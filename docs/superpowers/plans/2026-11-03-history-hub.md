# History Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Present local MoneyFlow results and server-backed Lotto draws in one filterable History page.

**Architecture:** Normalize local history entries and `/api/lotto/history` draws into one client-side view model, deduplicate Lotto records by `result_id`, and filter the merged chronological list by content type. The old Lotto history URL becomes a compatibility entry to the Lotto filter.

**Tech Stack:** Flask redirects, Jinja, browser JavaScript, existing localStorage history store and Lotto API.

**Spec:** `docs/superpowers/specs/2026-11-03-history-hub-design.md`

## Global Constraints

- Keep existing storage backends and identity behavior unchanged.
- Do not lose local or server-side records; merge for display only.
- Keep filters accessible by keyboard and screen readers.
- Keep local records available if the Lotto API fails.
- Preserve `/lotto/history` as a working entry point.

## Review Focus

- No local history and no server Lotto records: show a clear all-records empty state.
- No items for a selected filter: show a type-specific empty state and a way back to all records.
- Same Lotto draw exists locally and on server: display one row keyed by `result_id`.
- Lotto API fails: show local entries plus a Lotto-specific load message.
- Mixed date formats and missing timestamps: sort valid timestamps first by Korean local time, then put unknown dates last.

---

### Task 1: Normalize and merge history sources

**Files:**
- Modify: `static/js/history-view-model.js`
- Read: `static/js/history-store.js`, `lotto_routes.py`

**Interfaces:**
- `buildHistoryView(localItems, lottoDraws)` returns normalized rows with `id`, `type`, `category`, `label`, `title`, `date`, `createdAt`, `summary`, and optional `score`.

- [ ] Map `future`, `money`, and `spending` to the `check` category; retain `tarot`, `palm`, `lotto`, and `quote` categories.
- [ ] Map server Lotto objects to the existing row shape and deduplicate local/server copies using `result_id`.
- [ ] Sort merged rows newest first and keep entries with unknown dates at the end.
- [ ] Run `git diff --check`.

### Task 2: Replace the crowded History layout with filters and one list

**Files:**
- Modify: `templates/history.html`
- Modify: `static/js/history.js`
- Modify: `static/css/history.css`

**Interfaces:**
- Filter values: `all`, `tarot`, `palm`, `lotto`, `check`, `quote`.
- `/history?filter=lotto` opens with the Lotto filter selected.

- [ ] Remove the type-specific weekly score chart and oversized summary blocks from the main archive.
- [ ] Add keyboard-operable filters, one chronological list, concise storage disclosure, and separate all-empty/filter-empty/API-error states.
- [ ] Fetch `/api/lotto/history` without blocking display of locally stored entries.
- [ ] Run `git diff --check` and inspect all filters plus API error behavior in the browser.

### Task 3: Keep the old Lotto history address working

**Files:**
- Modify: `lotto_routes.py`

**Interfaces:**
- `/lotto/history` redirects to `/history?filter=lotto`.

- [ ] Redirect the old route to the integrated Lotto filter without changing the Lotto API or database.
- [ ] Open both `/history?filter=lotto` and `/lotto/history` in the browser and confirm the same filtered list appears.
- [ ] Run `git diff --check`.
