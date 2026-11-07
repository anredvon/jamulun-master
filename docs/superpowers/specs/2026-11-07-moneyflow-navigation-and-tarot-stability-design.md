# MoneyFlow navigation and Tarot stability

## Intent

Make the shared header match the requested hierarchy and make browser navigation and Tarot interactions feel reliable on iPhone.

## Goals

- Place the MoneyFlow brand at the top left and place `← 뒤로` on a second row directly beneath it on feature pages; keep Home at the top right.
- Keep horizontal motion for forward feature links and upward motion for an explicit Home link. Let browser history traversal, including iPhone edge-swipe Back, own Back/Forward motion so it cannot compete with a CSS transition.
- Let Tarot shuffle finish before restoring input and remove competing filter/opacity compositing during the shuffle.
- Accept only one card selection while the 400 ms reveal is pending; make result rendering idempotent.

## Non-goals and constraints

- Preserve random card selection, current redraw behavior, existing feature routes, APIs, database data/schema, and server deployment configuration.
- Do not alter the bottom navigation or unrelated feature icons.
- Do not add dependencies.
- Release only the reviewed merged SHA with the existing Lightsail deployment script after CI and live checks.

## Approach

1. **Custom motion for all traversals:** keep authored motion for every Back/Forward route. This preserves a uniform scripted look but can conflict with iOS's interactive edge-swipe animation.
2. **Browser-owned history motion (selected):** retain authored transitions for ordinary same-origin feature links and the explicit Home link; do not animate `back_forward` history restores in CSS. This preserves the requested forward and Home motion while avoiding a second animation during edge-swipe Back.
3. **Remove all route motion:** eliminates competing effects but drops the approved horizontal feature and upward Home transitions.

The second approach is selected because Back is explicitly meant to match iPhone's native history gesture. The user asked to correct all four findings and authorized implementation and production deployment; no extra design choice is pending.

## Behavior details

- Header brand and Home control share the first row. Feature pages put a browser-history Back button at the left of a second row; Home has no Back control.
- Forward link and Home animations remain. Back/Forward history traversal has no app-authored transform, whether restored from BFCache or reloaded.
- Tarot locks all choices synchronously on the first tap. A single pending reveal may be canceled by reset; duplicate report events do nothing.
- Shuffle unlocks on the three card animations' `animationend`, with a safety timeout after their 1.02 s CSS duration. Reduced-motion users do not wait for an animation that will not run.

## Verification

- Add failing regression tests for header hierarchy, history-transition ownership, rapid Tarot taps, idempotent report rendering, and shuffle completion/reduced-motion behavior.
- Run all Node and Python suites, deployment smoke checks, and the GitHub CI workflow.
- Inspect the rendered mobile layout and exercise feature links, Home, Back button, Tarot shuffle, and rapid taps in an isolated browser before release.
- Verify the merged SHA, Lightsail active release, `jaemulun.service`, local health endpoint, and public mobile pages after deployment. Distinguish physical iPhone edge-swipe verification from browser or desktop emulation if the connected device cannot be driven.
