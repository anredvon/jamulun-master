"""Read-only Flask smoke tests with an isolated in-memory database."""
import os
import unittest

os.environ["SECRET_KEY"] = "ci-test-key"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app
from models import db


class SmokeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config["TESTING"] = True
        with app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        self.client = app.test_client()

    def test_home(self):
        self.assertEqual(self.client.get("/").status_code, 200)

    def test_history_and_tarot(self):
        for path in ("/history", "/tarot"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_invalid_quiz(self):
        response = self.client.post("/api/start", json={"test_type": "unknown"})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
