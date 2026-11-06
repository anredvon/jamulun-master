# MoneyFlow 78-card Tarot deck

## Intent

Give the existing one-card MoneyFlow ritual a fuller, distinctive 78-card deck. Use recognizable Tarot archetypes as a starting point, then interpret them through ordinary money feelings and choices in MoneyFlow's warm, conversational self-reflection voice.

## Approved interaction and copy direction

- Keep the current three card backs as random entry points: tapping any one selects one random card from the full 78-card pool, with replacement. Preserve the current redraw behavior.
- Remove the discovery counter, collection sheet, found/new-card badges, discovery burst, and related progress copy. The collection is not a draw inventory and must not constrain future draws.
- Each result has three distinct fields:
  - `flow`: a longer, natural Tarot-reader-style interpretation grounded in a recognizable everyday situation, with warmth and empathy. Avoid generic abstractions, repeated templates, predictions, and financial instructions.
  - `caution`: one short, focused question the user can ask themself.
  - `line`: a second short question in the cat's voice, offering a different angle on the same card.
- Use a single concise framing line on the picker: `오늘의 마음을 비춰보는 타로 한 장, 가볍게 즐겨보세요.` Do not repeat disclaimers on reveal and report views.
- Show the card name in Korean only; show its keyword as a quiet secondary detail. Label the longer interpretation `오늘의 흐름`, not `생각해볼 거리`.
- Keep the original card backs and page palette, while increasing the card edge and offset shadow enough to make each card distinct from the pale page background.
- Interpret the traditional 22 Major Arcana and 56 Minor Arcana through MoneyFlow's self-reflection lens. Suit lens: Wands—motivation and action; Cups—values and satisfaction; Swords—thoughts and choices; Pentacles—everyday resources and spending.
- Use original raster artwork in the approved warm ivory, lavender, muted green and restrained gold storybook style with the cat mascot. Artwork itself contains no embedded explanatory copy; render card labels and user-facing text in HTML.

## History and data safety

- Preserve all existing Tarot History records and the existing 24 card IDs/art paths for lookup. Existing history continues to resolve its exact card image and reading through a legacy catalog.
- Keep the 78-card draw catalog separate from the 24-card legacy history lookup. Legacy cards must not enter the new random pool.
- Continue saving result history via the existing browser-local history store. No API, database, schema, route, redraw-policy, or service/deploy changes.
- Do not delete local history or collection storage during rollout.

## Non-goals

- No production deploy, API/DB changes, personalized investment advice, future/financial prediction, depleted-deck behavior, or new daily redraw restrictions.
- No collection or completion mechanic.

## Acceptance

- Exactly 78 unique draw cards: 22 Major and 56 Minor, all with unique IDs and complete copy/art fields.
- Every draw result is uniformly selected with replacement from those 78 cards.
- The current Tarot picker, reveal, and report screens reflect the 78-card pool and contain no collection progression UI.
- Existing local Tarot history records still show their original art and detail; new records resolve to the new 78-card art and copy.
- Copy reads as varied, specific, empathetic Korean, with one longer interpretation and two brief non-duplicative questions per card.
- Result hierarchy avoids the English card name and uses the concise Korean interpretation label; card backs remain visually distinct on the pale picker background.
- All original artwork files and business behavior outside this UI remain intact.
