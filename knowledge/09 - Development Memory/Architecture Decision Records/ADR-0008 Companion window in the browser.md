---
type: adr
status: accepted
date: 2026-11-21
---
# ADR-0008 Companion window in the browser

## Context
The owner wants to use Atlas while playing, as Teckium's overlay allows (« Tous mes outils, par-dessus ton jeu »). Research in [[Desktop Companion Research]] compared:
- a Document Picture-in-Picture window opened by the website;
- a plain popup;
- Electron;
- Tauri;
- a website with an optional launcher later.

Teckium's own overlay is a Document Picture-in-Picture window (VERIFIED 2026-11-21). Ankama's current terms text about third-party software could not be retrieved (UNVERIFIED). Atlas already excludes any interaction with the game client ([[ADR-0001 Game data from the game files]]).

## Decision
- The companion is a page of the website (`/compagnon`). One click opens it in an **always-on-top Document Picture-in-Picture window**, which Chrome and Edge 116+ support.
- If the browser refuses or lacks the API, a regular popup opens instead. If that is blocked too, the page says so and the companion stays usable in the tab.
- **Read-only:** no access to the game client, its memory, packets, files or logs; no input simulation; no screen reading.
- No desktop app (Electron or Tauri) for now.

## Consequences
- Nothing to install, sign or update. Same code, data and character progress as the site. Each move to the next guide step is a click by the player.
- Limits:
  - only Chromium browsers keep the window on top;
  - the game must run windowed or in borderless full screen;
  - the main tab must stay open;
  - there is no global hotkey and no click-through.
- Revisit, by superseding this ADR, only if players need a global hotkey or exclusive full screen. Even then: a read-only Tauri shell, after asking Ankama.
