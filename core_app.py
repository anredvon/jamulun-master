# ============================================================
#  app.py — Flask 메인 애플리케이션
# ============================================================
from flask import Flask, render_template, request, jsonify, redirect, flash, url_for
from models import db, Question, Choice, TestSession, TestResult
from datetime import datetime
from collections import defaultdict
import random
import json
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///jaemulun.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

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

@app.route("/intro/<test_type>")
def intro_page(test_type):
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))
    test_label = TEST_TYPE_LABELS.get(test_type, test_type)
    intro_map = {
        "spending": {
            "badge": "소비 패턴 분석", "heading_before": "나의 소비 습관을", "heading_highlight": "유형으로 확인",
            "desc": "평소 소비 패턴을 기준으로 계획형인지, 즉흥형인지 가볍게 확인합니다.",
            "bullets": ["일상적인 소비 습관을 기준으로 성향을 분석합니다.", "답변 흐름은 가볍지만 결과 문구는 신뢰감 있게 구성합니다.", "퀴즈 UI는 공통으로 사용되며 제목과 결과 메시지만 다르게 적용합니다."]},
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
                           intro_heading_highlight=data["heading_highlight"], intro_desc=data["desc"], intro_bullets=data["bullets"])

@app.route("/test/<test_type>")
def test_page(test_type):
    if test_type not in VALID_TEST_TYPES:
        return redirect(url_for("home_page"))
    return render_template("test.html", test_type=test_type, test_label=TEST_TYPE_LABELS.get(test_type, test_type))

@app.route("/result/<int:session_id>")
def result_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()
    result_heading = TEST_TYPE_LABELS.get(ts.test_type, "체크 결과")
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    return render_template("result.html", ts=ts, result=result, result_heading=result_heading,
                           result_tags=result_tags, test_type=ts.test_type, test_label=test_label)

@app.route("/insight/<int:session_id>")
def insight_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    if not ts.unlocked:
        return redirect(url_for("result_page", session_id=session_id))
    result = TestResult.query.filter_by(session_id=session_id).first()
    return render_template("insight.html", ts=ts, result=result)

@app.route("/share/<int:session_id>")
def share_page(session_id):
    ts = TestSession.query.get_or_404(session_id)
    result = TestResult.query.filter_by(session_id=session_id).first()
    test_label = TEST_TYPE_LABELS.get(ts.test_type, ts.test_type)
    result_tags = _result_tags(ts.test_type, result.result_type if result else None)
    share_data = {"score": result.final_score if result else 0, "delta_text": "이번 주 +4점", "rank": 28, "tags": result_tags}
    return render_template("share.html", ts=ts, result=share_data, test_type=ts.test_type, test_label=test_label)

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
    ts = TestSession(test_type=test_type, selected_question_ids=",".join(map(str, selected_ids)), answered_question_ids="",
                     meta_json=json.dumps({"question_count": len(selected_ids), "version": "pool-v1"}, ensure_ascii=False),
                     started_at=datetime.utcnow())
    db.session.add(ts); db.session.commit()
    return jsonify({"ok": True, "session_id": ts.id, "test_type": test_type, "questions": [q.to_dict() for q in selected_questions]})

@app.route("/api/answer", methods=["POST"])
def api_answer():
    data = request.json or {}; session_id = data.get("session_id"); question_id = data.get("question_id"); choice_id = data.get("choice_id")
    ts = TestSession.query.get_or_404(session_id); choice = Choice.query.get_or_404(choice_id)
    selected_ids = _parse_ids(ts.selected_question_ids); answered_ids = set(_parse_ids(ts.answered_question_ids))
    if question_id not in selected_ids: return jsonify({"ok": False, "message": "이 세션에 포함되지 않은 질문입니다."}), 400
    if choice.question_id != question_id: return jsonify({"ok": False, "message": "선택지와 질문이 일치하지 않습니다."}), 400
    if question_id in answered_ids: return jsonify({"ok": False, "message": "이미 답변한 질문입니다."}), 400
    ts.score = (ts.score or 0) + choice.score; answered_ids.add(question_id); ts.answer_count = len(answered_ids)
    ts.answered_question_ids = ",".join(map(str, sorted(answered_ids))); db.session.commit()
    return jsonify({"ok": True, "current_score": ts.score, "answer_count": ts.answer_count})

@app.route("/api/finish", methods=["POST"])
def api_finish():
    data = request.json or {}; session_id = data.get("session_id"); ts = TestSession.query.get_or_404(session_id)
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

@app.route("/api/unlock", methods=["POST"])
def api_unlock():
    data = request.json or {}; session_id = data.get("session_id"); ts = TestSession.query.get_or_404(session_id)
    ts.unlocked = True; db.session.commit(); return jsonify({"ok": True, "redirect": f"/insight/{session_id}"})

@app.route("/api/share", methods=["POST"])
def api_share():
    data = request.json or {}; session_id = data.get("session_id"); ts = TestSession.query.get_or_404(session_id)
    ts.share_count = (ts.share_count or 0) + 1; db.session.commit(); return jsonify({"ok": True})

@app.route("/api/stats")
def api_stats():
    total = TestSession.query.count(); finished = TestSession.query.filter(TestSession.finished_at.isnot(None)).count()
    unlocked = TestSession.query.filter_by(unlocked=True).count(); avg_score = db.session.query(db.func.avg(TestResult.final_score)).scalar() or 0
    return jsonify({"total_sessions": total, "finished": finished, "unlocked": unlocked,
                    "conversion_rate": round(unlocked / finished * 100, 1) if finished else 0, "avg_score": round(float(avg_score), 1)})

@app.route("/payment/success")
def payment_success():
    session_id = request.args.get("session")
    if session_id:
        ts = TestSession.query.get(int(session_id))
        if ts:
            ts.unlocked = True; db.session.commit(); flash("결제가 완료되었습니다! AI 리포트를 확인하세요.", "success")
            return redirect(url_for("insight_page", session_id=session_id))
    return redirect(url_for("home_page"))

@app.route("/payment/fail")
def payment_fail():
    session_id = request.args.get("session"); flash("결제가 취소되었습니다.", "error")
    return redirect(url_for("result_page", session_id=session_id) if session_id else url_for("home_page"))

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
        "money": {"gold": ("황금빛 돈 자석", "오늘 재물 에너지가 최고조입니다. 작은 기회도 놓치지 말고 적극적으로 행동해보세요."),
                  "silver": ("은빛 재물의 흐름", "안정적인 돈 감각이 살아 있는 날입니다. 작은 절약과 현명한 지출이 성과로 이어집니다."),
                  "bronze": ("균형 잡힌 지갑 감각", "무리하지 않으면 무난한 하루입니다. 충동 지출만 조심하면 안정적인 흐름을 유지할 수 있어요."),
                  "caution": ("지출 점검 모드", "오늘은 큰 지출을 미루고 계획적인 소비를 실천하는 것이 유리합니다.")},
        "spending": {"gold": ("계획형 소비 마스터", "필요와 욕구를 잘 구분하는 편입니다. 이런 패턴이 장기적으로 자산 형성에 큰 도움이 됩니다."),
                     "silver": ("안정형 소비 컨트롤러", "대체로 좋은 소비 습관을 유지하고 있습니다. 지출 기록을 더 자주 확인하면 더욱 좋아집니다."),
                     "bronze": ("감정과 계획 사이", "상황에 따라 소비가 흔들릴 수 있습니다. 월 예산선을 정하는 것만으로도 개선 폭이 큽니다."),
                     "caution": ("충동 지출 주의형", "세일·기분·분위기의 영향을 받기 쉬운 편입니다. 구매 전 10분 멈춤 습관이 효과적입니다.")},
        "future": {"gold": ("장기 자산 설계형", "목표와 습관이 잘 연결된 유형입니다. 꾸준히 쌓으면 복리 효과를 극대화할 수 있습니다."),
                   "silver": ("성장형 자산 준비자", "기초 체력이 좋은 편입니다. 수입 확장이나 투자 공부를 더하면 빠른 속도로 성장합니다."),
                   "bronze": ("가능성 축적형", "방향은 맞지만 루틴 고정이 필요합니다. 목표 금액과 기간을 글로 적어두면 성과가 빨라집니다."),
                   "caution": ("기초 체력 보강형", "지금은 큰 수익보다 현금 흐름과 비상금 관리부터 다지는 것이 가장 중요합니다.")}}
    key = "gold" if score >= 90 else "silver" if score >= 75 else "bronze" if score >= 55 else "caution"
    return (*result_copy.get(test_type, result_copy["money"])[key],) if False else (key, *result_copy.get(test_type, result_copy["money"])[key])

def _result_tags(test_type: str, result_type: str | None) -> list:
    tags_map = {"money": ["오늘 운세", "지출 관리", "리스크 점검"], "spending": ["소비 패턴", "예산 감각", "유형 분석"],
                "future": ["재물 체크", "현재 흐름", "즉시 확인"]}
    tags = list(tags_map.get(test_type, ["재물운", "테스트 결과", "흐름 확인"]))
    if result_type == "gold": tags[0] = "상위 흐름"
    elif result_type == "caution": tags[-1] = "주의 필요"
    return tags

if __name__ == "__main__":
    with app.app_context():
        db.create_all(); print("✅ DB 테이블 생성 완료"); print("⚠️  질문 데이터는 'python seed_db.py' 로 별도 삽입 필요")
    app.run(debug=True, port=5000)
