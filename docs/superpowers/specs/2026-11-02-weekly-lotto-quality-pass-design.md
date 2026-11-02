# Weekly Lotto Quality Pass Design

## Intent

Finish the existing weekly Lotto feature work in Draft PR #12 without duplicating the feature or changing the established MoneyFlow app structure. The experience should feel like a polished, entertaining part of the app while keeping draws honest, user-triggered, accessible, and recoverable.

## Current State

- The checked-out app is `anredvon/jamulun-master`, on `codex/today-home-icon-parity`, with a clean tree at `197288f`.
- The app uses Flask, SQLAlchemy, Jinja2, and Vanilla JS/CSS. Its app shell uses a pale background, purple accents, white cards, Pretendard, and four bottom tabs: Home, Today, Check, History.
- GitHub Issue #11 specifies the Lotto feature. Draft PR #12 already contains the Flask routes, SQLAlchemy model, random draw service, Canvas animation, result sharing, migration script, and `tests/test_lotto.py`.
- GitHub reported a successful workflow run for the PR head. Physical-device checks, concurrency coverage, and production migration checks remain unverified.
- The PR automatically draws on the first visit when no result exists. This design changes that behavior: only an explicit button press starts a draw.

## Goals

- Keep the existing app shell, navigation, typography, and server-side lottery architecture.
- Place `이번 주 로또번호 받기` in the Home activity list below Tarot and before Palm.
- Require a user press for every draw; page load and refresh must never consume a draw.
- Keep number generation, result persistence, round quota, and idempotency server-authoritative.
- Preserve the maximum of three result sets per visitor per verified round, restore prior results after refresh, and avoid duplicate requests.
- Use the existing light MoneyFlow shell and reserve deep purple/gold for the draw theater and result cards.
- Run visual animation only while useful; stop it when idle, hidden, offscreen, or reduced motion is enabled.
- Show draw round/date only when validated against an official schedule source; do not present a calculated guess as official.
- Keep share/copy/download behavior understandable when native sharing is unavailable.

## Non-Goals

- No prediction, weighted number selection, purchase, payment, account, or cross-device sync feature.
- No change to the four-tab navigation or unrelated Tarot, Palm, Check, History, or investment content.
- No new runtime package or rendering framework.
- No operating service, database migration, merge, or deployment during this Quality Pass.

## Anti-Goals

- Do not automatically spend a draw on first visit or refresh.
- Do not display guessed draw dates or imply increased odds or a guaranteed win.
- Do not let client animation choose or alter the committed result.
- Do not run a perpetual Canvas animation loop while the user is idle or has requested reduced motion.
- Do not replace, reset, or discard user data or existing worktree changes.

## Approaches

1. **Minimal visual unification:** use only the existing light purple and white card style on the draw screen. This maximizes sameness but weakens the requested sense of a special draw moment.
2. **Existing shell with a focused draw stage (selected):** keep the common app shell, home layout, and four-tab navigation; use deep purple and gold only for the draw theater and result cards. This uses the established PR implementation while giving the lottery moment a distinct, premium presentation.

## Approved Design Decisions

- A draw begins only after the user activates the draw button.
- Initial CTA communicates the first draw and three available attempts. Later CTAs show the remaining count; the button locks during a request or animation.
- The server commits the result before animation. A status refresh recovers committed results after a dropped response.
- Results remain ordered by draw sequence and share/copy actions do not use a draw attempt.
- The Canvas ball scene is decorative. It starts only for an active visible draw and stops on completion, hidden tab, offscreen stage, or reduced motion.
- Assistive technology receives a concise status update and a semantic six-number result; decorative Canvas elements remain hidden from the accessibility tree.
- Keep Pretendard and existing theme tokens. Improve undersized helper text, focus visibility, touch targets, and spacing inside the Lotto screen without broad site restyling.
- Display round/date only after validating the current schedule behavior against the official operator source; if special scheduling cannot be represented safely, withhold the round/date.
- Existing Draft PR #12 remains the implementation vehicle. Keep it in Draft and do not merge or deploy.

## Constraints and Risks

- The PR branch is remote and is not present in the current local checkout; create an isolated worktree from that existing PR branch before editing.
- The PR's round calculator assumes a weekly Saturday schedule. Verify the official schedule and current records before presenting derived date or round values.
- The feature adds a database table. Any migration remains additive and must be tested against existing schema/data in isolation.
- The GitHub workflow success does not establish physical iOS/Android QA or production database safety.
- The browser feature has no established full browser automation dependency; use the existing Python and Node test setup, plus manual viewport/device checks where available.

## Acceptance Criteria

- Visiting `/lotto` with no saved draws causes no draw POST and leaves all three attempts available.
- Refreshing a page with prior results restores those exact results without a new draw.
- A successful draw produces six distinct integers from 1 through 45, persists before animation, and consumes one attempt exactly once.
- Idempotent retries return the same result; concurrent requests cannot create more than three results for a visitor in a verified round.
- Reduced motion and hidden/offscreen states stop decorative animation while exposing the final number set immediately.
- Mobile layout remains legible and usable at 320px, 375px, and 430px widths, with keyboard focus and touch-sized controls.
- Sharing provides a native share path when available and a usable copy or image-download fallback when it is not.
- Existing main routes and current tests pass; any unavailable real-device or production checks are clearly listed as unverified.
