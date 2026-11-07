# MoneyFlow Header Back and Tarot Card Fit

## Intent

Make the shared top-left control behave like browser Back (including iPhone edge-swipe history semantics), while the top-right home control remains the explicit route to `/home`. Remove the extra visible frame around the Tarot card-back image so the rendered image itself defines the card bounds.

## Goals and constraints

- All non-home shared headers expose a top-left Back button that calls `history.back()`; it does not send users to `/home`.
- The top-right Home control continues to route to `/home`.
- The brand mark/title is not a second Home control.
- Tarot picker card-back wrapper adds no separate border, background, or shadow beyond the image bounds.
- Preserve routes, APIs, data, draw behavior, daily redraw policy, and production configuration.

## Approaches

- Use browser history directly for the Back control (chosen): aligns with Safari edge-swipe and native browser history. A Back action with no prior entry has no destination, matching the browser's own Back behavior.
- Keep a Home link and emulate horizontal motion: rejected because it does not return to the prior page and diverges from edge-swipe history.
- Add a client-side router or cross-document transition API: rejected because it expands scope and can compete with Safari's native interactive gesture.

## Implementation calls

- Render the shared left control as a button labeled `← 뒤로`; its handler calls `window.history.back()` without adding an app-authored exit animation.
- Keep `/home` only on the right-side Home control. Render the brand as a non-link.
- Make `.tarot-card-back` transparent and remove its border and shadow; let the 4:5 image fill its matching 4:5 wrapper.
- Bump cache keys for the changed shared header stylesheet, transition script, and Tarot stylesheet.

## Non-goals

No changes to the bottom navigation, transition system for feature links, Tarot selection/randomization, API, database, or deployment settings.
