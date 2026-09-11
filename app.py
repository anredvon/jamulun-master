"""Flask application composition root.

The legacy quiz application stays in core_app.py. Feature modules such as Tarot are
registered here so every entrypoint importing ``app`` receives the same routes.
"""

from core_app import app, db
from tarot_integration import register_tarot

register_tarot(app)

__all__ = ["app", "db"]


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("✅ DB 테이블 생성 완료")
        print("⚠️  질문 데이터는 'python seed_db.py' 로 별도 삽입 필요")
    app.run(debug=True, port=5000)
