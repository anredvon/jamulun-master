# MoneyFlow Today and Navigation Specification

## Goal

Make the Today screen feel more coherent and give iPhone users clear, reversible navigation through the check flow.

## Requirements

- Show exactly three daily lucky details under Today’s horoscope: color, die number (1–6), and direction (8 compass points).
- Generate each value deterministically from the Seoul date and selected zodiac so refreshes and sign changes keep the displayed text and raster image paired.
- Use generated raster sprite atlases for the category combinations; visible Korean text remains the accessible source of truth.
- Keep the current lucky item as a short sentence inside the horoscope interpretation; do not create a fourth image or tile for it.
- Replace all four bottom-tab mini icons with one coherent, monochrome raster outline set, including a cat-free Today symbol. Preserve the Korean menu labels and active-tab state.
- Add a top-left back affordance to check-flow subpages and let the question flow step backward through browser history, including iOS edge-swipe navigation where supported.
- Earlier submitted answers are view-only. Do not change API contracts, API behavior, database schema/data, redraw rules, or release configuration.
- Add restrained 150–250 ms state transitions and clear tap/selection feedback; honor `prefers-reduced-motion`.
- Keep the existing entertainment/self-reflection framing; do not present personalized financial advice or predictions.

## Decisions

- Compass values use N, NE, E, SE, S, SW, W, NW.
- Seven fixed palette values and die faces 1–6 map to fixed raster sprite indices.
- All four bottom navigation icons use the same 2×2 outline sprite sheet and stroke color.
- Seoul date plus zodiac index is the stable seed; values do not change on refresh within that day.
- A saved previous answer is shown selected and locked; the user may continue forward or leave the flow, but cannot replace it because `/api/answer` rejects duplicate answers.

## Non-goals

- API or database changes, new persistence, changes to how many check questions exist, or changes to service release configuration.
