"""Explicit, additive migration for the Lotto table.

First back up the production database; then, from repository root:
    python -m scripts.migrate_lotto
This creates ONLY lotto_draws if it does not already exist. It never drops data.
"""
from app import app
from lotto_models import LottoDraw
from models import db


def main():
    with app.app_context():
        LottoDraw.__table__.create(bind=db.engine, checkfirst=True)
        print("OK: lotto_draws table ready (existing data preserved)")


if __name__ == "__main__":
    main()
