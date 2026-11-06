# MoneyFlow monochrome feature icon rollout plan

> **For agentic workers:** Execute tasks in order in this isolated worktree. Review the final diff before release. Steps use checkbox syntax.

**Goal:** Extend the approved monochrome raster icon language to all non-Lotto feature surfaces while preserving the Lotto family.

**Architecture:** Add a transparent 4×3 feature atlas and route existing feature sprite classes through stable cell positions. Keep the Lotto cell on the current mascot atlas and keep the bottom navigation on its dedicated mini atlas. Replace only the in-app header Home/MoneyFlow marks and functional feature marks; preserve large illustrations, Tarot card art, lucky-point assets, and utility arrows.

**Tech Stack:** Flask/Jinja, CSS sprite atlases, transparent PNG.

**Spec:** `docs/superpowers/specs/2026-11-06-moneyflow-monochrome-feature-icons.md`

## Global constraints

- Non-Lotto feature icons use transparent raster line art; do not add vector versions.
- A feature uses the same canonical icon across Home, Check, Today, and History.
- Lotto and lucky-number screens, Today lucky-point sprites, Tarot card art, and hero mascot illustrations stay unchanged.
- Routes, APIs, database behavior, Tarot behavior, and deployment configuration stay unchanged.
- Review at 360, 390, and 430 CSS pixels.

## Review focus

- Lotto still uses its existing asset in Home and History.
- Tarot, Palm, Check, Future, Spending, Money, Quote, Today, and History map to the intended transparent atlas cell.
- Square crops retain artwork proportions and avoid clipping on the smallest width.
- Header brand and Home controls remain aligned with back buttons on subpages.
- No templates gain iconography changes outside this approved scope.

## Tasks

### Task 1: Generate and inspect the shared feature atlas

**Files:** create `static/images/ui/icons/feature-outline.png`; update `static/images/ui/ASSET_MANIFEST.md`.

- [x] Generate a transparent 4×3, no-text monochrome line atlas from the approved bottom-nav icon style.
- [x] Keep the Lotto cell empty/reserved; preserve the existing Lotto sprite outside this atlas.
- [x] Inspect the atlas for one distinct, centered icon per assigned cell and real alpha transparency.

### Task 2: Wire shared feature mappings and header marks

**Files:** `static/css/feature-icons.css`, `static/css/app-chrome.css`, `templates/_app_header.html`, `templates/today.html`, `static/css/today.css`.

- [x] Map each non-Lotto feature class to the approved 4×3 cell; retain the old Lotto atlas for `.feature-illustration--lotto`.
- [x] Render the header Home and MoneyFlow marks from the same new raster atlas outside the preserved Lotto screens.
- [x] Replace Today quote, horoscope, flow, and action feature marks with mapped line icons; leave lucky-point images unchanged.
- [x] Update icon boxes to square crops while retaining each existing outer component size.

### Task 3: Verify all shared placements

**Files:** verify Home, Check, History, Today, and check-flow templates/styles.

- [x] Inspect 360, 390, and 430 CSS px for Home, Today, Check, and History; confirm no line icon is clipped or distorted.
- [x] Confirm the Lotto Home and History rows still use the old Lotto sprite.
- [x] Confirm the same non-Lotto feature uses the same atlas mapping in Home and History.
- [x] Review the full diff for excluded routes/assets and unchanged API, DB, Tarot, and release configuration.

### Task 4: Release

- [ ] Run the focused existing deployment smoke tests locally and the full repository CI gate through GitHub; do not add unrelated test cases.
- [ ] Merge only after CI passes, deploy the exact merge SHA via the existing Lightsail release script, and verify health plus production Today/Home/History rendering.
