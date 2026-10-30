"""Tests for browser-owned anonymous test sessions."""

import unittest
import sqlite3
import subprocess
import sys
import tempfile
import os
from datetime import timedelta
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit

os.environ["SECRET_KEY"] = "session-ownership-test-secret-0123456789abcdef"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app, db
from models import Choice, Question, TestResult, TestSession

REPO_ROOT = Path(__file__).resolve().parents[1]
MIGRATION = REPO_ROOT / "scripts" / "migrate_session_ownership.py"


class SessionOwnershipModelTest(unittest.TestCase):
    def test_owner_token_hash_is_nullable_64_character_digest(self):
        self.assertIn("owner_token_hash", TestSession.__table__.columns.keys())
        column = TestSession.__table__.c.owner_token_hash

        self.assertTrue(column.nullable)
        self.assertEqual(column.type.length, 64)


class SessionOwnershipMigrationTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.database = Path(self.temp_dir.name) / "legacy.sqlite3"
        with sqlite3.connect(self.database) as conn:
            conn.execute(
                "CREATE TABLE test_sessions "
                "(id INTEGER PRIMARY KEY, test_type TEXT NOT NULL, "
                "unlocked BOOLEAN NOT NULL DEFAULT 0)"
            )
            conn.execute(
                "INSERT INTO test_sessions (id, test_type, unlocked) "
                "VALUES (7, 'money', 1)"
            )

    def tearDown(self):
        self.temp_dir.cleanup()

    def run_migration(self, database=None):
        return subprocess.run(
            [sys.executable, str(MIGRATION), "--database", str(database or self.database)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_upgrade_adds_nullable_column_and_preserves_existing_row(self):
        result = self.run_migration()

        self.assertEqual(result.returncode, 0, result.stderr)
        with sqlite3.connect(self.database) as conn:
            columns = {row[1]: row for row in conn.execute("PRAGMA table_info(test_sessions)")}
            self.assertIn("owner_token_hash", columns)
            self.assertEqual(columns["owner_token_hash"][3], 0)
            self.assertEqual(columns["owner_token_hash"][2].upper(), "VARCHAR(64)")
            self.assertEqual(
                conn.execute("SELECT id, test_type, unlocked FROM test_sessions WHERE id=7").fetchone(),
                (7, "money", 1),
            )
            self.assertEqual(
                conn.execute("SELECT owner_token_hash FROM test_sessions WHERE id=7").fetchone(),
                (None,),
            )

    def test_upgrade_is_idempotent(self):
        first = self.run_migration()
        second = self.run_migration()

        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(second.returncode, 0, second.stderr)
        with sqlite3.connect(self.database) as conn:
            self.assertEqual(
                sum(row[1] == "owner_token_hash" for row in conn.execute("PRAGMA table_info(test_sessions)")),
                1,
            )

    def test_missing_table_fails_without_creating_schema(self):
        empty_database = Path(self.temp_dir.name) / "empty.sqlite3"
        sqlite3.connect(empty_database).close()

        result = self.run_migration(empty_database)

        self.assertNotEqual(result.returncode, 0)
        with sqlite3.connect(empty_database) as conn:
            self.assertEqual(
                conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall(),
                [],
            )

    def test_failed_migration_rolls_back_open_transaction(self):
        from scripts import migrate_session_ownership

        self.assertTrue(hasattr(migrate_session_ownership, "upgrade_connection"))
        connection = sqlite3.connect(":memory:")
        try:
            with self.assertRaises(RuntimeError):
                migrate_session_ownership.upgrade_connection(connection)
            self.assertFalse(connection.in_transaction)
            self.assertEqual(
                connection.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall(),
                [],
            )
        finally:
            connection.close()

    def test_failed_commit_after_alter_rolls_back_schema_and_preserves_rows(self):
        from scripts import migrate_session_ownership

        class FailCommitConnection(sqlite3.Connection):
            fail_next_commit = False

            def commit(self):
                if self.fail_next_commit:
                    self.fail_next_commit = False
                    raise sqlite3.OperationalError("simulated commit failure")
                return super().commit()

        connection = sqlite3.connect(":memory:", factory=FailCommitConnection)
        try:
            connection.execute(
                "CREATE TABLE test_sessions "
                "(id INTEGER PRIMARY KEY, test_type TEXT NOT NULL)"
            )
            connection.execute(
                "INSERT INTO test_sessions (id, test_type) VALUES (7, 'money')"
            )
            connection.commit()
            connection.fail_next_commit = True

            with self.assertRaises(sqlite3.OperationalError):
                migrate_session_ownership.upgrade_connection(connection)

            self.assertFalse(connection.in_transaction)
            columns = [
                row[1]
                for row in connection.execute("PRAGMA table_info(test_sessions)")
            ]
            self.assertNotIn("owner_token_hash", columns)
            self.assertEqual(
                connection.execute("SELECT id, test_type FROM test_sessions").fetchall(),
                [(7, "money")],
            )
        finally:
            connection.close()


class SessionOwnershipRouteTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config.update(
            TESTING=True,
            SESSION_COOKIE_NAME="jaemulun_session",
            SESSION_COOKIE_SECURE=True,
            SESSION_COOKIE_HTTPONLY=True,
            SESSION_COOKIE_SAMESITE="Lax",
            SESSION_COOKIE_DOMAIN=None,
            PERMANENT_SESSION_LIFETIME=timedelta(days=30),
        )
        with app.app_context():
            db.create_all()

    def setUp(self):
        self.owner_client = app.test_client()
        self.other_client = app.test_client()
        with app.app_context():
            db.session.query(TestResult).delete()
            db.session.query(TestSession).delete()
            db.session.query(Choice).delete()
            db.session.query(Question).delete()
            question = Question(
                test_type="money",
                category="general",
                question_text="테스트 질문",
                question_subtext="",
                is_active=True,
                weight=1,
            )
            choice = Choice(
                question=question,
                choice_text="테스트 선택",
                score=3,
                choice_order=1,
            )
            db.session.add(question)
            db.session.commit()
            self.question_id = question.id
            self.choice_id = choice.id

        response = self.owner_client.post(
            "/api/start", json={"test_type": "money"}, base_url="https://localhost"
        )
        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        self.session_id = response.get_json()["session_id"]

    def https_get(self, client, path):
        return client.get(path, base_url="https://localhost")

    def https_post(self, client, path, **kwargs):
        return client.post(path, base_url="https://localhost", **kwargs)

    def assert_private_session_routes_are_hidden(self, client, session_id):
        for path in (
            f"/result/{session_id}",
            f"/insight/{session_id}",
            f"/share/{session_id}",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.https_get(client, path).status_code, 404)

        payloads = (
            ("/api/answer", {"session_id": session_id, "question_id": self.question_id, "choice_id": self.choice_id}),
            ("/api/finish", {"session_id": session_id}),
            ("/api/share", {"session_id": session_id}),
        )
        for path, payload in payloads:
            with self.subTest(path=path):
                response = self.https_post(client, path, json=payload)
                self.assertEqual(response.status_code, 404)

    def test_new_session_gets_secure_cookie_and_owner_can_read_free_insight(self):
        cookie = self.owner_client.get_cookie("jaemulun_session")
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie.secure)
        self.assertTrue(cookie.http_only)
        self.assertEqual(cookie.same_site, "Lax")

        with app.app_context():
            test_session = db.session.get(TestSession, self.session_id)
            self.assertIsNotNone(test_session.owner_token_hash)
            self.assertEqual(len(test_session.owner_token_hash), 64)
            self.assertNotEqual(test_session.owner_token_hash, "")
            owner_token = app.session_interface.get_signing_serializer(app).loads(cookie.value)["owner_token"]
            self.assertEqual(test_session.owner_token_hash, sha256(owner_token.encode()).hexdigest())

        finish = self.https_post(
            self.owner_client,
            "/api/finish",
            json={"session_id": self.session_id},
        )
        self.assertEqual(finish.status_code, 200)
        insight = self.https_get(self.owner_client, f"/insight/{self.session_id}")
        self.assertEqual(insight.status_code, 200)
        self.assertIn("무료 상세 리포트", insight.get_data(as_text=True))

    def test_owner_can_submit_an_answer_and_update_only_their_session(self):
        response = self.https_post(
            self.owner_client,
            "/api/answer",
            json={
                "session_id": self.session_id,
                "question_id": self.question_id,
                "choice_id": self.choice_id,
            },
        )

        self.assertEqual(response.status_code, 200, response.get_data(as_text=True))
        self.assertEqual(response.get_json(), {"ok": True, "current_score": 3, "answer_count": 1})
        with app.app_context():
            test_session = db.session.get(TestSession, self.session_id)
            self.assertEqual(test_session.score, 3)
            self.assertEqual(test_session.answer_count, 1)
            self.assertEqual(test_session.answered_question_ids, str(self.question_id))

    def test_other_browser_cannot_read_or_change_owned_session(self):
        other_start = self.https_post(
            self.other_client,
            "/api/start",
            json={"test_type": "money"},
        )
        self.assertEqual(other_start.status_code, 200)
        self.assertIsNotNone(self.other_client.get_cookie("jaemulun_session"))

        self.assert_private_session_routes_are_hidden(self.other_client, self.session_id)

        self.assertEqual(
            self.https_get(self.other_client, f"/result/{self.session_id}").get_data(),
            self.https_get(self.other_client, "/result/999999").get_data(),
        )

    def test_missing_altered_expired_and_legacy_ownership_are_denied(self):
        missing_client = app.test_client()
        missing_cookie_response = self.https_get(missing_client, f"/result/{self.session_id}")
        missing_target_response = self.https_get(missing_client, "/result/999999")
        self.assertEqual(missing_cookie_response.status_code, 404)
        self.assertEqual(missing_cookie_response.get_data(), missing_target_response.get_data())
        self.assert_private_session_routes_are_hidden(missing_client, self.session_id)

        self.owner_client.set_cookie("jaemulun_session", "not-a-valid-signed-cookie")
        self.assert_private_session_routes_are_hidden(self.owner_client, self.session_id)

        expiring_client = app.test_client()
        start = expiring_client.post(
            "/api/start", json={"test_type": "money"}, base_url="https://localhost"
        )
        expiring_id = start.get_json()["session_id"]
        previous_lifetime = app.config["PERMANENT_SESSION_LIFETIME"]
        try:
            app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(seconds=-1)
            expired = self.https_get(expiring_client, f"/result/{expiring_id}")
            self.assertEqual(expired.status_code, 404)
            self.assert_private_session_routes_are_hidden(expiring_client, expiring_id)
        finally:
            app.config["PERMANENT_SESSION_LIFETIME"] = previous_lifetime

        legacy_browser = app.test_client()
        legacy_start = self.https_post(
            legacy_browser,
            "/api/start",
            json={"test_type": "money"},
        )
        self.assertEqual(legacy_start.status_code, 200)
        with app.app_context():
            legacy = TestSession(test_type="money", selected_question_ids="")
            db.session.add(legacy)
            db.session.commit()
            legacy_id = legacy.id
        legacy_response = self.https_get(legacy_browser, f"/result/{legacy_id}")
        missing_response = self.https_get(legacy_browser, "/result/999999")
        self.assertEqual(legacy_response.status_code, 404)
        self.assertEqual(legacy_response.get_data(), missing_response.get_data())
        self.assert_private_session_routes_are_hidden(legacy_browser, legacy_id)

    def test_result_page_offers_owner_free_detailed_report(self):
        self.https_post(
            self.owner_client,
            "/api/finish",
            json={"session_id": self.session_id},
        )

        result = self.https_get(self.owner_client, f"/result/{self.session_id}")

        self.assertEqual(result.status_code, 200)
        self.assertIn(f'href="/insight/{self.session_id}"', result.get_data(as_text=True))
        self.assertIn("무료 상세 리포트 보기", result.get_data(as_text=True))

    def test_payment_routes_cannot_unlock_a_session(self):
        unlock = self.https_post(
            self.owner_client,
            "/api/unlock",
            json={"session_id": self.session_id},
        )
        payment = self.https_get(
            self.owner_client, f"/payment/success?session={self.session_id}"
        )
        self.assertIn(unlock.status_code, (404, 410))
        self.assertIn(payment.status_code, (404, 410))
        with app.app_context():
            test_session = db.session.get(TestSession, self.session_id)
            self.assertFalse(test_session.unlocked)

    def test_share_composer_and_api_issue_public_summary_link(self):
        self.https_post(
            self.owner_client,
            "/api/finish",
            json={"session_id": self.session_id},
        )
        composer = self.https_get(self.owner_client, f"/share/{self.session_id}")
        self.assertEqual(composer.status_code, 200)
        self.assertIn("JAEMULUN_SHARE_URL", composer.get_data(as_text=True))
        with app.app_context():
            test_session = db.session.get(TestSession, self.session_id)
            self.assertEqual(test_session.share_count, 1)

        response = self.https_post(
            self.owner_client,
            "/api/share",
            json={"session_id": self.session_id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("share_url", data)
        if "share_url" not in data:
            return

        public_response = self.https_get(self.other_client, urlsplit(data["share_url"]).path)
        self.assertEqual(public_response.status_code, 200)
        public_html = public_response.get_data(as_text=True)
        self.assertIn("MY MONEY FLOW SCORE", public_html)
        self.assertIn("오늘의 재물운", public_html)
        self.assertNotIn("상세 AI 인사이트", public_html)
        self.assertNotIn(
            "오늘은 큰 지출을 미루고 계획적인 소비를 실천하는 것이 유리합니다.",
            public_html,
        )
        self.assertEqual(
            self.https_get(self.other_client, f"/insight/{self.session_id}").status_code,
            404,
        )

    def test_share_tokens_reject_tampering_and_expiration(self):
        self.https_post(
            self.owner_client,
            "/api/finish",
            json={"session_id": self.session_id},
        )
        response = self.https_post(
            self.owner_client,
            "/api/share",
            json={"session_id": self.session_id},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("share_url", data)
        if "share_url" not in data:
            return

        share_path = urlsplit(data["share_url"]).path
        prefix = "/shared/"
        self.assertTrue(share_path.startswith(prefix))
        token = share_path[len(prefix):]
        token_parts = token.split(".")
        signature = token_parts[-1]
        token_parts[-1] = ("A" if signature[0] != "A" else "B") + signature[1:]
        tampered_token = ".".join(token_parts)
        self.assertEqual(
            self.https_get(self.other_client, f"{prefix}{tampered_token}").status_code,
            404,
        )

        previous_age = app.config.get("SHARE_LINK_MAX_AGE_SECONDS", 90 * 24 * 60 * 60)
        try:
            app.config["SHARE_LINK_MAX_AGE_SECONDS"] = -1
            expired = self.https_get(self.other_client, share_path)
        finally:
            app.config["SHARE_LINK_MAX_AGE_SECONDS"] = previous_age
        self.assertEqual(expired.status_code, 404)

    def test_stats_are_hidden_and_health_check_returns_only_ok(self):
        stats = self.https_get(self.other_client, "/api/stats")
        self.assertEqual(stats.status_code, 404)

        health = self.https_get(self.other_client, "/healthz")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.get_json(), {"ok": True})

    def test_application_refuses_missing_or_known_default_secret_key(self):
        for secret in (
            None,
            "too-short",
            "dev-secret-change-in-prod",
            "replace-with-a-random-secret-at-least-32-characters-long",
            "REPLACE_WITH_A_RANDOM_SECRET",
            "your-super-secret-key-here-change-this",
        ):
            with self.subTest(secret_set=secret is not None):
                env = {
                    "PATH": os.environ.get("PATH", ""),
                    "PYTHONPATH": str(REPO_ROOT),
                    "DATABASE_URL": "sqlite:///:memory:",
                }
                if secret is not None:
                    env["SECRET_KEY"] = secret
                result = subprocess.run(
                    [sys.executable, "-c", "import core_app"],
                    cwd=REPO_ROOT,
                    env=env,
                    capture_output=True,
                    text=True,
                    check=False,
                )
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("SECRET_KEY", result.stderr)

    def test_application_loads_secret_key_from_project_dotenv(self):
        test_secret = "dotenv-load-test-secret-0123456789abcdef"
        with tempfile.TemporaryDirectory() as working_directory:
            Path(working_directory, ".env").write_text(f"SECRET_KEY={test_secret}\n")
            result = subprocess.run(
                [sys.executable, "-c", "import core_app; assert core_app.app.secret_key"],
                cwd=working_directory,
                env={
                    "PATH": os.environ.get("PATH", ""),
                    "PYTHONPATH": str(REPO_ROOT),
                    "DATABASE_URL": "sqlite:///:memory:",
                },
                capture_output=True,
                text=True,
                check=False,
            )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
