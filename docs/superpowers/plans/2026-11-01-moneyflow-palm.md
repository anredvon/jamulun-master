# 머니플로우 사진 기반 손금 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 촬영하거나 선택한 실제 손 사진의 손금선 후보를 기기 안에서 확인·수정하고, 해당 세 유형 조합으로 재미용 결과를 만든다.

**Architecture:** 사용자 제스처로 카메라/보관함에서 이미지를 열고 Canvas 기반 로컬 처리가 선 후보를 제안한다. 사용자는 마음선·두뇌선·운명선 유형을 확인·수정하고, 5×5×4 조합 결과를 본다. 사진은 저장·전송하지 않으며 조합 결과만 공통 머니 기록에 기록한다.

**Tech Stack:** Flask/Tarot blueprint pattern, Jinja, browser Canvas and JavaScript, CSS/SVG line animation, `MoneyFlowHistory` browser API.

**Spec:** [2026-11-01-moneyflow-history-palm-quotes-design.md](../specs/2026-11-01-moneyflow-history-palm-quotes-design.md)

## Global Constraints

- 외부 AI·에이전트·원격 분석 API를 호출하지 않는다.
- iOS Safari 및 Android Chrome에서 카메라 촬영과 사진 보관함 선택을 제공한다. 카메라 호출을 쓸 수 없으면 사진 파일 선택으로 안내한다.
- 이미지 처리와 선 후보 선택은 브라우저 메모리 안에서 수행하며 원본 사진을 `localStorage`, 서버, 데이터베이스에 쓰지 않는다.
- 마음선 5종 × 두뇌선 5종 × 운명선 4종 = 100개 조합으로 제한한다.
- 자동 후보 결과는 확정 판독이 아니다. 사용자가 각 유형을 확인하거나 고친 뒤에만 조합을 만든다.
- 후보 탐지가 불가하면 재촬영과 수동 유형 선택을 제공하고 무작위 결과로 대신하지 않는다.
- 결과는 전통 손금 해석에서 착안한 재미용 콘텐츠라고 표시하며 건강·수익을 예언하지 않는다.
- 결과 기록에는 유형, 조합 ID, 제목, 요약만 저장하고 사진은 넣지 않는다.
- 실제 공개 서비스 코드는 배포 리비전 확인 전 배포하지 않는다.

## Review Focus

- 촬영을 취소하거나 권한을 거부해도 페이지가 멈추지 않는지 — 취소/미지원 브라우저 흐름에서 사진 선택 대안을 확인한다.
- 큰 이미지가 모바일 메모리를 과도하게 쓰지 않는지 — 이미지 크기 제한 전후에 적절한 안내를 확인한다.
- 흐리거나 손바닥이 잘린 사진이 확정 유형처럼 제시되지 않는지 — 품질 불량 입력은 재촬영/수정 안내를 확인한다.
- 유형 조합이 모든 유효 조합에서 001–100으로 일대일 대응하는지 — 조합 단위 테스트를 둔다.
- 다시 뽑기/페이지 재진입이 이전 사진을 보관하지 않는지 — browser storage inspection으로 이미지 바이너리/URL이 남지 않음을 확인한다.

---

### Task 1: Palm blueprint, photo capture page, and handling states

**Files:**
- Create: `palm_routes.py`
- Create: `palm_integration.py`
- Create: `templates/palm.html`
- Create: `static/css/palm.css`
- Modify: `app.py`
- Modify: `tests/test_deploy_smoke.py`

**Interfaces:**
- Produces: `GET /palm` route named `palm.palm_page` and template elements `palm-file-input`, `palm-capture`, `palm-preview`, `palm-review`, `palm-result`.
- File input uses `accept="image/*"` and `capture="environment"`; also exposes a visible `사진 보관함에서 선택` action.
- Register the blueprint in `app.py` using the existing `register_tarot(app)` composition-root pattern; do not add palm routes to `core_app.py`.

- [ ] **Step 1: Add route smoke tests** for `/palm`, accessible labels, camera/gallery controls, and no upload form/action.
- [ ] **Step 2: Run the focused Python tests** and confirm the route/template cases fail.
- [ ] **Step 3: Add the palm blueprint and template** with capture instructions, preview state, processing state, review state, result state, cancel path, retake path, and non-AI privacy copy.
- [ ] **Step 4: Register the blueprint** through `palm_integration.py` in `app.py` and run focused smoke tests.

### Task 2: Local line candidate processing and user confirmation

**Files:**
- Create: `static/js/palm-analysis.js`
- Create: `static/js/palm.js`
- Modify: `templates/palm.html`
- Create: `tests/palm-analysis.test.js`
- Modify: `.github/workflows/jaemulun-ci.yml`

**Interfaces:**
- Produces: `analyzeImageData(imageData, width, height) -> { heartCandidate, headCandidate, fateCandidate, quality }` in a pure JavaScript module; the browser wrapper reads/downscales Canvas ImageData to a maximum 1280px long edge before calling it. Each candidate is a stable variant ID or `null` and `quality` is `usable | retake`.
- `window.MoneyFlowPalm.dispose()` releases image/object URLs and canvas references after review/reset.
- Variants: heart `h1..h5`, head `d1..d5`, fate `f1..f4`; user changes are stored as IDs, not localized labels.

- [ ] **Step 1: Create synthetic ImageData-like fixtures** (`{data: Uint8ClampedArray, width, height}`) for candidate lines, low contrast, and cropped palm; write Node built-in tests for variant bounds and low-quality rejection without requiring Canvas libraries.
- [ ] **Step 2: Run the focused Node tests** and confirm they fail before the analysis module exists.
- [ ] **Step 3: Implement local-only grayscale/contrast normalization and line-candidate extraction** in `analyzeImageData`; do not add network requests, server endpoints, or third-party runtime libraries.
- [ ] **Step 4: Map extractable curvature/length/continuity/branch features** to candidate IDs and return `retake` when required regions cannot be read.
- [ ] **Step 5: Show editable candidate selectors and require explicit user confirmation before composing the result.** Do not draw estimated lines over the photo until the analyzer returns reliable line geometry; fixed-zone candidates alone do not establish where a line lies.
- [ ] **Step 6: Run focused tests and inspect browser network/storage** to confirm no image request occurs and photo data is not persisted.

### Task 3: 100 combinations, line animation, and history save

**Files:**
- Create: `static/data/palm-combinations.json`
- Modify: `static/js/palm.js`
- Modify: `templates/palm.html`
- Modify: `static/css/palm.css`
- Modify: `tests/palm-analysis.test.js`

**Interfaces:**
- Produces: `comboId(heartId, headId, fateId) -> 1..100`, computed from stable zero-based catalog positions as `heartIndex * 20 + headIndex * 4 + fateIndex + 1`.
- Each result object has `id`, `type`, `title`, `summary`, `oneLine`, and `lineTypes`.
- After accepted candidates, call `MoneyFlowHistory.add({id: drawId, type: 'palm', label: '오늘의 손금', title, summary, meta: {comboId, lineTypes}})`.

- [ ] **Step 1: Add combo tests** that all 100 input tuples map uniquely to 1–100 and that invalid IDs are rejected.
- [ ] **Step 2: Add the 100 hand-authored combination records** with exactly one result per valid tuple; validate count, unique ID, required copy, and allowed line IDs.
- [ ] **Step 3: Implement the mapping and safe result renderer** using `textContent` for result content.
- [ ] **Step 4: Add the scan animation** over only the user-confirmed lines, then reveal the matched result and source note.
- [ ] **Step 5: Save the result only after reveal** and verify the recorded item contains line IDs/combo ID but no image data.
- [ ] **Step 6: Verify interaction manually** with one clear sample image, one low-quality image, an edited candidate, retake, and canceled photo selection in mobile Safari and Android Chrome; inspect network/storage to confirm no upload or image persistence, and document any unavailable physical-device validation.
