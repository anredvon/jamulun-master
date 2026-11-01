# 머니플로우 홈·오늘 메뉴와 투자 한 줄 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 네 가지 기능 진입점과 `홈 / 오늘 / 체크 / 기록` 메뉴를 정리하고, 출처가 검증된 투자 명언 뽑기를 추가한다.

**Architecture:** 먼저 `/investment-quotes`와 명언 데이터를 구현하고, 그 다음 `/today` 허브와 하단 메뉴, 마지막으로 `/home` 카드 네 개를 연결한다. 이 순서로 모든 링크가 실제 route를 가리키게 한다. `/investment-quotes`는 저장소 내 편집 목록에서 한 줄을 뽑으며, 공통 기록 API에 매 뽑기를 저장한다.

**Tech Stack:** Flask route/blueprint, Jinja, static JavaScript/CSS, existing `MoneyFlowHistory` browser API.

**Spec:** [2026-11-01-moneyflow-history-palm-quotes-design.md](../specs/2026-11-01-moneyflow-history-palm-quotes-design.md)

## Global Constraints

- `/` 대문은 유지하고 `/home`을 기능 홈으로 유지한다.
- 홈에는 네 기능만 주요 카드로 둔다. 기존 직접 URL은 끊지 않는다.
- `today` 허브는 타로·손금·명언으로 연결하고, `체크`는 기존 `/intro/future` 5문항 흐름을 재사용한다.
- 명언은 출처를 확인한 짧은 문구, 화자, 원문 출처 제목·링크를 함께 제공한다.
- 명언은 개인 매수·매도 권유로 표현하지 않는다.
- 기록 저장은 `2026-11-01-moneyflow-history.md` Task 1에서 정의한 공통 `MoneyFlowHistory.add()`를 사용한다.
- 이 계획은 history 계획과 palm 계획이 실행된 뒤 수행한다. 전체 순서는 history → palm → home/quotes다.
- 새 blueprint는 기존 구조처럼 별도 integration 모듈에서 등록하고, `app.py`를 조합 지점으로 쓴다. 새 경로를 `core_app.py`에 추가하지 않는다.
- 공개 사이트 및 AWS 배포는 범위에 포함하지 않는다.

## Review Focus

- 명언 텍스트가 비어 있거나 출처 링크가 빠지지 않는지 — 콘텐츠 데이터 점검에서 모든 항목의 필수 필드를 확인한다.
- 사용자가 하루에 여러 번 뽑아도 ID가 충돌하지 않는지 — draw-scoped ID를 브라우저 확인에서 확인한다.
- 직접 링크 `/tarot`, `/intro/future`, `/intro/money`, `/intro/spending`이 계속 동작하는지 — Flask route smoke test를 둔다.
- 하단 오늘 메뉴가 데스크톱/모바일에서 탭 가능한지 — 모바일 viewport 브라우저 확인을 둔다.
- 새 홈 카드가 손금/명언 화면으로 연결되는지 — route smoke test에서 상태 코드 및 템플릿 핵심 요소를 확인한다.

---

### Task 1: 투자 명언 데이터와 뽑기 화면

**Files:**
- Create: `investment_quote_routes.py`
- Create: `investment_quote_integration.py`
- Create: `static/data/investment_quotes.json`
- Create: `templates/investment_quotes.html`
- Create: `static/js/investment-quotes.js`
- Create: `static/css/investment-quotes.css`
- Create: `tests/test_investment_quotes.py`
- Modify: `app.py`

**Interfaces:**
- Produces: `GET /investment-quotes` route named `investment_quotes.investment_quotes_page`; each quote object has `id`, `text_ko`, `text_original`, `author`, `source_title`, and `source_url`.
- Catalog: 20 entries; every entry has an HTTPS primary-source URL, and no quote is included when attribution cannot be verified.
- On a draw, client uses `MoneyFlowHistory.add({id: drawId, type: 'quote', label: '투자 한 줄', title: author, summary: text_ko, meta: {quoteId, sourceTitle, sourceUrl}})`.
- Register using `investment_quote_integration.register_investment_quotes(app)` in `app.py`.

- [ ] **Step 1: Add Python data validation tests** for exactly 20 unique quote IDs and required source/attribution fields; use the standard library only.
- [ ] **Step 2: Add the source-verified Korean quote catalog** and keep quotes short enough to display as a single card.
- [ ] **Step 3: Implement the quote blueprint, draw control, attribution, source link, and non-advice notice**; save each completed draw through `MoneyFlowHistory.add()`.
- [ ] **Step 4: Register the quote blueprint in `app.py`** and verify the catalog test and route smoke check for draw, source link, and a scoreless history record.

### Task 2: 오늘 허브와 하단 메뉴

**Files:**
- Create: `today_routes.py`
- Create: `today_integration.py`
- Create: `templates/today.html`
- Modify: `app.py`
- Modify: `templates/_bottom_nav.html`
- Modify: `tests/test_deploy_smoke.py`

**Interfaces:**
- Produces: `GET /today` route named `today.today_page`; navigation destinations `/home`, `/today`, `/intro/future`, `/history`.
- `/today` includes links to `tarot.tarot_page`, `palm.palm_page`, and `investment_quotes.investment_quotes_page`.
- Register using `today_integration.register_today(app)` in `app.py`.

- [ ] **Step 1: Add Flask client assertions** for `/today` response and all four bottom-nav route targets; include a test that `/` remains the splash and `/home` remains the activity home.
- [ ] **Step 2: Add the `/today` blueprint and template** with Tarot, palm, and quote links; change the second bottom-nav item from Tarot to Today.
- [ ] **Step 3: Register the today blueprint in `app.py`** and verify route names and destination links.

### Task 3: 홈 카드 구성

**Files:**
- Modify: `templates/home.html`
- Modify: `static/css/home-visual.css`
- Modify: `tests/test_deploy_smoke.py`

**Interfaces:**
- Consumes: Tarot, palm, check, and quote route names from the app.
- Produces: exactly four primary home cards: `오늘의 타로카드 뽑기`, `오늘의 손금 보기`, `재물 흐름 체크`, `오늘의 한 줄 투자 명언 뽑기`.

- [ ] **Step 1: Add smoke assertions** for the four card labels and their route destinations.
- [ ] **Step 2: Confirm the assertions fail** against the current four-card copy and links.
- [ ] **Step 3: Replace the spending-style and duplicate daily-fortune cards** with palm and quote cards; relabel the existing future check as `재물 흐름 체크` and update its description to `약 30초 · 5문항`.
- [ ] **Step 4: Preserve existing direct routes** for spending and money results, even though those cards leave the primary home.
- [ ] **Step 5: Run the focused smoke test** and visually review the four-card layout at a phone-width viewport.
