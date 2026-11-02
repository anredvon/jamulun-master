"""Read-only Flask smoke tests with an isolated in-memory database."""
import os
import json
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from flask import render_template

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
                f"#!/bin/sh\nexec {shlex.quote(sys.executable)} \"$@\"\n"
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

    def test_poller_refuses_to_fetch_without_confirmed_branch_protection(self):
        repo_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "repo" / ".git").mkdir(parents=True)
            (root / "ENABLE_AUTODEPLOY").touch()
            (root / "shims").mkdir()
            git_log = root / "git-called"
            git_shim = root / "shims" / "git"
            git_shim.write_text(f"#!/bin/sh\nprintf called > {shlex.quote(str(git_log))}\nexit 0\n")
            git_shim.chmod(0o755)
            result = subprocess.run(
                ["bash", str(repo_root / "scripts" / "poll_main.sh")],
                cwd=repo_root,
                env={
                    **os.environ,
                    "JAEMULUN_ROOT": str(root),
                    "PATH": f"{root / 'shims'}:{os.environ.get('PATH', '')}",
                },
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("branch protection confirmation", result.stderr)
        self.assertFalse(git_log.exists(), "poller must not fetch main before confirmation")

    def test_deployment_has_termination_rollback_before_switch_and_longer_start_timeout(self):
        repo_root = Path(__file__).resolve().parents[1]
        deploy = (repo_root / "scripts" / "deploy_lightsail.sh").read_text()
        systemd = (repo_root / "deploy" / "systemd" / "jaemulun-poll.service").read_text()

        self.assertIn("trap on_exit EXIT", deploy)
        self.assertIn("trap 'exit 143' TERM", deploy)
        self.assertLess(deploy.index("trap on_exit EXIT"), deploy.index('mv -Tf "$ROOT/current.next" "$ROOT/current"'))
        self.assertIn("TimeoutStartSec=900", systemd)
        self.assertIn("TimeoutStopSec=60", systemd)

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

    def test_home_has_four_primary_daily_activities(self):
        response = self.client.get("/home")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        for label in ("오늘의 타로카드 뽑기", "오늘의 손금 보기", "재물 흐름 체크", "오늘의 한 줄 투자 명언 뽑기"):
            with self.subTest(label=label):
                self.assertIn(label, html)
        for href in ('href="/tarot"', 'href="/palm"', 'href="/intro/future"', 'href="/investment-quotes"'):
            with self.subTest(href=href):
                self.assertIn(href, html)
        self.assertNotIn("나의 소비 스타일", html)
        self.assertNotIn("오늘의 재물운</strong>", html)

    def test_home_and_today_have_clear_non_predictive_content_promises(self):
        home = self.client.get("/home").get_data(as_text=True)
        today = self.client.get("/today").get_data(as_text=True)
        self.assertIn("재미로 즐기는 콘텐츠와 돈 관리 습관", home)
        self.assertNotIn('<em>NEW</em></span><span>마음이 가는 카드', home)
        self.assertIn("매일 타로카드 한 장으로", today)
        self.assertNotIn('class="today-action today-tarot"', today)

    def test_history_explains_on_device_history_and_server_records_separately(self):
        html = self.client.get("/history").get_data(as_text=True)
        self.assertIn("이 기기의 브라우저에 저장돼요", html)
        self.assertIn("체크 결과와 로또 추첨번호는 서버에도 기록되며", html)
        self.assertIn("‘내 로또 기록’에서 다시 볼 수 있어요", html)
        self.assertIn("손 사진은 업로드하거나 보관하지 않아요", html)

    def test_history_and_tarot(self):
        for path in ("/history", "/tarot"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_palm_page_keeps_the_photo_on_device(self):
        response = self.client.get("/palm")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn('id="palm-file-input"', html)
        self.assertIn('accept="image/*"', html)
        self.assertIn('capture="environment"', html)
        self.assertIn("사진 보관함에서 선택", html)
        self.assertIn("손 사진은 기기 안에서만 살펴보고 업로드하거나 보관하지 않아요", html)
        self.assertNotIn("enctype=\"multipart/form-data\"", html)
        self.assertNotIn('action="/palm', html)
        self.assertIn("전통 손금 이야기예요. 과학적 진단이나 재물·투자 예측이 아니니 가볍게 참고해주세요", html)

    def test_palm_scan_stops_after_analysis_and_resets_for_retake(self):
        root = Path(__file__).resolve().parents[1]
        css = (root / "static" / "css" / "palm.css").read_text()
        js = (root / "static" / "js" / "palm.js").read_text()

        self.assertIn(".palm-preview-card.is-analysis-complete .palm-scan-line", css)
        self.assertRegex(css, r"\.palm-preview-card\.is-analysis-complete \.palm-scan-line\s*\{[^}]*animation:\s*none")
        self.assertIn("function finishPreviewScan()", js)
        self.assertIn("previewCard.classList.remove('is-analysis-complete')", js)

    def test_investment_quote_page_is_reachable(self):
        response = self.client.get("/investment-quotes")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("투자 명언 뽑기", html)
        self.assertIn("투자 명언은 읽을거리이며 개인별 매수·매도 조언이 아니에요.", html)

    def test_today_hub_and_bottom_navigation_routes(self):
        today = self.client.get("/today")
        self.assertEqual(today.status_code, 200)
        today_html = today.get_data(as_text=True)
        for href in ('href="/palm"', 'href="/investment-quotes"'):
            with self.subTest(href=href):
                self.assertIn(href, today_html)
        self.assertIn("today-feature-link", today_html)
        self.assertIn("오늘의 타로카드 한 장", (Path(__file__).resolve().parents[1] / "static/js/today.js").read_text())

        for path in ("/home", "/today", "/intro/future", "/history"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                html = response.get_data(as_text=True)
                self.assertIn('aria-label="주요 메뉴"', html)
                self.assertIn('href="/today"', html)
                self.assertIn("오늘", html)

    def test_money_check_result_is_framed_as_answer_based_reflection(self):
        from core_app import _calc_result

        for score in (30, 60, 80, 95):
            with self.subTest(score=score):
                _, _, description = _calc_result(score, "future")
                self.assertNotRegex(description, r"투자|수익|성장합니다|성과가 빨라")
                self.assertRegex(description, r"답변|선택|한 가지|살펴|확인")

        html = self.client.get("/intro/future").get_data(as_text=True)
        self.assertIn("재미와 생활 점검을 위한", html)

    def test_root_stays_the_intro_page_and_home_is_the_activity_page(self):
        root_html = self.client.get("/").get_data(as_text=True)
        home_html = self.client.get("/home").get_data(as_text=True)
        self.assertIn("오늘의 돈 흐름", root_html)
        self.assertNotIn("home-actions", root_html)
        self.assertIn("home-actions", home_html)

    def test_result_page_uses_shared_history_store(self):
        with app.test_request_context():
            html = render_template(
                "result.html",
                ts=SimpleNamespace(id=17),
                result=SimpleNamespace(final_score=82, result_title="안정 흐름", result_desc="차근차근 살펴봐요."),
                result_tags=[],
                test_type="future",
                test_label="재물 흐름",
            )

        store_script = html.index("/static/js/history-store.js")
        result_data = html.index("window.MONEYFLOW_RESULT")
        self.assertLess(store_script, result_data)
        self.assertIn("MoneyFlowHistory?.add(window.MONEYFLOW_RESULT)", html)
        self.assertIn(f"summary: {json.dumps('차근차근 살펴봐요.')}", html)
        self.assertIn('score: 82', html)

    def test_invalid_quiz(self):
        response = self.client.post("/api/start", json={"test_type": "unknown"})
        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
