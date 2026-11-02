# Lotto Reference-Fidelity Redesign

## Intent

Bring the Lotto experience close to the user's supplied six-screen mobile reference. The reference communicates an immersive, premium purple-and-gold lottery flow from Home entry through an animated draw, sequential number reveal, a result card, and saved draw history. The current feature is functional but visually presents these moments as one basic page.

## User-Approved Scope

- Redesign the Lotto entry, draw, reveal, result, and history experience to follow the supplied reference.
- Keep the existing app-wide bottom navigation (`홈 · 오늘 · 체크 · 기록`). The user selected this after we explained that changing it would affect unrelated screens.
- Place the Home Lotto entry after Tarot and Palm as the third feature menu, matching the supplied reference.
- Reuse the existing Flask, Jinja, CSS, Canvas, and vanilla JavaScript architecture and current server-authoritative draw APIs.
- Reuse existing MoneyFlow mascot, crystal-ball, coin, and sparkle assets where they match.
- Keep current draw rules, saved results, share-link ownership, and entertainment-only disclaimer.

## Goals

1. Give `/lotto` a distinct entry state with a clear draw CTA, round information, draw allowance, and short feature benefits.
2. Show a polished lottery machine scene during the server-committed draw, then reveal six saved numbers in sequence.
3. Present a finished result card with round/sequence labels, three remaining-draw states, image save, link share, history access, and redraw action.
4. Add a dedicated `/lotto/history` screen backed by the existing owner-scoped history API, with current-round and past-record views and draw schedule information.
5. Recreate the reference's premium, luminous purple/gold visual language while keeping typography legible, controls accessible, and motion bounded.
6. Keep desktop layouts centered and responsive while tuning phone layouts to the portrait framing in the reference.

## Non-Goals

- Do not change Home/Today/Check/History global navigation or redesign unrelated Tarot, Palm, Check, investment, or general History pages.
- Do not change number generation, round/quota rules, database ownership, migration, or share-token behavior.
- Do not add a frontend framework, 3D engine, or runtime package.
- Do not treat text inside the reference image (including sample draw numbers/timestamps or implementation-status claims) as production data or verified project status.
- Do not merge or deploy the existing Draft PR.

## Current State and Constraints

- `/lotto` is one Jinja page containing intro text, Canvas theater, results, and an anchor to the result section.
- The 45-ball Canvas and staged result animation already exist and are server-result driven.
- `/api/lotto/history` returns owner-scoped draws (up to 90); there is no dedicated Lotto history page.
- The result card currently offers image save and link share. A direct history action is absent.
- Existing visual assets include `static/images/ui/wealth_check/cat_crystal_ball.png`, `cat_coin.png`, `crystal_ball_only.png`, `coin_gold_01.png` through `coin_gold_03.png`, `hat.png`, and sparkle assets.
- The supplied reference is a flattened image, not a layered Figma file. Pixel-identical reconstruction cannot be guaranteed without source layers, but the flow, layout, visual weight, palette, and asset composition can be closely matched at the agreed mobile viewport.
- Reference file: `/Users/redvon/Downloads/237B9D26-A973-486B-9C90-2F84439F1DB3.PNG` (1536×1024). For responsive work, treat 390×844 CSS pixels as the primary phone viewport and verify a fluid 320–430px range; the source image itself does not encode an exact device viewport.

## Approaches

### A. Reference-led, native-stack flow (selected)

Use the existing Flask/Jinja page and vanilla JavaScript to present entry, drawing, reveal, and result states at `/lotto`, then add a dedicated Jinja history route using the existing API. Build the machine scene with HTML/SVG/CSS, Canvas balls, and existing branded image assets. This preserves production behavior, accessibility, and offline-friendly app conventions without new dependencies.

### B. Static screen mockups

Render each view as a flat decorative image. This can resemble the reference quickly, but numbers and controls are not independently accessible or responsive and the experience would not match real saved state. Rejected.

### C. New 3D/WebGL frontend

Add a separate rendering engine for a 3D lottery machine. It could create deeper lighting but adds bundle weight, device risk, and maintenance beyond the requested visual improvement. Rejected for this pass.

## Interaction and Visual Decisions

- Entry CTA is the only way to create a draw; merely visiting or refreshing never spends an attempt.
- Show the live number reveal only after the server commits the result. If reduced motion is enabled, the document is hidden, the stage becomes offscreen, or Canvas is unavailable, expose the complete saved result without waiting on decorative motion.
- The intro and result page use deep-space purple surfaces, gold edge lighting, sparkling accents, and the existing purple-hat cat assets. The host app's common bottom navigation remains unchanged.
- The result card includes three distinct secondary actions (share link, save image, view history) and a prominent redraw CTA with the remaining count.
- History provides tabs for the current draw round and prior rounds, shows sequence/date details, and keeps the server as its data source.
- The UI labels schedule values as based on the operator's regular schedule and retains the existing warning that irregular schedule changes are not live-synced.
- Schedule presentation uses `Asia/Seoul`: draw day Saturday, Internet sales cutoff 20:00, approximate draw time 20:35. Historical cards use each stored `created_at` value for the user's draw time; current-round schedule copy comes from the existing status API.
- All meaningful labels, results, and actions remain readable without animation and without relying on color alone.

## Acceptance Criteria

- Home shows the Lotto entry card third, after Tarot and Palm, styled to match the reference.
- A first visit shows the entry state and consumes no draw; activating the CTA starts the existing server flow exactly once.
- The draw scene, staged reveal, and result card follow the reference's order and hierarchy at phone width.
- A completed result exposes image save, link share, history navigation, and redraw with correct remaining count.
- `/lotto/history` renders current-round draws and prior rounds from owner-scoped data; tabs work on narrow screens.
- Refresh restores committed results; share ownership and current quota logic remain unchanged.
- Reduced-motion, hidden-page, offscreen, and missing-Canvas behavior remain safe and reveal the complete result.
- Existing app bottom navigation remains intact; no unrelated product screens change.
- New runtime dependencies are not added.
