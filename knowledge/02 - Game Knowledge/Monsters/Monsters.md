# Monsters

The game database keeps monsters only where features need them:
- dungeon bosses (`dungeon_boss`, 141 links);
- names inside quest and achievement objectives.

There is no monster encyclopedia. The monster table built for the removed in-site map was dropped on 2026-11-20 ([[ADR-0005 Remove the in-site map]]). The raw file `monstersdata.json` (≈ 140 MB) is still downloaded by the import, for objective texts.

Status: no monster feature planned.
