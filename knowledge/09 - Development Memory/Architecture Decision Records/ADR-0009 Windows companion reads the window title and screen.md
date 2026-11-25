---
type: adr
status: accepted
date: 2026-11-25
---
# ADR-0009 Windows companion reads the window title and screen

## Context
The owner wants DOFUS progress picked up while playing, without uploading screenshots by hand. The browser scanner already reads a shared window ([[Character Sync OCR]]). A browser cannot do some things, though:
- see which DOFUS windows are open, and which character each one shows;
- capture on a global hotkey;
- capture without the sharing dialog.

Ankama publishes no API for progress ([[Official Sources]]). The game's logs hold no gameplay data (checked on 2026-11-25, [[Game Companion Design#What DOFUS exposes without touching the game (checked on the owner's PC, 2026-11-25)]]).

## Decision
1. A separate **Electron** app in `companion/`, with its own `package.json` (Electron 45.3.0). The site gains no dependency.
2. **What it reads:**
   - the DOFUS **window title**, from the OS window list. It gives `<character> - <class> - <version> - <channel>`;
   - **pixels** of the DOFUS window, through the OS capture API: on demand, by hotkey, or at an interval. The interval is off by default.
3. **What it never touches:** the game's process, memory, files, network traffic or input, and the launcher's folders.
4. **The companion only observes.** Progress is written by the site, through its existing validation and history (phase 6). Captures stay in memory and are never saved or sent.
5. The owner approved this on 2026-11-25, with both hotkey and interval capture, knowing that Ankama's position on automatic screen reading is not confirmed.

## Consequences
- **Character switches** are detected from the title, with certainty and without OCR.
- **Level and server** are not in the title. They must come from OCR, or from the player.
- **About 100 MB** for the companion's Electron, installed only by players who want it.
- [[Desktop Companion Research]] « no screen reading » now has two exceptions: the browser share, and this companion.
- Extends [[ADR-0004 Scanner reads screenshots locally]] and [[ADR-0008 Companion window in the browser]]; it replaces neither.
