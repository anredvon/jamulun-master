# ============================================================
#  models.py — 데이터베이스 모델 정의
#
#  테이블 4개:
#    1. questions     — 질문풀 (100개 이상 저장)
#    2. choices       — 각 질문의 선택지
#    3. test_sessions — 사용자 1회 테스트 세션
#    4. test_results  — 세션 완료 후 계산된 결과
#
#  DB는 .env 의 DATABASE_URL 로 결정
#    SQLite  → sqlite:///jaemulun.db         (로컬 개발)
#    MySQL   → mysql+pymysql://...           (PythonAnywhere 운영)
# ============================================================

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


# ──────────────────────────────────────────────────────────────
#  1. Question — 질문 테이블
#
#  test_type + is_active=True 인 질문 중에서
#  category 기준으로 균형 있게 랜덤 출제함
# ──────────────────────────────────────────────────────────────
class Question(db.Model):
    __tablename__ = "questions"

    id               = db.Column(db.Integer, primary_key=True)

    test_type        = db.Column(db.String(20), nullable=False, index=True)
    # 값: "money" | "spending" | "future"

    category         = db.Column(db.String(30), nullable=False, default="general", index=True)
    # money 예시:    daily / luck / money_habit
    # spending 예시: impulse / budget / saving / comparison
    # future 예시:   goal / investment / pension / side_income

    emoji            = db.Column(db.String(10), default="💰")
    question_text    = db.Column(db.Text, nullable=False)    # 질문 본문
    question_subtext = db.Column(db.Text, default="")        # 보조 설명

    is_active        = db.Column(db.Boolean, default=True, nullable=False, index=True)
    # False 로 설정하면 출제 대상에서 제외됨 (삭제 없이 비활성화 가능)

    weight           = db.Column(db.Integer, default=1, nullable=False)
    # 1~5 권장. 높을수록 랜덤 출제 시 뽑힐 확률 증가

    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    # 이 질문에 속한 선택지 목록 (choice_order 순 정렬)
    choices = db.relationship(
        "Choice",
        backref="question",
        lazy=True,
        order_by="Choice.choice_order",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        """API 응답용 직렬화. JS 렌더링에서 사용."""
        return {
            "id":       self.id,
            "test_type": self.test_type,
            "category": self.category,
            "emoji":    self.emoji,
            "text":     self.question_text,
            "sub":      self.question_subtext,
            "choices":  [c.to_dict() for c in self.choices],
        }


# ──────────────────────────────────────────────────────────────
#  2. Choice — 선택지 테이블
#
#  각 질문당 4개 권장. score 값이 채점에 사용됨
#  score는 to_dict()에서 의도적으로 제외 → 클라이언트 조작 방지
# ──────────────────────────────────────────────────────────────
class Choice(db.Model):
    __tablename__ = "choices"

    id           = db.Column(db.Integer, primary_key=True)
    question_id  = db.Column(
        db.Integer, db.ForeignKey("questions.id"), nullable=False, index=True
    )
    choice_text  = db.Column(db.String(255), nullable=False)   # 선택지 표시 텍스트
    score        = db.Column(db.Integer, default=0, nullable=False)
    # 점수 범위: 0~10 권장 (최고=10, 최저=1~2)
    # 서버에서만 집계. 클라이언트에는 노출 안 함

    choice_order = db.Column(db.Integer, default=1, nullable=False)
    # 1부터 시작. 표시 순서 결정

    def to_dict(self):
        """score는 보안상 클라이언트에 전달하지 않음."""
        return {
            "id":    self.id,
            "text":  self.choice_text,
            "order": self.choice_order,
        }


# ──────────────────────────────────────────────────────────────
#  3. TestSession — 테스트 세션 테이블
#
#  사용자가 "테스트 시작" 누르면 1개 세션 생성됨
#  selected_question_ids: 이 세션에 고정된 질문 ID 목록
#  unlocked: 광고 시청 or 결제 완료 → insight 접근 가능
# ──────────────────────────────────────────────────────────────
class TestSession(db.Model):
    __tablename__ = "test_sessions"

    id       = db.Column(db.Integer, primary_key=True)
    test_type = db.Column(db.String(20), nullable=False)

    selected_question_ids = db.Column(db.Text, default="")
    # 예: "3,15,22,47,61,88"  — 쉼표 구분 문자열로 저장
    # 세션 생성 시 확정되어 고정됨. 이후 변경 없음

    answered_question_ids = db.Column(db.Text, default="")
    # 예: "3,15,22"  — 이미 답변 완료한 질문 ID (중복 방지)

    meta_json = db.Column(db.Text, default="{}")
    # 확장용 JSON 필드
    # 현재: {"version": "random-pool-v1", "question_count": 6}
    # TODO: 광고 시청 횟수, 결제 시도 이력, A/B 테스트 그룹 등 확장 가능

    score        = db.Column(db.Integer, default=0, nullable=False)
    # 답변 누적 raw 점수 (정규화 전)

    answer_count = db.Column(db.Integer, default=0, nullable=False)
    # 답변한 질문 수

    unlocked     = db.Column(db.Boolean, default=False, nullable=False)
    # True: 광고 시청 or 결제 완료 → /insight/<id> 접근 허용
    # TODO: 결제 검증 로직 연동 시 이 값 업데이트

    share_count  = db.Column(db.Integer, default=0, nullable=False)
    # 공유 버튼 누른 횟수 (카카오/링크복사 등 합산)

    started_at   = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at  = db.Column(db.DateTime, nullable=True)
    # finished_at 이 있으면 완료된 세션

    # 관계: 세션 1개 = 결과 1개
    result = db.relationship(
        "TestResult",
        backref="session",
        uselist=False,
        lazy=True,
    )


# ──────────────────────────────────────────────────────────────
#  4. TestResult — 결과 테이블
#
#  /api/finish 호출 시 생성됨
#  final_score: 0~100 정규화 점수
#  result_type: gold | silver | bronze | caution
# ──────────────────────────────────────────────────────────────
class TestResult(db.Model):
    __tablename__ = "test_results"

    id           = db.Column(db.Integer, primary_key=True)
    session_id   = db.Column(
        db.Integer, db.ForeignKey("test_sessions.id"), nullable=False, unique=True
    )

    final_score  = db.Column(db.Integer, nullable=False)
    # 0~100 정규화. 계산식: (raw_score / max_possible_score) * 100

    result_type  = db.Column(db.String(20))
    # "gold"=90이상 / "silver"=75이상 / "bronze"=55이상 / "caution"=55미만

    result_title = db.Column(db.String(100))  # 결과 유형 제목
    result_desc  = db.Column(db.Text)         # 결과 설명 문구
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "final_score":  self.final_score,
            "result_type":  self.result_type,
            "result_title": self.result_title,
            "result_desc":  self.result_desc,
        }
