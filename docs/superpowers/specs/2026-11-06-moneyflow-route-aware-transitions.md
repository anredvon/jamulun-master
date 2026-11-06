# MoneyFlow Route-Aware Page Transitions

## Intent

Make navigation feel connected on iPhone: Home rises into view when a Home control is used, ordinary forward navigation enters from the right, and backward navigation returns from the left. Keep the existing Flask multi-page architecture and its native browser history behavior.

## Goals and boundaries

- Apply transitions to route changes only; keep Tarot card flips, dialogs, quiz steps, and in-page controls on their existing motion.
- Keep the app header and fixed bottom navigation visually steady during route transitions.
- Respect `prefers-reduced-motion` and gracefully leave normal navigation intact when cross-document View Transitions are unavailable.
- Do not change routes, APIs, database behavior, random draw/redraw policy, or deployment configuration.

## Approaches

1. Keep one subtle fade for all routes. Safest but does not express the user's requested direction.
2. **Use route-aware types on the existing cross-document View Transition. Chosen.** Use the current multi-page links and `pageswap`/`pagereveal` transition types to distinguish Home, forward, and backward navigation. This preserves browser history, iPhone swipe-back, forms, and Flask responses without introducing a client-side router.
3. Replace route navigation with client-side screen swaps. Rejected because it would duplicate route, form, and state behavior for a visual effect.

## Interaction rules

- Any same-origin Home link, including the header brand/home controls and in-result Home actions, uses `home-up`: the destination page rises from below with a short, restrained movement.
- Normal same-origin forward links use `forward`: the destination enters from the right.
- Explicit back controls and browser history traversal to an earlier entry use `back`: the destination enters from the left and the outgoing page moves right.
- Reloads, direct entry, same-page navigation, external links, downloads, and modified/new-tab clicks do not receive a directional animation.
- The app chrome remains stationary; motion is limited to page content.
- Under reduced-motion preference, route snapshots do not spatially animate. If View Transition type/event support is absent, normal browser navigation continues without script errors.

## Builder decisions

- Reuse CSS View Transitions already enabled in `static/css/app-chrome.css`.
- Add a small shared page-transition script and load it from `templates/base.html` so all Flask pages using the shared base follow the same rules.
- Test the route/type classifier and event wiring without adding runtime dependencies.
