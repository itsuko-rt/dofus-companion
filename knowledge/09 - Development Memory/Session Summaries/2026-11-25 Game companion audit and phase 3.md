---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion audit and phase 3

## What changed
- **Audit and design** of a Windows companion that syncs DOFUS progress to Atlas profiles: [[Game Companion Design]]. The owner approved Electron, hotkey and interval capture (interval off by default), and Assisted as the default mode ([[ADR-0009 Windows companion reads the window title and screen]]).
- **Main finding:** the DOFUS window title gives `<character> - <class> - <version> - <channel>`. So character switches can be detected from the OS window list, without OCR and without touching the game. The game's logs hold no gameplay data.
- **Phase 3 built** (`companion/`):
  - DOFUS window detection and the title parser (`src/game-window.ts`);
  - a `character.seen` event on each switch;
  - in-memory capture by button, tray, hotkey (Ctrl+Shift+F9) or interval;
  - modes;
  - emergency stop (Ctrl+Shift+F12);
  - a local history kept 30 days;
  - a tray icon and a small window in French.

## Why
The owner wants to play normally while Atlas picks up progress. A browser cannot list windows, use global hotkeys or capture without a dialog.

## Files affected
- **New:**
  - `src/game-window.ts`, `tests/game-window.test.ts`;
  - `companion/package.json`, `companion/package-lock.json`;
  - `companion/main.mjs`, `companion/preload.cjs`, `companion/ui.html`;
  - [[ADR-0009 Windows companion reads the window title and screen]], [[Game Companion Design]].
- **Updated:**
  - `CLAUDE.md`;
  - [[Integrations]], [[01 - PROJECT ROADMAP]], [[02 - PROJECT ARCHITECTURE]], [[03 - DEVELOPMENT STATUS]], [[05 - DOCUMENTATION INDEX]], [[Architecture Decision Records]].

## Tests performed and results
- Typecheck clean. `npm test`: 111/111, including 3 new tests.
- **Self-test with DOFUS 3.7.14.18 running:**
  - one window found;
  - class read as Huppermage (id 17), and the version;
  - one `character.seen` event;
  - a 3840 × 2160 capture with no black pixels.
- E2E not run: no site code changed.

## Remaining issues
- Not tested:
  - a covered window;
  - two DOFUS windows;
  - a live character switch;
  - the hotkeys while the game has focus.
- With several DOFUS windows, the active one is the one that changed last (`shortcut:` in `companion/main.mjs`).
- Modes have no effect until the sync (phase 6).

## Next recommended actions
1. **Owner:** start `npm start` in `companion/`, switch character in game, and check the companion follows.
2. **Phase 4:** run the existing OCR on companion captures (quest lists), with screen-kind detection and the evidence rules.
