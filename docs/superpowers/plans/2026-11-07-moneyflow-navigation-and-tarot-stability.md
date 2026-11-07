# MoneyFlow navigation and Tarot stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the header hierarchy, prevent competing history transitions, and make Tarot shuffle and rapid taps stable.

**Architecture:** Keep ordinary link transitions in the shared page transition controller, but leave Back/Forward history motion to the browser. Keep the Tarot interaction in its existing vanilla JavaScript controller, using a synchronous pending-selection guard and animation lifecycle events.

**Tech Stack:** Flask/Jinja templates, CSS, vanilla JavaScript, Node built-in test runner, Python unittest.

**Spec:** `docs/superpowers/specs/2026-11-07-moneyflow-navigation-and-tarot-stability-design.md`

## Global Constraints

- Preserve random Tarot draw, redraw behavior, APIs, database schema/data, feature routes, and server configuration.
- Do not alter bottom navigation or unrelated feature icons.
- No new runtime or test dependencies.
- Production deployment must use the reviewed merged SHA and `scripts/deploy_lightsail.sh`.

## Review Focus

- iPhone edge-swipe must not receive a second CSS transform — test history traversal has no authored entry animation.
- Home remains a top-right destination while Back uses history — test shared header structure on Home and feature routes.
- Repeated card taps during the reveal delay must only open one modal — test 3 rapid card clicks.
- Shuffle unlocks only after animations finish and cannot hang with reduced motion — test animation completion and reduced-motion fallback.
- Repeated result CTA events must not rerender or duplicate history — test second event after the report becomes visible.

---

### Task 1: Shared header hierarchy

**Files:**
- Modify: `templates/_app_header.html`
- Modify: `static/css/app-chrome.css`
- Test: `tests/test_deploy_smoke.py`

- [x] Add a smoke assertion that feature-page brand/Home share the top row and Back is on its own row below; Home omits Back.
- [x] Run the focused smoke test and confirm it fails on current header structure.
- [x] Restructure header markup/CSS to satisfy the assertion without changing bottom navigation.
- [x] Run the focused smoke test and the full Python suite.

### Task 2: Browser-owned Back/Forward motion

**Files:**
- Modify: `static/js/page-transitions.js`
- Modify: `tests/page-transitions.test.js`

- [x] Add tests that Back and Forward history traversals do not set app-authored entry animation, including a non-BFCache history restore.
- [x] Run the focused Node tests and confirm they fail against current fallback entry behavior.
- [x] Remove only the custom history-traversal entry motion; retain forward-link and explicit Home animations.
- [x] Run the complete Node suite.

### Task 3: Tarot shuffle and rapid-input protection

**Files:**
- Modify: `static/js/tarot.js`
- Modify: `static/css/tarot.css`
- Create: `tests/tarot-interactions.test.js`

- [x] Create a VM-based browser harness and add failing tests for single-open behavior under 3 rapid taps, idempotent report rendering, animation-end unlock, and reduced-motion unlock.
- [x] Run the focused tests and confirm each failure corresponds to the current race/timer behavior.
- [x] Add a synchronous opening guard and cancellable reveal timer; guard repeat report events.
- [x] Finish shuffle on all three `animationend` events, with reduced-motion handling and a post-duration safety timeout; limit shuffle compositing to transform.
- [x] Run the focused Node suite and all Node and Python suites.

### Task 4: Integrated verification and release

**Files:**
- Review: all changed files

- [ ] Run `git diff --check`, all Node tests, all Python unittests, and deployment smoke checks.
- [ ] Run local isolated-browser checks for 360 px, 390 px, and 430 px widths, Home, Back, forward feature navigation, Tarot shuffle, and repeated taps.
- [ ] Review the final diff against this spec and ensure API, database, service, and bottom navigation are unchanged.
- [ ] Push branch, open PR, wait for CI, merge after checks pass.
- [ ] Stage and deploy the exact merged SHA with `deploy_lightsail.sh`; verify service, active release, health endpoint, and public rendered routes.
- [ ] If physical iPhone edge-swipe cannot be exercised, report it separately from browser and unit-test verification.
