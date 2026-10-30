"""Read-only Flask smoke tests with an isolated in-memory database."""
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

os.environ["SECRET_KEY"] = "ci-test-secret-key-0123456789abcdef0123456789abcdef"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app
from models import db


class SmokeTest(unittest.TestCase):
    def run_secret_validator(self, secret):
        validator = Path(__file__).resolve().parents[1] / "scripts" / "validate_secret.py"
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env"
            env_file.write_text(f"SECRET_KEY={secret}\n")
            return subprocess.run(
                [sys.executable, str(validator), str(env_file)],
                cwd=Path(__file__).resolve().parents[1],
                capture_output=True,
                text=True,
                check=False,
            )

    def test_deploy_secret_validator_rejects_legacy_key_without_printing_it(self):
        secret = "dev-secret-change-in-prod"
        result = self.run_secret_validator(secret)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("rotate SECRET_KEY", result.stderr)
        self.assertNotIn(secret, result.stdout + result.stderr)

    def test_deploy_secret_validator_accepts_random_key_without_printing_it(self):
        secret = "test-only-random-key-0123456789abcdef"
        result = self.run_secret_validator(secret)

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(secret, result.stdout + result.stderr)

    def test_pythonanywhere_helper_stops_on_existing_weak_secret(self):
        repo_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "scripts").mkdir()
            (root / "shims").mkdir()
            for relative in ("deploy.sh", "requirements.txt", "secret_policy.py", "scripts/validate_secret.py"):
                source = repo_root / relative
                (root / relative).write_bytes(source.read_bytes())
            (root / ".env").write_text("SECRET_KEY=dev-secret-change-in-prod\n")
            pip_shim = root / "shims" / "pip"
            pip_shim.write_text("#!/bin/sh\nexit 0\n")
            python_shim = root / "shims" / "python3"
            python_shim.write_text(
                "#!/bin/sh\nexec /private/tmp/jamulun-free-report-venv312/bin/python \"$@\"\n"
            )
            pip_shim.chmod(0o755)
            python_shim.chmod(0o755)

            result = subprocess.run(
                ["bash", str(root / "deploy.sh"), "test-user"],
                cwd=root,
                env={"PATH": f"{root / 'shims'}:{os.environ.get('PATH', '')}"},
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("rotate SECRET_KEY", result.stderr)
        self.assertNotIn("배포 준비 완료", result.stdout)
        self.assertNotIn("dev-secret-change-in-prod", result.stdout + result.stderr)

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
