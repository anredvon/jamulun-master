# 머니플로우 통합 기록 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 퀴즈, 타로, 손금, 투자 명언 결과를 기기 내 기록 목록에 일관되게 저장하고 표시한다.

**Architecture:** `static/js/history-store.js`가 기존 `moneyflow_history_v1`를 읽고 쓰는 공통 API를 제공한다. 퀴즈 결과와 타로 리포트부터 이 API로 저장하고, 기록 화면은 종류별 카드로 모든 결과를 표시한다. 수치 그래프는 `future` 재물 흐름 체크 점수만 사용한다.

**Tech Stack:** Flask/Jinja, 정적 JavaScript, browser `localStorage`, 기존 Python `unittest`, Node 내장 `node:test`.

**Spec:** [2026-11-01-moneyflow-history-palm-quotes-design.md](../specs/2026-11-01-moneyflow-history-palm-quotes-design.md)

## Global Constraints

- 최근 30개 항목을 유지하고 기존 `moneyflow_history_v1` 데이터를 읽는다.
- 원본 손 사진은 기록에 저장하지 않는다.
- 점수가 없는 명언·손금 결과에 점수나 가짜 수치를 표시하지 않는다.
- 기록은 현재처럼 이 브라우저 기기에만 보관한다.
- 공개 사이트와 AWS를 변경하지 않는다.

## Review Focus

- 잘못된 JSON, storage 접근 거부, quota 오류에서도 결과 화면이 깨지지 않는지 — `history-store.test.js`에 손상·오류 저장소 케이스를 둔다.
- 같은 결과 ID를 여러 번 전달해도 중복 저장되지 않는지 — 중복 방지 테스트를 둔다.
- 서로 다른 종류의 점수가 하나의 추세선으로 섞이지 않는지 — 기록 렌더링에서 `future`만 차트에 반영되는지 확인한다.
- 점수가 없는 기록에서 `undefined`, `NaN`, `/100`이 나오지 않는지 — 렌더링 확인에 점수 없음 케이스를 둔다.
- 타로 카드 발견 컬렉션이 리딩 기록과 분리되어 계속 유지되는지 — 브라우저 수동 확인에서 두 저장소를 각각 확인한다.

---

### Task 1: 공통 기록 저장소

**Files:**
- Create: `static/js/history-store.js`
- Create: `tests/history-store.test.js`
- Modify: `.github/workflows/jaemulun-ci.yml`

**Interfaces:**
- Produces: `createHistoryStore(storage, { maxItems = 30 }) -> { read(), add(entry) }`.
- `entry` fields: `id`, `type`, `label`, `title`, `date`, `createdAt`; optional `summary`, `score`, `meta`.
- `add()` supplies ISO `date` and `createdAt` timestamps when omitted, prepends an entry, de-duplicates by string ID, caps at 30, and returns `false` without throwing if storage is unavailable.
- `read()` normalizes legacy quiz items and returns an array; malformed storage reads as an empty array without clearing unrelated data.

- [ ] **Step 1: Write `tests/history-store.test.js`** using Node's built-in test runner and an in-memory Storage stub. Cover prepend, duplicate ID, 30-item cap, legacy entry preservation, malformed JSON, unavailable storage, and scoreless entries.
- [ ] **Step 2: Run the focused test** with `node --test tests/history-store.test.js`; confirm the tests fail because the module is absent.
- [ ] **Step 3: Implement `createHistoryStore(storage, options)`** in `static/js/history-store.js`; export the factory for Node and expose the browser singleton as `window.MoneyFlowHistory`.
- [ ] **Step 4: Run the focused test** and confirm every storage-contract case passes.
- [ ] **Step 5: Add Node 22 setup and the focused Node test command** to `.github/workflows/jaemulun-ci.yml`, leaving the Python test command intact.

### Task 2: 기존 퀴즈 결과를 공통 API로 저장

**Files:**
- Modify: `templates/result.html`
- Modify: `tests/test_deploy_smoke.py`

**Interfaces:**
- Consumes: `window.MoneyFlowHistory.add(entry)` from Task 1.
- Produces: existing `MONEYFLOW_RESULT` records continue to use `id`, `type`, `label`, `score`, and `title`, with `summary` set from the result description when available.

- [ ] **Step 1: Add a smoke assertion** that the result template loads the shared store before recording the result and still exposes the existing result fields.
- [ ] **Step 2: Run the focused Python smoke test** and confirm it fails on the missing shared-store reference.
- [ ] **Step 3: Load `history-store.js` before the result inline script** and replace its direct `localStorage` manipulation with `MoneyFlowHistory.add()`.
- [ ] **Step 4: Run the focused smoke test** and confirm the result page preserves its current template data and uses the common store.

### Task 3: 타로 리딩을 기록에 추가

**Files:**
- Modify: `templates/tarot.html`
- Modify: `static/js/tarot.js`

**Interfaces:**
- Consumes: `window.MoneyFlowHistory.add(entry)` from Task 1.
- Produces: after `renderReport()` completes, a unique `tarot` history entry with card title, score, flow summary, date, and card ID metadata.

- [ ] **Step 1: Add a focused browser check** to the feature verification notes: one completed reading adds one record; opening the card collection does not add one; revisiting the same report does not duplicate the same reading.
- [ ] **Step 2: Load `history-store.js` before `tarot.js`** in the Tarot template.
- [ ] **Step 3: Call the common store once per completed draw** from `renderReport()`, using a draw-scoped ID rather than the card ID so repeat readings are preserved.
- [ ] **Step 4: Verify in a browser** that the count changes after a completed report and the collection counter still behaves independently.

### Task 4: 종류별 기록 화면

**Files:**
- Modify: `templates/history.html`
- Modify: `static/js/history.js`
- Modify: `static/css/history.css`
- Create: `static/js/history-view-model.js`
- Create: `tests/history-view-model.test.js`
- Modify: `.github/workflows/jaemulun-ci.yml`

**Interfaces:**
- Consumes: normalized records from `MoneyFlowHistory.read()`.
- Produces: `buildHistoryView(items) -> { count, latestFutureScore, rows, futureTrend }`; every record appears in `rows`, scores are optional, and only `type === 'future'` records contribute to the money-check trend chart.

- [ ] **Step 1: Add `history-view-model.test.js`** for mixed record types, scoreless entries, latest `future` score, numeric future-only trend, and empty input.
- [ ] **Step 2: Implement `buildHistoryView(items)`** in `history-view-model.js`; load the module from `history.html` and export it for Node.
- [ ] **Step 3: Render all model rows safely in `history.js`** using DOM `textContent`, type labels, optional score markup, and the existing empty state.
- [ ] **Step 4: Keep the summary tied to the latest `future` record** and build weekly bars only from numeric `futureTrend` entries.
- [ ] **Step 5: Add modest type styling** and include the model test in the existing Node 22 CI step.
- [ ] **Step 6: Verify in a browser** that mixed score/scoreless records render correctly and that only `future` scores appear in the trend chart.
