# ============================================================
#  seed_db.py — 질문 데이터 시드 스크립트
#
#  사용법:
#    python seed_db.py                  ← SQL 파일에서 시드 (기본)
#    python seed_db.py --reset          ← 기존 데이터 초기화 후 재시드
#    python seed_db.py --check          ← 현재 DB 질문 수 확인만
#
#  시드 데이터 파일:
#    seeds/02_questions_100_seed.sql   ← 질문 100개 + 선택지 400개
#
#  질문 추가 방법:
#    1. seeds/02_questions_100_seed.sql 파일 끝에 INSERT 문 추가
#    2. python seed_db.py --reset 실행
#    또는
#    1. seeds/03_questions_100_seed.csv 수정 후 CSV 방식 사용 가능
# ============================================================

import sys
import os
from pathlib import Path

# app.py 에서 Flask 앱 + db 임포트
from app import app, db
from models import Question, Choice


# ──────────────────────────────────────────
#  SQL 파일 기반 시드 (기본 방식)
# ──────────────────────────────────────────
def seed_from_sql(sql_path: str = "seeds/02_questions_100_seed.sql", reset: bool = False):
    """
    SQL 파일을 읽어 DB에 직접 실행.
    SQLite 에서는 executescript() 사용.
    MySQL 사용 시 아래 TODO 참고.
    """
    sql_file = Path(sql_path)
    if not sql_file.exists():
        print(f"❌ SQL 파일을 찾을 수 없습니다: {sql_path}")
        return

    sql = sql_file.read_text(encoding="utf-8")

    with app.app_context():
        db.create_all()

        if reset:
            print("🗑️  기존 데이터 삭제 중...")
            db.session.execute(db.text("DELETE FROM choices"))
            db.session.execute(db.text("DELETE FROM questions"))
            db.session.commit()
            print("   ✅ 삭제 완료")

        # SQLite 전용: executescript 는 자동 커밋
        conn = db.engine.raw_connection()
        try:
            conn.executescript(sql)
            conn.commit()
        finally:
            conn.close()

        # TODO: MySQL 사용 시 아래 방식으로 교체
        # with db.engine.connect() as conn:
        #     for statement in sql.split(";"):
        #         stmt = statement.strip()
        #         if stmt:
        #             conn.execute(db.text(stmt))
        #     conn.commit()

        q_count = Question.query.count()
        c_count = Choice.query.count()
        print(f"✅ 시드 완료: 질문 {q_count}개, 선택지 {c_count}개")
        _print_summary()


# ──────────────────────────────────────────
#  현황 출력
# ──────────────────────────────────────────
def check_db():
    """현재 DB에 있는 질문 수를 test_type/category 별로 출력."""
    with app.app_context():
        total = Question.query.count()
        print(f"\n📊 DB 질문 현황 (총 {total}개)")
        print("-" * 40)
        _print_summary()


def _print_summary():
    """test_type 별 질문 수 출력 (내부용)."""
    for ttype in ["money", "spending", "future"]:
        count = Question.query.filter_by(test_type=ttype, is_active=True).count()
        inactive = Question.query.filter_by(test_type=ttype, is_active=False).count()
        print(f"  {ttype:12s}: 활성 {count}개  /  비활성 {inactive}개")

        # 카테고리별 세부 출력
        from sqlalchemy import func
        rows = (
            db.session.query(Question.category, func.count(Question.id))
            .filter_by(test_type=ttype, is_active=True)
            .group_by(Question.category)
            .all()
        )
        for cat, cnt in sorted(rows):
            print(f"    └ {cat}: {cnt}개")
    print()


# ──────────────────────────────────────────
#  CLI 진입점
# ──────────────────────────────────────────
if __name__ == "__main__":
    args = sys.argv[1:]

    if "--check" in args:
        check_db()
    elif "--reset" in args:
        print("⚠️  기존 데이터를 모두 삭제하고 재시드합니다.")
        seed_from_sql(reset=True)
    else:
        # 이미 질문이 있으면 건너뜀 (안전 모드)
        with app.app_context():
            db.create_all()
            existing = Question.query.count()
        if existing > 0:
            print(f"ℹ️  이미 질문 {existing}개가 있습니다. --reset 옵션으로 재시드하세요.")
        else:
            seed_from_sql(reset=False)
