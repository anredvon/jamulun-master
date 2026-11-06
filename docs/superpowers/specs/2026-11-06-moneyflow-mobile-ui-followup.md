# MoneyFlow mobile UI follow-up

## Goal

Bring the live iPhone interface back in line with the supplied screenshots and the user's approved navigation behavior, then verify the rendered result before production release.

## Requirements

- Keep the monochrome line icons and Korean labels in the four-item bottom navigation (Today, Tarot, Check, History).
- Restore the existing illustrated feature icons used by Home and History; do not replace those with the bottom-navigation icon set.
- Show a visible `← 홈` control on each non-primary content screen and keep the MoneyFlow brand block aligned at the same horizontal position across routes.
- Keep the tarot draw random and preserve the current redraw policy. Make the card-back art fill its rounded card frame with the smaller outer lavender gutter seen in the supplied reference.
- Keep Home entry motion rising from below, normal feature navigation entering from the right, and back navigation returning in the reverse direction, including browser/iPhone back gestures where supported.
- Remove the check-to-history transition ghosting with a cross-browser page-motion fallback; reduced-motion settings keep navigation immediate.
- Do not change service behavior, APIs, database schema/data, or deployment settings.

## Evidence required

- Inspect supplied iPhone screenshots and current production markup/styles before edits.
- Verify 360px, 390px, and 430px responsive layouts, feature icon reuse, stable header alignment, and tarot card-frame proportions.
- Reproduce Check-to-History navigation in the browser and verify a single stable bottom-navigation instance during the transition.
- Run project unit suites and CI smoke checks; verify public health, release SHA, and the live pages after deploy.

