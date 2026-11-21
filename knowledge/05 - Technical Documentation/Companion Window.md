---
type: feature
date: 2026-11-21
status: prototype, implemented and tested (see below)
---
# Companion window

A narrow panel to keep over the game: a step-by-step guide, pinned achievements, and the encyclopaedia search. Decision: [[ADR-0008 Companion window in the browser]]. Research: [[Desktop Companion Research]].

## Use
1. Open `/compagnon`, or « Suivre pas à pas dans le compagnon » on a Dofus guide page (`/compagnon?guide=<slug>`).
2. Click « Ouvrir au premier plan »:
   - Chrome and Edge open an always-on-top window (Document Picture-in-Picture);
   - other browsers get a regular popup;
   - if that is blocked too, the page says so.
3. Run DOFUS windowed or in borderless full screen, and place the window over it. Keep the Atlas tab open: the window is part of it.

## What it shows
- **Guide:** the Dofus quest chains, the same ones the Dofus guide pages compute from the quest graph (`src/companion.ts`).
  - Each step is a quest with its own steps and objectives as the game files word them, a link to Atlas and the DPLN walkthrough when the database has one.
  - « Quête terminée » marks the quest done in the character's progress, as the quest tracker does, and moves to the next step not done.
  - ← and → change step.
  - The position is saved per character and guide (`atlas:compagnon:<characterId>`).
  - Several routes (« voies ») when a Dofus has several sources.
- **Épinglés:** achievements pinned from the Succès sheet (« Épingler au compagnon »), with their objectives. Checking an objective updates the same progress as the Succès page.
- **Chercher:** the encyclopaedia search. Sheets open in the main browser, so the companion keeps its place.

## Files
- `components/companion/CompanionView.tsx`, `usePip.ts`, `companion-store.ts`, `PinButton.tsx`
- `app/compagnon/page.tsx`, `app/api/compagnon/route.ts`
- `src/companion.ts`, `src/companion-shared.ts` (`startStep`, `nextStep`)

## Tested (2026-11-21)
- Unit:
  - `startStep` and `nextStep` cases;
  - real-data guides: 25 Dofus chains; « Dofus Argenté » has 71 steps with objectives.
- E2E, desktop and mobile:
  - open from the Dofus page, mark a quest finished, keyboard ← →, position kept after a reload, quest written to the character's progress;
  - the window button either opens the window or shows a visible fallback message.
- In the embedded browser pane, Picture-in-Picture refused automated clicks with « no window ». That is how the fallback path was found and fixed.

**Not verified:** staying above a running DOFUS client. That needs the owner's own click and the game; it is the next manual check.

## Limits
- Only Chromium browsers keep it on top.
- No global hotkey, no click-through, not above exclusive full screen.
- Guides cover Dofus chains only. Region and dungeon guides are planned ([[Ecosystem Architecture]]).
