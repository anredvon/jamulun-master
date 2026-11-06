# MoneyFlow Mobile UI Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the approved icon split and correct mobile header, Tarot card framing, and route transition behavior before deploying the verified result.

**Architecture:** Keep bottom-navigation raster atlas usage scoped to bottom-nav classes; restore existing illustrated feature-icon rendering in Home and History. Centralize the header's back slot and brand alignment in shared chrome. Diagnose the route transition capture/stacking around Check→History, then constrain transitions to one page surface. Adjust Tarot back artwork scale inside the fixed card frame.

**Tech Stack:** Flask/Jinja, CSS, vanilla JavaScript, Python unittest, Node test runner, GitHub Actions, Lightsail release script.

**Spec:** `docs/superpowers/specs/2026-11-06-moneyflow-mobile-ui-followup.md`

## Global Constraints

- Keep feature icons illustrated and consistent by feature across Home and History.
- Keep the four monochrome bottom-navigation icons and Korean labels from the supplied reference.
- Keep Tarot random draw and current redraw policy.
- Preserve API, database, and deployment configuration behavior.

## Review Focus

- Pages without a prior destination still show `← 홈` and reach Home.
- A prior same-origin route receives a reverse transition; external referrers do not control navigation.
- Home and History reuse the same per-feature illustration.
- Tarot card art does not clip/cut meaningful card-back ornaments at 360px, 390px, or 430px.
- Reduced motion keeps navigation immediate; browsers without a cross-document transition API get a CSS entry/exit motion fallback.

---

### Task 1: Restore the approved feature-icon scope

**Files:** `templates/_content_icon.html`, `static/css/feature-icons.css`, relevant smoke tests.

- [x] Add assertions that Home and History use the same existing illustrated icon by feature and the bottom navigation remains on its own monochrome atlas.
- [x] Restore the existing illustration mapping for feature icons without changing `_bottom_nav.html` artwork.
- [x] Run focused and full test suites.

### Task 2: Align the shared back control and brand

**Files:** `templates/_app_header.html`, shared header CSS, smoke tests.

- [x] Add route-render assertions for visible `← 홈` on non-home pages and a stable brand column.
- [x] Implement one shared header grid that reserves the same back-control column and brand coordinates across content routes.
- [x] Verify screenshot/layout and tests at the specified mobile widths.

### Task 3: Correct Tarot card/backdrop proportions

**Files:** `static/css/tarot.css`, Tarot CSS/render tests if available.

- [x] Tune only the back-image frame gutter against the supplied screenshot.
- [x] Verify the card-back image at 360px, 390px, and 430px without horizontal clipping.

### Task 4: Remove transition ghosting

**Files:** `static/css/app-chrome.css`, `static/js/page-transitions.js`, `tests/page-transitions.test.js`.

- [x] Inspect the page shell and fixed bottom navigation structure for Check→History; make History opaque to prevent bleed-through.
- [x] Add regression tests for route intent, history restoration, and reduced-motion behavior.
- [x] Implement Home-up, forward-right-to-left, browser Back/edge-swipe reverse entry, and reduced-motion behavior without relying on cross-document View Transitions.
- [x] Verify route layouts at 360px, 390px, and 430px; inspect stable Check and History screens in browser.

### Task 5: Release

- [x] Run Python unittest and Node test suites, JavaScript syntax check, and diff check.
- [ ] Push branch, open PR, wait for smoke CI, merge the verified head.
- [ ] Archive exactly the merged SHA to a new release directory and run the existing rollback-capable Lightsail deploy script.
- [ ] Verify active SHA, service, private/public health, and live Home, Today, Check, History, and Tarot pages.

