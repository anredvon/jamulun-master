# Today lucky point sprite atlases

These transparent PNG sprite sheets back the three entertainment-only lucky point cards on `/today`.

- `color-atlas.png`: 4 columns × 2 rows. Row-major cells 0–6 are lavender, sky blue, sage, rose, gold, peach, and mint. The final cell is intentionally unused.
- `dice-atlas.png`: 3 columns × 2 rows. Row-major cells show die faces 1 through 6.
- `compass-atlas.png`: 4 columns × 2 rows. Row-major cells point north, northeast, east, southeast, south, southwest, west, and northwest.

`static/js/today.js` derives each value from the Seoul date supplied by the page and the zodiac's stable list index. The label and sprite cell use the same selected catalog entry so the displayed image cannot drift from its text.
