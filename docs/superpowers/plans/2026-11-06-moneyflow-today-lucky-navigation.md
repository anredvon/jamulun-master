# MoneyFlow Today Lucky Points and Navigation Implementation Plan

> **For agentic workers:** Use the native inline execution path; tasks below are ordered and independently inspectable.

**Goal:** Add deterministic image-matched lucky details and clearer mobile navigation without changing existing APIs or database behavior.

**Architecture:** Derive lucky values in the Today client from the Seoul date and zodiac index already present in the horoscope payload, render them through generated raster sprite atlases, and replace the complete bottom navigation icon set with the approved monochrome outline sprite. Keep the check flow on its existing session and answer APIs while representing each question in browser history and locking already-submitted answers on revisit.

**Tech Stack:** Flask/Jinja, vanilla JavaScript, CSS, generated PNG assets.

**Spec:** `docs/superpowers/specs/2026-11-06-moneyflow-today-lucky-navigation.md`

## Global Constraints

- Preserve service routes, API request/response shapes, API duplicate-answer behavior, database schema and data, and existing Tarot behavior.
- Lucky values are daily entertainment content, deterministic by Asia/Seoul date and selected zodiac.
- Replace all four navigation icons with the approved monochrome outline sprite set; keep Korean labels and active-tab behavior.
- Honor reduced-motion settings and iPhone safe areas.

## Review Focus

- Refreshing or selecting another zodiac must keep value text and the sprite index paired.
- A saved answer revisited via back navigation must be locked against duplicate submission.
- Back at question one must return to Intro; back from later questions must move one question, not exit the route.
- Forward navigation after stepping back must not double-submit an already answered question.
- 360px width and reduced-motion settings must not clip the lucky grid, navigation, or question controls.

### Task 1: Deterministic Today luck values and imagery

**Files:** `templates/today.html`, `static/js/today.js`, `static/css/today.css`, `static/css/feature-icons.css`, `templates/_bottom_nav.html`, `static/images/ui/icons/bottom-nav-outline.png`, `static/images/ui/luck/{color-atlas,dice-atlas,compass-atlas}.png`.

- Add fixed color, direction, and dice value catalogs with sprite indices and derive a stable per-date/per-zodiac value set.
- Show the three lucky details and the existing lucky-item sentence in the horoscope interpretation.
- Replace all four bottom-tab icons with the approved monochrome outline sprite sheet, preserving labels and active-tab behavior; use generated raster sprite sheets for the lucky value combinations.
- Keep zodiac picker and overview selections synchronized with the main screen values.

### Task 2: Back navigation and question flow

**Files:** `core_app.py` (template context only), `templates/_app_header.html`, `templates/intro.html`, `templates/test.html`, `templates/result.html`, `templates/insight.html`, `static/js/jaemulun.js`, `static/css/app-chrome.css`, `static/css/diagnosis-flow.css`.

- Add accessible top-left back controls with route fallbacks to their logical parent screens.
- Push question index entries into the current route history and handle `popstate` for browser and iOS edge-swipe back.
- Preserve saved answers in client state; revisit them as selected and read-only; never resubmit them.
- Let users continue forward from a revisited saved step without a duplicate API call.
- Add touch feedback and short directional transitions with reduced-motion support.

### Task 3: Review and verification

- Inspect the rendered Today screen at 360px, 390px, and 430px.
- Visually compare category sprite cells to their Korean labels and direction orientations.
- Manually inspect question next/back behavior and read-only saved answers in the local browser.
- Review the final diff for API, database, Tarot, and non-Today tab icon changes. No automated tests are added or run for this task.
