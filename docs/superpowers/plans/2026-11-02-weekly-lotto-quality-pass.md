# Weekly Lotto Quality Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the existing Draft PR #12 by aligning the lottery flow with explicit user action, improving mobile accessibility and animation performance, and verifying draw state without duplicating the feature.

**Architecture:** Continue the existing Flask Blueprint, SQLAlchemy persistence, Jinja templates, and dependency-free browser JavaScript in PR #12. Keep number generation, draw limits, idempotency, and saved results server-authoritative; make the client request a draw only after an explicit button activation and animate that committed result. Preserve the current MoneyFlow shell and use the deep-purple/gold treatment only for the draw stage and result cards.

**Tech Stack:** Flask, Flask-SQLAlchemy, Jinja2, Vanilla JS/CSS, Python `unittest`, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-02-weekly-lotto-quality-pass-design.md` (approval: 2026-11-02, existing Draft PR #12).

## Global Constraints

- Preserve the current Flask + SQLAlchemy + Jinja2 + Vanilla JS/CSS stack and add no runtime dependency.
- Lottery results are entertainment-only random numbers; do not imply prediction, improved odds, or a guarantee.
- Generate and persist numbers on the server before animation; the client animation is decorative.
- Allow at most three draws per visitor and verified draw round; preserve idempotency, saved results, and retry recovery.
- A page visit or refresh must not consume a draw; the user must press the draw button.
- Show round/date information only when its schedule basis is verified; otherwise omit the unverified date/round label and explain the temporary unavailability.
- Honor `prefers-reduced-motion`; do not run a continuous animation loop while idle, hidden, or offscreen.
- Keep existing bottom navigation, local history behavior, and unrelated working-tree state intact.
- Do not merge the PR or deploy the application.

## Review Focus

- Refresh or first visit with zero draws must not create a result or consume a draw; verify with UI-flow tests and API status.
- A request can commit while its response is lost; status refresh must restore the exact saved result without consuming another slot.
- Rapid double activation and concurrent requests must never exceed three saved results; verify with SQLite concurrency coverage.
- Reduced-motion, hidden-tab, and offscreen states must stop nonessential animation while keeping the result immediately readable; verify motion controls and reduced-motion UI path.
- Schedule uncertainty or an exceptional draw date must not display a guessed public round/date; verify schedule fixtures and rendering rules.

---

### Task 1: Verify the Draft PR base and draw schedule inputs

**Files:**
- Inspect: `lotto_service.py`
- Inspect: `lotto_routes.py`
- Inspect: `docs/weekly-lotto-v1.1.md`
- Test: `tests/test_lotto.py`

**Interfaces:**
- Consumes: existing `current_draw(now=None) -> (round_number, draw_date)` and `/api/lotto/status` response.
- Produces: verified schedule behavior or an explicit unavailable schedule state for the UI; no date or round is presented as official without evidence.

- [x] **Step 1: Check the official lottery schedule and current published draw record** using the official operator source; record the source and whether special schedules are represented.
  - Expected: the operator documents routine Saturday draws and a 20:00 Saturday internet sales cutoff; its page notes the broadcast time may vary. The latest published result page is used only as the current round anchor.
- [x] **Step 2: Add a focused regression test** for an aware UTC timestamp at the KST sales cutoff and verify round/date conversion against the official routine.
  - Expected: the timestamp is converted to KST before applying the Saturday cutoff; no local-host timezone assumption is used.
- [x] **Step 3: Change schedule behavior only if the new evidence-backed regression test exposes a mismatch**; if exceptions cannot be modeled safely, return a non-displayable schedule state instead of an estimate.
- [x] **Step 4: Run the focused schedule tests** with `python -m unittest discover -s tests -p 'test_lotto.py' -v`.
  - Expected: all `test_lotto.py` tests pass for the documented recurring schedule; no special schedule is listed for this date in the source checked.
- [x] **Step 5: Commit** `docs(lotto): record official schedule basis`.

### Task 2: Make draw initiation explicit and recovery-safe

**Files:**
- Modify: `static/js/lotto.js`
- Modify: `templates/lotto.html`
- Test: `tests/lotto-ui.test.js`
- Modify: `.github/workflows/jaemulun-ci.yml`

**Interfaces:**
- Consumes: `/api/lotto/status`, `/api/lotto/draw`, existing UUID idempotency key, result card rendering, and `MoneyFlowHistory`.
- Produces: first draw only from a user action; `refresh()` restores persisted results; retry after a lost response re-queries status before permitting another draw.

- [x] **Step 1: Add a failing client-flow test** that loads a visitor with zero draws and asserts no POST occurs until the draw button is activated.
- [x] **Step 2: Add a failing client-flow test** that loads one or more saved results and asserts the cards render without issuing a draw POST.
- [x] **Step 3: Add a failing recovery test** that simulates a committed draw with a lost response and verifies a status refresh restores the same result and remaining count.
- [x] **Step 4: Implement the explicit-click flow** and update initial/remaining draw button text; retain request locking and server-provided results.
- [x] **Step 5: Run `node --test tests/lotto-ui.test.js`**.
  - Expected: first-visit, revisit, and lost-response recovery flow tests pass.
- [x] **Step 6: Commit** `fix(lotto): require explicit draw action`.

### Task 3: Bound animation work and support reduced motion

**Files:**
- Modify: `static/js/lotto.js`
- Modify: `static/css/lotto.css`
- Test: `tests/lotto-ui.test.js`

**Interfaces:**
- Consumes: existing Canvas scene, draw state, `prefers-reduced-motion`, document visibility, and result animation.
- Produces: a start/stop-controlled Canvas animation that runs only while visible and needed; a static final-state result when motion is reduced.

- [ ] **Step 1: Add a failing animation lifecycle test** asserting no perpetual frame scheduling while idle and no frame loop while the document is hidden or the stage is offscreen.
- [ ] **Step 2: Add a failing reduced-motion test** asserting the result numbers become readable without waiting for the full animation sequence.
- [ ] **Step 3: Implement bounded animation lifecycle controls** using existing browser APIs (`requestAnimationFrame`, Page Visibility, IntersectionObserver where supported) with a safe fallback.
- [ ] **Step 4: Implement a reduced-motion CSS and JS path** that removes decorative looping effects and presents committed numbers immediately.
- [ ] **Step 5: Run `node --test tests/lotto-ui.test.js`**.
  - Expected: lifecycle tests show no idle loop and confirm stop/start across draw, hide, show, completion, and reduced motion.
- [ ] **Step 6: Commit** `perf(lotto): bound draw animation lifecycle`.

### Task 4: Refine mobile readability, focus, and sharing fallback

**Files:**
- Modify: `templates/lotto.html`
- Modify: `static/css/lotto.css`
- Modify: `static/js/lotto.js`
- Test: `tests/lotto-ui.test.js`

**Interfaces:**
- Consumes: current theme tokens, accessible status region, result cards, Web Share API, clipboard, and PNG download fallback.
- Produces: readable result/status text, keyboard-visible focus, touch-sized actions, and a useful fallback when native sharing or clipboard is unavailable.

- [ ] **Step 1: Add failing UI-flow assertions** for labeled number results, draw progress announcements, visible keyboard focus, and copy/download fallback selection.
- [ ] **Step 2: Increase undersized supporting text and action hit areas** while preserving the existing 430px mobile shell and 320px layout.
- [ ] **Step 3: Add explicit accessible labels/live announcements** for the six-number result and draw status without exposing decorative Canvas balls to assistive technology.
- [ ] **Step 4: Implement copy/download fallback behavior** for unavailable or failed native sharing; keep cancellation from reporting a false failure.
- [ ] **Step 5: Run `node --test tests/lotto-ui.test.js`**.
  - Expected: accessibility and share fallback tests pass without unsupported APIs throwing.
- [ ] **Step 6: Commit** `feat(lotto): improve accessible sharing and results`.

### Task 5: Validate limits, concurrency, and regression behavior

**Files:**
- Modify: `tests/test_lotto.py`
- Modify: `.github/workflows/jaemulun-ci.yml`

**Interfaces:**
- Consumes: existing `LottoDraw` unique constraints, lottery API routes, existing app smoke tests, and the CI workflow.
- Produces: repeatable coverage of range, uniqueness, 3-draw cap, idempotency, concurrency, ownership, migration safety, and existing route regressions.

- [ ] **Step 1: Add a failing concurrent-request test** with separate clients for one owner; assert no more than three records exist and all accepted results have unique sequence slots.
- [ ] **Step 2: Add a failing migration safety check** that confirms the additive lottery table creation leaves existing tables/data intact.
- [ ] **Step 3: Run the focused suite** with `python -m unittest discover -s tests -p 'test_lotto.py' -v`.
  - Expected: all Lotto backend tests pass, including concurrency and migration-safety coverage.
- [ ] **Step 4: Run the full Python suite** with `python -m unittest discover -s tests -p 'test_*.py' -v`.
  - Expected: all existing and Lotto Python tests pass.
- [ ] **Step 5: Run the JavaScript suite** with `node --test tests/history-store.test.js tests/history-view-model.test.js tests/palm-analysis.test.js tests/lotto-ui.test.js`.
  - Expected: all existing history/palm tests and new Lotto UI tests pass.
- [ ] **Step 6: Run the route smoke check** using `flask --app app routes` under the test environment.
  - Expected: `/lotto`, `/api/lotto/status`, `/api/lotto/draw`, `/api/lotto/share`, and `/lotto/shared/<token>` appear in the route table.
- [ ] **Step 7: Perform browser visual checks** at 320px, 375px, 430px, and desktop widths; inspect draw, refresh restore, reduced motion, native share, and fallback behavior. Record unavailable physical-device checks without claiming them as passed.
- [ ] **Step 8: Commit** `test(lotto): verify quota and mobile behavior`.

### Task 6: Review and update the existing Draft PR

**Files:**
- Modify: `docs/weekly-lotto-v1.1.md`
- Modify: existing PR #12 description only if its test checklist is now evidenced.

**Interfaces:**
- Consumes: verified implementation and test results from Tasks 1–5.
- Produces: an updated PR #12 with accurate behavior, test evidence, and uncompleted device/production checks clearly identified.

- [ ] **Step 1: Inspect the final diff** against PR #12 and confirm only approved files and behavior changed.
- [ ] **Step 2: Run a code review pass** for data ownership, quota races, schedule truthfulness, reduced-motion, and sharing privacy.
- [ ] **Step 3: Update documentation and PR text** using only observed test outcomes; do not mark unperformed manual or production checks complete.
- [ ] **Step 4: Leave PR #12 in Draft**; do not merge or deploy.

