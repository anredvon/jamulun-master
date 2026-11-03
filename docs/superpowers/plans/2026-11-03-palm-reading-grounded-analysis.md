# Palm Reading Grounded Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a source-attributed palm-reading dataset and on-device photo quality/hand analysis that produces separate, confidence-aware readings for the left and right hands.

**Architecture:** Curate paraphrased interpretation rules from public-domain historical books and store source/page/license metadata in a reviewed seed dataset. Use a locally hosted hand-landmark model in the browser, then image processing inside the palm ROI to assess capture suitability and extract crease features; map only sufficiently confident features to source-backed rules in the database.

**Tech Stack:** Existing Flask + SQLAlchemy models, SQLite/MySQL, browser JavaScript, locally hosted MediaPipe Tasks Vision Web model, versioned JSON seed data.

**Spec:** `docs/superpowers/specs/2026-11-03-palm-reading-grounded-analysis-design.md`

## Global Constraints

- Keep hand photos, landmarks, and raw crease features on the device.
- Require both hands as separate captures and ask which hand is used most, while applying hand-dominance interpretations only when supported by a cited source.
- Do not fabricate a reading when a palm or line is not confidently detected.
- Store source title, author, year, page/section, rights note, tradition, review status, and rule version for each interpretation.
- Preserve the entertainment/self-reflection framing; do not make scientific, health, lifespan, financial, or predictive claims.
- Do not modify the production database or deploy as part of this plan.
- No new tests or test runs are included unless the user asks for testing/verification.

## Review Focus

- Non-hand or back-of-hand photo: must request a palm-facing capture.
- Cropped palm/finger bases or wrist: must identify the missing frame area and request retake.
- Blur, dim lighting, glare, or tiny palm: must request a better photo before line reading.
- Full palm with one faint/ambiguous crease: must preserve uncertainty for that line without inventing a substitute.
- Mirrored selfie or left/right confusion: displayed hand side must match the subject's hand.

---

### Task 1: Source catalog and reviewable reading dataset

**Files:**
- Create: `static/data/palm-sources.json`
- Create: `static/data/palm-reading-rules.json`
- Create: `docs/palm-reading-sources.md`

**Interfaces:**
- Produces source records with stable IDs and paraphrased rule records containing hand-line type, observable feature code, tradition, reading text, reflection prompt, citation, rights scope, editorial status, and version.

- [x] Record the three initial historical books with public links, publication data, rights notes, and jurisdiction limitations.
- [x] Extract line/feature claims into a source-page matrix; retain source wording only as short research notes where permitted.
- [x] Write Korean app copy as paraphrases and mark every rule `draft` until editorial review.
- [x] Record known disagreements/limitations separately rather than merging them into universal fact.

### Task 2: Palm source and interpretation database models

**Files:**
- Modify: `models.py`
- Create: `scripts/seed_palm_readings.py`
- Consume: Task 1 JSON catalogs

**Interfaces:**
- `PalmSource`: bibliographic and rights metadata.
- `PalmReadingRule`: `line_type`, `feature_code`, `tradition`, `reading_text`, `reflection_prompt`, `source_id`, `source_locator`, `review_status`, `version`, `is_active`.
- Seed operation is idempotent by stable source/rule key and does not alter quiz or user result records.

- [x] Add SQLAlchemy models with source foreign key and indexes on line type, feature code, status, and source ID.
- [x] Use existing SQLAlchemy `db.create_all()` for SQLite/MySQL table creation without altering existing tables.
- [x] Add an idempotent seed importer for reviewed catalog files; draft rules remain inactive.

### Task 3: On-device capture suitability and hand-side detection

**Files:**
- Modify: `templates/palm.html`
- Modify: `static/js/palm.js`
- Create: `static/js/palm-hand-detector.js`
- Modify: `static/css/palm.css`
- Add locally hosted MediaPipe Tasks Vision library/model assets under `static/vendor/` and `static/models/` after license review.

**Interfaces:**
- `inspectPalmPhoto(image) -> {status, handSide, palmRegion, quality, retakeReasons}`.
- `status` values: `no-hand`, `back-of-hand`, `partial`, `poor-quality`, `usable`.
- Capture state stores one analysis per `left` and `right` hand plus `dominantHand` (`left` or `right`) in memory only.

- [x] Integrate local hand landmark detection, limit expected detection to one open hand per capture, and have the user label each photo as left/right to handle mirroring.
- [x] Assess hand bounds, palm ROI size, focus/exposure, and crease visibility. HandLandmarker does not classify palm vs back; absent creases trigger a cautious retake prompt rather than a definitive back-of-hand label.
- [x] Replace generic “take again” message with reason-specific Korean guidance.
- [x] Support separate left/right captures; a single captured side can be reviewed while the other is clearly marked as not captured.

### Task 4: Crease feature extraction, confidence, and source-backed readings

**Files:**
- Modify: `static/js/palm-analysis.js`
- Modify: `static/js/palm.js`
- Modify: `palm_routes.py`
- Modify: `templates/palm.html`
- Modify: `static/js/palm-copy.js`
- Consume: Task 2 database models and Task 3 capture output

**Interfaces:**
- `analyzePalmRegion(imageData, landmarks) -> {features, confidenceByLine, quality}`.
- `quality` is usable only when the palm image passes capture gates. Each line feature is either a measured code with confidence or `unreadable`.
- Server embeds the active source-backed rule catalog in the page; the browser maps local feature codes to rules. Image and extracted features never go to server.

- [x] Normalize the palm ROI using hand landmarks and extract contrast/continuity features with local confidence scores.
- [x] Remove current fallback that assigns synthetic line variants when no line candidate exists.
- [x] Query only active, approved rules and render source citation metadata independently for each hand; image and features never go to the server.
- [x] Display unreadable lines as such and avoid substituting missing line features.
- [x] Preserve only a generic user-visible summary in existing history storage; never persist photos or raw image features.

### Task 5: Data and photo assessment review

**Files:**
- Update: `docs/palm-reading-sources.md`
- Review: existing `tests/palm-analysis.test.js`, `tests/palm-copy.test.js` without adding/running tests unless requested.

- [ ] Compare the curated rule records against cited source pages and remove unsupported or overconfident interpretations.
- [ ] Review image-gate behavior against a larger representative set of good, partial, non-hand, palm/back, blurry, and low-light examples. Only the user-provided full palm photo has been exercised so far.
- [ ] Report tested inputs and limitations explicitly; do not claim general accuracy from a few examples.
