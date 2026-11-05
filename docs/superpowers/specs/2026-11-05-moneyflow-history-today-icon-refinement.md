# MoneyFlow History and Today Icon Refinement

## Intent

Make Tarot History feel personal again by showing the selected card on each saved row, while keeping the canonical Tarot feature icon identifiable. Bring the shared header and Today content marks into the approved raster cat style so these surfaces feel like one product.

## Goals

- Show the actual selected Tarot card as a compact portrait preview in its History row.
- Keep the same canonical Tarot feature icon as a small category marker; the card preview is record content, not a replacement feature icon.
- Replace the generic MoneyFlow O mark with the existing raster cat brand mark.
- Replace the header Home SVG with one generated transparent raster cat-and-house icon that remains recognizable at small iPhone sizes.
- Reuse the existing canonical Quote and Today raster feature cells in the Today page headings.
- Preserve the selected zodiac sign's constellation so it continues to identify the selected sign.

## Non-goals

- No changes to routes, APIs, database schema or rows, history storage, random Tarot draws, redraw rules, or service/deployment settings.
- No changes to copy, card layout, navigation labels, active states, safe-area behavior, or Lotto result graphics.
- No replacement of canonical feature artwork with record-specific art in menus or other features.

## Approaches considered

1. Replace the Tarot History mascot with the card image. Rejected because it removes the consistent feature marker the user asked to share between a feature and its records.
2. Keep the mascot and add the selected Tarot card as a compact row preview. Selected because it restores the record-specific cue without changing the feature-icon contract.
3. Replace every symbol on Today with a detailed mascot. Rejected because small navigation and selected-zodiac symbols must stay immediately readable.

## Selected visual direction

Use an actual Tarot card preview with a small canonical Tarot marker in the record row. Use the existing generated raster cat for the brand, a new transparent raster cat-and-house for the Home action, and existing shared Quote/Today feature sprites for Today content headings. Keep the selected constellation and all navigation semantics legible. Artwork remains decorative to assistive technology; the text labels continue to convey meaning.

## Constraints and verification

- Preserve the current 360–430 CSS-pixel mobile layouts and WKWebView safe-area behavior.
- Use a fallback to the canonical Tarot feature icon when a record has a missing or unknown `cardId`.
- Render Home, History, and Today at 360, 390, and 430 CSS px. Verify a Tarot record with a valid card ID, one with a missing ID, canonical feature-marker parity, PNG transparency/crop, tap targets, and no missing image requests.
- Run Python and Node suites. Release only through the protected main PR and existing rollback-capable Lightsail script; do not enable auto-deploy.
