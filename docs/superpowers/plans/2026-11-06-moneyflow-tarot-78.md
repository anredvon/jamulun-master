# MoneyFlow 78-card Tarot Implementation Plan

> **For agentic workers:** Follow the plan task-by-task and record verification evidence below.

**Goal:** Replace the 24-card draw pool with a complete MoneyFlow-interpreted 78-card Tarot deck, remove collection UI, and preserve old history.

**Architecture:** Keep Flask routes and the browser-local history store. Separate the 78-card draw catalog from the old 24-card history compatibility catalog. Generate original text-free raster card fronts; keep all result copy in card data rendered by the existing UI.

**Tech Stack:** Flask/Jinja, Python card catalog, vanilla JavaScript, CSS, Node tests, Python unittest, ImageGen raster assets.

**Spec:** `docs/superpowers/specs/2026-11-06-moneyflow-tarot-78.md`

## Global constraints

- Keep random one-card selection with replacement and the existing redraw behavior.
- Preserve existing `moneyflow_history_v1` records and legacy card images/copy resolution.
- Do not change API, DB, route, service, or production deployment settings.
- Do not delete old local history or collection storage.

## Review focus

- Draw pool has exactly 22 Major Arcana and 56 Minor Arcana, all unique.
- A legacy card ID resolves only for history and never appears in the new random pool.
- Each new card's questions have distinct intent and avoid prediction/instruction language.
- No collection references remain in Tarot screens or runtime behavior.
- All referenced raster assets exist and have consistent portrait dimensions.

---

### Task 1: Catalog and history compatibility contracts — complete

**Files:** `tests/test_deploy_smoke.py`, `tests/history-view-model.test.js`, `tarot_cards.py`, `app.py`

- [x] Write failing tests for 78 unique draw cards, 22/56 category counts, complete copy fields, legacy IDs kept out of the draw pool, and exact old-history resolution.
- [x] Run focused tests and confirm they fail for the missing 78-card contract.
- [x] Preserve the current 24 cards in a legacy catalog and define a separate 78-card draw catalog with stable new IDs.
- [x] Pass both catalog roles correctly: Tarot page gets only the 78 draw cards; History gets new plus legacy lookup entries.
- [x] Verify new and legacy history preview resolution tests pass.

### Task 2: Card copy and no-collection flow — complete

**Files:** `tests/test_deploy_smoke.py`, `tests/history-view-model.test.js`, `templates/tarot.html`, `static/js/tarot.js`, `static/css/tarot.css`, `static/js/history-view-model.js`

- [x] Add failing tests for the single short picker framing line, absence of collection DOM/runtime, and persistence of new card IDs in existing history records.
- [x] Remove collection progress/modal/discovery UI and its browser-local counting behavior while leaving the separate history store untouched.
- [x] Update the picker copy to 78, use the accepted concise framing line once, and keep three random backs and current redraw behavior.
- [x] Show the new card title/keyword and the three approved copy fields in reveal/report; remove repeated disclaimers and collection note.
- [x] Confirm the existing History row and details still work for both catalogs.

### Task 3: 78 original raster cards — complete

**Files:** `static/images/tarot/moneyflow_78/` and card catalog image paths

- [x] Copy the three approved sample artworks into project assets for The Fool, Temperance, and The Hermit.
- [x] Generate original raster artwork for every remaining Major and Minor Arcana card in the approved style, one unique ImageGen generation per card.
- [x] Confirm all 78 image files are unique and scaled to 768×1152 portrait JPEGs. Generation prompts excluded lettering; visual review included the approved samples and selected generated cards.
- [x] Confirm all catalog image references resolve locally.

### Task 4: Responsive result screens and full verification — partially complete

**Files:** screenshots/browser only; tests and plan records

- [x] Run full Python and Node CI suites.
- [ ] Verify picker, reveal, report, and History at exact 360/390/430px viewport overrides; verify new and legacy card images.
- [x] Visually inspect local picker, random reveal, interpretation report, and saved-history detail in the in-app browser. Review image/copy consistency and `git diff --check`.
- [x] Record the exact-width viewport limitation below. Keep production deployment out of this task.

### Task 5: Result hierarchy and card-back separation — complete

**Files:** `tests/test_deploy_smoke.py`, `templates/tarot.html`, `static/js/tarot.js`, `static/css/tarot.css`

- [x] Write and run a failing regression test for Korean-only card naming, the natural `오늘의 흐름` label, and a clearer card-back edge/shadow.
- [x] Remove the unused English title from the result UI and keep the report title in Korean only.
- [x] Replace `생각해볼 거리` with `오늘의 흐름` while retaining the full reflection paragraph and both short questions.
- [x] Strengthen the card-back perimeter and offset shadow without changing the card artwork or picker layout.
- [x] Run the focused regression test (1 passed). Full suites will run after route-transition integration.

## Verification notes

- Python: `python -m unittest discover -s tests -p 'test_*.py' -v` — 59 passed.
- Node: repository CI command — 49 passed.
- Asset audit: 78/78 catalog paths exist, 78 unique content hashes, 768×1152, 36 MB total.
- Local browser: picker, card reveal, interpretation report, and a new History entry/detail rendered successfully. The current CUA browser has no viewport override, so exact 360/390/430 CSS-pixel runs remain unverified.
- At the time of this plan update, production deployment and remote publish remain pending. No API or DB schema/service change was made.
