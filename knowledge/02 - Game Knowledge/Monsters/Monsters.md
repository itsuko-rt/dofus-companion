# Monsters

The game database keeps monsters only where features need them:
- dungeon bosses (`dungeon_boss`, 141 links);
- names inside quest and achievement objectives.

Since 2026-11-20 `scripts/creatures-import.ts` imports every named monster from the game files (VERIFIED, 3.7.14.18): grades (level, XP, life), the zones each lives in, and drop chances per grade with their conditions. See [[Database Schema]]. The old map-era monster table (dropped with [[ADR-0005 Remove the in-site map]]) had another schema. The raw file `monstersdata.json` (≈ 140 MB) is still downloaded by the import, for objective texts.

Status: data imported, not shown on the site yet. Candidate uses: XP routes (zones by level, monster XP) and item sources (drops). Note: grade XP matches the game's `getEXP` formula for only about a quarter of the grades, so the stored value is used, never the formula.
