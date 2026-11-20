# Game data and product audit (2026-11-20)

Scope: game data, every class, performance, UX and code quality. **Investigation only: no application code was changed.**

Labels:
- **VERIFIED**: measured, queried or reproduced during this audit.
- **ASSUMPTION** / **NEEDS VERIFICATION**: not checked yet.

How it was checked:
- **Data:** SQL on `data/game-3.7.14.18.sqlite` and reads of the raw files in `data/raw/v6.0_3.7.14.18/`.
- **Performance:** a production build (`npm run build`, `next start`) driven by Playwright in Edge. Runs at normal CPU and at 4× CPU slowdown (a mid-range phone), on localhost, so network latency is not included.
- **UX:** screenshots at 1366×860 and 390×844.

---

## 1. Game-data coverage

### What is imported and what powers the site
| Entity | In the game DB | Powers today | Could power |
|---|---|---|---|
| Classes | `breed` (19), with spell id lists | Spell pages for Crâ and Pandawa | All 19 classes (see §2) |
| Spells | `spell` 862 (19 × 44 ¹), `spell_level` 1,786 | Spell pages, class states | Spell unlocks per level for every class |
| Items | `item` 21,622, `item_set` 941, `item_type` 236 | Equipment, build stats | "Equipment for your level" per class |
| Quests | `quest` 1,984, `quest_step` 2,233, `node`/`edge` graph | Quest tracker, guides | Class quest chains (see §3) |
| Achievements | `achievement` 2,777, `achievement_objective` 8,936 | Achievements tracker, scanner | Class-named achievements |
| Dungeons | `dungeon` 187, `dungeon_boss` 141, `dungeon_achievement` 716 | Graph `in_dungeon` links | A dungeon view by level (backlog) |
| Professions | `job` 22, `gather_skill` 125, `recipe` 4,743, `world_subarea` 254 | Professions guide | Unchanged |
| Dofus | `dofus` 34 | Dofus planner | Unchanged |

¹ 44 = 22 spell slots × 2 variants, as for Crâ.

### Available in the raw files but not imported (VERIFIED by reading the files)
| Raw file | Content | Value |
|---|---|---|
| `breedsdata.json` | Per class: description text id, gameplay title id ("Protecteur" for Féca), **8 role scores** (`breedRoles`), **complexity**, sort order, colours, characteristic point costs | Class overview from official data, instead of the hand-written titles and roles in `components/breeds.ts` |
| `npcsdata.json` | NPCs | Quest-giver names already come through `quest_start`; no other use found |
| `monstersdata.json` (≈ 140 MB) | Monsters, grades, drops | A monster or drop encyclopedia. Out of scope (vault note *Monsters*) |
| `spellstatesdata.json`, `spellvariantsdata.json` | States, variant pairs | Already derived through `spell` and `spell_level` |

### Not in the game data (do not invent)
- XP rates, kamas rates, "best" spots, prices, build quality.
- Which general quests are *recommended* for a class: the game files hold no such link. That is community advice, to be labelled COMMUNITY.

---

## 2. Character system for every class

### Current state (VERIFIED)
- **Engine already class-agnostic:** the quest engine evaluates the class condition `PG` against the character's `breed` (`src/criteria.ts`, `case 'PG'`), for any class id.
- **Spells and states:** spell pages and class states are generated from the data (`src/spells.ts`). There is no Crâ- or Pandawa-specific logic in them.
- **The restriction is one hand-written list,** `SUPPORTED_BREEDS` in `components/breeds.ts`, used in 13 files. It holds the slug, title, roles, blurb, colour, Fashionista class name and artwork path.
- **Presentation per class:**
  - colour tokens exist only for Crâ and Pandawa (`app/globals.css`);
  - artwork exists only for breeds 9 and 12 (`public/ankama/breeds/`, downloaded by `scripts/fetch-assets.ts` for supported classes only).

### Proposed architecture (reuse, no duplication)
1. **Data:**
   - import `breedsdata.json` roles, complexity, description and gameplay title into `breed`;
   - one presentation table in code holds only what the data lacks: slug, colour and Fashionista name.
   - `SUPPORTED_BREEDS` then becomes `BREEDS`, built from the DB plus that table.
2. **Art:** extend `fetch-assets` to the 19 classes (still local only, never committed, ADR-0003 in the vault). Show a fallback when a file is missing.
3. **Class hub** `/personnage/classes/[slug]`: one page component for all 19 classes, built from existing parts:
   - overview (official description, roles, complexity);
   - spells (the existing `SpellGuide`);
   - class quests (§3);
   - class-named achievements;
   - builds (the existing `BuildsView` with that class);
   - spell unlocks by level.
4. **Onboarding:** all 19 classes in a compact grid (the current two big cards don't scale), with search.

**Open question:** the Fashionista class names for the other 17 classes are UNVERIFIED. Check each against the API before turning builds on for that class.

---

## 3. Quest and progression relationships

### Genuinely class-specific quests (VERIFIED: their start condition contains `PG=<class>`)
| Quest | Per class | Level | Prerequisite |
|---|---|---|---|
| Astrub class quest (e.g. "C'est pour ta pomme" for Crâ, "Trempette dans un verre d'eau" for Pandawa) | 1 each, 19 in total | 12–20 | "Conseil de classe" (2009) |
| Temple "Dévotion à …" | 1 each, 19 in total | 30 | "Les principes d'Archie m'aident" (1958), subscription (`PZ=1`) |
| "Ça sent le gaz" (1960) | 1 quest, with a per-class branch | 25 | That class's Astrub quest |
| "La colère des dieux" (1938) | 1 quest, with a per-class temple map | 200 (`level_min`) | Its condition only asks level 50+ (`PL>49`) |

That is **40 quests with a class condition.** Every one of the 19 classes has its Astrub quest and its Dévotion.

### Data quirks (VERIFIED in the files; shown as they are, never corrected by hand)
- Quest 775 is named "Dévotion à Sadida" but requires `PG=14` (Zobal). Quest 772 is the real Sadida one.
- Roublard's Dévotion is "Dévotion à Dralbour" (the god's name, not the class name).

### Class-named achievements (VERIFIED names; restriction NEEDS VERIFICATION)
- "Dopeul <class>" and "Challenge <class>": 1 each for all 19 classes, in the *Monstres* categories.
- Their objectives contain no `PG` condition, so they are **related to a class, not restricted to it**. Whether "Challenge <class>" needs you to play that class is not in the data.

### Class-specific equipment (VERIFIED)
- Only 21 items have a class condition: 19 "Touffe de <class>" items and two Ecaflip swords.
- 19 "Panoplie d'apparat <class>" sets exist, one per class. They are named after a class; their wear condition was not checked.
- There is no class-restricted combat gear. "Equipment for a class" can only mean items by level plus community builds.

### Level-by-level guidance from verified data only
For a character's class and level, the data supports:
- the next spell unlocks;
- the class quests and their prerequisites;
- quests available at that level (the graph already does this);
- dungeons by `min_level`;
- items by level;
- profession tiers.

It does not support XP efficiency or a "best" order. Present these as facts plus links, never as a recommended route.

---

## 4. Performance (VERIFIED measurements)

### Navigation timings (production build, localhost, no saved character)
| Navigation | Normal CPU | 4× slower CPU | Long tasks at 4× |
|---|---|---|---|
| Home → Quêtes (first time) | 145 ms | 711 ms | 474 ms (max 273) |
| Quêtes → Succès (first time) | 390 ms | 759 ms | 177 ms |
| Succès → Quêtes (again) | 71 ms | 440 ms | 228 ms |
| Quêtes → Succès (again) | 85 ms | 389 ms | 143 ms |
| Succès → Dofus | 73 ms | 282 ms | 79 ms |

| Payload | Uncompressed | Compressed | Server time |
|---|---|---|---|
| `/api/graph` (static) | 851 KB | 131 KB | 18 ms |
| `/api/achievements/objectives` (static) | 197 KB | 51 KB | 3 ms |
| `/api/achievements?categories=<Donjons>` (dynamic) | 382 KB | 35 KB | **217–231 ms** |
| `/api/achievements?categories=15` (small) | — | — | 17 ms |

### Causes found
| # | Cause | Evidence |
|---|---|---|
| P1 | **One query per achievement, with no index.** `loadAchievements` runs two queries per achievement (objectives, guide). `achievement_objective` has no index on `achievement_id`, so each one scans 8,936 rows. | `EXPLAIN QUERY PLAN` gives `SCAN achievement_objective`. Donjons (743 achievements) takes about 220 ms on a fast PC, more on a small server |
| P2 | **The quest graph is rebuilt on every visit.** `useGame` caches the download, but each mount runs `new Graph(...)` and computes the status of all 5,050 nodes again. | 228 ms long task when coming back to Quêtes at 4× CPU, with an empty profile |
| P3 | **Every first visit downloads and parses the whole graph** (851 KB of JSON, 131 KB compressed), even to show one region. | Network panel |
| P4 | **First-visit blank pages** (a correctness bug that feels like slowness). With no saved character, `/personnage` and `/builds` stay blank when opened directly. | Reproduced in a fresh Edge profile with no console error; they work after an in-site navigation. Cause: `useSyncExternalStore` returns the same `EMPTY_STORE` object after loading, so React never re-renders, and `ready` (read from a module variable) stays `false` (`components/useCharacter.ts`) |
| P5 | `BuildCard` is a component declared inside `BuildsView`'s render, so React remounts every card on each render (open card and compare state included). | `components/builds/BuildsView.tsx` |

Bundle: the 330 KB flow-graph chunk (`@xyflow/react` + `dagre`) loads only on `/progression/quetes`. The two shared chunks (169 KB + 113 KB) load on every page. Nothing urgent here.

### Proposed fixes, in order (each re-measured with the same script)
1. **P4:** make "loaded" part of the store snapshot (a new object after `load()`). Add an E2E test that opens `/personnage` and `/builds` directly in a fresh profile.
2. **P1:** add indexes in the import, on `achievement_objective(achievement_id)`, `achievement(category_id)` and `achievement_guide(achievement_id)`, and fetch objectives in one query. Expected: Donjons from about 220 ms to under 20 ms (ASSUMPTION until measured).
3. **P2:** build the `Graph` once per page lifetime, next to the existing download cache, and reuse statuses while progress is unchanged.
4. **P5:** move `BuildCard` out of the render.
5. **P3, only if still needed after 1–3:** per-region graph files. This is a bigger change; measure first.

---

## 5. UX and visual design (VERIFIED from screenshots unless marked)

| Area | Finding | Proposal |
|---|---|---|
| First visit | Blank `/personnage` and `/builds` (P4) | Fix first; every page gets a real empty state |
| Onboarding | Two large class cards and "D'autres classes arriveront ensuite" | A 19-class grid (portrait, name, official title, complexity), with search |
| Succès | Two category navigations (summary grid and left list) | Keep one: the grid as the summary, the list as the navigation, sharing the same selection |
| Succès | With an empty profile it shows "232 en cours" and "Presque terminés" (Kardorim appears twice) | NEEDS VERIFICATION: probably objectives that count as met at level 1. Hide "en cours" items without a real action from the player |
| Quêtes, mobile | Header, stats and filters fill about half of a 390 px screen; the sub-tab "SCANNER" is cut off | Collapse the filters into one button, use a smaller stats row, and make the tabs scroll |
| Quêtes | Small regions leave most of the canvas empty | Fit the view to the content and offer a list view for regions with 1–3 groups |
| Consistency | Cream parchment cards on a dark UI (Succès, Métiers) next to plain dark cards elsewhere | Choose one card surface per content type (parchment = in-game journal), and document it in the vault note *Components* |
| Builds | No empty or error state while the Fashionista data loads | Add a skeleton of the card layout and a clear error message with a retry |

Keep: the hero artwork, the display typeface and the section colours; they already feel like the Dofus world. No glass effects or large gradients. Motion only where it confirms an action, such as ticking a quest.

---

## 6. Code quality

| Finding | Evidence | Recommendation |
|---|---|---|
| Store snapshot bug (P4) | `components/useCharacter.ts` | Fix with a test |
| Component declared inside a render (P5) | `BuildsView.tsx` | Move it to module scope |
| Large components mixing data and display | `QuestTracker.tsx` 360 lines, `BuildsView.tsx` 342, `AchievementsView.tsx` 313 | Split along existing seams (filters, list, header) when touching them; no rewrite |
| N+1 queries without indexes (P1) | `src/load.ts` | Add indexes in `scripts/import.ts`, and batch the objective queries |
| Hand-written class data | `components/breeds.ts` | Data-driven list (§2) |
| Tests | 73 unit `test()` calls and 22 E2E tests; nothing covers a first visit without a character, and there is no performance budget | Add the first-visit E2E test, plus the navigation timing script as a non-blocking check |
| Dependencies | 7 runtime dependencies, all used | Nothing to remove |

---

## 7. Recommended order (each phase needs your approval)

| Phase | Content | Size | Why first |
|---|---|---|---|
| **0. Fixes** | P4 blank pages, P1 indexes and batched query, P2 graph cached once, P5; with tests and re-measurement | Small | Bugs and the measured slowness, without redesign |
| **1. All classes, data** | Import breed roles, complexity and descriptions; build `BREEDS` from data; art and colours for 19 classes; onboarding grid; spell pages for 19 classes | Medium | Reuses the existing generic engine |
| **2. Class hub** | `/personnage/classes/[slug]`: overview, spells, class quests (40 verified), class-named achievements, builds, spell unlocks by level | Medium | Combines existing parts, plus one new page |
| **3. UX pass** | Succès navigation, mobile Quêtes header, empty and error states, card consistency | Medium | After the structure stops moving |
| **4. Optional** | Per-region graph data (P3), dungeon view, sourced community class advice (COMMUNITY labels) | Large | Only if measurements or sources justify it |

### Decisions needed from you
1. Approve Phase 0.
2. Should all 19 classes appear at once, or in batches (each one needs its Fashionista name checked)?
3. Should the class hub replace `/personnage/sorts/[classe]` (keeping redirects), or sit next to it?

---

## Phase 0 results (2026-11-20, approved and done)

| Fix | Change | Check |
|---|---|---|
| P4 blank first visit | `load()` returns a new empty object; `ready` derived from the snapshot (`components/useCharacter.ts`) | New E2E test "first visit without a saved character" (desktop + mobile); the earlier blank-page reproduction now renders |
| P1 Succès query | Objectives and guides in one query each per page (`src/load.ts`); 3 indexes created by `scripts/import.ts` | New unit test: the batched objectives match the per-achievement query for 700+ achievements. Donjons API: **217–231 ms → 27–30 ms** server time |
| P2 graph rebuilt | `Graph` and the statuses built once per page lifetime, keyed by the download and the character object (`components/quests/useGame.ts`) | See the table below |
| P5 `BuildCard` remounts | A render function instead of a component declared in render | E2E builds test |

The local database built before this change got the 3 indexes with the same `CREATE INDEX` statements. A database built by a new `npm run import` has them automatically.

**Same-time comparison, at 4× slower CPU, 3 interleaved runs** (old build on one port, new build on another, same PC load). Median time to content in ms, with blocked main-thread time in brackets:

| Navigation | Before | After |
|---|---|---|
| Home → Quêtes (first) | 1,984 (875) | 1,612 (645) |
| Quêtes → Succès (first) | 1,560 (436) | 1,118 (347) |
| Succès → Quêtes (again) | 629 (309) | 423 (115) |
| Quêtes → Succès (again) | 699 (352) | 558 (190) |
| Succès → Dofus | 649 (262) | 562 (99) |

These absolute numbers are higher than in §4 because the PC was busier during the comparison. Compare within this table only.

**Checks:** `npm run typecheck` clean; `npm test` 73/73 passed; `npx playwright test` 24/24 passed against the new production build.

**Still slow:** the first visit to Quêtes (download and parse of the whole graph, P3, plus the React Flow layout). This is the candidate for phase 4 (per-region data), to measure before deciding.

---

## First Quêtes load (2026-11-20, after phase 6)

**Profile, 4× CPU, first client navigation Home → Quêtes:** about 555 ms of the 721 ms were the browser's own work (script compile, first render), mostly for the 330 KB flow-graph chunk. The data side is small: on the dev PC, parsing takes 2 ms, building the graph 16–26 ms and the 5,050 statuses 9 ms.

**Change:**
- Once any other page is loaded and the browser is idle (and data saver is off), `Nav` downloads and builds the quest graph (`warmGame` in `components/quests/useGame.ts`) and loads the graph view's code.
- `useGame` renders with already-downloaded data at once, with no loading frame.

**Same-time comparison**, 4× CPU, median of 3, after 3 s on the home page (time to content / blocked main-thread time):

| Navigation | Before | After |
|---|---|---|
| Home → Quêtes (first) | 730 ms / 461 ms | 580 ms / 203 ms |
| Quêtes → Succès (first) | 692 ms / 122 ms | 620 ms / 50 ms |

**Cost:** a visitor who never opens Quêtes still downloads about 130 KB of graph data and the graph chunk, in idle time. Not done with data saver on.
