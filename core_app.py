# ============================================================
#  app.py — Flask 메인 애플리케이션
#
#  역할:
#    - Flask 앱 초기화 및 설정
#    - 페이지 라우트 (HTML 반환)
#    - API 라우트 (JSON 반환)
#    - 결제 콜백 처리
#    - 헬퍼 함수 (랜덤 질문 출제, 점수 계산 등)
#
#  의존성: models.py, .env (환경변수)
# ============================================================

from flask import Flask, render_template, request, jsonify, redirect, flash, url_for
from models import db, Question, Choice, TestSession, TestResult
from datetime import datetime
from collections import defaultdict
import random
import json
import os

# ──────────────────────────────────────────────────────────────
#  Flask 앱 초기화
# ──────────────────────────────────────────────────────────────
app = Flask(__name__)

# 환경변수에서 설정 로드 (.env 파일 또는 실제 환경변수)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
# ↑ 반드시 운영 환경에서 강력한 랜덤 키로 교체할 것

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///jaemulun.db"
)
# SQLite: 로컬 개발용 (파일 기반)
# MySQL:  운영 배포용 (PythonAnywhere 등)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# 불필요한 이벤트 추적 비활성화 (성능 향상)

db.init_app(app)


# ──────────────────────────────────────────────────────────────
#  상수 정의
# ──────────────────────────────────────────────────────────────

# 허용된 테스트 타입 (유효성 검사에 사용)
VALID_TEST_TYPES = {"money", "spending", "future"}

# 테스트 타입별 출제 문항 수
QUESTION_COUNT = {
    "money":    5,
    "spending": 5,
    "future":   5,
}

# 테스트 타입 표시 이름
TEST_TYPE_LABELS = {
    "money":    "오늘의 재물운",
    "spending": "소비 성향 퀴즈",
    "future":   "빠른 진단",
}


# ══════════════════════════════════════════════════════════════
#  SECTION 1 — 페이지 라우트 (HTML 렌더링)
# ══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    """스플래시 화면."""
    return render_template("index.html")


@app.route("/home")
def home_page():
    """홈 화면."""
    today_score = _today_score()
    return render_template("home.html", today_score=today_score)



@app.route("/intro/<test_type>")
def intro_page(test_type):
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))

    test_label = TEST_TYPE_LABELS.get(test_type, test_type)

    intro_map = {
        "spending": {
            "badge": "소비 패턴 분석",
            "heading_before": "나의 소비 습관을",
            "heading_highlight": "유형으로 확인",
            "desc": "평소 소비 패턴을 기준으로 계획형인지, 즉흥형인지 가볍게 확인합니다.",
            "bullets": [
                "일상적인 소비 습관을 기준으로 성향을 분석합니다.",
                "답변 흐름은 가볍지만 결과 문구는 신뢰감 있게 구성합니다.",
                "퀴즈 UI는 공통으로 사용되며 제목과 결과 메시지만 다르게 적용합니다."
            ]
        },
        "money": {
            "badge": "오늘의 금전운",
            "heading_before": "오늘 하루의",
            "heading_highlight": "재물 흐름 확인",
            "desc": "오늘 소비해도 괜찮을지 금전운의 흐름을 가볍게 체크해보세요.",
            "bullets": [
                "간단한 질문으로 오늘의 금전운을 확인합니다.",
                "현재 소비 타이밍이 좋은지 알려드립니다.",
                "결과는 가볍지만 현실적인 방향을 제공합니다."
            ]
        },
        "future": {
            "badge": "빠른 진단",
            "heading_before": "지금 내 상태를",
            "heading_highlight": "빠르게 확인",
            "desc": "짧은 질문으로 현재의 재물 흐름을 빠르게 확인합니다.",
            "bullets": [
                "빠르게 현재 상태를 파악할 수 있습니다.",
                "직관적인 결과로 이해하기 쉽습니다.",
                "짧지만 핵심적인 피드백을 제공합니다."
            ]
        }
    }

    data = intro_map.get(test_type, intro_map["money"])

    return render_template(
        "intro.html",
        test_type=test_type,
        test_label=test_label,
        intro_title=test_label,
        intro_badge=data["badge"],
        intro_heading_before=data["heading_before"],
        intro_heading_highlight=data["heading_highlight"],
        intro_desc=data["desc"],
        intro_bullets=data["bullets"]
    )

@app.route("/test/<test_type>")
def test_page(test_type):
    """퀴즈 진행 화면."""
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))

    label = TEST_TYPE_LABELS.get(test_type, test_type)

    return render_template(
        "test.html",
        test_type=test_type,
        test_label=label
    )


# ✅ 결과 화면 (중요)
@app.route("/result/<int:session_id>")
def result_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()

    result_heading = TEST_TYPE_LABELS.get(ts.test_type, "진단 결과")
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)

    return render_template(
        "result.html",
        ts=ts,
        result=result,
        result_heading=result_heading,
        result_tags=result_tags,
        test_type=ts.test_type,
        test_label=test_label
    )


# 상세 인사이트
@app.route("/insight/<int:session_id>")
def insight_page(session_id):
    ts = TestSession.query.get_or_404(session_id)

    if not ts.unlocked:
        return redirect(url_for("result_page", session_id=session_id))

    result = TestResult.query.filter_by(session_id=session_id).first()

    return render_template(
        "insight.html",
        ts=ts,
        result=result
    )

 
# ✅ 공유 화면 (핵심 수정 완료 버전)
@app.route("/share/<int:session_id>")
def share_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()

    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)

    share_data = {
        "score": result.final_score if result else 0,
        "delta_text": "이번 주 +4점",
        "rank": 28,
        "tags": result_tags
    }

    return render_template(
        "share.html",
        ts=ts,
        result=share_data,
        test_type=ts.test_type,
        test_label=test_label
    )

# ══════════════════════════════════════════════════════════════
#  SECTION 2 — API 라우트 (JSON 응답)
# ══════════════════════════════════════════════════════════════

@app.route("/api/start", methods=["POST"])
def api_start():
    """
    테스트 세션 시작.

    1. test_type 유효성 검사
    2. DB 질문풀에서 카테고리 균형 랜덤 출제
    3. 새 TestSession 생성 및 저장
    4. 선택된 질문 목록을 JSON으로 반환

    요청 body: { "test_type": "money" | "spending" | "future" }
    응답: { ok, session_id, test_type, questions: [...] }
    """
    data = request.json or {}
    test_type = data.get("test_type", "money")

    # 유효성 검사
    if test_type not in VALID_TEST_TYPES:
        return jsonify({"ok": False, "message": "유효하지 않은 test_type입니다."}), 400

    # 질문 랜덤 출제 (카테고리 균형 반영)
    count = QUESTION_COUNT.get(test_type, 6)
    selected_questions = _get_balanced_questions(test_type=test_type, count=count)

    if not selected_questions:
        return jsonify({
            "ok": False,
            "message": "질문 데이터가 없습니다. seed_db.py를 먼저 실행해주세요."
        }), 404

    selected_ids = [q.id for q in selected_questions]

    # 세션 생성
    ts = TestSession(
        test_type=test_type,
        selected_question_ids=",".join(map(str, selected_ids)),
        answered_question_ids="",
        meta_json=json.dumps({
            "question_count": len(selected_ids),
            "version": "pool-v1",
        }, ensure_ascii=False),
        started_at=datetime.utcnow(),
    )
    db.session.add(ts)
    db.session.commit()

    return jsonify({
        "ok": True,
        "session_id": ts.id,
        "test_type": test_type,
        "questions": [q.to_dict() for q in selected_questions],
    })


@app.route("/api/answer", methods=["POST"])
def api_answer():
    """
    답변 제출 및 점수 누적.

    검증 항목:
    - 해당 question이 이 세션에 포함되어 있는지
    - choice가 해당 question에 속하는지
    - 이미 답변한 question인지 (중복 방지)

    요청 body: { "session_id": int, "question_id": int, "choice_id": int }
    응답: { ok, current_score, answer_count }
    """
    data = request.json or {}
    session_id  = data.get("session_id")
    question_id = data.get("question_id")
    choice_id   = data.get("choice_id")

    ts     = TestSession.query.get_or_404(session_id)
    choice = Choice.query.get_or_404(choice_id)

    selected_ids = _parse_ids(ts.selected_question_ids)
    answered_ids = set(_parse_ids(ts.answered_question_ids))

    # 검증 1: 이 세션의 질문인가?
    if question_id not in selected_ids:
        return jsonify({"ok": False, "message": "이 세션에 포함되지 않은 질문입니다."}), 400

    # 검증 2: 선택지가 해당 질문에 속하는가?
    if choice.question_id != question_id:
        return jsonify({"ok": False, "message": "선택지와 질문이 일치하지 않습니다."}), 400

    # 검증 3: 이미 답변한 질문인가?
    if question_id in answered_ids:
        return jsonify({"ok": False, "message": "이미 답변한 질문입니다."}), 400

    # 점수 누적 및 상태 업데이트
    ts.score = (ts.score or 0) + choice.score
    answered_ids.add(question_id)
    ts.answer_count = len(answered_ids)
    ts.answered_question_ids = ",".join(map(str, sorted(answered_ids)))
    db.session.commit()

    return jsonify({
        "ok": True,
        "current_score": ts.score,
        "answer_count": ts.answer_count,
    })


@app.route("/api/finish", methods=["POST"])
def api_finish():
    """
    테스트 완료 처리 및 결과 계산.

    - raw score를 0~100으로 정규화
    - test_type + score 구간에 따라 result_type, title, desc 결정
    - TestResult 저장
    - 이미 결과가 있으면 재계산 없이 기존 값 반환

    요청 body: { "session_id": int }
    응답: { ok, session_id, final_score, result_type, result_title }
    """
    data = request.json or {}
    session_id = data.get("session_id")
    ts = TestSession.query.get_or_404(session_id)

    # 이미 결과가 계산된 경우 → 그냥 반환 (중복 생성 방지)
    if ts.result:
        return jsonify({
            "ok":           True,
            "session_id":   session_id,
            "final_score":  ts.result.final_score,
            "result_type":  ts.result.result_type,
            "result_title": ts.result.result_title,
        })

    # 선택된 질문들의 최고 가능 점수 계산 → 정규화 기준
    selected_ids   = _parse_ids(ts.selected_question_ids)
    max_possible   = _calc_max_score(selected_ids)
    normalized     = min(100, round((ts.score / max_possible) * 100)) if max_possible else 50

    # 결과 유형 계산
    result_type, title, desc = _calc_result(normalized, ts.test_type)

    # 결과 저장
    result = TestResult(
        session_id=session_id,
        final_score=normalized,
        result_type=result_type,
        result_title=title,
        result_desc=desc,
        created_at=datetime.utcnow(),
    )
    db.session.add(result)
    ts.finished_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "ok":           True,
        "session_id":   session_id,
        "final_score":  normalized,
        "result_type":  result_type,
        "result_title": title,
    })


@app.route("/api/unlock", methods=["POST"])
def api_unlock():
    """
    잠금 해제 처리.
    광고 시청 완료 or 결제 완료 후 호출.

    TODO: 실제 광고 SDK 콜백 검증 로직 추가
    TODO: 결제의 경우 /payment/success 에서 처리하도록 분리

    요청 body: { "session_id": int }
    응답: { ok, redirect }
    """
    data = request.json or {}
    session_id = data.get("session_id")
    ts = TestSession.query.get_or_404(session_id)

    ts.unlocked = True
    db.session.commit()

    return jsonify({"ok": True, "redirect": f"/insight/{session_id}"})


@app.route("/api/share", methods=["POST"])
def api_share():
    """
    공유 이벤트 기록.
    카카오/링크복사 등 공유 버튼 클릭 시 호출.

    TODO: platform 값 저장 (meta_json 에 추가 가능)
    TODO: 공유 후 보상(잠금 해제 등) 로직 추가 가능

    요청 body: { "session_id": int }
    응답: { ok }
    """
    data = request.json or {}
    session_id = data.get("session_id")
    ts = TestSession.query.get_or_404(session_id)

    ts.share_count = (ts.share_count or 0) + 1
    db.session.commit()

    return jsonify({"ok": True})


@app.route("/api/stats")
def api_stats():
    """
    관리자용 통계 API.
    전체 세션 수, 완료율, 잠금해제율, 평균 점수 반환.

    TODO: 인증 미들웨어 추가 (관리자만 접근 가능하게)
    TODO: 일별/주별 통계 추가
    """
    total    = TestSession.query.count()
    finished = TestSession.query.filter(TestSession.finished_at.isnot(None)).count()
    unlocked = TestSession.query.filter_by(unlocked=True).count()
    avg_score = db.session.query(db.func.avg(TestResult.final_score)).scalar() or 0

    return jsonify({
        "total_sessions":  total,
        "finished":        finished,
        "unlocked":        unlocked,
        "conversion_rate": round(unlocked / finished * 100, 1) if finished else 0,
        "avg_score":       round(float(avg_score), 1),
    })


# ══════════════════════════════════════════════════════════════
#  SECTION 3 — 결제 콜백 라우트
# ══════════════════════════════════════════════════════════════

@app.route("/payment/success")
def payment_success():
    """
    결제 성공 콜백.
    토스페이먼츠/아임포트 등 PG사에서 리다이렉트.

    TODO: 서버-to-서버 결제 검증 API 호출 (orderId, paymentKey, amount 검증)
    TODO: 결제 금액과 예상 금액 일치 여부 확인
    TODO: 이중 결제 방지 로직 추가
    """
    session_id = request.args.get("session")
    if session_id:
        ts = TestSession.query.get(int(session_id))
        if ts:
            ts.unlocked = True
            db.session.commit()
            flash("결제가 완료되었습니다! AI 리포트를 확인하세요.", "success")
            return redirect(url_for("insight_page", session_id=session_id))
    return redirect(url_for("home_page"))


@app.route("/payment/fail")
def payment_fail():
    """결제 실패/취소 콜백."""
    session_id = request.args.get("session")
    flash("결제가 취소되었습니다.", "error")
    return redirect(url_for("result_page", session_id=session_id) if session_id else url_for("home_page"))


# ══════════════════════════════════════════════════════════════
#  SECTION 4 — 헬퍼 함수
# ══════════════════════════════════════════════════════════════

def _today_score() -> int:
    """
    오늘 날짜 기반 고정 점수 생성.
    같은 날 접속하면 항상 같은 값 → 신뢰감 부여
    날짜가 바뀌면 값도 바뀜
    """
    seed = int(datetime.utcnow().strftime("%Y%m%d"))
    random.seed(seed)
    return random.randint(65, 98)


def _parse_ids(raw: str) -> list:
    """
    쉼표 구분 문자열을 정수 리스트로 변환.
    예: "3,15,22" → [3, 15, 22]
    빈 문자열이나 None → []
    """
    if not raw:
        return []
    return [int(x) for x in raw.split(",") if x.strip().isdigit()]


def _weighted_sample(pool: list) -> object:
    """
    weight 값 기반 가중 랜덤 선택.
    weight=3 이면 weight=1 짜리보다 3배 확률로 선택됨.
    """
    expanded = []
    for item in pool:
        expanded.extend([item] * max(1, item.weight))
    return random.choice(expanded)


def _get_balanced_questions(test_type: str, count: int = 6) -> list:
    """
    카테고리 균형 랜덤 출제 로직.

    동작 방식:
    1단계: is_active=True 질문 전체 조회 후 카테고리별 그룹화
    2단계: 카테고리를 셔플하여 각 카테고리에서 1개씩 선택 (균형 보장)
    3단계: count에 미달하면 나머지 풀에서 추가로 채움
    4단계: 전체 섞어서 반환 (카테고리 순서 노출 방지)

    예: money 카테고리가 daily/luck/money_habit 3종이면
        각각 1개씩 = 3개 선택 후 부족하면 잔여에서 추가 채움
    """
    # is_active=True 인 질문만 조회
    all_questions = Question.query.filter_by(
        test_type=test_type,
        is_active=True,
    ).all()

    if not all_questions:
        return []

    # 카테고리별 그룹화
    grouped = defaultdict(list)
    for q in all_questions:
        grouped[q.category].append(q)

    selected  = []
    used_ids  = set()

    # 1단계: 카테고리별 1개씩 균형 출제
    category_keys = list(grouped.keys())
    random.shuffle(category_keys)  # 카테고리 순서도 랜덤

    for cat in category_keys:
        candidates = [q for q in grouped[cat] if q.id not in used_ids]
        if not candidates:
            continue
        picked = _weighted_sample(candidates)
        selected.append(picked)
        used_ids.add(picked.id)
        if len(selected) >= count:
            break

    # 2단계: 부족하면 나머지 풀에서 보충
    if len(selected) < count:
        remaining = [q for q in all_questions if q.id not in used_ids]
        random.shuffle(remaining)
        while remaining and len(selected) < count:
            picked = _weighted_sample(remaining)
            selected.append(picked)
            used_ids.add(picked.id)
            remaining = [q for q in remaining if q.id not in used_ids]

    # 최종 섞어서 반환 (카테고리 패턴 노출 방지)
    random.shuffle(selected)
    return selected[:count]


def _calc_max_score(question_ids: list) -> int:
    """
    선택된 질문들의 최대 획득 가능 점수 계산.
    각 질문에서 가장 높은 score 선택지 값의 합.
    질문 없으면 기본값 20 반환 (0 나누기 방지).
    """
    if not question_ids:
        return 20

    questions = Question.query.filter(Question.id.in_(question_ids)).all()
    total = sum(
        max((c.score for c in q.choices), default=0)
        for q in questions
    )
    return total or 20


def _calc_result(score: int, test_type: str) -> tuple:
    """
    점수 + 테스트 타입에 따라 결과 유형, 제목, 설명 반환.

    점수 구간:
    90 이상 → golds
    75~89   → silver
    55~74   → bronze
    55 미만  → caution

    각 test_type별로 결과 문구를 다르게 구성.
    TODO: 문구가 많아지면 별도 constants.py 파일로 분리 추천
    """
    result_copy = {
        "money": {
            "gold":    ("황금빛 돈 자석",       "오늘 재물 에너지가 최고조입니다. 작은 기회도 놓치지 말고 적극적으로 행동해보세요."),
            "silver":  ("은빛 재물의 흐름",      "안정적인 돈 감각이 살아 있는 날입니다. 작은 절약과 현명한 지출이 성과로 이어집니다."),
            "bronze":  ("균형 잡힌 지갑 감각",   "무리하지 않으면 무난한 하루입니다. 충동 지출만 조심하면 안정적인 흐름을 유지할 수 있어요."),
            "caution": ("지출 점검 모드",         "오늘은 큰 지출을 미루고 계획적인 소비를 실천하는 것이 유리합니다."),
        },
        "spending": {
            "gold":    ("계획형 소비 마스터",     "필요와 욕구를 잘 구분하는 편입니다. 이런 패턴이 장기적으로 자산 형성에 큰 도움이 됩니다."),
            "silver":  ("안정형 소비 컨트롤러",   "대체로 좋은 소비 습관을 유지하고 있습니다. 지출 기록을 더 자주 확인하면 더욱 좋아집니다."),
            "bronze":  ("감정과 계획 사이",        "상황에 따라 소비가 흔들릴 수 있습니다. 월 예산선을 정하는 것만으로도 개선 폭이 큽니다."),
            "caution": ("충동 지출 주의형",        "세일·기분·분위기의 영향을 받기 쉬운 편입니다. 구매 전 10분 멈춤 습관이 효과적입니다."),
        },
        "future": {
            "gold":    ("장기 자산 설계형",        "목표와 습관이 잘 연결된 유형입니다. 꾸준히 쌓으면 복리 효과를 극대화할 수 있습니다."),
            "silver":  ("성장형 자산 준비자",      "기초 체력이 좋은 편입니다. 수입 확장이나 투자 공부를 더하면 빠른 속도로 성장합니다."),
            "bronze":  ("가능성 축적형",           "방향은 맞지만 루틴 고정이 필요합니다. 목표 금액과 기간을 글로 적어두면 성과가 빨라집니다."),
            "caution": ("기초 체력 보강형",         "지금은 큰 수익보다 현금 흐름과 비상금 관리부터 다지는 것이 가장 중요합니다."),
        },
    }

    # 점수 구간 판정
    if score >= 90:
        key = "gold"
    elif score >= 75:
        key = "silver"
    elif score >= 55:
        key = "bronze"
    else:
        key = "caution"

    # test_type이 없으면 money 기준으로 fallback
    copy = result_copy.get(test_type, result_copy["money"])
    title, desc = copy[key]
    return key, title, desc




def _result_tags(test_type: str, result_type: str | None) -> list:
    tags_map = {
        "money": ["오늘 운세", "지출 관리", "리스크 점검"],
        "spending": ["소비 패턴", "예산 감각", "유형 분석"],
        "future": ["빠른 진단", "현재 흐름", "즉시 확인"],
    }
    tags = list(tags_map.get(test_type, ["재물운", "테스트 결과", "흐름 확인"]))
    if result_type == "gold":
        tags[0] = "상위 흐름"
    elif result_type == "caution":
        tags[-1] = "주의 필요"
    return tags


# ══════════════════════════════════════════════════════════════
#  실행 진입점
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    with app.app_context():
        # 테이블 없으면 자동 생성 (개발 환경용)
        # 운영에서는 DB 마이그레이션 도구(Flask-Migrate 등) 사용 권장
        db.create_all()
        print("✅ DB 테이블 생성 완료")
        print("⚠️  질문 데이터는 'python seed_db.py' 로 별도 삽입 필요")
    app.run(debug=True, port=5000)
