# Data pipeline

## Import (`npm run import`)
1. **Download:**
   - the latest **dofus-sqlite** release JSON files (quests, steps, achievements, objectives, dungeons, breeds, spells, effects, monsters, NPCs, subareas, maps information, jobs, skills, recipes, i18n_fr…);
   - the **dofusdude** `items` and `item_sets` of the same version;
   - the **DPLN** sitemap.
2. **Build:** `data/game-<version>.sqlite`, with Ankama ids as keys.
3. **Items:** taken from dofusdude, because dofus-sqlite's JSON rounds 64-bit Unity ids, which breaks the item → effect links ([[Bug History]]).
4. **Graph:** compiled from the conditions.
5. **Tutorial links:** only for exact title matches (1,390 quests).
6. **Professions:** imported by `scripts/professions-import.ts`.
7. **Report:** `data/report-<version>.json` with counts, parse errors, interpreted quests (1,363 / 1,984) and inferred codes.

Memory: the import needs ≈ 8 GB (`--max-old-space-size=8192`). Raw downloads stay in `data/raw/` (git-ignored).

## After a game patch
- Run the import with the new tag: `npm run import -- --tag <tag>`.
- Run `node scripts/profile-codes.ts` to list condition codes, and document new ones in `src/codes.ts` with their source.
- The old database file stays, and the newest one is used (`latestDb()` in `src/load.ts`).
- Planned, not built: automatic weekly check and a diff of changed quests (`docs/RAPPORT_ARCHITECTURE.md` §4).

## Assets
`npm run assets` (`scripts/fetch-assets.ts`) copies official class art and item icons to `public/ankama/`. These files are © Ankama, kept local, never committed, and not hotlinked.

Sources and their reliability: [[Official Sources]].
