# MoneyFlow commercial content UX design

## Goal

Make the reviewed first-run and result flows feel clear, useful, and trustworthy before wider launch. Keep the existing four-item bottom navigation (`홈 · 오늘 · 체크 · 기록`) and preserve existing draw, result, and on-device palm-photo behavior.

## Decisions

- **Home:** Describe the full product as light entertainment and money-habit reflection. Keep the five existing destinations; remove the stale `NEW` badge from the established Tarot feature.
- **Today:** Make Tarot the stable featured daily experience. The secondary list must not repeat Tarot; it offers palm reading, an investment quote, and the money check.
- **Check results:** Label the numeric result as a response-based activity score, explain that it is not an objective financial assessment, and remove language implying guaranteed luck, investment gains, or a measured percentile. Use one practical next step per result.
- **Sharing:** Share only the real result title and actual answer-derived score. Remove fabricated week-over-week change and percentile from the share card.
- **Palm reading:** Keep the traditional heart/head/fate-line format, but write in direct, everyday Korean. Each reading should explain a relatable tendency, give a small optional reflection prompt, avoid deterministic predictions, and disclose that the photo is analyzed on-device and palmistry is for entertainment. Unclear line detection must be stated plainly.
- **History:** Explain which content is stored on this device and that the palm photo itself is not uploaded. Do not promise retention or deletion behavior the app does not provide.

## Out of scope

- Changing the current bottom navigation or product destinations.
- Changing draw limits, result generation, database schema, or user records.
- Adding a custom domain, publishing legal terms, or claiming compliance. These require owner decisions and are launch-readiness items.

## Acceptance criteria

- Today opens with Tarot on every date, with no repeated Tarot card in the secondary list.
- Check/share copy contains no unsupported rank, weekly delta, prediction, or investment recommendation.
- Palm copy is understandable without palmistry jargon; uncertain readings remain clearly marked as estimates.
- History distinguishes this-device result history from server-backed check and Lotto records without overstating photo handling.
- Existing routes, choices, saved results, and lotto flow continue to work.
