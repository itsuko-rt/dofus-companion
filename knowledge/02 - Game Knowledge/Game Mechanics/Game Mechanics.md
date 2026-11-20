# Game mechanics

Only what the code relies on and can source. Combat formulas, damage and XP rates are **not recorded**: no verified source has been found.

## Condition codes
- **Where:** `src/codes.ts` documents 40 codes. Each has its source: **dodumap** (dofusdude's interpretation, checked by its authors against the decompiled client) and/or **dofusdb** (its readable rendering, sampled 2026-11-19).
- **Evaluated by the site:** progress codes such as `PL`, `Qf`, `Qa`, `OA`, `Oa`, `QF`, `QQ`.
- **Shown but not evaluated:** context, objective and server codes (map, inventory, calendar, kills…). They display as "à vérifier en jeu".
- **Inferred, no source:** `BT` (meaning deduced from how the data uses it). Label: **HYPOTHESIS**.
- **Undocumented in 3.7.14.18:** `BI` (436 uses), `lB` (81), `NC` (15), and 15 rarer codes. They are shown raw and evaluated as unknown. Label: **UNVERIFIED**.

## Characteristics and build stats
- **Data:** 123 characteristics (`characteristic`).
- **Build stats:** `src/stats.ts` adds up item effects (maximum rolls), set bonuses, base points and scrolls. Mounts are not counted.
- **Status:** an addition, not a game simulation. Shown as indicative.

## Items
- 21,622 items and 941 sets, from dofusdude (the dofus-sqlite JSON rounds 64-bit ids).
- Dofus 3 data defines no item rarity, so none is shown.
