# MoneyFlow generated raster icon system

## Intent

Replace the small feature illustrations and bottom-tab SVGs with lively raster cat illustrations that match MoneyFlow's existing mascot. The user approved the generated 3D cat direction, selected the dedicated bottom-tab treatment (B), and asked for each feature's icon to be identical wherever that feature appears, including Home and History.

## Goals

- Use transparent PNG artwork only for the feature and bottom-navigation illustration sets; do not introduce SVG/vector versions of these icons.
- Give each feature one canonical sprite cell and reuse it anywhere that feature appears, including dynamic History rows cloned from the template.
- Use a separate set of four smaller raster cat illustrations for the bottom navigation, in the same character, material, and palette family.
- Keep the existing page layout, route behavior, copy, storage, API, database, redraw rules, and deployment configuration unchanged.
- Tune image size and crop so menu cards, History rows, and bottom tabs remain crisp at 360–430 CSS px and inside WKWebView-safe layouts.

## Non-goals

- Redesigning card/button shapes or changing any feature flow.
- Replacing functional lotto number balls or other result data graphics.
- Changing API, database, service, or deployment settings.
- Deploying a sprite atlas as a user-selectable theme.

## Approved approach

Use a transparent 3×3 PNG feature atlas with a stable mapping for tarot, palm, lotto, future/money-check, spending, money-reflection, quote, today, and History. The shared Jinja `content_icon(name)` macro will emit the same raster sprite class for Home, Check, and History. `/lotto/history` redirects to `/history?filter=lotto`, so Lotto's canonical icon appears in the shared History row rather than a separate Lotto History screen. Use one separate transparent 2×2 PNG atlas for dedicated Today/Tarot/Check/History bottom-tab minis (the approved B direction). CSS owns sprite crop positions and responsive display sizes; no inline SVG will remain in these two icon systems.

## Constraints and assumptions

- Existing generated cat artwork is the visual authority: soft 3D, glossy rounded forms, violet/lavender, ivory, and warm gold.
- The feature atlas mapping is canonical: Tarot, Palm, Lotto, Future Check, Spending, Money Reflection, Quote, Today, History (row-major order).
- The dedicated bottom atlas mapping is canonical: Today, Tarot, Check, History (row-major order).
- Menu illustrations target the current 40–48px visual area; History rows target 38–42px; bottom tabs target about 26px plus the existing text label.
- The current checked-out GitHub main revision is the source baseline. AWS deployment state and auto-deploy readiness must be verified before release claims.

## Verification

Render Home, Check, and History (including a saved lotto entry) at 360, 390, and 430 CSS px. Confirm feature mapping consistency, transparent backgrounds on the existing surfaces, crop alignment, nav label/illustration balance, no missing-image requests, and no unrelated functional or data-flow changes. Run repository tests and CI before release. Deploy only the reviewed commit through the existing release process, then check health and the affected live routes.
