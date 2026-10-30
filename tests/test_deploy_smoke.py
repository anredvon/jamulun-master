"""Read-only Flask smoke tests with an isolated in-memory database."""
import os
import re
import subprocess
import sys
import unittest
from pathlib import Path

os.environ["SECRET_KEY"] = "ci-test-secret-key-0123456789abcdef0123456789abcdef"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app
from models import db


class SmokeTest(unittest.TestCase):
    def test_deploy_smoke_import_uses_a_secret_the_app_accepts(self):
        script = (Path(__file__).resolve().parents[1] / "scripts" / "deploy_lightsail.sh").read_text()
        match = re.search(r"SECRET_KEY=([^\s]+)\s+DATABASE_URL=sqlite:///:memory:", script)
        self.assertIsNotNone(match, "deployment smoke check must define its isolated environment")
        result = subprocess.run(
            [sys.executable, "-c", "from app import app; assert app.url_map"],
            cwd=Path(__file__).resolve().parents[1],
            env={
                **os.environ,
                "SECRET_KEY": match.group(1),
                "DATABASE_URL": "sqlite:///:memory:",
            },
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

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
