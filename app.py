from flask import Flask, render_template, request, jsonify, redirect, flash
from models import db, Question, Choice, TestSession, TestResult
from datetime import datetime
import random
import os

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
    today_score = _today_score()
    return render_template('index.html', today_score=today_score)


@app.route('/test/<test_type>')
def test_page(test_type):
    if test_type not in ['money', 'spending', 'future']:
        return redirect('/')
    questions = Question.query.filter_by(test_type=test_type).order_by(Question.order).all()
    return render_template('test.html', test_type=test_type, questions=questions)


@app.route('/result/<int:session_id>')
def result_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template('result.html', ts=ts, result=result)


@app.route('/insight/<int:session_id>')
def insight_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    if not ts.unlocked:
        return redirect(f'/result/{session_id}')
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template('insight.html', ts=ts, result=result)


@app.route('/history')
def history_page():
    return render_template('history.html')


@app.route('/profile')
def profile_page():
    return render_template('profile.html')


# ────────────────────────────────────────
#  API
# ────────────────────────────────────────

@app.route('/api/start', methods=['POST'])
def api_start():
    data = request.get_json()
    ts = TestSession(test_type=data.get('test_type', 'money'), started_at=datetime.utcnow())
    db.session.add(ts)
    db.session.commit()
    return jsonify({'session_id': ts.id})


@app.route('/api/answer', methods=['POST'])
def api_answer():
    data = request.get_json()
    ts     = TestSession.query.get_or_404(data.get('session_id'))
    choice = Choice.query.get_or_404(data.get('choice_id'))
    ts.score        = (ts.score or 0) + choice.score
    ts.answer_count = (ts.answer_count or 0) + 1
    db.session.commit()
    return jsonify({'ok': True, 'current_score': ts.score})


@app.route('/api/finish', methods=['POST'])
def api_finish():
    data = request.get_json()
    ts   = TestSession.query.get_or_404(data.get('session_id'))
    total_possible = _max_score(ts.test_type)
    normalized = min(100, round((ts.score / total_possible) * 100)) if total_possible else 50
    result_type, title, desc = _calc_result(normalized)
    db.session.add(TestResult(
        session_id=ts.id, final_score=normalized,
        result_type=result_type, result_title=title,
        result_desc=desc, created_at=datetime.utcnow()
    ))
    ts.finished_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'session_id': ts.id, 'final_score': normalized,
                    'result_type': result_type, 'result_title': title})


@app.route('/api/unlock', methods=['POST'])
def api_unlock():
    data = request.get_json()
    ts = TestSession.query.get_or_404(data.get('session_id'))
    ts.unlocked = True
    db.session.commit()
    return jsonify({'ok': True, 'redirect': f'/insight/{ts.id}'})


@app.route('/api/share', methods=['POST'])
def api_share():
    data = request.get_json()
    ts = TestSession.query.get_or_404(data.get('session_id'))
    ts.share_count = (ts.share_count or 0) + 1
    db.session.commit()
    return jsonify({'ok': True})


@app.route('/api/stats', methods=['GET'])
def api_stats():
    total    = TestSession.query.count()
    finished = TestSession.query.filter(TestSession.finished_at.isnot(None)).count()
    unlocked = TestSession.query.filter_by(unlocked=True).count()
    return jsonify({
        'total_sessions':  total,
        'finished':        finished,
        'unlocked':        unlocked,
        'conversion_rate': round(unlocked / finished * 100, 1) if finished else 0
    })


# ────────────────────────────────────────
#  PAYMENT
# ────────────────────────────────────────

@app.route('/payment/success')
def payment_success():
    session_id = request.args.get('session')
    # TODO: 토스페이먼츠 서버-to-서버 승인 API 호출
    if session_id:
        ts = TestSession.query.get(int(session_id))
        if ts:
            ts.unlocked = True
            db.session.commit()
            flash('결제가 완료되었습니다! AI 리포트를 확인하세요.', 'success')
            return redirect(f'/insight/{session_id}')
    return redirect('/')


@app.route('/payment/fail')
def payment_fail():
    session_id = request.args.get('session')
    flash('결제가 취소되었습니다.', 'error')
    return redirect(f'/result/{session_id}' if session_id else '/')


# ────────────────────────────────────────
#  HELPERS
# ────────────────────────────────────────

def _today_score():
    random.seed(int(datetime.utcnow().strftime('%Y%m%d')))
    return random.randint(50, 99)


def _max_score(test_type):
    questions = Question.query.filter_by(test_type=test_type).all()
    return sum(max((c.score for c in q.choices), default=0) for q in questions) or 20


def _calc_result(score):
    if score >= 90:
        return 'gold',    '황금빛 돈 자석',  '별들이 당신의 재물 하우스로 모이고 있습니다. 기회가 직접 찾아올 거예요.'
    elif score >= 75:
        return 'silver',  '은빛 재물의 흐름', '꾸준한 노력이 빛을 발하는 시기입니다. 작은 기회를 놓치지 마세요.'
    elif score >= 55:
        return 'bronze',  '동전의 양면',      '재물운이 균형을 찾는 시기입니다. 신중한 판단이 필요합니다.'
    else:
        return 'caution', '절약의 지혜',      '지금은 지출을 줄이고 내실을 다지는 것이 유리합니다.'


# ────────────────────────────────────────
#  DB SEED
# ────────────────────────────────────────

def seed_data():
    if Question.query.count() > 0:
        return

    data = [
        ('money',1,'💰','오늘 아침 눈을 떴을 때 가장 먼저 한 생각은?','평소 습관과 가장 가까운 항목을 선택해 주세요.',
         [('오늘 할 일 체크',3),('잔고 확인',4),('더 자고 싶다',1),('뭔가 좋은 일 있을 것 같아',5)]),
        ('money',2,'🎯','이번 달 가장 큰 지출은 무엇인가요?','솔직하게 선택해 주세요.',
         [('식비/외식',3),('쇼핑',2),('취미/자기계발',4),('저축/투자',5)]),
        ('money',3,'💳','보너스를 받으면 주로 어떻게 사용하시나요?','평소 습관과 가장 가까운 항목을 선택해 주세요.',
         [('전부 저축한다',5),('나를 위해 플렉스한다',2),('주식이나 코인에 투자한다',4),('대출이나 빚을 갚는다',3)]),
        ('money',4,'🌙','잠자리에 들기 전 주로 생각하는 것은?','가장 솔직한 답을 골라주세요.',
         [('오늘 얼마 썼지?',4),('내일 일이 잘 됐으면...',3),('빨리 부자가 되고 싶다',3),('그냥 잠이나 자자',1)]),
        ('money',5,'🔮','로또 1등에 당첨된다면 가장 먼저 할 것은?','솔직한 마음 속 1순위를 선택해 주세요.',
         [('부동산 투자',5),('가족에게 나눠준다',4),('여행을 떠난다',3),('은행에 넣어둔다',4)]),
        ('spending',1,'🛍️','쇼핑할 때 나의 스타일은?','평소 소비 패턴과 가장 가까운 항목을 선택해 주세요.',
         [('미리 리스트 작성 후 구매',5),('눈에 띄면 바로 구매',1),('가격 비교 후 최저가 구매',4),('충동구매 후 자주 반품',2)]),
        ('spending',2,'💸','월급날 가장 먼저 하는 것은?','솔직하게 선택해 주세요.',
         [('적금/투자 자동이체 확인',5),('밀린 쇼핑몰 장바구니 결제',1),('한 달 예산 계획 수립',4),('맛있는 거 먹으러 간다',3)]),
        ('spending',3,'📊','가계부/지출 관리를 하시나요?','현재 나의 상태와 가장 가까운 항목을 선택해 주세요.',
         [('매일 꼼꼼히 기록',5),('앱으로 자동 관리',4),('가끔 확인',2),('전혀 안 한다',1)]),
        ('spending',4,'🎁','친구 생일 선물 예산은?','평소 기준으로 선택해 주세요.',
         [('3만원 이하로 실용적으로',4),('10만원 이상 아낌없이',2),('형편에 맞게 유동적으로',5),('선물 대신 밥 사준다',3)]),
        ('spending',5,'🏷️','세일 기간에 나의 행동은?','솔직한 마음 속 1순위를 선택해 주세요.',
         [('필요한 것만 할인가에 구매',5),('없어도 되는 것까지 다 산다',1),('세일 전 가격부터 비교한다',4),('세일에 별로 관심 없다',3)]),
        ('future',1,'🏠','10년 후 나의 가장 큰 자산 목표는?','현재 계획과 가장 가까운 항목을 선택해 주세요.',
         [('내 집 마련',5),('주식/코인 투자 수익',4),('사업 자금 마련',4),('아직 생각 안 해봤다',1)]),
        ('future',2,'📈','현재 투자를 하고 있나요?','현재 상황을 솔직하게 선택해 주세요.',
         [('매월 정기 투자 중',5),('가끔 관심 있을 때만',2),('공부 중이지만 아직 미투자',3),('투자는 위험해서 안 한다',1)]),
        ('future',3,'💼','노후 준비는 어떻게 하고 있나요?','현재 상황과 가장 가까운 항목을 선택해 주세요.',
         [('연금저축/IRP 납입 중',5),('국민연금만 믿는다',2),('아직 젊어서 생각 안 함',1),('부동산으로 대비 중',4)]),
        ('future',4,'🌍','5년 안에 달성하고 싶은 재정 목표는?','가장 현실적인 목표를 선택해 주세요.',
         [('종잣돈 5000만원 만들기',5),('연봉 1억 달성',4),('부채 전액 상환',4),('목표가 없다',1)]),
        ('future',5,'⚡','부수입(N잡)에 대한 생각은?','솔직한 마음 속 1순위를 선택해 주세요.',
         [('이미 하고 있다',5),('준비 중이다',4),('관심은 있지만 엄두가 안 난다',2),('본업에 집중하는 게 낫다',3)]),
    ]

    for test_type, order, emoji, text, sub, choices in data:
        q = Question(test_type=test_type, order=order, emoji=emoji, text=text, sub=sub)
        db.session.add(q)
        db.session.flush()
        for i, (t, s) in enumerate(choices):
            db.session.add(Choice(question_id=q.id, text=t, score=s, order=i))

    db.session.commit()
    print('✅ Seed data inserted.')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_data()
    app.run(debug=True, port=5000)
