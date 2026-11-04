# Lotto Result and Quiz Score Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline, task by task, with the approved design and release request.

**Goal:** Remove stray-looking star dots from lottery results and make the quiz result score feel clear, friendly, and explicitly answer-based before releasing to Lightsail.

**Approved design:** Keep the existing lotto card colors and broad glow, but reserve tiny star points for the entry and drawing scenes. On quiz results, lead with the answer-derived result category, show the number as `84점`, and explain near it that the score is a reference calculated from the selected answers, not an assessment of finances or the future. Preserve the scoring algorithm, saved score, tags, share/history data, and lottery behavior.

**Files:** `static/css/lotto.css` (separate result-card background); `templates/result.html` and `static/css/ui-quality-pass.css` (copy and hierarchy); `tests/test_deploy_smoke.py` (targeted rendering assertions).

## Tasks

1. Add focused assertions for the quiz-result wording and result-card background treatment; run them and confirm they fail for the current markup/styles.
2. Split the lottery result background from the animated/dotted entry and drawing backgrounds; keep only soft light on result cards.
3. Reorder the quiz result category before a smaller `84점` display, label it as an answer-based reference score, and clarify its meaning next to the score. Do not change score calculation or persistence.
4. Run the repository's existing CI commands, inspect the diff, and verify both pages in a local/live browser at phone width.
5. Open a PR to `main`, wait for required CI, merge, deploy the exact merge SHA using `scripts/deploy_lightsail.sh`, and verify public health plus both live pages.

## Review focus

- The lotto result card has no 1–1.5px pinpoint gradients, while the entry and draw scenes retain their existing stars.
- The score remains the same stored integer; only its presentation and explanation change.
- The result title, note, and mascot fit narrow phone widths without clipping or overlap.
