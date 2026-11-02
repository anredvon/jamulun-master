"""Lotto feature API and schedule regression tests.

Run from repository root:
    python -m unittest discover -s tests -p 'test_lotto.py' -v
Requires installed application dependencies; uses a temporary isolated SQLite DB.
"""
import os
import secrets
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from uuid import uuid4
from zoneinfo import ZoneInfo

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


if __name__ == "__main__":
    unittest.main()
