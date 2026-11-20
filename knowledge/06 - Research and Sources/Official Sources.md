# Official and game-file sources

**Ankama** publishes no API for game data or personal progress (checked 2026-11-19; `developer.ankama.com` doesn't resolve). "Official" here means **the game's own files**, extracted by community tools. These are accurate for the version they were extracted from, but not statements by Ankama.

| Source | Type | URL | Game version | Used for | Label |
|---|---|---|---|---|---|
| dofus-sqlite | game files (community extraction), one release per patch | https://github.com/ledouxm/dofus-sqlite | 3.7.14.18 (`v6.0_3.7.14.18`) | quests, achievements, dungeons, spells, effects, professions, zones, i18n | VERIFIED |
| dofusdude dofus3-main | game files (community extraction) | https://github.com/dofusdude/dofus3-main | 3.7.14.18 | items, sets (exact 64-bit ids) | VERIFIED |
| dofusdude dodumap | condition interpretations checked against the decompiled client | https://github.com/dofusdude/dodumap | — | meaning of condition codes | VERIFIED |
| Ankama support "Qu'est-ce qu'un bot ?" | official policy | support.ankama.com | — | the scanner never automates actions in the game. The page says nothing about screenshots or OCR | VERIFIED (policy) |
| Ankama fan-site / artwork terms | official policy | to find | — | artwork and the DOFUS name | **UNVERIFIED: to check before launch** |

**Licence note:** dofus-sqlite declares no licence for its code. The data itself belongs to Ankama. We use its releases without copying its code. Fallback options are DDC (MIT) and dofusdude (`docs/RAPPORT_ARCHITECTURE.md` §10).

The provenance of every imported dataset is in the `data_source` table.
