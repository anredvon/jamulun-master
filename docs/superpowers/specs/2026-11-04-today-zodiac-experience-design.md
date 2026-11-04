# Today Zodiac Experience

## Intent

Make the Today page's zodiac section feel useful and editorially composed while keeping the main mobile screen compact. The user approved the generated MoneyFlow mockup as the visual target.

## Design

- Keep the existing selected-sign selector and local preference.
- Present the selected sign with three clearly labeled parts: `오늘의 흐름`, `오늘 해볼 일`, and a compact `행운 아이템` chip.
- Add `다른 별자리도 보기`; it opens a mobile-friendly list of all 12 signs with each sign's short daily fortune and item. Selecting a row updates the selected sign and closes the list.
- Keep the quote card and four-tab navigation. Preserve source/casual-entertainment disclaimer.
- Use existing constellation line icons and the current lavender/purple visual language; no external illustrations or unlicensed horoscope text.
- Horoscope text remains MoneyFlow editorial content. Derive the day consistently from Asia/Seoul and use the existing weekday rotation until a separately approved licensed feed or dated editorial store exists.

## Content and interaction constraints

- Do not attribute original MoneyFlow copy to a third party.
- Avoid guaranteed predictions or instructions to buy/sell/invest.
- Treat lucky items as playful editorial prompts, not as claims that an object causes luck.
- Ensure the selected-sign card and all-sign list use the same date and payload.
- Keep the selected-sign experience compact enough to retain the existing one-screen mobile intent; the full list may scroll inside its own sheet.

## Non-goals

- No third-party feed, API key, new dependency, user account, or date-of-birth collection.
- No deployment in this change.
