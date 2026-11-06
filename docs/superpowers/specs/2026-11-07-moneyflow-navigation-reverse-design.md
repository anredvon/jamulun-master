# MoneyFlow Navigation Reverse Motion

## Goal

Make returning from Home feel like the inverse of entering Home, and avoid layering app-authored CSS motion over iPhone Safari's native edge-swipe/BFCache transition.

## Scope

- Keep `/home` as the Home destination and keep `/today` as its separate bottom-navigation destination.
- Keep feature-to-Home entry as an upward movement.
- On a non-BFCache browser history return, infer the inverse of the transition recorded on the destination history entry. In particular, `home-up` returns with `home-down`.
- On BFCache `pageshow` with `persisted === true`, let the browser own the gesture; clear stale transforms and unlock the next navigation without adding CSS entry motion.
- Keep a plain horizontal `back` entry as the fallback when direction metadata is absent or cannot be matched.
- Preserve reduced-motion behavior, API/DB/server configuration, route behavior, and the existing random Tarot and daily redraw behavior.

## Motion thesis

- **Continuity:** entering Home rises from the feature; returning to that feature descends from Home.
- **Native gesture:** iOS edge-swipe is already an interactive spatial transition, so CSS must not animate the restored BFCache page again.
- **Budget:** use the existing transform-only motion and timings; add only one reverse keyframe, with no dependency or persistent animation.

## State contract

Before a normal same-origin link navigation, annotate the current history entry with the outgoing transition type and destination URL while preserving its existing `history.state`. A later non-BFCache `back_forward` restoration uses this metadata only when the document referrer matches the recorded destination. Otherwise it uses the existing horizontal-back fallback.

