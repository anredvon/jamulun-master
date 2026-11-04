# Substantive Palm Reading Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make palm readings feel specific and worth reading by connecting supported visible line patterns to distinct, source-grounded interpretations and concrete everyday examples.

**Architecture:** Keep hand/photo processing on device. Preserve the analyzer's supported line-pattern classifications instead of collapsing them into generic presence flags. Expand the reviewed reading catalog and render each result as observed pattern, traditional interpretation, practical example, and source; never invent an interpretation for an unconfirmed line.

**Tech Stack:** Browser JavaScript, JSON content catalog, Flask/Jinja template data, Node and Python unittest suites.

**Spec:** `docs/superpowers/specs/2026-11-03-palm-reading-grounded-analysis-design.md`

## Global Constraints

- Hand images and landmarks stay on device.
- Content remains cultural entertainment and self-reflection, not scientific diagnosis or health, lifespan, wealth, or future prediction.
- Unconfirmed image features must not receive a substitute reading.
- Original copyrighted text is not copied at length; Korean content is newly edited and source locators remain visible.
- No production database migration or mutation.

## Review Focus

- A missing or low-confidence line never receives a detailed claim.
- Existing supported pattern codes continue mapping to a valid reading.
- Text ties each claim to a visible pattern and named historical source.
- The left/right hand sections remain independent and do not imply unsupported dominant-hand science.
- Long Korean reading cards remain readable on mobile.

### Task 1: Preserve observable pattern classifications

**Files:** `static/js/palm-analysis.js`, `tests/palm-analysis.test.js`

- [x] Add regression tests proving detected heart/head geometry retains the classifier subtype in `result.lines`.
- [x] Run the focused tests and confirm they fail because the current result collapses every detected type to a generic code.
- [x] Return a subtype only when the existing confidence thresholds pass; keep `null` for unsupported/uncertain lines.
- [x] Run focused analysis tests.

### Task 2: Add substantive, feature-specific interpretation records

**Files:** `static/data/palm-reading-rules.json`, `tests/palm-copy.test.js`, `docs/palm-reading-sources.md`

- [x] Test that every emitted subtype has distinct, sufficiently detailed interpretation and a source locator.
- [x] Add reviewed Korean interpretations for supported heart/head subtypes and strengthen life/fate descriptions with specific historical distinctions supported by the cited books.
- [x] Separate observed pattern, symbolic interpretation, everyday example, and source note; retain uncertainty language only where it affects interpretation.
- [x] Run catalog tests.

### Task 3: Render specific readings in the result flow

**Files:** `static/js/palm.js`, `static/css/palm.css`, `templates/palm.html`, `tests/test_deploy_smoke.py`

- [x] Test the catalog content and ensure unknown-line fallback remains covered.
- [x] Render the detected pattern and distinct interpretation in each line card; keep source details available and show a single concise global scope note.
- [ ] Verify both hand sections and mobile card legibility on a running browser.
- [x] Run all Python and Node suites and `git diff --check`.
