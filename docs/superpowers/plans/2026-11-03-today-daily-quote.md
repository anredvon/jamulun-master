# Today Daily Quote Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/today` a compact, single-glance daily quote page and remove the duplicate quote tile from Home.

**Architecture:** The Flask `/today` route selects one source-attributed item from the existing quote catalog deterministically by Seoul date and renders it server-side. Today keeps only the daily quote content; Tarot remains in its dedicated tab and Home feature list.

**Tech Stack:** Flask/Jinja, existing JSON quote catalog, CSS, browser JavaScript only where still needed.

**Spec:** `docs/superpowers/specs/2026-11-03-today-daily-quote-design.md`

## Global Constraints

- Use `Asia/Seoul` as the day boundary.
- Display the Korean quote, author, and source link.
- Do not collect personal data or auto-save merely because the Today page is viewed.
- Do not hard-clip content; allow vertical scrolling on short viewports or with enlarged text.
- Keep the existing bottom tabs: 오늘·타로·체크·기록.

## Review Focus

- Empty/invalid quote catalog entries: select only entries with Korean text, author, and source URL; provide a non-crashing fallback.
- Date changes at UTC/Seoul boundaries: use Seoul date, so daily selection does not change at UTC midnight.
- Long quote/title/source strings: wrap cleanly without forcing horizontal overflow.
- Short viewport/enlarged text: allow scrolling instead of covering content with fixed navigation.
- Today/Home direct routes: remove duplicate quote entry while preserving the Tarot route and current bottom navigation.

---

### Task 1: Render a deterministic daily quote

**Files:**
- Modify: `today_routes.py`
- Read: `investment_quote_routes.py`, `static/data/investment_quotes.json`
- Modify: `templates/today.html`
- Modify: `static/css/today.css`
- Modify: `investment_quote_routes.py`
- Remove: `static/js/today.js` if it becomes unnecessary after server rendering

**Interfaces:**
- `/today` passes a `daily_quote` object to Jinja with `text_ko`, `author`, and `source_url`/`source_title`.

- [ ] Select valid catalog entries and derive a stable index from the current Seoul date.
- [ ] Render one quote card with date label, Korean quote, author, and source link; remove Tarot CTA and secondary feature links from Today.
- [ ] Redirect the former `/investment-quotes` entry to `/today` so the now-duplicate draw screen does not remain orphaned.
- [ ] Simplify CSS so the quote and bottom navigation fit on a typical phone viewport, while small viewports and enlarged text can scroll.
- [ ] Run `git diff --check` and inspect `/today` in a browser at a typical phone viewport and a short viewport.

### Task 2: Remove Home quote duplication

**Files:**
- Modify: `templates/home.html`
- Modify: `static/css/home-visual.css` only if removing the tile leaves a layout-specific gap

**Interfaces:**
- Home retains Tarot, Palm, Lotto, and Money Check destinations.

- [ ] Remove the investment-quote tile and preserve spacing/rhythm among remaining actions.
- [ ] Inspect `/home` on mobile and confirm all remaining menu destinations are unchanged.
- [ ] Run `git diff --check`.
