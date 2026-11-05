# MoneyFlow History and Today Icon Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore card-specific recognition in Tarot History and bring MoneyFlow branding, Home, Quote, and Today marks into the existing generated raster icon system.

**Architecture:** History resolves a saved Tarot `meta.cardId` against the existing embedded Tarot catalogue and renders a small card preview with the shared Tarot category mark; missing IDs fall back safely to the feature icon. The shared header uses the existing raster cat brand asset and one new transparent raster Home image; Today headings reuse canonical Quote and Today sprite classes. No route, persistence, API, DB, service, or deployment settings change.

**Tech Stack:** Flask/Jinja, vanilla JavaScript, CSS, transparent PNG, Python unittest, Node test runner, mobile browser emulation, GitHub Actions, Lightsail release script.

**Spec:** `docs/superpowers/specs/2026-11-05-moneyflow-history-today-icon-refinement.md`

## Global Constraints

- Same feature uses its canonical sprite wherever repeated; selected-card art is a record preview, not another Tarot feature icon.
- New Home art is generated raster PNG with real transparency; do not add a vector substitute.
- Preserve the selected zodiac sign's constellation and the meaning of the Home action.
- Keep API, database, service configuration, auto-deploy state, route behavior, user-facing copy, Tarot draw randomness, and redraw policy unchanged.
- Deploy only the tested, reviewed, CI-passing SHA through the existing manual release script with rollback and health check.

## Review Focus

- Valid Tarot `meta.cardId` selects the exact catalogue card image in the History row; covered by a unit test and seeded browser capture.
- Missing/unknown `meta.cardId` leaves the shared Tarot icon visible without a broken-image request; covered by a unit test and render assertion.
- The Tarot category marker stays the same canonical feature sprite as the Tarot entry point; covered by template/source test and browser inspection.
- The 44px Home control remains accessible and the raster house is recognizable at 360px; covered by markup test and iPhone-size visual review.
- Today selected-sign constellation and the bottom-nav mini sprite remain unchanged; covered by focused template assertions and browser comparison.

---

### Task 1: Tarot History card preview with canonical category marker

**Files:**
- Modify: `static/js/history-view-model.js`
- Modify: `static/js/history.js`
- Modify: `static/css/history.css`
- Modify: `tests/history-view-model.test.js`
- Verify: `templates/history.html` card catalogue JSON remains available

- [ ] Add `resolveTarotPreview(item, tarotCards)` tests: a valid saved `meta.cardId` returns the matching card including its image path; missing ID, unknown ID, non-Tarot item, and card with no usable image return `null`.
- [ ] Run the focused Node test and confirm it fails because no row preview resolver exists.
- [ ] Implement `resolveTarotPreview(item, tarotCards)` in `static/js/history-view-model.js`; make `history.js` use it to show the selected card as a compact portrait preview and retain the canonical Tarot mascot as a small category marker. Avoid generating or storing new draw state.
- [ ] Run the focused Node and Python tests; inspect a seeded Tarot History row at 360, 390, and 430 CSS px, plus a missing-card fallback.

### Task 2: Raster Home and Today icon alignment

**Files:**
- Create: `static/images/ui/icons/home-mascot.png`
- Modify: `templates/_app_header.html`
- Modify: `templates/today.html`
- Modify: `static/css/app-chrome.css`
- Modify: `static/css/today.css`
- Modify: `tests/test_deploy_smoke.py`

- [ ] Add `test_header_uses_raster_brand_and_home_assets` and `test_today_uses_canonical_quote_and_today_raster_icons`: assert rendered Home/History/Today pages use the raster brand and Home `<img>`, Today heading classes are the canonical Quote/Today feature sprites, and the selected-zodiac control remains.
- [ ] Run focused Python tests and confirm they fail on the current CSS-ring/inline-SVG/glyph markup.
- [ ] Generate and inspect the transparent Home raster; copy it into the project assets directory without overwriting existing assets.
- [ ] Wire the existing `cat_icon.png` as the shared brand mark, use the new Home raster inside the unchanged 44px control, and reuse the Quote/Today feature classes in their headings.
- [ ] Run focused Python tests; verify PNG alpha, network loads, accessible labels, control sizes, and unchanged safe-area/nav layout at 360, 390, and 430 CSS px.

### Task 3: Full verification and production release

**Files:**
- Verify only: no API, DB, service, or deployment configuration files change.

- [ ] Run `python -m unittest discover -s tests -p 'test_*.py' -v` in the isolated project environment.
- [ ] Run `node --test tests/history-store.test.js tests/history-view-model.test.js tests/palm-analysis.test.js tests/palm-copy.test.js tests/today.test.js tests/lotto-ui.test.js`.
- [ ] Run `git diff --check`, inspect changed paths, and perform a fresh reviewer pass.
- [ ] Push a PR to protected `main`, wait for required CI, and merge only the reviewed commit.
- [ ] Stage/deploy that exact merged SHA with the existing Lightsail release script. Confirm active release, `/healthz`, public CSS/PNG responses, and live Home/History/Today renderings.
- [ ] Leave the auto-deploy timer and all production data/configuration unchanged.
