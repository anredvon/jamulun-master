# ============================================================
#  app.py — Flask 메인 애플리케이션
# ============================================================
from flask import Flask, abort, render_template, request, jsonify, redirect, url_for, session
from models import db, Question, Choice, TestSession, TestResult
from datetime import datetime, timedelta
from collections import defaultdict
from hashlib import sha256
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
import hmac
import random
import json
import os
import secrets
from dotenv import load_dotenv
from secret_policy import is_valid_secret_key

load_dotenv(os.path.join(os.getcwd(), ".env"))

app = Flask(__name__)
secret_key = os.environ.get("SECRET_KEY")
if not is_valid_secret_key(secret_key):
    raise RuntimeError("SECRET_KEY must be a random value of at least 32 characters")
app.secret_key = secret_key
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///jaemulun.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config.update(
    SESSION_COOKIE_NAME="jaemulun_session",
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_DOMAIN=None,
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    SHARE_LINK_MAX_AGE_SECONDS=90 * 24 * 60 * 60,
)
db.init_app(app)


def _owner_token_digest(owner_token: str) -> str:
    return sha256(owner_token.encode("utf-8")).hexdigest()


def _get_or_create_owner_token() -> str:
    owner_token = session.get("owner_token")
    if not isinstance(owner_token, str) or not owner_token:
        owner_token = secrets.token_urlsafe(32)
        session["owner_token"] = owner_token
    session.permanent = True
    return owner_token


def _share_token_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(app.secret_key, salt="jaemulun-public-share-v1")


def _share_url(test_session: TestSession) -> str:
    token = _share_token_serializer().dumps({"session_id": test_session.id})
    return url_for("public_share_page", token=token)


def _issue_share_url(test_session: TestSession) -> str:
    test_session.share_count = (test_session.share_count or 0) + 1
    db.session.commit()
    return _share_url(test_session)


def get_owned_test_session(session_id: int) -> TestSession | None:
    """Return a session only when this signed visitor cookie owns it."""
    if isinstance(session_id, bool):
        return None
    try:
        normalized_id = int(session_id)
    except (TypeError, ValueError):
        return None

    owner_token = session.get("owner_token")
    if not isinstance(owner_token, str) or not owner_token:
        return None

    test_session = db.session.get(TestSession, normalized_id)
    if test_session is None or not isinstance(test_session.owner_token_hash, str):
        return None
    if not hmac.compare_digest(test_session.owner_token_hash, _owner_token_digest(owner_token)):
        return None
    return test_session

VALID_TEST_TYPES = {"money", "spending", "future"}
QUESTION_COUNT = {"money": 5, "spending": 5, "future": 5}
TEST_TYPE_LABELS = {
    "money": "오늘의 재물운",
    "spending": "소비 성향 퀴즈",
    "future": "재물 체크",
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/home")
def home_page():
    today_score = _today_score()
    return render_template("home.html", today_score=today_score)

@app.route("/check")
def check_page():
    return render_template("check.html")

@app.route("/intro/<test_type>")
def intro_page(test_type):
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))
    test_label = TEST_TYPE_LABELS.get(test_type, test_type)
    intro_map = {
        "spending": {
            "badge": "소비 패턴 분석", "heading_before": "나의 소비 습관을", "heading_highlight": "유형으로 확인",
            "desc": "평소 소비 패턴을 기준으로 계획형인지, 즉흥형인지 가볍게 확인합니다.",
            "bullets": ["평소 소비 선택에 가까운 답을 골라주세요.", "5개의 질문으로 나의 소비 스타일을 살펴봐요.", "결과와 함께 이번 주 실천 아이디어도 확인해요."]},
        "money": {
            "badge": "오늘의 금전운", "heading_before": "오늘 하루의", "heading_highlight": "재물 흐름 확인",
            "desc": "오늘 소비해도 괜찮을지 금전운의 흐름을 가볍게 체크해보세요.",
            "bullets": ["간단한 질문으로 오늘의 금전운을 확인합니다.", "현재 소비 타이밍이 좋은지 알려드립니다.", "결과는 가볍지만 현실적인 방향을 제공합니다."]},
        "future": {
            "badge": "30초 재물 체크", "heading_before": "지금 내 재물 상태를", "heading_highlight": "가볍게 체크",
            "desc": "5개의 짧은 질문으로 현재의 재물 흐름과 준비 상태를 확인해보세요.",
            "bullets": ["현재의 재물 습관과 준비 상태를 빠르게 확인합니다.", "점수와 유형으로 결과를 한눈에 이해할 수 있습니다.", "지금부터 챙기면 좋은 포인트를 가볍게 알려드립니다."]}}
    data = intro_map.get(test_type, intro_map["money"])
    return render_template("intro.html", test_type=test_type, test_label=test_label, intro_title=test_label,
                           intro_badge=data["badge"], intro_heading_before=data["heading_before"],
                           intro_heading_highlight=data["heading_highlight"], intro_desc=data["desc"], intro_bullets=data["bullets"],
                           back_url=url_for("check_page"))

@app.route("/test/<test_type>")
def test_page(test_type):
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))
    return render_template("test.html", test_type=test_type, test_label=TEST_TYPE_LABELS.get(test_type, test_type),
                           back_url=url_for("intro_page", test_type=test_type))

@app.route("/result/<int:session_id>")
def result_page(session_id):
    ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    result = TestResult.query.filter_by(session_id=session_id).first()
    result_heading = TEST_TYPE_LABELS.get(ts.test_type, "체크 결과")
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    return render_template("result.html", ts=ts, result=result, result_heading=result_heading,
                           result_tags=result_tags, test_type=ts.test_type, test_label=test_label,
                           back_url=url_for("check_page"))

@app.route("/insight/<int:session_id>")
def insight_page(session_id):
    ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    if ts.result is None:
        return redirect(url_for("result_page", session_id=session_id))
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template("insight.html", ts=ts, result=result,
                           back_url=url_for("result_page", session_id=session_id))

@app.route("/share/<int:session_id>")
def share_page(session_id):
    ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    result = TestResult.query.filter_by(session_id=session_id).first()
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)
    share_data = {"score": result.final_score if result else 0,
                  "title": result.result_title if result else "체크 결과",
                  "tags": result_tags}
    return render_template("share.html", ts=ts, result=share_data, test_type=ts.test_type,
                           test_label=test_label, share_url=_issue_share_url(ts))


@app.route("/shared/<token>")
def public_share_page(token):
    try:
        payload = _share_token_serializer().loads(
            token,
            max_age=app.config["SHARE_LINK_MAX_AGE_SECONDS"],
        )
        session_id = payload.get("session_id")
        if not isinstance(session_id, int) or isinstance(session_id, bool):
            abort(404)
    except (BadSignature, SignatureExpired, AttributeError, TypeError, ValueError):
        abort(404)

    ts = db.session.get(TestSession, session_id)
    if ts is None:
        abort(404)
    result = TestResult.query.filter_by(session_id=session_id).first()
    if result is None:
        abort(404)
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    public_result = {
        "score": result.final_score,
        "title": result.result_title,
        "tags": _result_tags(ts.test_type, result.result_type),
    }
    return render_template("public_share.html", result=public_result, test_label=test_label)

@app.route("/api/start", methods=["POST"])
def api_start():
    data = request.json or {}
    test_type = data.get("test_type", "money")
    if test_type not in VALID_TEST_TYPES:
        return jsonify({"ok": False, "message": "유효하지 않은 test_type입니다."}), 400
    count = QUESTION_COUNT.get(test_type, 6)
    selected_questions = _get_balanced_questions(test_type=test_type, count=count)
    if not selected_questions:
        return jsonify({"ok": False, "message": "질문 데이터가 없습니다. seed_db.py를 먼저 실행해주세요."}), 404
    selected_ids = [q.id for q in selected_questions]
    owner_token = _get_or_create_owner_token()
    ts = TestSession(test_type=test_type, selected_question_ids=",".join(map(str, selected_ids)), answered_question_ids="",
                     meta_json=json.dumps({"question_count": len(selected_ids), "version": "pool-v1"}, ensure_ascii=False),
                     started_at=datetime.utcnow(), owner_token_hash=_owner_token_digest(owner_token))
    db.session.add(ts); db.session.commit()
    return jsonify({"ok": True, "session_id": ts.id, "test_type": test_type, "questions": [q.to_dict() for q in selected_questions]})

@app.route("/api/answer", methods=["POST"])
def api_answer():
    data = request.json or {}; session_id = data.get("session_id"); question_id = data.get("question_id"); choice_id = data.get("choice_id")
    ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    choice = Choice.query.get_or_404(choice_id)
    selected_ids = _parse_ids(ts.selected_question_ids); answered_ids = set(_parse_ids(ts.answered_question_ids))
    if question_id not in selected_ids: return jsonify({"ok": False, "message": "이 세션에 포함되지 않은 질문입니다."}), 400
    if choice.question_id != question_id: return jsonify({"ok": False, "message": "선택지와 질문이 일치하지 않습니다."}), 400
    if question_id in answered_ids: return jsonify({"ok": False, "message": "이미 답변한 질문입니다."}), 400
    ts.score = (ts.score or 0) + choice.score; answered_ids.add(question_id); ts.answer_count = len(answered_ids)
    ts.answered_question_ids = ",".join(map(str, sorted(answered_ids))); db.session.commit()
    return jsonify({"ok": True, "current_score": ts.score, "answer_count": ts.answer_count})

@app.route("/api/finish", methods=["POST"])
def api_finish():
    data = request.json or {}; session_id = data.get("session_id"); ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    if ts.result:
        return jsonify({"ok": True, "session_id": session_id, "final_score": ts.result.final_score,
                        "result_type": ts.result.result_type, "result_title": ts.result.result_title})
    selected_ids = _parse_ids(ts.selected_question_ids); max_possible = _calc_max_score(selected_ids)
    normalized = min(100, round((ts.score / max_possible) * 100)) if max_possible else 50
    result_type, title, desc = _calc_result(normalized, ts.test_type)
    result = TestResult(session_id=session_id, final_score=normalized, result_type=result_type, result_title=title,
                        result_desc=desc, created_at=datetime.utcnow())
    db.session.add(result); ts.finished_at = datetime.utcnow(); db.session.commit()
    return jsonify({"ok": True, "session_id": session_id, "final_score": normalized, "result_type": result_type, "result_title": title})

@app.route("/api/share", methods=["POST"])
def api_share():
    data = request.json or {}; session_id = data.get("session_id"); ts = get_owned_test_session(session_id)
    if ts is None:
        abort(404)
    return jsonify({"ok": True, "share_url": _issue_share_url(ts)})


@app.route("/healthz")
def health_check():
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception:
        db.session.rollback()
        return jsonify({"ok": False}), 503
    return jsonify({"ok": True})

def _today_score() -> int:
    seed = int(datetime.utcnow().strftime("%Y%m%d")); random.seed(seed); return random.randint(65, 98)

def _parse_ids(raw: str) -> list:
    if not raw: return []
    return [int(x) for x in raw.split(",") if x.strip().isdigit()]

def _weighted_sample(pool: list) -> object:
    expanded = []
    for item in pool: expanded.extend([item] * max(1, item.weight))
    return random.choice(expanded)

def _get_balanced_questions(test_type: str, count: int = 6) -> list:
    all_questions = Question.query.filter_by(test_type=test_type, is_active=True).all()
    if not all_questions: return []
    grouped = defaultdict(list)
    for q in all_questions: grouped[q.category].append(q)
    selected = []; used_ids = set(); category_keys = list(grouped.keys()); random.shuffle(category_keys)
    for cat in category_keys:
        candidates = [q for q in grouped[cat] if q.id not in used_ids]
        if not candidates: continue
        picked = _weighted_sample(candidates); selected.append(picked); used_ids.add(picked.id)
        if len(selected) >= count: break
    if len(selected) < count:
        remaining = [q for q in all_questions if q.id not in used_ids]; random.shuffle(remaining)
        while remaining and len(selected) < count:
            picked = _weighted_sample(remaining); selected.append(picked); used_ids.add(picked.id)
            remaining = [q for q in remaining if q.id not in used_ids]
    random.shuffle(selected); return selected[:count]

def _calc_max_score(question_ids: list) -> int:
    if not question_ids: return 20
    questions = Question.query.filter(Question.id.in_(question_ids)).all()
    total = sum(max((c.score for c in q.choices), default=0) for q in questions)
    return total or 20

def _calc_result(score: int, test_type: str) -> tuple:
    result_copy = {
        "money": {"gold": ("지출 전에 한 번 더 살펴보는 편", "고른 답에서는 결제 전에 한 번 생각하는 모습이 보여요. 오늘은 계획한 지출과 예정에 없던 지출을 나눠 적어보세요."),
                  "silver": ("작은 기준을 잘 챙기는 편", "필요한 것과 원하는 것을 함께 살피는 답이 많았어요. 오늘 쓴 돈 중 기억에 남는 한 건만 기록해보세요."),
                  "bronze": ("상황에 따라 달라지는 편", "바쁘거나 기분이 달라질 때 소비도 달라질 수 있어요. 다음 결제 전에 이번 주 예산을 한 번 확인해보세요."),
                  "caution": ("지출 기준을 세워보는 중", "꼭 필요한 지출과 미룰 수 있는 지출을 나눠보면 선택이 쉬워져요. 다음 구매 전 정해둔 예산을 살펴보세요.")},
        "spending": {"gold": ("계획을 세우고 사는 편", "답변에서 구매 전에 필요와 예산을 함께 보는 모습이 보여요. 이번 주 자주 결제한 항목 하나를 확인해보세요."),
                     "silver": ("필요와 기분을 함께 살피는 편", "필요를 따지면서도 상황에 따라 마음이 움직일 수 있어요. 장바구니에서 하루 더 생각할 물건 하나를 골라보세요."),
                     "bronze": ("상황에 따라 소비가 달라지는 편", "세일이나 약속처럼 예상 밖의 일이 소비에 영향을 줄 수 있어요. 한 주 자유 지출의 기준을 정해보세요."),
                     "caution": ("구매 전 잠깐 멈춰보는 중", "급하게 결제할 때 계획한 예산을 놓치기 쉬워요. 다음 구매 전 10분만 기다렸다가 필요한 이유를 적어보세요.")},
        "future": {"gold": ("목표를 정해 차근차근 준비하는 편", "답변에서 정한 목표를 꾸준히 챙기는 모습이 보여요. 저축 계획이 지금 생활에 무리 없는지 한 번 확인해보세요."),
                   "silver": ("기초를 차곡차곡 쌓는 중", "돈을 모으려는 마음은 있지만 계획이 흐려질 때도 있을 수 있어요. 이번 달 목표와 확인할 날짜를 한 줄로 적어보세요."),
                   "bronze": ("작은 목표부터 정하면 좋아요", "큰 계획보다 이번 달에 이어갈 수 있는 습관부터 정해보세요. 예를 들어 결제일에 잔액을 확인하는 것부터 시작할 수 있어요."),
                   "caution": ("고정 지출부터 살펴보는 중", "답변을 보면 큰 목표보다 매달 나가는 돈을 먼저 살펴보면 좋겠어요. 이번 달 결제일과 통장 잔액을 확인해보세요.")}}
    key = "gold" if score >= 90 else "silver" if score >= 75 else "bronze" if score >= 55 else "caution"
    return (*result_copy.get(test_type, result_copy["money"])[key],) if False else (key, *result_copy.get(test_type, result_copy["money"])[key])

def _result_tags(test_type: str, result_type: str | None) -> list:
    tags_map = {"money": ["오늘 돌아보기", "지출 습관", "가벼운 체크"], "spending": ["소비 습관", "예산 감각", "가벼운 체크"],
                "future": ["돈 관리 습관", "준비 상태", "가벼운 체크"]}
    return list(tags_map.get(test_type, ["머니 체크", "답변 요약", "가벼운 참고"]))

if __name__ == "__main__":
    with app.app_context():
        db.create_all(); print("✅ DB 테이블 생성 완료"); print("⚠️  질문 데이터는 'python seed_db.py' 로 별도 삽입 필요")
    app.run(debug=True, port=5000)
