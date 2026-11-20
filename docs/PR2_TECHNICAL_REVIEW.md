# PR #2 technical review (`develop` → `main`)

Reviewed on 2026-11-20 at commit `d3fb282` (18 commits, 88 files, +2,280 / −142). Game data: `data/game-3.7.14.18.sqlite` (dofus-sqlite `v6.0_3.7.14.18`, dofusdude `3.7.14.18`).
Method: code read of every changed source file and its callers, the full verification suite, and read-only integrity queries on the game database and raw files (scripts kept outside the repository). No application code was changed.

> **Status (2026-11-20, later the same day):** the pre-merge blockers H1, H2, H3 and M9 have been fixed on `develop` with regression tests. See **§12 Remediation**. Sections 1–11 below are the original review, kept unchanged as the record of what was found.

## 1. Executive summary

PR #2 is technically sound: it typechecks, all 88 unit tests pass, the production build succeeds, 36 of 37 runnable E2E tests pass (the 37th is a timing budget problem, M9), the database passes `PRAGMA integrity_check`, and no imported reference is dangling (drops, recipes, bosses, Almanax items all resolve). There is no security or privacy regression.

It is **not ready to merge as is**, because three features show game data that is wrong or misleading for real players, and the existing tests cannot see it:

1. **Almanax:** on **81 days of 2026** the home card shows the *season's* offering and bonus instead of the day's (e.g. 1 March: "2 × Rondelle de Bois" instead of "La Chaîne Nhanor Kibrill").
2. **Level page:** monsters whose grade XP is `0` in the data are shown as "0 XP" (533 grades in Monde des Douze zones), and archmonsters, quest monsters and Pwâk event monsters are counted in the "zones with the most monsters" ranking.
3. **Level page, "Ressources les plus utilisées":** the ranking only looks at each monster's 3 best drops, so it is not the ranking it claims to be.

These are small, local fixes (§10). The data foundation is good enough to keep, but two structural gaps (objectives stored as rendered text, a zone table limited to the world map) will block the planner and should be fixed before building on them (§7).

**Recommendation: fix H1–H3, M1 (doc claims) and M9 (E2E budget) first, then merge.** Everything else can follow in separate PRs.

## 2. Verified working features

Verification run (production build, `next start` on 127.0.0.1:3101, `E2E_BASE_URL` set):

| Check | Result | PR claim |
|---|---|---|
| `npm run typecheck` | exit 0 | clean ✔ |
| `npm test` | 88 / 88 pass, 0 skipped (real-data tests ran) | 88/88 ✔ |
| `npm run build` | success | OK ✔ |
| `npx playwright test` (desktop + mobile) | **36 passed, 1 skipped, 1 failed** (see M9); the failed test passes when re-run alone (1.8 min) | 37 passed, 1 skipped |
| `PRAGMA integrity_check` | ok | — |

Verified by reading the code and querying the data:

| Feature | Evidence |
|---|---|
| 19 classes from game files | `breed_info` 19 rows; `src/breed-data.json` built by the import; every class has a Fashionista name and colour (`components/breeds.ts`) |
| Class-scoped quests | 40 quests carry `PG`: 38 exclusive + 2 per-class, both per-class quests list all 19 classes, so `reservedToOtherClass` hides exactly the other classes' quests. Tracker totals and home counts use the same rule (`src/regions.ts`, `QuestTracker.tsx`, `Home.tsx`) |
| Server-only objectives | `Sc`/`Sv`-only objectives return `unknown` instead of `inferred` (`src/achievements.ts`) |
| Batched achievement loading | 2 queries per page instead of 2 per achievement; order kept (`loadAchievements`, data test) |
| Character XP table | 200 levels, strictly increasing, level 2 = 110, level 200 = 5,555,424,000 |
| Drop chances | 67,835 values, none null or > 100; all `item_id`/`monster_id` resolve |
| Recipes | 4,743; no missing result or ingredient; one recipe per item |
| Dungeons | 187, no null or inverted level ranges; all bosses resolve |
| Profession calculator input checks | integers ≥ 0, current ≤ next, XP per action > 0 (`checkInput`), with an E2E test |
| « Avec vos métiers » | only gathered/crafted ingredients within the character's levels count; loot never qualifies (`selfSufficient`) |
| Quest graph warm-up | memoised graph and statuses, warmed on idle, skipped with data saver (`useGame.ts`, `Nav.tsx`) |
| First-visit blank pages | `useCharacter` returns a new store object, `ready` derives from identity |
| Security | parameterised SQL in all new queries; bounded inputs (`limit ≤ 120`, ≤ 200 categories, `q` ≤ 60 chars); no new external call, secret, or personal data; `data/`, `.env`, `public/ankama/` stay ignored |

## 3. Bugs and problems found

### Critical
None. No data loss, no security hole, no crash path found.

### High

**H1. Almanax shows the season's offering on 81 days a year**
- *File:* `src/almanax-shared.ts` (`almanaxFor`).
- *Evidence:* season entries #2, #130 and #131 list their days explicitly (`01/03/*`, `02/03/*`…), so they score the same "exact day" precision (2) as the day's own entry. The sort is stable and entries come in id order, so the season entry wins. Over 2026: 81 days affected, e.g. 1 March shows #130 "Challenges augmentés…, 2 × Rondelle de Bois" instead of #193 "Économie d'ingrédients, 1 × La Chaîne Nhanor Kibrill". The unit test only uses single-pattern entries; the real-data test checks one day outside the affected ranges.
- *Fix:* among entries with the same precision, prefer the one with the fewest date patterns (the most specific). Add a real-data test on 1 March and 21 December, and one asserting that every day has exactly one single-pattern winner. Then show the season entries as period bonuses.

**H2. Level page: "0 XP" monsters, and non-standard monsters inflate the zone ranking**
- *Files:* `src/zones.ts`, `src/zones-shared.ts`, `components/progression/LevelView.tsx`.
- *Evidence:* 9,308 of 26,851 grades have `xp = 0`, mostly quest monsters (5,501), summons (789), alignment quest monsters (552) and archmonsters (286). Within world-map zones, 533 of 5,184 grades are 0 and render as "0 XP". The zone ranking (`monsters.length`) counts archmonsters (rare spawns), quest monsters and Pwâk event monsters: at level 60 that is 50 archmonster, 8 quest and 17 Pwâk entries across the top zones.
- *Fix:* show "XP non renseignée" when `xp = 0`, never "0". Import `race` into `ZoneMonster` and exclude, or count separately, the races "Archimonstres", "Monstres de quête…", "Monstres de quête de Pwâk" and "Invocations…". These are game race names, not guesses. Add a data test: no zone monster in the ranking has `xp = 0`.

**H3. "Ressources les plus utilisées par les artisans" only sees each monster's 3 best drops**
- *File:* `src/zones.ts` (`drops[...].slice(0, 3)` happens before `forLevel` computes `wanted`).
- *Evidence:* monsters average 3.1 unconditional drops, but every resource beyond a monster's top 3 by chance is invisible to the demand ranking. Low-chance, high-demand resources (typically the ones crafters need most) are the ones dropped.
- *Fix:* compute `uses` on all unconditional drops, and truncate to 3 only for display. Either send the full list (payload +~150 KB raw) or compute the `wanted` candidates server-side per monster. Add a test that a resource ranked by `uses` is not limited to the top-3 list.

### Medium

**M1. Documentation claims that overstate the features**
- *Files:* `knowledge/09 - Development Memory/Session Summaries/2026-11-20 Autonomous development session.md`, `docs/GAME_DATA_INVENTORY.md`.
- *Evidence:*
  - "~99% resolved" for « Où trouver » counts name matches (1,369 / 1,382 monsters), not correct targets. 155 monster names and 31 item names in objectives are shared by several game entries (M2).
  - Monsters only found in dungeons get no zone (M3).
  - The inventory note on monster XP does not mention the 9,308 zero values.
- *Fix:* correct the notes (part of this review's vault update).

**M2. Quest targets are parsed back from rendered text and matched by name**
- *Files:* `src/objective-targets.ts`, `questTargets` in `src/load.ts`.
- *Evidence:* 155 objective monster names map to several monsters, whose zones are merged (e.g. "Scarabosse Doré", "Chafer Rōnin"). Items with homonyms take the lowest id (`ORDER BY id LIMIT 1`): 31 cases, e.g. "Potion de lèche-bottes", "Lettre de l'intendant San Lavalss". The regexes depend on the French templates of `src/objectives.ts`.
- *Fix:* import the objective parameters (`questobjectivesdata`: `typeId`, `parameters`, already downloaded) into a `quest_objective(id, step_id, type, monster_id, item_id, qty, map_id)` table and join on ids. Keep the regex only as a fallback for free text.

**M3. Zones table excludes dungeons and instances**
- *Files:* `scripts/professions-import.ts` (`world_subarea` keeps only zones displayed on the world map), used by `questTargets` and `loadZoneData`.
- *Evidence:* 1,429 `monster_subarea` rows point to 315 subareas absent from `world_subarea` (e.g. "Repaire de Skeunk", "Caverne du Koulosse", "Expédition - Donjon des Scarafeuilles"). 506 of 1,716 placed monsters have no known zone, and « Où trouver » silently omits them.
- *Fix:* import all 569 subareas into a `subarea` table, with the world-map flag as a column; keep `world_subarea` as a view or filter for the map features.

**M4. Drop data partly imported; duplicates shown twice**
- *Files:* `scripts/creatures-import.ts`, `itemSources` in `src/professions.ts`.
- *Evidence:*
  - Ignored fields: `specificDropCoefficient` (2,792 drops), `disableDropModificator` (309, where prospection probably does not apply), `count`, `hiddenIfInvalidCriterions`, plus the monster-level `temporisDrops` and `globalDrops`.
  - 199 (monster, item) pairs appear twice with different conditions, so the same monster can fill two of the "3 best" source slots (e.g. Wabbit, "Carte en bois : Pierre").
- *Fix:* import these fields unchanged (their meaning stays UNVERIFIED until checked in game), and deduplicate sources per monster, keeping the highest unconditional chance.

**M5. Profession calculator: "% of the current level" rests on an unverified assumption**
- *File:* `src/craft-calc.ts` (`progress = xpNow / xpNext`), `JobGuide.tsx` ("Niveau en cours : x %").
- *Evidence:* this is the share of the level only if the game's two numbers are counted from the start of the level. If the profession panel shows cumulative totals, the bar shows the share of total XP instead. The remaining XP and the number of crafts are correct either way.
- *Fix:* check one in-game screenshot. Until then, label the bar "XP actuelle / XP du niveau suivant" without calling it the level's share.

**M6. Monster XP is the stored base value, not what a player earns**
- *Files:* `src/zones*.ts`, `LevelView.tsx`.
- *Evidence:* the stored grade XP equals the game's `getEXP` formula for only 5,447 grades. Real gains also depend on `getPlayerXP` and `getGroupXPCoefficient` (both present in `luaformulasdata`, not imported), wisdom and group size. The page labels the value "valeur de base… avant sagesse, taille du groupe et bonus", which is honest, but nothing says whether the game actually uses the stored value.
- *Fix:* keep the label, mark the value UNVERIFIED in the inventory, and check 2–3 monsters in game before any XP-per-fight or XP-route feature.

**M7. Static routes can bake an error into the build**
- *Files:* `app/api/zones/route.ts`, `app/api/almanax/route.ts` (and the pre-existing `/api/graph`).
- *Evidence:* `force-static` plus `return 503` when `data/` is missing means a build without the database ships a permanent 503 file.
- *Fix:* throw during the build when the database is missing, so the build fails loudly. Keep the 503 for the dynamic routes.

**M8. Importer structure will not scale to the planned systems as is** (details in §7)
- *Files:* `scripts/import.ts`, `scripts/creatures-import.ts`, `scripts/professions-import.ts`.
- *Evidence:*
  - Each feature script drops and recreates its own tables, and table ownership moves between scripts (`monster`).
  - No foreign keys or constraints (0 `REFERENCES`); `monster_drop` has no primary key.
  - The importer writes into the source tree (`src/breed-data.json`).
  - The standalone importer picks "the newest" database by string sort (`game-3.10…` sorts before `game-3.7…`).
- *Fix:* see §7 and §11, step 1.

**M9. The sitemap E2E test sits at its time budget**
- *File:* `e2e/ui.spec.ts:3` ("every sitemap page loads…", 180 pages, timeout 240 s).
- *Evidence:* in the full run (2 workers, desktop and mobile in parallel) the desktop instance timed out at 240 s on `/guides/quetes/tours-de-la-fratrie`, and the mobile instance passed in 3.9 min. Re-run alone it passes in 1.8 min, and the page itself answers 200 in 57 ms. So it is not a broken page, but the suite is no longer reliably green, contrary to the PR's "37 passed".
- *Fix:* split the sitemap check into batches (one test per 30 pages) or raise its own timeout. Do not hide it with `retries`.

### Low

| # | Problem | File | Evidence | Fix |
|---|---|---|---|---|
| L1 | `itemSources()` re-runs two full `GROUP BY` scans (gather skills, recipes) on every call; item search takes ~270–320 ms per request | `src/professions.ts`, `src/load.ts` | called per request by `/api/items/search` and `/api/quests/[id]` (timings in §5) | build the maps once per database path (module cache keyed by path); reuse one read-only connection |
| L2 | N+1 queries in `searchItems` (recipe + ingredient names per row, ≤ 120 rows) | `src/load.ts` | indexed lookups, fast today | fine at this scale; batch if the limit grows |
| L3 | `loadClassExtras` loads the graph data twice (`loadGraph` calls `loadGraphData`, then it is called again) | `src/load.ts` | build time only (19 pages) | build the graph from the one `loadGraphData` result |
| L4 | `useWarmQuests` cleanup does not cancel the idle callback | `components/Nav.tsx` | harmless: `fetchGraph` is cached | `cancelIdleCallback` |
| L5 | Level field cannot be emptied (forced to 1 while typing) | `LevelView.tsx` | `|| 1` on every keystroke | keep the raw text, clamp on blur |
| L6 | Ankama game text committed in Git (19 class titles and summaries) | `src/breed-data.json` | the project rule keeps Ankama assets local; text is not covered explicitly | owner decision: accept, or generate at build time |
| L7 | No index on `monster.name` / `item.name`, used by name lookups | import scripts | full scans of 5,135 / 21,622 rows per lookup | disappears with M2; otherwise add indexes |
| L8 | Real-data tests skip silently without `data/` | `tests/data.test.ts` | a CI run without the database would pass while checking nothing | fail in CI when `CI=1` and the database is missing |

## 4. Data accuracy assessment

| Data | Accuracy | Notes |
|---|---|---|
| Classes, spells, spell levels | **Exact** (game files) | 19 classes, 862 spells, 1,786 levels |
| Items, sets, effects (min/max, characteristic id) | **Exact** | 12,392 items with effects; set bonuses per piece count |
| Recipes, professions, gathering levels | **Exact** | complete, no orphans |
| Character XP table | **Exact** | levels 1–200 |
| Quests, steps, achievements, class conditions | **Exact**; targets **approximate** | name matching (M2) |
| Drop chances | **Exact base value**, **incomplete context** | before prospection; coefficient fields not imported (M4) |
| Monster XP | **Raw value, meaning unverified** | 35% zero; stored ≠ formula for most (H2, M6) |
| Monster zones | **Incomplete** | dungeons and instances missing (M3) |
| Level recommendations | **Game suggestions exact**; **zone ranking misleading** | race mixing and "0 XP" (H2); demand ranking truncated (H3) |
| Almanax | **Wrong on 81 days/year** | H1 |
| Profession XP | **Player-provided** (no table in the files) | calculation correct; progress % unverified (M5) |
| Prices, kamas | **Absent** | not in the files; nothing is invented |

Nothing in the PR invents values: every displayed number comes from the files or from the player. The problems are selection and interpretation errors, not fabrication.

## 5. Performance assessment

Measured on the production build (`next start`, local machine, median of 5 requests):

| Endpoint | Raw | Gzip | Median |
|---|---|---|---|
| `/api/graph` (static) | 831 KB | 127 KB | 15 ms |
| `/api/zones` (static) | 469 KB | 64 KB | 11 ms |
| `/api/almanax` (static) | 134 KB | 21 KB | 8 ms |
| `/api/items/search?q=a` | 44 KB | 6 KB | **268 ms** |
| `/api/items/search?q=coiffe` | 41 KB | 7 KB | **324 ms** |
| `/api/professions/paysan` | 50 KB | 6 KB | 181 ms |
| `/api/quests/1042` | 1 KB | — | 57 ms |
| `/api/achievements?categories=29` | 7 KB | 1 KB | 18 ms |

In-process profile of `searchItems('a')`: 77 ms, of which 8 ms is building `itemSources` and 23 ms is 120 source lookups. The remaining HTTP time is opening the database per request and serialising. Item search is typed into, so ~300 ms per keystroke request is the slowest path the PR adds (L1). Caching the source maps per database and keeping one read-only connection would remove most of it.

- First Quêtes visit: the claimed gain (730 → 580 ms at 4× CPU) comes from idle prefetch and memoisation. The code is consistent with it; the remaining main cost is the first FlowCanvas render, as the PR says.
- `/api/zones` is static and 461 KB raw. It is fetched once per session and cached in memory. Acceptable, but it grows with H3's fix: compress or compute server-side.
- SQL: every new hot query has an index (`monster_drop_item`, `monster_drop_monster`, `monster_subarea_zone`, achievement indexes). The unindexed ones are the name lookups (L7) and the repeated aggregates (L1).

## 6. Security assessment

- **Injection:** all new SQL uses placeholders. The only interpolations are fixed lists of `?` and constant table names. `LIKE` wildcards in `q` are harmless.
- **Input bounds:** search limit ≤ 120, categories ≤ 200, query ≤ 60 characters, quest id non-numeric → 404.
- **New surface:** three static GET routes, no write route, no new dependency, no external request at runtime.
- **Privacy:** character data stays in `localStorage` or the existing account API. Nothing new is sent off the device.
- **Secrets:** none in the diff (scanned); `data/`, `.env*`, `public/ankama/` ignored.
- **Supply chain:** the importer downloads from GitHub releases over HTTPS without checksum verification. This predates the PR; recommended: pin and verify release asset digests.

Verdict: no security finding in this PR.

## 7. Architecture assessment

Strengths to keep:
- One immutable SQLite file per game version, rebuilt from raw files: reproducible and easy to compare between patches.
- `data_source` and `game_version` give provenance per dataset.
- Client/server split (`*-shared.ts`) keeps `node:sqlite` out of the browser.
- Static API routes for data that only changes on import.

Weaknesses that matter for the next systems:
1. **Text instead of ids.** `quest_step.objectives` stores rendered French text; features then parse it back (M2). Any planner needs ids.
2. **Feature-shaped tables.** `world_subarea` is "zones for the map feature", not "all subareas" (M3). `monster_grade` keeps 3 of 50 grade fields: no resistances or characteristics, which a damage or optimizer feature needs.
3. **No schema contract.** No foreign keys, no primary key on `monster_drop`, tables created inside feature scripts that drop each other's tables. Adding a feature means editing the importer and hoping nothing else depended on a table.
4. **Importer side effects** on the source tree (`src/breed-data.json`).

Recommended direction, with no new architecture:
- Keep the three scripts. Split each into "faithful import" (one table per game file, all useful fields, game ids, foreign keys declared) and "derived views" (what features read). Features read the views.
- Add a `scripts/check-data.ts` run after import: orphans, duplicates, counts per table compared with the previous version, the Almanax one-offering-per-day rule. It fails the import on regression.

## 8. Equipment optimizer readiness (A)

| Needed | Status |
|---|---|
| Item effects with min/max and characteristic ids | **Present** (`item.effects`) |
| Set bonuses per number of pieces | **Present** (`item_set.bonuses`) |
| Item conditions (`criterion`) | **Present** (raw string); evaluator exists for quests (`src/criteria.ts`), not yet applied to items |
| Stat summing | **Present, partial**: `computeBuild` in `src/stats.ts` adds max rolls, set bonuses, characteristics and scrolls |
| Class characteristic costs (points per stat level) | **Missing**: in `breedsdata`, not imported |
| Spell levels (AP, range, crit, casts, effects with min/max) | **Present** |
| Damage formula | **Missing**: not in the game files; would be a COMMUNITY formula, to check against in-game tooltips |
| Monster resistances (for damage against a target) | **Missing**: in the raw grades, not imported |
| Prices / budget | **Missing**: not in the files; would need a dated external or player-entered source |
| Search/optimisation algorithm | **Not started** |

Verdict: a stat-based builder (fill slots, sum stats, check conditions, set bonuses) is feasible now. Damage needs a verified formula. A budget optimizer needs a price source that does not exist yet.

## 9. Solo progression planner readiness (B)

| Link | Status |
|---|---|
| Quests ↔ prerequisites ↔ achievements | **Present** (graph, 5,050 nodes, 5,607 edges) |
| Quest objectives → monster / item ids | **Missing as ids** (M2) |
| Monsters → zones | **Partial** (M3) |
| Monsters → XP | **Raw values, unverified** (H2, M6) |
| Monsters → drops | **Present** (base chances) |
| Items → recipes → professions | **Present** |
| Game activity suggestions by level | **Present** (667) |
| Equipment by level | **Present** (items by level and type) |
| Player state (level, class, jobs, done quests) | **Present** (`useCharacter`, account sync) |
| Planner logic (route, priorities) | **Not started** |

Verdict: most links exist. The two that block a reliable planner are objective ids (M2) and complete monster zones (M3). Monster XP must be verified before any XP route is computed.

## 10. Recommended fixes before merging

1. **H1** Almanax tie-break, plus real-data tests on 1 March and 21 December. *Small.*
2. **H2** "XP non renseignée" for 0, and race-based exclusion in the zone ranking, plus a test. *Small.*
3. **H3** Demand computed on all unconditional drops, plus a test. *Small.*
4. **M1** Correct the overstated documentation (done in this review's vault update).
5. **M9** Make the sitemap E2E test fit its budget, so the suite is green again before merging.

Everything else (M2–M8, L1–L8) can follow in separate PRs. None of it makes current pages wrong in a way players would act on.

## 11. Recommended development roadmap

1. **Data foundation PR** (before any new system):
   - `quest_objective` table with ids (M2), all subareas (M3);
   - full monster grades: characteristics and resistances; drop fields (M4);
   - class characteristic costs;
   - foreign keys and primary keys;
   - `scripts/check-data.ts` integrity gate;
   - version sort fix.
2. **Verification pass in game:** 2–3 monsters' XP, one profession panel (M5), one spell tooltip damage. Recorded as VERIFIED or not in the vault.
3. **Equipment builder v1 (A):** slots, item conditions, characteristic costs and scrolls, set bonuses, on the existing `computeBuild`. No damage yet.
4. **Progression planner v1 (B):** Cra and Pandawa first. Class quests, objectives by id, zones for the level, equipment by level and element, profession routes. Community advice is labelled COMMUNITY.
5. **Damage calculator:** only after the formula is verified against in-game tooltips.
6. **Budget and kamas:** only with a dated, licensed or player-entered price source.

## 12. Remediation (2026-11-20, after the review)

The owner approved fixing the pre-merge blockers (§10). The fixes are on `develop`, made with no new dependency, no schema change, and no change to the import.

### 12.1 Fixes

| Finding | Root cause | Fix | Files | Before → after | Regression tests |
|---|---|---|---|---|---|
| **H1** Almanax | Season entries (#2, #130, #131) list some of their days explicitly (`01/03/*`…), so they score the same "exact day" precision as the day's own entry. The sort was stable over id order, so a season with a lower id won. | Ties of equal precision go to the entry with **fewer dates** (the most specific). A season that loses is listed among the period bonuses. Exact-year entries (events) still win. | `src/almanax-shared.ts` | Days of 2026 showing a season's offering: **81 → 0**. 122 days of 2026 have a competing season; all now show the day's own entry. 1 March: "La Chaîne Nhanor Kibrill" (was "2 × Rondelle de Bois"). | Unit: season tie. Real data: 1 March and 21 December 2026; every day of 2026–2027 against the calendar (exact-year entry, else the day's own entry); the season stays a period bonus; month-wide season (15 January) stays a period bonus; no offering repeated as a bonus. |
| **H2** Level page XP | `MIN/MAX(xp)` over grades included `0`, which in the files means "not set". | XP range over non-zero grades (`NULLIF`); `null` → "XP non renseignée". Never shown as 0. | `src/zones.ts`, `src/zones-shared.ts`, `components/progression/LevelView.tsx` | Zone monsters showing "0 XP": **533 grades → 0**; 3–7 monsters per level now say "non renseignée". | Real data: no zone monster has XP 0. |
| **H2** Zone ranking | Every monster placed in a zone counted, whatever its race. | Races "Archimonstres", "Monstres de quête…" (incl. alignment and Pwâk), "Avis de recherche…", "Dopeuls" and "Invocations…" are left out of the level page's zone lists only (`NOT_REGULAR`, game race names). They stay in the database for quests, achievements and item sources. | `src/zones.ts`, `LevelView.tsx` (explanation text) | Excluded entries in the top zones at level 60: **75 → 0** (50 archmonsters, 8 quest, 17 Pwâk). `/api/zones`: 469 → 355 KB raw. | Real data: no excluded race in any zone; more than 1,000 such monsters still in the database (5,135 monsters unchanged); Bouftou still in "Coin des Bouftous" with a known XP and found at level 26. |
| **H3** Demand ranking | `drops` were cut to each monster's 3 best before `forLevel` computed `wanted`. | All unconditional drops with a chance above 0 are kept; zone loot display still shows the top 8 per zone. Payload measured: all drops 355 KB / 47 KB gzip, versus top 3 at 343 / 46 KB. Computing candidates server-side would save under 1 KB gzip, so it was not worth the extra code. | `src/zones.ts` | 162 zone monsters have more than 3 drops. Ranking changes were **smaller than the review feared**: 1 new top-10 entry at level 60 ("Capsule Explosive"), none at 20, 120, 190. | Real data: a monster with more than 3 drops exists in the payload; "Capsule Explosive" (outside its monsters' top 3) is in the level-60 ranking. |
| **M9** Sitemap E2E | 180 pages in one test. Measured alone: 65–88 s on desktop and 51–87 s on mobile per run, of which only 13 s is server time; the browser time varies ±40% between runs on this machine. With 2 workers and the rest of the suite in parallel, one run crossed 240 s. Blocking the quest-graph prefetch did not change the picture (not the cause). | Split into **6 equal batches** whose size follows the sitemap length (no page can be left out), 120 s each, desktop and mobile kept. No retries, no skip. | `e2e/ui.spec.ts` | Full suite 6.0 min with 1 failure → **4.1 min, 0 failures**. Slowest batch 45.9 s (budget 120 s). | The batches themselves. |

The tests were checked against the old code: with the H1 and H2/H3 production changes reverted, the new real-data tests fail (Almanax test 0/1; level tests 0/2). With the fixes, they pass.

### 12.2 Verification after the fixes

Two full runs on the same machine (production build, `next start -p 3101`, Edge, 2 workers):
- **Run A:** working tree just before commit `25f2a8a`.
- **Run B:** the committed `25f2a8a` itself, clean tree (`git status` empty).

| Command | Run A | Run B (commit `25f2a8a`) |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| `npm test` | exit 0: 90 tests, 90 pass, 0 fail, 0 skipped | exit 0: 90 tests, 90 pass, 0 fail, 0 skipped |
| `npm run build` | exit 0 | exit 0 |
| `E2E_BASE_URL=http://127.0.0.1:3101 npx playwright test` (desktop + mobile) | exit 0: **47 passed, 1 skipped, 0 failed**, 4.1 min | exit 0: **47 passed, 1 skipped, 0 failed**, 5.4 min |
| Sitemap batches (12 tests) | 7.4–45.9 s each | 18.2–53.9 s each (budget 120 s) |
| Server log during E2E | no error | no error |
| `PRAGMA integrity_check` | ok | ok (database not rewritten) |
| Reference checks (drops, recipes, ingredients, bosses, Almanax items) | 0 dangling | 0 dangling |

The one skip is the pre-existing `class-aware progression` test on the **mobile** project (`e2e/ui.spec.ts:216`). It skips itself on mobile by design and runs on desktop, where it passed.

Unit tests: 88 before the fixes, plus 2 new tests: the season-tie unit test (`tests/almanax.test.ts`) and the real-data Almanax season test (`tests/data.test.ts`). The H2 and H3 checks extend the existing level-page and craft-demand tests.

The final commit after `25f2a8a` adds:
- a summons assertion to the level-page test;
- the review documents;
- a whitespace fix in `src/zones.ts` (`=(` → `= (`).

On that final tree: `npm run typecheck` exit 0, `npm test` exit 0 with 90/90. Build and E2E were not re-run, because no runtime code changed.

No dependency was added (`package.json` and the lockfile are unchanged). The only new SQL is constant (`NULLIF`), and the race filter runs in JavaScript on game data, so no user input reaches a new query.

### 12.2b Detailed confirmations

**Almanax coverage (H1).** The real-data test `Almanax season entries never replace the day's own offering` walks 730 consecutive days, 1 January 2026 → 31 December 2027 (365 + 365, neither year is a leap year). For each day it:
- checks the winner against the calendar itself: an exact-year entry if one exists, otherwise the day's own single-date entry. All 730 days have one, so none is left unchecked;
- checks that the offering is not repeated as a period bonus.

It also checks:
- 1 March and 21 December 2026 by name, with every competing season present among the period bonuses;
- 15 January 2026, where a month-wide season stays a period bonus;
- the 122 competing days of 2026, the 81 that were wrong before among them.

No expected offering is written into production code; the only literal item name is one assertion in the test (1 March).

**Monsters (H2).**
- *Summons:* `NOT_REGULAR` matches all 25 "Invocations…" race names of the data (285 monsters). No summon was placed in a world-map zone in 3.7.14.18, so for summons the rule is preventive. A test asserts every summon race is matched and no summon appears in a zone list.
- *Ordinary monsters remain:* Bouftou is in "Coin des Bouftous" with a known XP, and the zone is found at level 26 ± 5 (Bouftou grades: 22–30 in the data).
- *No records deleted:* the exclusion is a read-time filter in `loadZoneData`. No import script changed, and `data/game-3.7.14.18.sqlite` was not rewritten (last modified 2026-11-20 09:49, before the review). Counts are unchanged: monster 5,135, grades 26,851, drops 13,567, monster zones 3,305, Almanax 376, items 21,622, recipes 4,743. 3,395 monsters of the excluded races are still in the database.

**H3: what was changed and what was deliberately not.** H3 *was* fixed: the ranking now sees every unconditional drop. The brief also suggested computing ranking candidates server-side to avoid a bigger payload. That variant was measured and **not** adopted:

| `/api/zones` payload (3.7.14.18, after the H2 exclusions) | Raw | Gzip | Drop entries |
|---|---|---|---|
| All unconditional drops (chosen) | 355 KB | 47 KB | 1,671 |
| Top 3 per monster (old behaviour, wrong ranking) | 343 KB | 46 KB | 1,455 |
| Top 3 + only drops used by recipes (server-side variant) | 345 KB | 47 KB | 1,500 |
| Before this PR's fixes (top 3, races included) | 469 KB | 64 KB | — |

The server-side variant saves 10 KB raw and under 1 KB gzipped, but needs a second data shape and code path. The chosen version is simpler, and its payload is still 114 KB smaller than before the fixes. Zone loot display keeps its limit (8 per zone).

**E2E bottleneck (M9).** Measured with one browser on the production build, crawling the 180 sitemap pages the way the test does:

| Run | Desktop | Mobile | Notes |
|---|---|---|---|
| Server only (HTML fetch, all 180 pages) | 13.2 s total | | slowest 298 ms (`/guides/quetes/ile-de-nowel`) |
| Browser crawl, run 1 | 65.1 s (mean 362 ms) | 87.3 s (mean 485 ms) | spikes of 2–5 s on profession pages |
| Browser crawl, run 2, quest-graph prefetch blocked | 88.1 s | 50.7 s | spikes moved to other pages |
| Profession pages alone | 76–277 ms each | | spikes are not the page itself |
| Old single test in the full suite (2 workers) | timed out at 240 s | 3.9 min (just under 240 s) | |
| 6 batches in the full suite | 12.8–45.9 s per batch | 7.4–45.9 s per batch | budget 120 s each |

Conclusions:
- The cost is browser time (navigation and hydration), not the server.
- It varies by up to about ±40% between identical runs on this machine.
- The idle quest-graph prefetch is not the cause.

One 180-page test under parallel load therefore had no safety margin. Six batches of `ceil(180 / 6) = 30` pages each:
- run in parallel and keep every page on desktop and mobile;
- grow with the sitemap, so no page can fall out;
- stay at most 46 s against a 120 s budget, a margin of more than 2.5×.

Raising the single test's timeout would have hidden the variance instead of reducing it, and retries or skips were ruled out.

### 12.3 Status of every finding

| Finding | Status |
|---|---|
| H1, H2, H3, M9 | **Fixed** (regression tests above) |
| M1 doc claims | **Fixed** (vault and inventory corrected) |
| M2 objective targets by name | Unresolved: needs the `quest_objective` table (data foundation) |
| M3 dungeons and instances missing from zones | Unresolved: needs all subareas (data foundation) |
| M4 drop fields not imported, duplicates | Unresolved (data foundation) |
| M5 profession progress % | Unresolved: **not verified in game** |
| M6 monster XP meaning | Unresolved: **not verified in game**. The page keeps "valeur de base…" and never computes earned XP. |
| M7 static routes bake a 503 | Unresolved (small, next PR) |
| M8 importer structure | Unresolved: future architectural work (§7, §11) |
| L1–L8 | Unresolved, low priority |
| New: event zones | Unresolved: event-only zones (e.g. "Havre de Nowel", "Terre de Nowel") are still listed. Their monsters are the regular population of those zones, and no game-data flag marking a zone as event-only was found, so they are not hidden by guesswork. |

### 12.4 New risks introduced

- `NOT_REGULAR` matches race names by prefix. A renamed or new race in a future game version could slip through, or be hidden. Mitigation: the real-data test fails if more than 0 excluded-race monsters appear in zones, and re-checks after every import.
- The Almanax rule assumes a day's own entry lists fewer dates than any season covering it. This is true for every day of 2026–2027 in 3.7.14.18 (tested); a new calendar shape would be caught by the same test.

### 12.5 Merge recommendation

The four pre-merge blockers are fixed and proven by tests that fail on the old code, and the full suite is green. **PR #2 can be merged**, keeping in mind that M2–M8 remain open by design. They do not make current pages wrong, but they must be done (data foundation PR) **before** the equipment optimizer or the solo progression planner are built on this data.
