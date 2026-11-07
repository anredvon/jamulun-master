# MoneyFlow Tarot and Palm Reading Voice and Typography Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite all active Tarot and palm readings in the approved warm, human fortune-reader voice, then improve reading typography for iPhone.

**Architecture:** Keep the 78-card deck IDs, random selection, routes, APIs, data schema, and history behavior intact. Store the 78 active Tarot readings in a keyed copy catalog and merge the same `flow`, `caution`, and `line` fields into existing card objects. Rewrite the 14 approved palm catalog rows without changing keys or feature codes; deploy these existing content rows through the current seed path. Tune the existing system font stack and the Tarot/palm reading roles only.

**Tech Stack:** Flask/Python, JSON content catalogs, vanilla JavaScript, CSS, unittest, Node test runner.

**Spec:** User-approved MoneyFlow Tarot and palm reading tone in conversation, plus `docs/superpowers/specs/2026-11-03-palm-reading-grounded-analysis-design.md`.

## Global Constraints

- Tarot remains daily entertainment and self-reflection, not financial advice or prediction.
- Tarot selection remains random with the current redraw policy.
- Existing APIs, database schema, deployment settings, and service behavior remain unchanged.
- Only palm-reading content rows are updated in the existing database; no migrations or user-history edits.
- Palm interpretations use visible features and traditional symbolism; unclear features remain unclaimed.
- The 24 legacy Tarot cards remain intact for historical records; all 78 active Tarot readings are rewritten.
- Use the existing iPhone-friendly system font stack, with clear Korean reading text and platform fallbacks.

## Review Focus

- Every Tarot card has a distinct conversational reading, a concise personal reflection question, and a short non-duplicative cat question.
- No Tarot text implies investment advice, assured financial outcomes, or deterministic prediction.
- Every active palm feature code and source locator remains present; uncertain patterns stay uncertain.
- Existing hand photo processing, APIs, and schema remain untouched.
- Reading text remains legible at narrow iPhone widths and with font fallback.

### Task 1: Pin copy and typography expectations with failing tests

**Files:** `tests/test_deploy_smoke.py`, `tests/palm-copy.test.js`

- [x] Test all 78 Tarot IDs have a unique reading and separate questions, with approved King/Ten of Wands examples.
- [x] Test all 14 approved palm rules keep their IDs, sources, and human-readable reading structure without analysis-process filler.
- [x] Test the Tarot and palm reading roles meet mobile type-size and leading floors.
- [x] Run focused tests and confirm the new assertions fail against the current content.

### Task 2: Rewrite active Tarot and palm copy

**Files:** `static/data/tarot-readings.json`, `tarot_cards.py`, `static/data/palm-reading-rules.json`, `static/data/palm-sources.json`, `docs/palm-reading-sources.md`

- [x] Add 78 newly written Tarot readings in the approved voice; merge them into existing deck records without changing selection behavior.
- [x] Rewrite all active palm rules with feature-specific traditional readings and natural reflection prompts.
- [x] Add the user-requested wikiHow reference as a traditional palmistry source while excluding medical, lifespan, mental-health, and deterministic claims.
- [x] Confirm all rule keys, feature codes, source locators, and active status are preserved.

### Task 3: Improve reading typography

**Files:** `static/css/jaemulun.css`, `static/css/tarot.css`, `static/css/palm.css`, `templates/palm.html`, `templates/tarot.html`

- [x] Prefer loaded Pretendard on compatible clients, retaining iOS/system Korean fallbacks.
- [x] Set reading prose at or above 16px with comfortable line-height and stronger text contrast; keep labels and metadata clearly secondary.
- [x] Update only cache keys needed for changed assets.
- [x] Run the Impeccable type detector and review its findings (zero findings).

### Task 4: Verify and release

**Files:** tests and existing deployment tooling only.

- [x] Run Python and Node suites (65 Python and 73 Node tests passed), catalog checks, and `git diff --check`.
- [x] Render Tarot and palm capture pages at 360, 390, and 430px; inspect Tarot draw, reveal, and report at 390px. Palm interpretation text is covered by catalog and typography tests; no palm-photo fixture exists for a complete local result screenshot.
- [ ] Merge/release only the verified commit; run production health and live route checks.
- [ ] Reseed only the existing palm source/rule content records using the established seed command; verify served readings and leave user records untouched.
