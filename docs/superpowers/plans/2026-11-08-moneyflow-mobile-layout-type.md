# MoneyFlow Mobile Layout and Type Refinement Plan

> **For agentic workers:** This is a CSS-only UI refinement. Preserve existing application behavior and verify the changed pages with rendered mobile viewports.

**Goal:** Make MoneyFlow's iPhone layouts feel better balanced, keep long content legible above the fixed bottom navigation, and strengthen small-text readability.

**Architecture:** Preserve the current Flask/Jinja page structure and Pretendard family. Refine per-screen spacing in the existing CSS files, keep safe-area-aware bottom clearance, and make the fixed navigation visually opaque enough to mask scrolling content cleanly.

**Tech Stack:** HTML/Jinja, CSS, current Flask app.

**Spec:** User-approved order: (1) vertical balance and Check screen fit, (2) fixed bottom navigation overlap on long content, (3) typography size, contrast, and weight hierarchy.

## Global Constraints

- Do not change routes, APIs, DB, application behavior, or deployment configuration.
- Keep the established MoneyFlow lavender identity and Pretendard font family.
- Retain safe-area handling and allow long, dynamic content to scroll naturally.
- Production deployment was held during implementation and has now been explicitly authorized by the user on 2026-11-08; release only through the protected `main` workflow and the existing Lightsail auto-deploy path.

## Review Focus

- At 360px, compact spacing must not clip labels or touch targets.
- At 390px and 430px, Tarot should use the viewport more evenly without pushing the deck behind the bottom navigation.
- Check's third option and free notice must remain reachable and readable on short iPhone viewports.
- Long Palm, Today, Lotto, and History content must remain readable while scrolling; fixed navigation should mask underlying text cleanly and end content must clear it.
- Larger secondary text must preserve card wrapping and fit at narrow widths.

---

### Task 1: Balance Tarot and Check vertical layout

**Files:** `static/css/tarot.css`, `static/css/check.css`

- [x] Tune surplus vertical space around the Tarot deck and hint using responsive viewport-aware spacing.
- [x] Reduce Check's excess vertical footprint while preserving readable copy and usable option targets.
- [x] Manually inspect 360px, 390px, and 430px wide mobile renderings.

### Task 2: Keep long pages clear of fixed navigation

**Files:** `static/css/app-chrome.css`, `static/css/palm.css`

- [x] Make the fixed bottom navigation mask scrolled content cleanly.
- [x] Confirm app-chrome bottom clearance remains safe-area-aware and applies to long Palm reading content.
- [x] Manually inspect the Today page at an intermediate and final scroll position; inspect Palm and History source spacing and the supplied iPhone captures. Lotto was not separately rendered.

### Task 3: Improve supporting text hierarchy

**Files:** `static/css/app-chrome.css`, `static/css/home-visual.css`, `static/css/check.css`, `static/css/tarot.css`, `static/css/palm.css`, `static/css/today.css`, `static/css/history.css`, `templates/base.html`, `templates/home.html`, `templates/tarot.html`, `templates/check.html`, `templates/palm.html`, `templates/today.html`, `templates/history.html`

- [x] Raise the smallest explanatory and metadata text to a more readable size and contrast.
- [x] Preserve the current font family and distinguish display headings, card titles, body copy, and metadata through size, weight, and color.
- [x] Manually review text wrapping and visual hierarchy at 360px, 390px, and 430px.

### Final review

- [x] Run `git diff --check` and inspect the final CSS diff.
- [x] Run the same Python and JavaScript test commands used by `.github/workflows/jaemulun-ci.yml`: Python 65/65 passed; JavaScript 73/73 passed.
- [ ] Open a PR to protected `main`, wait for required CI, and merge the reviewed commit.
- [ ] Confirm Lightsail auto-deploy activates the exact merged SHA; verify `/healthz` and the live `/today` page.
- [ ] Confirm API, DB, and service/deployment configuration remain unchanged.
