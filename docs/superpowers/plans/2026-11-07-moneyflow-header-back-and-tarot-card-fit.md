# MoneyFlow Header Back and Tarot Card Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shared left header control use browser history Back, reserve Home navigation for the top-right control, and align Tarot card-back decoration with the image bounds.

**Architecture:** Keep the multi-page Flask routes. Add a small delegated handler for a marked Back button that calls `history.back()` and bypasses the normal link transition; keep the right Home link as `/home`. Remove outer decorative styling from the Tarot back-image wrapper.

**Tech Stack:** Flask/Jinja templates, CSS, browser JavaScript, Python unittest, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-07-moneyflow-header-back-and-tarot-card-fit-design.md`

## Global Constraints

- Preserve routes, APIs, data, draw behavior, daily redraw policy, and production configuration.
- Top-left Back calls browser history; top-right Home routes to `/home`.
- Tarot card-back wrapper adds no border, background, or shadow beyond the image bounds.

## Review Focus

- A Back click with history available must call browser history and avoid hard navigation to `/home`.
- A Home click must still navigate to `/home` through the top-right control.
- Home page header must keep its spacer and must not gain a Back button.
- Reduced-motion behavior and iPhone native edge-swipe must remain untouched.
- The card-back image must still fill the 4:5 wrapper with no additional visible frame.

---

### Task 1: Shared Header Back semantics

**Files:**
- Modify: `templates/_app_header.html`
- Modify: `templates/base.html`
- Modify: `templates/tarot.html`
- Modify: `static/js/page-transitions.js`
- Modify: `static/css/app-chrome.css`
- Test: `tests/test_deploy_smoke.py`
- Test: `tests/page-transitions.test.js`

- [x] Add failing template assertions for `← 뒤로`, `data-history-back`, a non-link brand, retained top-right Home link, and no Back button on `/home`.
- [x] Add a failing JavaScript test proving a marked Back control calls `history.back()` rather than `location.assign('/home')`.
- [x] Run the focused Python and Node tests and confirm they fail on the current behavior.
- [x] Change the shared non-home control to a button, make the brand non-link, and handle the marked control by calling `window.history.back()` before generic anchor transition handling.
- [x] Run the focused Python and Node tests and confirm they pass.

### Task 2: Tarot card-back bounds

**Files:**
- Modify: `static/css/tarot.css`
- Test: `tests/test_deploy_smoke.py`

- [x] Replace assertions for the old border and shadow with assertions that `.tarot-card-back` clears border, background, and box-shadow and that its image fills the wrapper.
- [x] Run the focused Tarot smoke test and confirm it fails on current CSS.
- [x] Remove separate wrapper decoration while preserving the 4:5 wrapper and full-size image.
- [x] Run the focused Tarot smoke test and confirm it passes.

### Task 3: Full verification

- [x] Run `node --test tests/*.test.js` (64 passed) and `/private/tmp/moneyflow-step1-venv312/bin/python -m unittest discover -s tests -p 'test_*.py'` (62 passed) from the repository root.
- [x] Run `git diff --check` and inspect the final diff for scope limited to the shared header, Tarot picker frame, their tests, and this plan/spec.
