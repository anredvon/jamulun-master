# MoneyFlow Tarot P1 Reflection and Dialog Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the random daily Tarot experience clearly entertainment and self-reflection, remove predictive scoring and advice from Tarot UI and History, and make both Tarot dialogs keyboard accessible.

**Architecture:** Keep the existing 24-card random selection, redraw behavior, content object shape, history storage format compatibility, and routes. Replace Tarot copy with reflection prompts; suppress Tarot scores in current and historical UI; add a small focus manager for dialog entry, Tab containment, and focus return.

**Tech Stack:** Flask/Jinja, vanilla JavaScript, Python card data, Node built-in test runner, Python unittest.

**Spec:** Existing MoneyFlow product direction: daily Tarot is entertainment and self-reflection, not individualized financial advice or financial prediction. The review targets P1 random-choice clarity, financial-prediction framing, and modal keyboard focus.

## Global Constraints

- Preserve the random draw from all 24 cards and existing redraw/day policy.
- Preserve routes, API contracts, database schema/values, service behavior, Tarot card object fields, and card artwork.
- Tarot copy must not promise or predict income, loss, luck, timing, or a financial outcome.
- Tarot results and History must not present numeric Tarot scores.
- Dialogs must receive initial focus, contain keyboard focus, and restore focus to the opener when closed.
- No deployment during this work.

## Review Focus

- Any of the three card backs starts an unweighted random draw; copy must say so and code must continue using the same random selection.
- Existing locally stored Tarot records may contain score and prediction copy; the History view must hide those values without mutating stored records.
- The card collection and result dialogs must each restore focus to their own triggering control after close.
- Tab and Shift+Tab at either focus boundary must stay inside the open dialog, including when there are no focusable descendants.
- A redraw must preserve existing behavior and must not accidentally restore stale focus or change the daily redraw rule.

---

### Task 1: Align random draw and make Tarot copy reflective

**Files:**
- Modify: `templates/tarot.html`
- Modify: `tarot_cards.py`
- Modify: `static/js/tarot.js`
- Test: `tests/test_deploy_smoke.py`

**Interfaces:**
- Consumes: Existing `TAROT_CARDS` objects and `randomCard()` behavior.
- Produces: Same 24 card objects and fields, with reflection-oriented Korean copy and UI that explicitly identifies the selection as random.

- [x] Add regression assertions in `tests/test_deploy_smoke.py` for random-draw copy, entertainment disclaimer, and all 24 cards having reflection-oriented copy with no fortune/financial prediction framing.
- [x] Run the focused tests and confirm they fail against current source.
- [x] Update headings, helper copy, result labels, and disclaimer; rewrite all 24 `status`, `flow`, `caution`, and `line` values as neutral self-reflection prompts without changing object shape or scores.
- [x] Keep `randomCard()` and redraw logic unchanged; ensure new History entries retain `meta.cardId` and omit Tarot score.
- [x] Run focused tests and confirm they pass.

### Task 2: Hide Tarot scores and stale predictive copy in History

**Files:**
- Modify: `static/js/history-view-model.js`
- Modify: `static/js/history.js`
- Test: `tests/history-view-model.test.js`

**Interfaces:**
- Consumes: Existing local history records and the canonical `tarotCards` list embedded in History.
- Produces: Tarot rows/detail show the card identity and reflection-oriented content, while check-result scores remain unchanged.

- [x] Add a regression test showing a legacy Tarot record with score and predictive summary is normalized to no score and a neutral summary, without mutating its input.
- [x] Add a focused source regression assertion in `tests/history-view-model.test.js` that Tarot detail no longer calls or renders score output; preserve score rendering for check records.
- [x] Run focused tests and confirm they fail against current source.
- [x] Hide legacy Tarot score and summary only in the view model, remove Tarot score rendering from detail, and preserve existing check score rendering.
- [x] Run focused tests and confirm they pass.

### Task 3: Add focus management for Tarot dialogs

**Files:**
- Create: `static/js/dialog-focus.js`
- Modify: `templates/tarot.html`
- Modify: `static/js/tarot.js`
- Test: `tests/dialog-focus.test.js`

**Interfaces:**
- Produces: `window.MoneyFlowDialogFocus.create(document)` with `open(dialog, initialFocus)`, `close()`, and `handleKeydown(event)` methods.
- `open` captures the opener, sets the current dialog, and focuses the initial target; `handleKeydown` contains Tab/Shift+Tab; `close` clears state and returns focus.

- [x] Add unit tests for initial focus, forward/reverse Tab wrapping, empty-dialog containment, and focus return.
- [x] Run tests and confirm they fail because the manager is missing.
- [x] Implement the focus manager and wire both dialog open/close paths to it, including Escape and backdrop close.
- [x] Run tests and confirm they pass.

### Task 4: Verify the branch against product constraints

**Files:**
- Verify: all files above and existing test suites.

- [x] Run the full Python unittest suite and all Node test files.
- [x] Inspect the diff to confirm only Tarot UI/copy/history presentation and dialog focus changed; confirm draw and redraw code, APIs, DB, and deployment files are untouched.
- [x] Record test totals, any existing warnings, and deployment status (not deployed).
