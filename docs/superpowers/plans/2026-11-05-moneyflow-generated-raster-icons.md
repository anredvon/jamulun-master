# MoneyFlow Generated Raster Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace feature and bottom-navigation vector icons with generated cat-mascot PNG sprites, sharing one canonical raster illustration per feature and using separate dedicated mini PNGs in the bottom tabs.

**Architecture:** Generate a transparent 3×3 feature sprite atlas and a transparent 2×2 bottom-navigation atlas. A shared Jinja macro emits canonical feature classes for Home, Check, and History; global CSS maps those classes to atlas cells, while the shared bottom-nav template uses the dedicated mini atlas. `/lotto/history` redirects to `/history?filter=lotto`, so the canonical Lotto feature image appears in the shared History row. No routes, interactions, data structures, or services change.

**Tech Stack:** Flask, Jinja, HTML, CSS sprite atlases, PNG, Python unittest/pytest, Node test runner, GitHub Actions, AWS Lightsail release scripts.

**Spec:** `docs/superpowers/specs/2026-11-05-moneyflow-generated-raster-icons.md`

## Global Constraints

- Feature and bottom-navigation illustration assets are transparent raster PNGs; no vector icon files or inline SVGs in these icon systems.
- The same feature uses the exact same sprite cell in every context; bottom navigation is a separate but visually consistent mini set.
- Preserve routes, user-visible copy, random behavior, history storage, APIs, database, service settings, and deployment configuration.
- Preserve existing mobile layout and safe-area behavior; tune only image size and crop.
- Preserve existing untracked documentation and previews in the original checkout; implement on the isolated clone branch.
- Production release must use the repository's CI/release process and exact reviewed commit.

## Review Focus

- Sprite background positions select exactly one transparent cell at each display size — verified in rendered screenshots at 360, 390, and 430 CSS px.
- Home and History entries for the same feature render the identical feature sprite class — verified by template and browser output.
- Bottom mini images remain distinct enough from feature illustrations at 26px — checked visually on all four tabs.
- Missing/unknown feature names retain a safe, non-broken fallback — covered by a rendering test.
- Production deploy does not touch databases, APIs, or service configuration — checked by the diff and existing release script.

---

### Task 1: Lock the icon contract with failing tests

**Files:**
- Modify: `tests/test_deploy_smoke.py`
- Test asset paths: `static/images/ui/icons/feature-mascots.png`, `static/images/ui/icons/bottom-nav-mascots.png`

- [x] Add tests asserting rendered `/home`, `/check`, and `/history` contain expected raster icon classes and load the shared icon stylesheet.
- [x] Add tests asserting the four bottom-nav entries use `nav-illustration` classes, not inline SVG.
- [x] Add tests asserting the Home/History feature keys map to the same classes and required PNG files exist.
- [x] Run the targeted tests and confirm they fail for the missing raster implementation.

### Task 2: Generate and wire the canonical PNG icon atlases

**Files:**
- Create: `static/images/ui/icons/feature-mascots.png`
- Create: `static/images/ui/icons/bottom-nav-mascots.png`
- Create: `static/css/feature-icons.css`
- Modify: `templates/base.html`
- Modify: `templates/_content_icon.html`
- Modify: `templates/_bottom_nav.html`
- Modify: `templates/check.html`
- Modify: `templates/history.html`
- Modify: `static/css/home-visual.css`
- Modify: `static/css/check.css`
- Modify: `static/css/history.css`
- Modify: `static/css/app-chrome.css`

- [x] Generate transparent 3×3 feature and 2×2 bottom-nav atlases with consistent 3D cat artwork and the approved row-major mapping.
- [x] Implement one reusable sprite-position map in `feature-icons.css` and load it globally.
- [x] Update the Jinja macro to render raster feature sprites, including tarot, palm, lotto, check, future, spending, money, quote, and history.
- [x] Replace the Check page's inline feature SVGs with the canonical macro.
- [x] Replace bottom-nav inline SVGs with the dedicated four-cell PNG sprites; preserve active-state background, label, min-height, and safe-area padding.
- [x] Update scoped CSS selectors to size the raster crops without changing card geometry or layout.
- [x] Run the targeted tests and verify green.

### Task 3: Verify all placements and mobile rendering

**Files:**
- Verify: all changed templates and CSS; no other files expected.

- [x] Run the full Python and Node test suites available in the repository (51 Python and 41 Node tests pass).
- [x] Start the isolated local Flask environment and capture Home, Check, and History with temporary browser-local Tarot, Lotto, and Check records at 360×844, 390×844, and 430×844. Lottery History redirects to `/history?filter=lotto`.
- [x] Inspect PNG alpha, crop boundaries, feature-to-history consistency, tab legibility, and touch-target preservation. New CSS and PNG requests returned HTTP 200; console errors were not separately audited.
- [x] Review `git diff --check` and confirm API, DB, behavior, and deployment files are untouched.

### Task 4: Release the reviewed commit to production

**Files:**
- No deployment or service configuration files may change.

- [ ] Confirm repository branch protection and Lightsail release/auto-deploy readiness; do not infer deployment status from `/healthz` alone.
- [ ] Push the isolated branch and open a PR; wait for required CI.
- [ ] Merge the reviewed commit using the existing GitHub flow and deploy that exact SHA through the current release mechanism.
- [ ] Verify the active release SHA if host access allows, health, and live Home/Check/History/Lottery History icon rendering.
- [ ] If host access or required deployment gates are unavailable, stop at the exact gate and report the PR/CI/source state separately from production state.
