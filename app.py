from flask import Flask, render_template, request, jsonify, session
from models import db, Question, Choice, TestSession, TestResult
from datetime import datetime
import random, os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-prod')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///jaemulun.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# ────────────────────────────────────────
#  PAGES
# ────────────────────────────────────────

@app.route('/')
def index():
    """홈 화면 — 오늘 금전운 점수 생성"""
    today_score = _today_score()
    return render_template('index.html', today_score=today_score)


@app.route('/test/<test_type>')
def test_page(test_type):
    """테스트 화면"""
    valid = ['money', 'spending', 'future']
    if test_type not in valid:
        return redirect('/')
    questions = Question.query.filter_by(test_type=test_type).order_by(Question.order).all()
    return render_template('test.html', test_type=test_type, questions=questions)


@app.route('/result/<int:session_id>')
def result_page(session_id):
    """결과 화면"""
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template('result.html', ts=ts, result=result)


@app.route('/insight/<int:session_id>')
def insight_page(session_id):
    """AI 인사이트 화면 (광고 시청 후 접근)"""
    ts = TestSession.query.get_or_404(session_id)
    if not ts.unlocked:
        return redirect(f'/result/{session_id}')
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template('insight.html', ts=ts, result=result)


# ────────────────────────────────────────
#  API
# ────────────────────────────────────────

@app.route('/api/start', methods=['POST'])
def api_start():
    """테스트 세션 시작"""
    data = request.json
    test_type = data.get('test_type', 'money')
    ts = TestSession(test_type=test_type, started_at=datetime.utcnow())
    db.session.add(ts)
    db.session.commit()
    return jsonify({'session_id': ts.id})


@app.route('/api/answer', methods=['POST'])
def api_answer():
    """답변 저장"""
    data = request.json
    session_id = data.get('session_id')
    question_id = data.get('question_id')
    choice_id = data.get('choice_id')

    ts = TestSession.query.get_or_404(session_id)
    choice = Choice.query.get_or_404(choice_id)

    # 누적 점수
    ts.score = (ts.score or 0) + choice.score
    ts.answer_count = (ts.answer_count or 0) + 1
    db.session.commit()

    return jsonify({'ok': True, 'current_score': ts.score})


@app.route('/api/finish', methods=['POST'])
def api_finish():
    """테스트 완료 → 결과 계산"""
    data = request.json
    session_id = data.get('session_id')
    ts = TestSession.query.get_or_404(session_id)

    # 점수 정규화 (0~100)
    total_possible = _max_score(ts.test_type)
    normalized = min(100, round((ts.score / total_possible) * 100)) if total_possible else 50

    result_type, title, desc = _calc_result(normalized)

    result = TestResult(
        session_id=session_id,
        final_score=normalized,
        result_type=result_type,
        result_title=title,
        result_desc=desc,
        created_at=datetime.utcnow()
    )
    db.session.add(result)
    ts.finished_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'session_id': session_id,
        'final_score': normalized,
        'result_type': result_type,
        'result_title': title,
    })


@app.route('/api/unlock', methods=['POST'])
def api_unlock():
    """광고 시청 완료 → 잠금 해제"""
    data = request.json
    session_id = data.get('session_id')
    ts = TestSession.query.get_or_404(session_id)
    ts.unlocked = True
    db.session.commit()
    return jsonify({'ok': True, 'redirect': f'/insight/{session_id}'})


@app.route('/api/share', methods=['POST'])
def api_share():
    """공유 이벤트 기록"""
    data = request.json
    session_id = data.get('session_id')
    platform = data.get('platform', 'kakao')
    ts = TestSession.query.get_or_404(session_id)
    ts.share_count = (ts.share_count or 0) + 1
    db.session.commit()
    # 실제 서비스에서는 카카오 공유 API 호출
    return jsonify({'ok': True})


@app.route('/payment/success')
def payment_success():
    """토스페이먼츠 결제 성공 콜백"""
    session_id    = request.args.get('session')
    payment_key   = request.args.get('paymentKey')
    order_id      = request.args.get('orderId')
    amount        = request.args.get('amount', 4900, type=int)

    # ── 토스페이먼츠 결제 최종 승인 ──
    # 실제 서비스에서는 requests 라이브러리로 서버-to-서버 승인 API 호출
    # import requests, base64
    # secret = base64.b64encode(f"{TOSS_SECRET_KEY}:".encode()).decode()
    # requests.post('https://api.tosspayments.com/v1/payments/confirm',
    #   json={'paymentKey':payment_key,'orderId':order_id,'amount':amount},
    #   headers={'Authorization': f'Basic {secret}','Content-Type':'application/json'})

    if session_id:
        ts = TestSession.query.get(int(session_id))
        if ts:
            ts.unlocked = True
            db.session.commit()
            from flask import flash, redirect
            flash('결제가 완료되었습니다! AI 리포트를 확인하세요.', 'success')
            return redirect(f'/insight/{session_id}')
    return redirect('/')


@app.route('/payment/fail')
def payment_fail():
    """토스페이먼츠 결제 실패 콜백"""
    session_id = request.args.get('session')
    from flask import flash, redirect
    flash('결제가 취소되었습니다.', 'error')
    return redirect(f'/result/{session_id}' if session_id else '/')



def api_stats():
    """간단한 통계 (관리자용)"""
    total = TestSession.query.count()
    finished = TestSession.query.filter(TestSession.finished_at.isnot(None)).count()
    unlocked = TestSession.query.filter_by(unlocked=True).count()
    return jsonify({
        'total_sessions': total,
        'finished': finished,
        'unlocked': unlocked,
        'conversion_rate': round(unlocked / finished * 100, 1) if finished else 0
    })


# ────────────────────────────────────────
#  HELPERS
# ────────────────────────────────────────

def _today_score():
    """날짜 기반 오늘 금전운 점수 (50~99)"""
    seed = int(datetime.utcnow().strftime('%Y%m%d'))
    random.seed(seed)
    return random.randint(50, 99)


def _max_score(test_type):
    """테스트 유형별 최대 가능 점수"""
    questions = Question.query.filter_by(test_type=test_type).all()
    total = 0
    for q in questions:
        max_c = max((c.score for c in q.choices), default=0)
        total += max_c
    return total or 20


def _calc_result(score):
    """점수 → 결과 유형"""
    if score >= 90:
        return 'gold', '황금빛 돈 자석', '별들이 당신의 재물 하우스로 모이고 있습니다. 기회가 직접 찾아올 거예요.'
    elif score >= 75:
        return 'silver', '은빛 재물의 흐름', '꾸준한 노력이 빛을 발하는 시기입니다. 작은 기회를 놓치지 마세요.'
    elif score >= 55:
        return 'bronze', '동전의 양면', '재물운이 균형을 찾는 시기입니다. 신중한 판단이 필요합니다.'
    else:
        return 'caution', '절약의 지혜', '지금은 지출을 줄이고 내실을 다지는 것이 유리합니다.'


# ────────────────────────────────────────
#  INIT DB & SEED
# ────────────────────────────────────────

def seed_data():
    """초기 질문 데이터 삽입"""
    if Question.query.count() > 0:
        return  # 이미 데이터 있음

    questions_data = [
        {
            'test_type': 'money',
            'order': 1,
            'emoji': '💰',
            'text': '오늘 아침 눈을 떴을 때 가장 먼저 한 생각은?',
            'sub': '평소 습관과 가장 가까운 항목을 선택해 주세요.',
            'choices': [
                ('오늘 할 일 체크', 3),
                ('잔고 확인', 4),
                ('더 자고 싶다', 1),
                ('뭔가 좋은 일 있을 것 같아', 5),
            ]
        },
        {
            'test_type': 'money',
            'order': 2,
            'emoji': '🎯',
            'text': '이번 달 가장 큰 지출은 무엇인가요?',
            'sub': '솔직하게 선택해 주세요.',
            'choices': [
                ('식비/외식', 3),
                ('쇼핑', 2),
                ('취미/자기계발', 4),
                ('저축/투자', 5),
            ]
        },
        {
            'test_type': 'money',
            'order': 3,
            'emoji': '💳',
            'text': '보너스를 받으면 주로 어떻게 사용하시나요?',
            'sub': '평소 습관과 가장 가까운 항목을 선택해 주세요.',
            'choices': [
                ('전부 저축한다', 5),
                ('나를 위해 플렉스한다', 2),
                ('주식이나 코인에 투자한다', 4),
                ('대출이나 빚을 갚는다', 3),
            ]
        },
        {
            'test_type': 'money',
            'order': 4,
            'emoji': '🌙',
            'text': '잠자리에 들기 전 주로 생각하는 것은?',
            'sub': '가장 솔직한 답을 골라주세요.',
            'choices': [
                ('오늘 얼마 썼지?', 4),
                ('내일 일이 잘 됐으면...', 3),
                ('빨리 부자가 되고 싶다', 3),
                ('그냥 잠이나 자자', 1),
            ]
        },
        {
            'test_type': 'money',
            'order': 5,
            'emoji': '🔮',
            'text': '로또 1등에 당첨된다면 가장 먼저 할 것은?',
            'sub': '솔직한 마음 속 1순위를 선택해 주세요.',
            'choices': [
                ('부동산 투자', 5),
                ('가족에게 나눠준다', 4),
                ('여행을 떠난다', 3),
                ('은행에 넣어둔다', 4),
            ]
        },
    ]

    for qd in questions_data:
        q = Question(
            test_type=qd['test_type'],
            order=qd['order'],
            emoji=qd['emoji'],
            text=qd['text'],
            sub=qd.get('sub', '')
        )
        db.session.add(q)
        db.session.flush()
        for i, (text, score) in enumerate(qd['choices']):
            c = Choice(question_id=q.id, text=text, score=score, order=i)
            db.session.add(c)

    db.session.commit()
    print("✅ Seed data inserted.")


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_data()
    app.run(debug=True, port=5000)
