# Lotto Reference-Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Lotto UI flow to closely match the user's six-screen reference without changing draw ownership, quotas, or the app-wide navigation.

**Architecture:** Keep Flask, Jinja, CSS, Canvas, and vanilla JavaScript. Model entry, draw, reveal, and result as clear states within `/lotto`; add a separate `/lotto/history` page that consumes the existing owner-scoped history API. Reuse the current backend and branded image assets, and construct the premium gacha machine with HTML/SVG/CSS plus the existing Canvas ball animation.

**Tech Stack:** Flask, Flask-SQLAlchemy, Jinja2, CSS, inline SVG, Canvas, vanilla JavaScript.

**Spec:** `docs/superpowers/specs/2026-11-02-lotto-reference-fidelity-design.md` (approved by the user's “전체 수정해줘” request and the selected app-navigation scope).

## Global Constraints

- Keep the current global bottom navigation (`홈 · 오늘 · 체크 · 기록`).
- Preserve server-authoritative draws, UUID idempotency, ownership, stored results, and the maximum of three draws per visitor and round.
- A page visit or refresh must not create a draw.
- Keep current API routes and add only the history page route needed for the UI.
- Do not add a frontend framework, 3D engine, or runtime dependency.
- Respect reduced motion, hidden/offscreen states, keyboard focus, screen-reader semantics, and small phone widths.
- Label schedule data as based on the regular operator schedule and retain the irregular-schedule warning.
- Do not merge the Draft PR or deploy.

## Review Focus

- First entry or refresh must not submit a draw; only the CTA can start one.
- The draw transition must animate the saved server result and recover the same result if the request response is lost.
- The 3-attempt state, redraw CTA, and result history must agree after each successful draw and refresh.
- History must only show records belonging to the current anonymous owner and must group current round versus previous rounds correctly.
- Hidden/offscreen/reduced-motion/Canvas-unavailable states must not leave an incomplete draw or a blocked result screen.

---

### Task 1: Rebuild the Lotto entry and draw-stage shell

**Files:**
- Modify: `templates/lotto.html`
- Modify: `templates/home.html`
- Modify: `static/css/lotto.css`
- Reuse: `static/images/ui/wealth_check/cat_crystal_ball.png`, `cat_coin.png`, `crystal_ball_only.png`, coin and sparkle assets

**Interfaces:**
- Consumes: current `/api/lotto/status` fields `round`, `draw_date`, `remaining`, and `draws`.
- Produces: a reference-led dark purple/gold intro and a dedicated draw theater state while retaining existing app navigation.

- [x] **Step 1: Inspect matching mascot and decorative assets** and choose the crystal-ball cat, gold coin, hat, and sparkle assets that match the reference.
- [x] **Step 2: Restructure the Lotto template** into an entry hero with round/allowance, short feature benefits, explicit primary CTA, and a visually distinct draw-machine stage.
- [x] **Step 3: Build the machine artwork** from layered glass sphere, gold rings/base, lights, starfield and existing assets; keep numbered balls in Canvas/DOM so they remain dynamic.
- [x] **Step 4: Tune the Home Lotto card** to the reference as the third menu after Tarot and Palm, preserving the host navigation.
- [x] **Step 5: Implement the reference visual tokens and responsive layout** in `lotto.css` for 390px target width and 320–430px fluid widths.

### Task 2: Implement the entry → drawing → reveal → result presentation

**Files:**
- Modify: `static/js/lotto.js`
- Modify: `templates/lotto.html`
- Modify: `static/css/lotto.css`

**Interfaces:**
- Consumes: existing `/api/lotto/draw`, `/api/lotto/status`, `canvasAnimation`, and current `renderCard()` data.
- Produces: clear UI states matching the reference, with explicit CTA, approximately 4.8s staged reveal, and a premium final card.

- [x] **Step 1: Define explicit client states** for entry, drawing, reveal, and result without issuing a request during initialization or refresh.
- [x] **Step 2: Connect CTA activation to the existing server draw**; display progress only after the server returns a committed result and keep the request lock through animation.
- [x] **Step 3: Animate the six committed balls sequentially** in the stage, with complete-result fallback for reduced motion, hidden/offscreen state, or Canvas failure.
- [x] **Step 4: Rebuild the final card** with round and sequence, all six balls, remaining-count text, image save, link share, history link, and redraw CTA.
- [x] **Step 5: Preserve status refresh recovery** and render the result state after a committed request whose response was lost.

### Task 3: Add the dedicated Lotto history screen

**Files:**
- Modify: `lotto_routes.py`
- Create: `templates/lotto_history.html`
- Modify: `static/css/lotto.css`
- Modify: `static/js/lotto.js` or create `static/js/lotto-history.js`

**Interfaces:**
- Consumes: owner-scoped `GET /api/lotto/history` records and current round from `GET /api/lotto/status`.
- Produces: `/lotto/history` with current-round and prior-history tabs; each saved record shows sequence, saved time, and six numbers.

- [x] **Step 1: Add a page route** at `/lotto/history` that renders a Jinja template under the existing app shell.
- [x] **Step 2: Build the history header and current/past tabs** matching the reference's card density and mobile spacing.
- [x] **Step 3: Load owner-scoped history and group records** into current-round and previous-round panels; show an explicit empty state when no records exist.
- [x] **Step 4: Show the KST schedule summary** with Saturday, 20:00 sales cutoff and approximate 20:35 draw time plus the existing irregular-schedule caveat.
- [x] **Step 5: Add return paths** to the current Lotto draw and host Home screen.

### Task 4: Match spacing, typography, assets, and accessibility across states

**Files:**
- Modify: `static/css/lotto.css`
- Modify: `templates/lotto.html`
- Modify: `templates/lotto_history.html`
- Modify: `templates/lotto_shared.html`
- Modify: `docs/weekly-lotto-v1.1.md`

**Interfaces:**
- Consumes: MoneyFlow Pretendard and host shell; current privacy/schedule copy; existing decorative assets.
- Produces: consistent entry, draw, result, history and shared-result screens with accessible labels, visible focus, touch targets, and responsive behavior.

- [x] **Step 1: Align shared result screen** with the same premium result-card visual language and keep public result semantics.
- [x] **Step 2: Verify text hierarchy and contrast** for header, schedule metadata, counts, CTA, and disclaimer against real purple/gold surfaces.
- [x] **Step 3: Verify keyboard focus, screen-reader labels, list roles, minimum touch targets, reduced motion, and decorative-image hiding.**
- [x] **Step 4: Check the actual browser rendering** at phone-like 320px and 390px widths and the available desktop viewport; adjust the narrow layout.
- [x] **Step 5: Update feature documentation** to describe the new entry/draw/result/history flow and note device/viewport/schedule limitations accurately.

### Task 5: Final review and existing Draft PR update

**Files:**
- Review all changes against the design spec and existing Draft PR #12.
- Update the PR description with observed implementation and manual verification boundaries.

**Interfaces:**
- Consumes: completed UI states, current server APIs and repository constraints.
- Produces: updated existing Draft PR #12, still unmerged and undeployed.

- [ ] **Step 1: Review the diff** for accidental changes to global navigation, draw logic, ownership, quotas, and share privacy.
- [ ] **Step 2: Perform a fresh code review** of the UI/route changes and resolve material findings.
- [ ] **Step 3: Update PR #12 text** to describe delivered screens and distinguish local checks from device/production checks.
- [ ] **Step 4: Keep PR #12 Draft** and do not merge or deploy.
