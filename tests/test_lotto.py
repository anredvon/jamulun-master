"""Lotto feature API and schedule regression tests.

Run from repository root:
    python -m unittest discover -s tests -p 'test_lotto.py' -v
Requires installed application dependencies; uses a temporary isolated SQLite DB.
"""
import os
import secrets
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

from flask import Flask
from sqlalchemy import create_engine, text

_TEST_DIR = tempfile.TemporaryDirectory(prefix="moneyflow-lotto-")
os.environ["DATABASE_URL"] = "sqlite:///" + str(Path(_TEST_DIR.name) / "lotto.sqlite3")
os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)

from app import app  # noqa: E402
from models import db  # noqa: E402
from lotto_service import current_draw, generate_numbers  # noqa: E402

BASE_URL = "https://localhost"


class LottoServiceTest(unittest.TestCase):
    def test_six_distinct_numbers_in_range(self):
        for _ in range(100):
            numbers = generate_numbers()
            self.assertEqual(len(numbers), 6)
            self.assertEqual(len(set(numbers)), 6)
            self.assertEqual(numbers, sorted(numbers))
            self.assertTrue(all(1 <= n <= 45 for n in numbers))

    def test_weekly_round_and_cutoff(self):
        tz = ZoneInfo("Asia/Seoul")
        self.assertEqual(current_draw(datetime(2026, 11, 2, 15, 0, tzinfo=tz)),
                         (1249, datetime(2026, 11, 7, tzinfo=tz).date()))
        self.assertEqual(current_draw(datetime(2026, 11, 7, 19, 59, tzinfo=tz))[0], 1249)
        self.assertEqual(current_draw(datetime(2026, 11, 7, 20, 0, tzinfo=tz))[0], 1250)

    def test_utc_timestamp_uses_kst_sales_cutoff(self):
        before_cutoff = datetime(2026, 11, 7, 10, 59, tzinfo=timezone.utc)
        at_cutoff = datetime(2026, 11, 7, 11, 0, tzinfo=timezone.utc)
        self.assertEqual(current_draw(before_cutoff)[0], 1249)
        self.assertEqual(current_draw(at_cutoff),
                         (1250, datetime(2026, 11, 14, tzinfo=ZoneInfo("Asia/Seoul")).date()))

    def test_reject_naive_datetime(self):
        with self.assertRaises(ValueError):
            current_draw(datetime(2026, 11, 2))


class LottoApiTest(unittest.TestCase):
    def setUp(self):
        app.config.update(TESTING=True)
        self.ctx = app.app_context()
        self.ctx.push()
        db.create_all()
        self.client = app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def get(self, url):
        return self.client.get(url, base_url=BASE_URL)

    def post(self, url, payload):
        return self.client.post(url, json=payload, base_url=BASE_URL)

    def test_page_and_status(self):
        page = self.get("/lotto")
        self.assertEqual(page.status_code, 200)
        self.assertIn("이번 주 로또번호", page.get_data(as_text=True))
        status = self.get("/api/lotto/status").get_json()
        self.assertTrue(status["ok"])
        self.assertEqual(status["remaining"], 3)
        self.assertEqual(status["draws"], [])

    def test_three_draws_and_fourth_rejected(self):
        self.get("/api/lotto/status")
        draws = []
        for seq in range(1, 4):
            response = self.post("/api/lotto/draw", {"idempotency_key": str(uuid4())})
            self.assertEqual(response.status_code, 200)
            draw = response.get_json()
            self.assertEqual(draw["sequence"], seq)
            self.assertEqual(draw["remaining"], 3-seq)
            self.assertEqual(len(set(draw["numbers"])), 6)
            draws.append(tuple(draw["numbers"]))
        self.assertEqual(len(set(draws)), 3)
        fourth = self.post("/api/lotto/draw", {"idempotency_key": str(uuid4())})
        self.assertEqual(fourth.status_code, 409)
        self.assertEqual(fourth.get_json()["code"], "LIMIT_REACHED")
        self.assertEqual(len(self.get("/api/lotto/status").get_json()["draws"]), 3)

    def test_concurrent_draws_never_exceed_three_slots_for_one_owner(self):
        from lotto_routes import lotto_bp

        concurrent_app = Flask("lotto_concurrency_test")
        database_path = Path(_TEST_DIR.name) / "lotto-concurrency.sqlite3"
        concurrent_app.config.update(
            TESTING=True,
            SECRET_KEY=os.environ["SECRET_KEY"],
            SESSION_COOKIE_NAME="jaemulun_session",
            SQLALCHEMY_DATABASE_URI="sqlite:///" + str(database_path),
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
        db.init_app(concurrent_app)
        concurrent_app.register_blueprint(lotto_bp)
        with concurrent_app.app_context():
            db.create_all()

        clients = [concurrent_app.test_client() for _ in range(8)]
        clients[0].get("/api/lotto/status", base_url=BASE_URL)
        owner_cookie = clients[0].get_cookie("jaemulun_session", domain="localhost")
        self.assertIsNotNone(owner_cookie)
        for client in clients[1:]:
            client.set_cookie("jaemulun_session", owner_cookie.value, domain="localhost")
        barrier = threading.Barrier(len(clients))

        def draw_concurrently(index):
            barrier.wait(timeout=5)
            return clients[index].post(
                "/api/lotto/draw",
                json={"idempotency_key": str(uuid4())},
                base_url=BASE_URL,
            )

        with ThreadPoolExecutor(max_workers=len(clients)) as executor:
            responses = list(executor.map(draw_concurrently, range(len(clients))))

        self.assertTrue(all(response.status_code in (200, 409, 503) for response in responses))
        accepted = [response.get_json() for response in responses if response.status_code == 200]
        self.assertLessEqual(len(accepted), 3)
        self.assertEqual(len({row["sequence"] for row in accepted}), len(accepted))
        stored = clients[0].get("/api/lotto/status", base_url=BASE_URL).get_json()["draws"]
        self.assertLessEqual(len(stored), 3)
        self.assertEqual(len({row["sequence"] for row in stored}), len(stored))

        with concurrent_app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def test_idempotent_replay_does_not_consume_extra_slot(self):
        key = str(uuid4())
        first = self.post("/api/lotto/draw", {"idempotency_key": key}).get_json()
        second = self.post("/api/lotto/draw", {"idempotency_key": key}).get_json()
        self.assertEqual(first["result_id"], second["result_id"])
        self.assertEqual(first["numbers"], second["numbers"])
        self.assertTrue(second["replayed"])
        self.assertEqual(self.get("/api/lotto/status").get_json()["remaining"], 2)

    def test_shared_result_and_other_visitor_privacy(self):
        first = self.post("/api/lotto/draw", {"idempotency_key": str(uuid4())}).get_json()
        shared = self.post("/api/lotto/share", {"result_id": first["result_id"]})
        self.assertEqual(shared.status_code, 200)
        shared_page = self.get(shared.get_json()["url"])
        self.assertEqual(shared_page.status_code, 200)
        self.assertIn("공유받은 로또번호", shared_page.get_data(as_text=True))
        outsider = app.test_client()
        response = outsider.post("/api/lotto/share", json={"result_id": first["result_id"]},
                                 base_url=BASE_URL)
        self.assertEqual(response.status_code, 404)

    def test_invalid_request_key_and_media_type(self):
        self.assertEqual(self.post("/api/lotto/draw", {"idempotency_key": "bad"}).status_code, 400)
        no_json = self.client.post("/api/lotto/draw", data="{}", base_url=BASE_URL)
        self.assertEqual(no_json.status_code, 415)


class LottoMigrationTest(unittest.TestCase):
    def test_additive_migration_preserves_existing_table_and_rows(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE existing_records (id INTEGER PRIMARY KEY, value TEXT NOT NULL)"))
            connection.execute(text("INSERT INTO existing_records (id, value) VALUES (1, 'keep-me')"))

        from scripts.migrate_lotto import ensure_lotto_table
        ensure_lotto_table(engine)

        with engine.connect() as connection:
            tables = set(connection.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).scalars())
            value = connection.execute(text("SELECT value FROM existing_records WHERE id = 1")).scalar_one()
        engine.dispose()

        self.assertIn("existing_records", tables)
        self.assertIn("lotto_draws", tables)
        self.assertEqual(value, "keep-me")


if __name__ == "__main__":
    unittest.main()
