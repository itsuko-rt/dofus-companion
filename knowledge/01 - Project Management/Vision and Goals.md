---
type: planning
---
# Vision and goals

## Vision
Help DOFUS players progress with answers computed from the game's own files, not from guesswork. Show what is official, what comes from the community, and what is unknown.

## Principles (from `docs/RAPPORT_ARCHITECTURE.md` and later decisions)
1. **Official data first:** quests, conditions, achievements, spells, items and recipes come from the game files ([[ADR-0001 Game data from the game files]]).
2. **Never invent:**
   - an undocumented condition code shows "à vérifier en jeu";
   - missing data is labelled as missing (no rarity, no prices, no spot counts).
3. **Link, don't copy:** Dofus Pour Les Noobs, Fashionista, DofusBook, DofusDB and Dofus Maps are linked, never scraped or copied ([[ADR-0003 Link community sites, never copy them]]).
4. **Never touch the game client:** no memory reading, packet capture or automation. The scanner only reads screenshots the player provides ([[ADR-0004 Scanner reads screenshots locally]]).
5. **Privacy by default:** works without an account; no ads or analytics without consent ([[ADR-0006 No ads or analytics without consent]]).

## Goals
| Goal | Status |
|---|---|
| Accurate quest prerequisites for all quests | Implemented (1,363 of 1,984 fully interpreted; the rest flagged) |
| Achievement and Dofus tracking | Implemented |
| Classes: spells, builds | Implemented for all 19 classes since 2026-11-20 (spells from data; builds from Fashionista, COMMUNITY). Crâ and Pandawa were the first two |
| Profession guides | Implemented (from game data) |
| Public launch | Planned (see [[Release Checklist]]) |
| Class guides with sourced advice ("couche B") | Planned, not started |
| Recommended routes, XP and kamas | Planned; blocked by missing verified data |

Related: [[01 - PROJECT ROADMAP]], which holds the up-to-date status of each goal.
