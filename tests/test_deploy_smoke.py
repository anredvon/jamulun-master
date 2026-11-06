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

from flask import render_template, render_template_string

os.environ["SECRET_KEY"] = "ci-test-secret-key-0123456789abcdef0123456789abcdef"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import app
from models import db
from tarot_cards import LEGACY_TAROT_CARDS, TAROT_CARDS


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

    def test_tarot_draw_is_explicitly_random_and_framed_as_reflection(self):
        response = self.client.get("/tarot")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("무작위", html)
        self.assertIn("오늘의 마음을 비춰보는 타로 한 장, 가볍게 즐겨보세요.", html)
        self.assertNotIn("한 장 골라보세요", html)
        self.assertNotIn('class="tarot-score-pill"', html)

    def test_tarot_card_copy_uses_reflection_questions_not_financial_predictions(self):
        self.assertEqual(len(TAROT_CARDS), 78)
        self.assertEqual(sum(card.get("arcana") == "major" for card in TAROT_CARDS), 22)
        self.assertEqual(sum(card.get("arcana") == "minor" for card in TAROT_CARDS), 56)
        self.assertEqual(
            {suit: sum(card.get("suit") == suit for card in TAROT_CARDS) for suit in ("wands", "cups", "swords", "pentacles")},
            {"wands": 14, "cups": 14, "swords": 14, "pentacles": 14},
        )
        self.assertEqual(len({card["id"] for card in TAROT_CARDS}), 78)
        self.assertEqual(len({card["image"] for card in TAROT_CARDS}), 78)
        missing_art = [card["image"] for card in TAROT_CARDS
                       if not (Path(__file__).resolve().parents[1] / "static" / card["image"]).is_file()]
        self.assertEqual(missing_art, [])
        self.assertEqual(len(LEGACY_TAROT_CARDS), 24)
        self.assertTrue(all(card["image"].startswith("images/tarot/app_cards/")
                            for card in LEGACY_TAROT_CARDS))
        prediction_terms = ("수익을 보장", "투자하세요", "반드시 돈이 들어", "부자가 됩니다", "매수하세요", "대출받으세요")
        for card in TAROT_CARDS:
            with self.subTest(card=card["id"]):
                self.assertGreaterEqual(len(card["flow"]), 80, card["flow"])
                self.assertTrue(card["caution"].endswith("?"), card["caution"])
                self.assertTrue(card["line"].endswith("?"), card["line"])
                self.assertNotEqual(card["caution"], card["line"])
                copy = " ".join((card["status"], card["flow"], card["caution"], card["line"]))
                self.assertFalse(any(term in copy for term in prediction_terms), copy)

    def test_tarot_history_catalog_keeps_legacy_cards_and_includes_new_cards(self):
        response = self.client.get("/history")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        match = re.search(r'<script type="application/json" id="history-tarot-data">(.*?)</script>', html)
        self.assertIsNotNone(match)
        catalog = json.loads(match.group(1))
        card_ids = {card["id"] for card in catalog}
        self.assertIn("temperance", card_ids)
        self.assertIn("major-temperance", card_ids)
        self.assertEqual(len(catalog), 102)

    def test_tarot_picker_has_single_concise_framing_and_no_collection_ui(self):
        response = self.client.get("/tarot")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn("오늘의 마음을 비춰보는 타로 한 장, 가볍게 즐겨보세요.", html)
        self.assertIn("78장", html)
        self.assertNotIn("24장", html)
        self.assertNotIn("카드 발견", html)
        self.assertNotIn("NEW CARD", html)
        self.assertNotIn("moneyflow_tarot_collection_v2", html)
        script = (Path(__file__).resolve().parents[1] / "static" / "js" / "tarot.js").read_text()
        styles = (Path(__file__).resolve().parents[1] / "static" / "css" / "tarot.css").read_text()
        self.assertNotIn("collection", script.lower())
        self.assertNotIn("collection", styles.lower())
        self.assertIn("cards[Math.floor(Math.random() * cards.length)]", script)

    def test_tarot_result_uses_korean_title_natural_flow_label_and_defined_card_edges(self):
        response = self.client.get("/tarot")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        self.assertIn('class="tarot-report-label">오늘의 흐름</span>', html)
        self.assertNotIn('class="tarot-report-label">생각해볼 거리</span>', html)
        self.assertNotIn('id="tarot-card-en"', html)

        script = (Path(__file__).resolve().parents[1] / "static" / "js" / "tarot.js").read_text()
        self.assertIn("elements.reportTitle.textContent = selected.title;", script)
        self.assertNotIn("${selected.title} · ${selected.en}", script)
        self.assertNotIn("elements.en.textContent", script)

        styles = (Path(__file__).resolve().parents[1] / "static" / "css" / "tarot.css").read_text()
        self.assertRegex(styles, r"\.tarot-card-back\s*\{[^}]*border:\s*1px solid")
        self.assertRegex(styles, r"\.tarot-card-back\s*\{[^}]*box-shadow:\s*0 8px 18px rgba\(45, 31, 87, \.14\)")

    def test_home_links_money_quizzes_to_the_check_hub(self):
        response = self.client.get("/home")
        self.assertEqual(response.status_code, 200)
        html = response.get_data(as_text=True)
        for label in ("오늘의 타로카드 뽑기", "오늘의 손금 보기", "나의 돈 습관 알아보기", "이번 주 로또번호 받기"):
            with self.subTest(label=label):
                self.assertIn(label, html)
        for href in ('href="/tarot"', 'href="/palm"', 'href="/check"', 'href="/lotto"'):
            with self.subTest(href=href):
                self.assertIn(href, html)
        self.assertNotIn("나의 소비 스타일", html)
        self.assertNotIn("오늘의 재물운</strong>", html)
        self.assertNotIn("오늘의 한 줄 투자 명언 뽑기", html)

    def test_home_and_today_have_clear_non_predictive_content_promises(self):
        home = self.client.get("/home").get_data(as_text=True)
        today = self.client.get("/today").get_data(as_text=True)
        self.assertIn("재미로 즐기는 콘텐츠와 돈 관리 습관", home)
        self.assertNotIn('<em>NEW</em></span><span>마음이 가는 카드', home)
        self.assertIn("오늘의 명언", today)
        self.assertIn("오늘의 별자리 운세", today)
        self.assertIn("재미로 가볍게 참고해 주세요", today)
        self.assertNotIn("매일 타로카드 한 장으로", today)

    def test_history_explains_on_device_history_and_server_records_separately(self):
        html = self.client.get("/history").get_data(as_text=True)
        self.assertIn("이 기기의 브라우저에 저장돼요", html)
        self.assertIn("로또 번호는 서비스 기록에 저장돼요", html)
        self.assertIn("손 사진은 업로드하거나 보관하지 않아요", html)

    def test_history_and_tarot(self):
        for path in ("/history", "/tarot"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(path).status_code, 200)

    def test_history_script_has_valid_javascript_syntax(self):
        script = Path(__file__).resolve().parents[1] / "static" / "js" / "history.js"
        result = subprocess.run(["node", "--check", str(script)], capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_header_uses_consistent_raster_brand_and_home_assets(self):
        for path in ("/home", "/history", "/today", "/tarot", "/check", "/lotto", "/palm"):
            with self.subTest(path=path):
                html = self.client.get(path).get_data(as_text=True)
                self.assertIn('src="/static/images/ui/wealth_check/cat_icon.png"', html)
                self.assertIn('class="app-header-home', html)
                self.assertIn('src="/static/images/ui/icons/home-mascot.png"', html)
                self.assertIn('aria-label="홈"', html)
                self.assertIn('class="app-brand"', html)

        lotto_html = self.client.get("/lotto").get_data(as_text=True)
        self.assertIn('src="/static/images/ui/wealth_check/cat_icon.png"', lotto_html)
        self.assertIn('src="/static/images/ui/icons/home-mascot.png"', lotto_html)
        self.assertIn('class="app-header-back"', lotto_html)
        self.assertIn('← 홈', lotto_html)

    def test_today_uses_canonical_quote_and_today_raster_icons(self):
        html = self.client.get("/today").get_data(as_text=True)
        self.assertIn('class="feature-illustration feature-illustration--quote"', html)
        self.assertIn('class="feature-illustration feature-illustration--today"', html)
        self.assertIn('id="selected-zodiac-icon"', html)
        self.assertNotIn('class="today-card-mark quote-mark"', html)
        self.assertNotIn('class="today-card-mark horoscope-mark"', html)

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
        self.assertIn("previewCard.classList.add('is-analysis-complete')", js)
        self.assertIn("previewCard.classList.remove('is-hidden', 'is-analysis-complete')", js)
        self.assertIn("previewCard.classList.remove('is-scanning', 'is-analysis-complete')", js)

    def test_investment_quote_page_is_reachable(self):
        response = self.client.get("/investment-quotes")
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.headers["Location"], "/today")

    def test_today_hub_and_bottom_navigation_routes(self):
        today = self.client.get("/today")
        self.assertEqual(today.status_code, 200)
        today_html = today.get_data(as_text=True)
        self.assertIn("오늘의 명언", today_html)
        self.assertIn("별자리 선택", today_html)
        self.assertIn("머니플로우 콘텐츠", today_html)
        self.assertIn("출처 보기", today_html)
        self.assertNotIn('href="/palm"', today_html)
        self.assertNotIn("today-feature-link", today_html)
        self.assertNotIn('href="/investment-quotes"', today_html)

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

    def test_lotto_result_card_uses_soft_light_without_pinpoint_stars(self):
        css = (Path(__file__).resolve().parents[1] / "static" / "css" / "lotto.css").read_text()
        result_background = re.search(r"\.lotto-result-card:before\{([^{}]*)\}", css)

        self.assertIsNotNone(result_background)
        self.assertNotRegex(result_background.group(1), r"radial-gradient\(\s*1(?:\.5)?px")
        self.assertIn(".lotto-entry:before,.lotto-theater:before{", css)

    def test_result_score_is_answer_reference_and_leads_with_result_type(self):
        with app.test_request_context():
            html = render_template(
                "result.html",
                ts=SimpleNamespace(id=18),
                result=SimpleNamespace(final_score=84, result_title="기초를 차곡차곡 쌓는 중", result_desc="이번 달 목표를 한 줄로 적어보세요."),
                result_tags=[],
                test_type="future",
                test_label="돈 관리 습관",
            )

        self.assertIn('aria-label="답변 참고 점수"', html)
        self.assertIn("<strong>84</strong><span>점</span>", html)
        self.assertNotIn("<span>/100</span>", html)
        self.assertLess(html.index("money-score-type"), html.index("money-score-value"))
        self.assertIn("선택한 답변을 100점 기준으로 환산한 참고 결과예요.", html)

    def test_root_stays_the_intro_page_and_home_is_the_activity_page(self):
        root_html = self.client.get("/").get_data(as_text=True)
        home_html = self.client.get("/home").get_data(as_text=True)
        self.assertIn("오늘의 돈 흐름", root_html)
        self.assertNotIn("home-actions", root_html)
        self.assertIn("home-actions", home_html)

    def test_feature_and_bottom_navigation_icons_use_shared_raster_assets(self):
        repo_root = Path(__file__).resolve().parents[1]
        home_html = self.client.get("/home").get_data(as_text=True)
        check_html = self.client.get("/check").get_data(as_text=True)
        history_html = self.client.get("/history").get_data(as_text=True)

        for name in ("tarot", "palm", "lotto", "check"):
            self.assertIn(f"feature-illustration--{name}", home_html)
        for name in ("future", "spending", "money"):
            self.assertIn(f"feature-illustration--{name}", check_html)
        for name in ("tarot", "palm", "lotto", "future", "spending", "money", "check", "quote"):
            self.assertIn(f"feature-illustration--{name}", history_html)

        for name in ("today", "tarot", "check", "history"):
            self.assertIn(f"nav-illustration--{name}", home_html)
        for html in (home_html, check_html, history_html):
            self.assertIn("/static/css/feature-icons.css", html)
        nav_markup = re.search(r'<nav class="app-bottom-nav".*?</nav>', home_html, re.DOTALL)
        self.assertIsNotNone(nav_markup)
        self.assertNotIn("<svg", nav_markup.group(0))

        with app.test_request_context():
            unknown_icon = render_template_string(
                "{% from '_content_icon.html' import content_icon %}{{ content_icon('unknown') }}"
            )
        self.assertIn("feature-illustration--history", unknown_icon)

        for relative in (
            "static/css/feature-icons.css",
            "static/images/ui/icons/feature-outline.png",
            "static/images/ui/icons/feature-mascots.png",
            "static/images/ui/icons/bottom-nav-outline.png",
        ):
            self.assertTrue((repo_root / relative).is_file(), f"missing raster icon asset: {relative}")

        feature_css = (repo_root / "static/css/feature-icons.css").read_text()
        self.assertRegex(
            feature_css,
            r"\.feature-illustration\s*\{[^}]*background-image:url\(\"\.\./images/ui/icons/feature-mascots\.png\"\);",
        )
        self.assertRegex(feature_css, r"\.feature-illustration\s*\{[^}]*background-size:300% 300%;")
        mappings = {
            "tarot": "0 0",
            "palm": "50% 0",
            "lotto": "100% 0",
            "check": "0 50%",
            "future": "0 50%",
            "spending": "50% 50%",
            "money": "100% 50%",
            "quote": "0 100%",
            "today": "50% 100%",
            "history": "100% 100%",
        }
        for name, position in mappings.items():
            with self.subTest(icon=name):
                self.assertRegex(
                    feature_css,
                    rf"\.feature-illustration--{name}\s*\{{[^}}]*background-position:\s*{re.escape(position)}\s*;",
                )
        self.assertRegex(feature_css, r"\.feature-illustration--lotto\s*\{[^}]*background-position:\s*100% 0;")
        self.assertIn('background-image:url("../images/ui/icons/bottom-nav-outline.png")', feature_css)

        lotto_css = (repo_root / "static/css/lotto.css").read_text()
        history_css = (repo_root / "static/css/history.css").read_text()
        self.assertRegex(lotto_css, r"\.home-action-icon-lotto \.feature-illustration\s*\{[^}]*width:38px;height:25\.33px")
        self.assertRegex(lotto_css, r"@media\(max-width:380px\)[^}]*\.home-action-icon-lotto \.feature-illustration\{width:36px;height:24px\}")
        self.assertRegex(history_css, r"\.history-item\[data-category=\"lotto\"\] \.history-item-icon \.feature-illustration\s*\{width:40px;height:26\.67px;\}")

    def test_bottom_navigation_divider_tracks_the_menu_grid_inset(self):
        repo_root = Path(__file__).resolve().parents[1]
        chrome_css = (repo_root / "static/css/app-chrome.css").read_text()

        self.assertRegex(chrome_css, r"--nav-inline-inset:\s*10px")
        self.assertRegex(chrome_css, r"\.app-bottom-nav::before\s*\{[^}]*left:\s*var\(--nav-inline-inset\)")
        self.assertRegex(chrome_css, r"\.app-bottom-nav::before\s*\{[^}]*right:\s*var\(--nav-inline-inset\)")
        self.assertRegex(chrome_css, r"@media\s*\(max-width:\s*380px\)[\s\S]*--nav-inline-inset:\s*6px")

    def test_route_aware_page_transitions_keep_app_chrome_steady_and_respect_reduced_motion(self):
        repo_root = Path(__file__).resolve().parents[1]
        chrome_css = (repo_root / "static/css/app-chrome.css").read_text()
        history_css = (repo_root / "static/css/history.css").read_text()
        base_template = (repo_root / "templates/base.html").read_text()

        self.assertNotIn("view-transition-name:app-header", chrome_css)
        self.assertNotIn("view-transition-name:app-bottom-nav", chrome_css)
        self.assertNotIn("@view-transition", chrome_css)
        self.assertIn("@media(prefers-reduced-motion:reduce)", chrome_css)
        self.assertNotRegex(chrome_css, r"@keyframes page-(?:home|forward|back)-(?:out|in)\s*\{[^}]*opacity:")
        for transition in ("home-up", "forward", "back"):
            self.assertIn(f'data-transition-exit="{transition}"', chrome_css)
            self.assertIn(f'data-transition-enter="{transition}"', chrome_css)
        self.assertIn('data-transition-enter="home-down"', chrome_css)
        self.assertRegex(history_css, r"\.history-page\s*\{[^}]*background:\s*(?:#|rgb|linear-gradient)")
        self.assertRegex(chrome_css, r"\.app-header\s*\{[^}]*grid-template-columns:\s*56px minmax\(0,1fr\) 44px")
        self.assertIn('data-home-url="{{ url_for(\'home_page\') }}"', base_template)
        self.assertIn('filename=\'js/page-transitions.js\'', base_template)
        transition_js = (repo_root / "static/js/page-transitions.js").read_text()
        self.assertIn("moneyflow-page-transition", transition_js)
        self.assertIn("performance?.getEntriesByType", transition_js)
        self.assertIn("moneyflowOutgoingDestination", transition_js)
        self.assertIn("addEventListener('pagehide'", transition_js)
        self.assertNotIn('addEventListener(\'pageshow\'', transition_js)

    def test_all_non_home_pages_offer_a_visible_home_back_control(self):
        for path in ("/today", "/history", "/tarot", "/check", "/palm", "/lotto", "/history?filter=lotto"):
            with self.subTest(path=path):
                html = self.client.get(path).get_data(as_text=True)
                self.assertIn('class="app-header-back"', html)
                self.assertIn('← 홈', html)
                self.assertIn('href="/home"', html)

        lotto_html = self.client.get("/lotto").get_data(as_text=True)
        self.assertNotIn('class="lotto-back lotto-back--icon"', lotto_html)

        home_html = self.client.get("/home").get_data(as_text=True)
        self.assertNotIn('class="app-header-back"', home_html)

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
