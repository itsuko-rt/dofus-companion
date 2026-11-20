# Current status

*Last updated: 2026-11-20 by Claude Code. Update this note after each significant session.*

## Where we are
**Pre-launch.** The site runs locally. All checks pass: typecheck, 72 unit tests, 22 E2E tests, production build, `npm audit` with 0 vulnerabilities.

## Latest changes (2026-11-20, pushed to `main`)
- **In-site map removed:** `/carte` is now a directory of DofusDB and Dofus Maps ([[ADR-0005 Remove the in-site map]]).
- **Security audit and fixes:** reset links kept out of production logs, password hashing capped, JSON-LD escape fixed ([[Security Audit]]).
- **This knowledge base** and the project `CLAUDE.md`.
- **Obsidian set up** (branch docs/obsidian-setup): vault registered in Obsidian 1.15.1, dashboard rebuilt, Bases view of research notes ([[Setup Report]]).

## Since phase 0 (2026-11-20, branch docs/product-audit, not committed)
- **Game data foundation:** classes (`breed_info`), monsters with grades, zones and drops, character XP table. Inventory: `docs/GAME_DATA_INVENTORY.md`.
- **All 19 classes:** onboarding grid, spell pages, builds (Fashionista names checked) and class filters. Crâ and Pandawa keep their URLs.
- **Not in the game files:** profession XP table and XP per craft, prices.
- **Class-aware progression:** class quests panel and hiding of other classes' exclusive quests; "Pour votre classe" achievements (linked by class quests, or named after the class); fix of [[Server-only objectives counted as met]].
- **Professions:** XP calculator on every profession page ([[ADR-0007 Profession XP comes from the player's screen]]); loot ingredients show up to 3 monsters that drop them, with the base chance.
- **Que faire à mon niveau** (`/progression/niveau`): game suggestions, zones and monsters (base XP, drops, harvests) and dungeons for a level. No rates or prices.
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
Phase 0 of `docs/GAME_DATA_AND_PRODUCT_AUDIT.md` done on 2026-11-20 (branch docs/product-audit, not committed): [[Blank pages on a first visit]] fixed, Succès query batched and indexed, quest graph built once. Phases 1–2 (all classes, class hub) wait for the owner's approval. Next recommended actions are in the latest [[Session Summaries|session summary]].
