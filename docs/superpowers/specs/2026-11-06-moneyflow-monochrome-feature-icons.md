# MoneyFlow monochrome feature icons

## Intent

Extend the user's approved thin monochrome raster line-icon style across the remaining MoneyFlow feature screens so the interface reads as one product.

## Goals

- Use transparent PNG line art for non-Lotto feature icons and the in-app brand/home header marks.
- Keep each feature mapped to the same icon in Home, Check, Today, and History wherever that feature appears.
- Keep the bottom navigation's dedicated mini icons as approved.
- Keep existing Lotto/lucky-number screens, their Lotto Home/History icon and header art, Today lucky-point artwork, Tarot card artwork, and large mascot illustrations unchanged.
- Preserve routes, controls, copy, APIs, database behavior, Tarot random draw/redraw behavior, and release configuration.

## Non-goals

- Restyling buttons, arrows, social-network logos, system status glyphs, Tarot card artwork, or large page illustrations.
- Changing Lotto, lucky-number, or lucky-point image catalogs.
- Replacing any raster asset with SVG or other vector artwork.

## Approach

Use one transparent 4×3 PNG atlas for the non-Lotto feature icons, with stable CSS sprite mappings. Keep the current Lotto icon on its existing sprite and use the existing mini atlas in the bottom navigation. This extends the approved icon family while preserving exact feature identity across shared screens. Separate per-page assets would make feature-to-history parity harder to maintain; stretching the four-icon bottom atlas into unrelated concepts would weaken recognition.

## Mapping

| Feature | Atlas cell |
|---|---|
| Tarot | row 1, column 1 |
| Palm | row 1, column 2 |
| Lotto | existing Lotto sprite, unchanged |
| Check | row 1, column 4 |
| Future / money management | row 2, column 1 |
| Spending style | row 2, column 2 |
| Money reflection | row 2, column 3 |
| Quote | row 2, column 4 |
| Today | row 3, column 1 |
| History | row 3, column 2 |
| Home | row 3, column 3 |
| MoneyFlow mark | row 3, column 4 |

## Responsive use

The atlas cells are square, so feature artwork keeps its proportions in square image boxes. Existing card and row geometry remains fixed; only the icon crop and size change. Review Home, Today, Check, History, and the Check flow at 360, 390, and 430 CSS pixels.
