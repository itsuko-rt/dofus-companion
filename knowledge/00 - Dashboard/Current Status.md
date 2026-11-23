# Current status

*Last updated: 2026-11-20 by Claude Code. Update this note after each significant session.*

## Where we are
**Pre-launch.** The site runs locally. On branch `develop` (after the pre-merge fixes of 2026-11-20): typecheck clean, 90/90 unit tests, production build OK, E2E 47 passed and 1 skipped by design, 0 failed. Not deployed.

## Scanner (2026-11-23, branch feature/atlas-ecosystem)
A screenshot or a shared window of the « Terminées » quest list or the obtained achievements now saves what is read with certainty at once (undo in the history), and pre-ticks the rest. See [[2026-11-23 Scanner that saves quests and achievements]]. Accuracy on real DOFUS screenshots: not measured yet.

## Connected ecosystem (2026-11-21, branch feature/atlas-ecosystem)
Research and the first ecosystem features ([[2026-11-21 Ecosystem research and encyclopaedia]]):
- **Research:** [[Competitor Analysis]], [[Teckium Tool Analysis]], [[Desktop Companion Research]].
- **Encyclopaedia** `/encyclopedie`: monster, item, dungeon, zone and set sheets, linked both ways, with one search ([[Ecosystem Architecture]]).
- **Atelier** `/metiers/atelier`: a craft list adding up the resources from the game recipes.
- **Drop odds:** exact probability from the game's base rates.
- **Companion window** `/compagnon`: an always-on-top window with a step-by-step Dofus guide, pinned achievements and search ([[Companion Window]], [[ADR-0008 Companion window in the browser]]).
- Checks: typecheck clean, 106/106 unit tests, E2E 59 passed and 1 skipped by design, 0 failed. Not merged, not deployed.

## Succès redesign (2026-11-21, on `develop`)
The achievement journal was rebuilt for first-time players ([[2026-11-21 Achievements redesign]]):
- **"Pour vous"** landing: to confirm, nearly done, class and level suggestions, each with its reason;
- **categories in 3 families**, with Temporis and events kept apart;
- **one search** over names, objectives, dungeons and categories;
- **clearer cards** with "Où aller" (quests and their status, dungeons, Dofus);
- **mobile category picker**, and the browser's back button works between views.

Then a visual rework ([[2026-11-21 Achievements visual redesign]]): a header dashboard (ring, points, obtained, to confirm, search), category icons with a collapsible sidebar, compact entries with emblems, a parchment detail sheet in a side panel from 1280 px, and a category drawer on phones.
A refinement pass followed ([[2026-11-21 Achievements refinement]]): medallions whose ring fills with the objectives met, points tiers, objectives that name their monster, zone or dungeon (level, where it lives, link to the level page at that level), linked « Où aller » rows (quests, dungeons, Dofus guides), reward tiles, clearer completion footer, sidebar without truncation.

## PR #2 review (2026-11-20)
Report: `docs/PR2_TECHNICAL_REVIEW.md`, summary [[2026-11-20 PR 2 technical review]]. The four pre-merge fixes are done on `develop`, with regression tests ([[2026-11-20 PR 2 pre-merge fixes]]):
1. Almanax: a season no longer replaces the day's offering (81 days of 2026 → 0).
2. Level page: "XP non renseignée" instead of 0; archmonsters, quest monsters (incl. Pwâk), wanted targets, Dopeuls and summons left out of zones (still in the database).
3. Craft-demand ranking uses every unconditional drop.
4. Sitemap E2E test split into 6 batches.

Open after the fixes: findings M2–M8 and L1–L8 of the report (data foundation work).

## Latest changes (2026-11-20, pushed to `main`)
- **In-site map removed:** `/carte` is now a directory of DofusDB and Dofus Maps ([[ADR-0005 Remove the in-site map]]).
- **Security audit and fixes:** reset links kept out of production logs, password hashing capped, JSON-LD escape fixed ([[Security Audit]]).
- **This knowledge base** and the project `CLAUDE.md`.
- **Obsidian set up** (branch docs/obsidian-setup): vault registered in Obsidian 1.15.1, dashboard rebuilt, Bases view of research notes ([[Setup Report]]).

## On branch `develop` (2026-11-20, pushed; PR #2 into `main`, not merged)
- **Game data foundation:** classes (`breed_info`), monsters with grades, zones and drops, character XP table. Inventory: `docs/GAME_DATA_INVENTORY.md`.
- **All 19 classes:** onboarding grid, spell pages, builds (Fashionista names checked) and class filters. Crâ and Pandawa keep their URLs.
- **Not in the game files:** profession XP table and XP per craft, prices.
- **Class-aware progression:** class quests panel and hiding of other classes' exclusive quests; "Pour votre classe" achievements (linked by class quests, or named after the class); fix of [[Server-only objectives counted as met]].
- **Professions:** XP calculator on every profession page ([[ADR-0007 Profession XP comes from the player's screen]]); loot ingredients show up to 3 monsters that drop them, with the base chance.
- **Que faire à mon niveau** (`/progression/niveau`): game suggestions, zones and monsters (base XP, drops, harvests) and dungeons for a level. No rates or prices.
- **Almanax du jour** on the home page: offering (item, quantity, where it comes from), bonus, period bonuses, next 6 days, from the game calendar (Paris day).
- **Class pages** (`/personnage/sorts/<classe>`): official description and complexity, class quests with links, linked achievements, then the spells.
- **Equipment « Obtention »:** each item card shows its recipe (profession, level, ingredients) or the monsters that drop it.
- **Quest drawer « Où trouver »:** zones of objective monsters, sources of objective items.
- **First Quêtes visit:** graph and graph view warmed on idle from other pages (730 → 580 ms at 4× CPU).
- **UX pass:** sharper tab icon (`favicon.svg`), compact mobile Quêtes header with a « Filtres » button, five progression tabs that fit 375 px, one category navigation in Succès (with progress), short fade-in after loading.

## Blocking a public launch
From [[Release Checklist]]:
1. **E-mail provider:** password reset can't send links in production.
2. **Hosting environment variables:** `NEXT_PUBLIC_SITE_URL` (https), `TRUSTED_IP_HEADER`, `APP_DB_PATH`, `LEGAL_*`.
3. **Backups** of `data/app.sqlite`, with one restore tested.
4. **Staging run:** OWASP ZAP baseline, headers over https.
5. **Legal review** ([[GDPR and Privacy]]): terms of service, DPAs, breach procedure, retention, minors.
6. **Ankama fan-site terms**, Fashionista maintainers informed, trademark check.

## Known limitations
- The scanner's OCR accuracy has not been measured on real Dofus screenshots (UNVERIFIED).
- 621 of 1,984 quests have conditions the engine can't fully interpret. They are shown as "à vérifier en jeu", never guessed.
- Builds come from Fashionista; budget, prices and verified damage are not available.
- Professions: resources are known per zone, not per map, and no spot counts.
- XP and kamas routes: no verified data, not implemented.

## What Claude Code is working on
Nothing in progress. PR #2 is fixed and ready for the owner to merge (not merged). Next steps: [[2026-11-20 PR 2 pre-merge fixes#Next recommended actions]].
