# MoneyFlow Route-Aware Page Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add direction-aware, accessible transitions between MoneyFlow pages while preserving the current multi-page navigation.

**Architecture:** Keep Flask route navigation and the existing cross-document View Transition opt-in. A small shared script classifies Home, forward, and backward navigation from user link intent and browser navigation entries; shared CSS animates the content snapshot and preserves app chrome.

**Tech Stack:** Flask/Jinja, CSS View Transitions, vanilla JavaScript, Node test runner, Python unittest.

**Spec:** `docs/superpowers/specs/2026-11-06-moneyflow-route-aware-transitions.md`

## Global Constraints

- Preserve route URLs, APIs, database behavior, and app history.
- Keep reduced-motion behavior and native browser history navigation.
- Do not change service, deployment, Tarot draw/redraw, or persistence behavior.
- Add no runtime dependencies.

## Review Focus

- Header brand, header Home, and ordinary Home links must all choose the Home transition type.
- iPhone/browser history traversal to an earlier entry must move in the reverse direction.
- Direct loads, reloads, same-page links, external links, target-blank links, downloads, and modifier clicks must not be blocked or mislabeled.
- The fixed bottom nav and shared header must stay visually steady.
- Reduced-motion preference and unsupported View Transition events must leave navigation usable.

---

### Task 1: Navigation intent classifier and event tests

**Files:**
- Create: `static/js/page-transitions.js`
- Create: `tests/page-transitions.test.js`
- Modify: `.github/workflows/jaemulun-ci.yml` to include the test in the existing Node suite

**Interfaces:**
- Produces: `window.MoneyFlowPageTransitions.classifyTransition({ intent, fromIndex, toIndex, destinationIsHome })` returning `home-up`, `forward`, `back`, or `null`.
- Produces: delegated link-intent tracking and `pageswap`/`pagereveal` listeners that add a matching type only when a supported transition object exists.

- [x] **Step 1: Write Node tests** for explicit Home intent, forward links, explicit back links, earlier/later traversal indexes, reload/same-index, and absent navigation metadata.
- [x] **Step 2: Run the focused Node test and confirm expected failures.**
- [x] **Step 3: Implement the pure classifier and guarded event wiring** in `static/js/page-transitions.js`; ignore external, target-blank, download, hash-only, and modified clicks.
- [x] **Step 4: Load the shared script in `templates/base.html` and add the test to the existing CI Node command.**
- [x] **Step 5: Run the focused Node test and confirm it passes.**

### Task 2: Directional mobile motion and in-browser verification

**Files:**
- Modify: `static/js/page-transitions.js`
- Modify: `tests/page-transitions.test.js`
- Modify: `static/css/app-chrome.css`
- Modify: `templates/base.html` with a canonical Home URL for same-origin matching if needed
- Modify: `tests/test_deploy_smoke.py` for shared script/transition contract checks if the browser test cannot exercise static routing markup

**Interfaces:**
- Consumes: the `home-up`, `forward`, and `back` types from Task 1.
- Produces: content-only page motion; header and fixed navigation remain anchored.

- [x] **Step 1: Add and pass tests** for link-intent filtering and CSS contract assertions for each transition type, stable app chrome, and reduced motion.
- [x] **Step 2: Define restrained transitions** with 220–230 ms arrivals, a 150 ms exit, and transform/opacity only.
- [x] **Step 3: Keep `.app-header` and `.app-bottom-nav` out of the moving content snapshot** while animating the main page shell.
- [x] **Step 4: Verify route rendering at 360/390/430px.** All six routes (`/home`, `/today`, `/tarot`, `/check`, `/history`, `/lotto`) loaded without horizontal overflow. Link navigation and history interactions were exercised in the local preview. The preview browser does not implement `document.startViewTransition`, `window.navigation`, or the cross-document transition events, so actual animation playback remains for iPhone Safari verification.
- [x] **Step 5: Verify reduced-motion and unsupported-event fallback** through CSS contract and browser-mock tests; run `git diff --check`.

### Task 3: Release preparation

**Files:**
- Modify: this plan to record completed checks and release readiness

- [x] **Step 1: Review the diff** for API, database, service, deployment, and unrelated interaction changes. Changes are limited to the shared template, route transition JS/CSS, tests, CI test list, and this design/plan record.
- [x] **Step 2: Commit the verified implementation on the isolated feature branch.** A remote push/PR is not part of this preparation because production work is being held for the user's evening session.
- [x] **Step 3: Leave production deployment for the user's evening authorization/session; do not deploy in this preparation task.**

## Verification evidence

- Python: `/private/tmp/moneyflow-step1-venv312/bin/python -m unittest discover -s tests -p 'test_*.py' -v` — 58 passed. Existing datetime/SQLAlchemy deprecation warnings remain outside this change.
- Node: `node --test tests/history-store.test.js tests/history-view-model.test.js tests/palm-analysis.test.js tests/palm-copy.test.js tests/today.test.js tests/lotto-ui.test.js tests/dialog-focus.test.js tests/page-transitions.test.js` — 64 passed.
- `git diff --check` — passed.
- Local browser: 18 route/viewport combinations, all with `scrollWidth === clientWidth`; transition API playback unavailable in this browser, so confirm the actual motion on iPhone Safari before production.
