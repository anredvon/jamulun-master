# Today Zodiac Experience Implementation Plan

> **For agentic workers:** Use this plan to implement the approved Today zodiac design in the existing Flask/Jinja app.

**Goal:** Add a compact, actionable selected-sign horoscope and an all-12-sign daily overview to the Today page.

**Architecture:** Extend the existing server-rendered daily zodiac payload with an action and lucky item for each sign. Keep selected-sign persistence and constellation selection in the current client script; add a separate accessible sheet for the all-sign overview that consumes the same payload.

**Tech Stack:** Flask, Jinja, vanilla JavaScript, CSS.

**Spec:** `docs/superpowers/specs/2026-11-04-today-zodiac-experience-design.md`

## Global Constraints

- Use Asia/Seoul date and existing weekday rotation.
- No external API, dependency, or copied third-party horoscope content.
- Preserve the existing four-tab navigation and selected sign storage.
- Keep all-sign entries synchronized to the selected-sign card's date and source note.
- Do not add tests in this UI/content change; run the repository's existing Python and Node CI smoke suites before release.

## Review Focus

- A sign is missing from the payload: all 12 entries must render without breaking the selected card.
- User has no saved sign: keep the current prompt and allow selection from either sheet.
- Sign selection from the overview: update the card and saved preference, then close the overview.
- Narrow/short viewport: list scroll stays inside its sheet; main navigation remains available.
- JavaScript disabled or malformed payload: preserve server-rendered fallback and avoid a broken dialog.

## Tasks

### Task 1: Extend the daily content payload

**Files:** Modify `today_routes.py`.

- Add a concise editorial action for each sign and a date/sign-stable lucky item.
- Include action and item fields in the existing `horoscope_data.signs` entries.
- Keep fortune, action and item source labeled as MoneyFlow content.

### Task 2: Update Today markup and layout

**Files:** Modify `templates/today.html`, `static/css/today.css`.

- Add labeled flow/action sections and the lucky-item chip to the selected-sign card.
- Add a `다른 별자리도 보기` trigger and a separate accessible list sheet.
- Style the sheet and compact entries responsively, preserving reduced-motion behavior and current navigation.

### Task 3: Wire overview behavior

**Files:** Modify `static/js/today.js`.

- Render all 12 entries from the existing JSON payload with safe text nodes and current constellation SVGs.
- Support open, close, Escape, focus restoration, row selection, selected-state updates, and saved preference.
- Keep selection sheet and overview sheet behavior independent and robust to absent elements.

## Verification boundary

- Inspect the final diff and confirm the requested view hierarchy, copy fields, selectors, accessibility labels, and responsive styles.
- Run the exact CI smoke commands from `.github/workflows/jaemulun-ci.yml`; inspect both results.
- Deploy only the reviewed PR merge commit; then check the public Today page and `/healthz`.
