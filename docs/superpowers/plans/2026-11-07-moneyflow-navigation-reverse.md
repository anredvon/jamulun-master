# MoneyFlow Navigation Reverse Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reverse the Home vertical transition during a normal browser history return and prevent custom motion from competing with iPhone Safari's native BFCache edge-swipe transition.

**Architecture:** The current history entry records its outgoing transition and destination before a custom same-origin navigation. A restored non-BFCache entry compares its referrer with that destination and plays the inverse transition. BFCache keeps the browser's interactive gesture, clears stale transforms, and unlocks the next navigation.

**Tech Stack:** Vanilla JavaScript, CSS keyframes, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-07-moneyflow-navigation-reverse-design.md`

## Global Constraints

- Keep `/today` distinct from `/home` and preserve its horizontal feature transition.
- Keep routes, APIs, database behavior, service/deployment configuration, Tarot draw behavior, and daily redraw policy unchanged.
- Preserve existing `history.state` fields and reduced-motion behavior.
- Do not add dependencies or deploy unrelated changes.

## Review Focus

- Home reversal: a matched history return after `home-up` enters with `home-down`.
- Non-Home reversal: a matched return after `forward` enters with `back`.
- Unmatched or absent history metadata: retain the horizontal `back` fallback.
- BFCache edge-swipe: `pageshow.persisted` does not add an app animation.
- Existing state and platform paths: preserve prior history state, reduced motion, standard links, and distinct `/today` navigation.

---

### Task 1: Record and reverse transition history

**Files:**
- Modify: `static/js/page-transitions.js`
- Modify: `static/css/app-chrome.css`
- Tests: `tests/page-transitions.test.js`, `tests/test_deploy_smoke.py`

**Interfaces:**
- Consumes: existing click classifier and fallback entry handling.
- Produces: `reverseTransitionType(type)` and history metadata fields `moneyflowOutgoingTransition` / `moneyflowOutgoingDestination`.

- [x] Add regression tests for matched Home/non-Home reversal, mismatch fallback, preservation of existing history state, and BFCache no-op.
- [x] Run `node --test tests/page-transitions.test.js` and confirm new cases fail for the expected behavior.
- [x] Implement metadata recording, matching and inverse mapping; add `home-down` CSS entry keyframe. Keep existing transition distances and timings.
- [x] Run `node --test tests/page-transitions.test.js`, then the complete project test commands identified from repository documentation.
- [x] Review the diff for scope: transition JS/CSS, focused tests, and this plan/spec only.
- [x] Clear transient entry/exit attributes on `pagehide` so a BFCache-cached page returns at its resting transform.

