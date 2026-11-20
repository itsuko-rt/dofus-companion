---
type: adr
status: accepted
date: 2026-11-20
---
# ADR-0007 Profession XP comes from the player's screen

## Context
The owner asked for a profession XP calculator "with real XP tables and verified recipe XP values". All 250 files of the 3.7.14.18 game-data release were searched (`docs/GAME_DATA_INVENTORY.md`):
- there is **no profession XP table**;
- there is **no XP per craft or per harvest**.

One unlabelled Lua formula (`3.795 × lvl^2.329`) may be a job XP curve. Nothing names it, so it is a HYPOTHESIS. Community tables exist, but copying them would break [[ADR-0003 Link community sites, never copy them]], and they could not be checked against the game.

## Decision
- The calculator (`src/craft-calc.ts`, shown on every profession page) takes the three numbers the game shows the player:
  - current XP;
  - XP of the next level (the profession's XP bar);
  - XP gained by one craft or harvest.
- From the game data it uses the recipes, ingredient quantities and ingredient sources (profession, or the monsters that drop the item with their base chance).
- It computes only up to the next level, and says why.

## Consequences
- **Every result is exact** for the player's own numbers. Nothing is guessed.
- **No multi-level planning** until a verified XP table exists. If a future game release adds one, or the formula is confirmed against in-game numbers, supersede this ADR.
