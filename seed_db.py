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
import re

# app.py 에서 Flask 앱 + db 임포트
from app import app, db
from models import Question, Choice


_ALLOWED_SQL_PREFIXES = (
    "INSERT INTO questions",
    "INSERT INTO choices",
)


def _resolve_and_check_seed_path(sql_path: str) -> Path:
    """
    - 파일 존재 여부/접근 가능 여부 확인
    - seeds/ 디렉터리 내부 파일만 허용 (경로 주입 방지)
    """
    sql_file = Path(sql_path)
    try:
        if not sql_file.exists():
            raise FileNotFoundError(sql_path)
    except OSError as e:
        raise OSError(f"SQL 파일 존재 여부 확인 실패: {sql_path} ({e})") from e

    seeds_dir = (Path(__file__).resolve().parent / "seeds").resolve()
    try:
        resolved = sql_file.resolve()
    except OSError as e:
        raise OSError(f"SQL 파일 경로 확인 실패: {sql_path} ({e})") from e

    if seeds_dir not in resolved.parents and resolved != seeds_dir:
        raise PermissionError("허용되지 않은 경로입니다. seeds/ 디렉터리 내부 파일만 실행 가능합니다.")

    return resolved


def _read_text_utf8(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as e:
        raise UnicodeDecodeError(
            e.encoding, e.object, e.start, e.end, f"SQL 파일 인코딩 오류(utf-8): {path}"
        ) from e
    except OSError as e:
        raise OSError(f"SQL 파일 열기/읽기 실패: {path} ({e})") from e


def _strip_sql_comments(sql: str) -> str:
    # remove -- line comments
    sql = re.sub(r"(?m)^\s*--.*$", "", sql)
    # remove /* ... */ block comments
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    return sql


def _validate_seed_sql(sql: str) -> list[str]:
    """
    seeds SQL은 질문/선택지 INSERT만 허용.
    위험한 DDL/DML(예: DROP/ALTER/PRAGMA/ATTACH 등) 실행을 차단.
    """
    cleaned = _strip_sql_comments(sql)
    parts = [p.strip() for p in cleaned.split(";")]
    statements: list[str] = []

    for stmt in parts:
        if not stmt:
            continue
        s_norm = " ".join(stmt.split())
        s_up = s_norm.upper()
        if not s_up.startswith(_ALLOWED_SQL_PREFIXES):
            raise RuntimeError(f"Refusing to execute non-INSERT statement: {s_norm[:80]}...")
        statements.append(stmt)

    if not statements:
        raise RuntimeError("SQL file contained no executable INSERT statements.")
    return statements


# ──────────────────────────────────────────
#  SQL 파일 기반 시드 (기본 방식)
# ──────────────────────────────────────────
def seed_from_sql(sql_path: str = "seeds/02_questions_100_seed.sql", reset: bool = False):
    """
    SQL 파일을 읽어 DB에 직접 실행.
    SQLite 에서는 executescript() 사용.
    MySQL 사용 시 아래 TODO 참고.
    """
    try:
        resolved = _resolve_and_check_seed_path(sql_path)
    except FileNotFoundError:
        print(f"❌ SQL 파일을 찾을 수 없습니다: {sql_path}")
        return
    except PermissionError as e:
        print(f"❌ {e}")
        return
    except OSError as e:
        print(f"❌ {e}")
        return

    try:
        sql = _read_text_utf8(resolved)
    except Exception as e:
        print(f"❌ {e}")
        return

    with app.app_context():
        try:
            db.create_all()

            if reset:
                print("🗑️  기존 데이터 삭제 중...")
                db.session.execute(db.text("DELETE FROM choices"))
                db.session.execute(db.text("DELETE FROM questions"))
                db.session.commit()
                print("   ✅ 삭제 완료")

            statements = _validate_seed_sql(sql)

            # DB 엔진에 상관없이 statement 단위 실행 (DDL/DML 화이트리스트 검증 후)
            with db.engine.begin() as conn:
                for stmt in statements:
                    conn.execute(db.text(stmt))

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
        except Exception as e:
            db.session.rollback()
            print("❌ 시드 작업 중 오류가 발생했습니다.")
            print(f"   {e}")
            return
        finally:
            try:
                db.session.remove()
            except Exception:
                pass


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
