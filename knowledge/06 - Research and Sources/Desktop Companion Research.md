---
type: research
date: 2026-11-21
status: mixed, labelled per line
---
# Desktop companion research

Goal: use Atlas while playing, without switching windows and without touching the game. Related notes: [[Teckium Tool Analysis]], [[Competitor Analysis]], decision [[ADR-0008 Companion window in the browser]].

## How others do it
| Project | Approach | Notes |
|---|---|---|
| Teckium overlay | A web page opens a **Document Picture-in-Picture** window: an always-on-top browser window that can hold any HTML. If the API is missing, it falls back to `window.open`. | VERIFIED 2026-11-21: their launcher script calls `documentPictureInPicture.requestWindow` and has a `window.open` fallback (checked for the presence of the API calls only, nothing copied). The site says « Fenêtre toujours au premier plan sur Chrome et Edge · jeu en fenêtré ou plein écran fenêtré ». |
| Teckium Launcher | Windows app: multi-account switching, DPS check read from the combat chat, the site's tools | Observed on their page; implementation UNVERIFIED. It goes beyond reading a web page: it acts on game windows and logs. |
| Ganymède | Desktop guide app with an overlay | Community; repository GanymedeTeam/GanymedeApp (UNVERIFIED). Some players were wary of installing it (Reddit, 2024). |
| dofus-hunteRS (LightInn) | Treasure-hunt overlay, « not a bot » | Community, work in progress (UNVERIFIED). |
| Lindo | Modified client (Dofus Touch) | Out of scope: a modified client. |

## Options for Atlas
| Option | Install | Always on top | Size / memory | Effort | Risks |
|---|---|---|---|---|---|
| **1. Document Picture-in-Picture from the website** | none | yes (Chrome, Edge 116+; Firefox only recently, UNVERIFIED) | one extra browser window | low | must open from a click; HTTPS or localhost; not in Safari |
| 2. `window.open` popup | none | no (stays behind the game once you click the game) | small | very low | useful only as a fallback, on a second screen |
| 3. Electron app | ~100 MB+, signed installer and updater | yes (`setAlwaysOnTop`) | ~150 MB+ RAM | high | code signing, updates, a larger attack surface |
| 4. Tauri app | ~5–10 MB, needs the Rust toolchain | yes | uses the WebView2 already in Windows | medium-high | Rust toolchain, signing, updates |
| 5. Website plus an optional launcher later | none now | through option 1 | — | low now | — |

**Recommendation: option 5.** Ship option 1 now, with option 2 as the fallback, from the existing Next.js app. Same code and data, nothing to install or update, no access to the game. Revisit Tauri only if players need features a browser cannot give: global hotkeys, click-through, staying visible above exclusive full screen.

## Game integrity and Ankama's rules
- Ankama warns against bots and automation and asks players to report tools that give kamas or items (secondary sources: JOL, Breakflip). The exact current wording of the terms about third-party software could not be retrieved (UNVERIFIED): ankama.com/fr/cgu returned 404 and searches did not surface the text.
- **What Atlas does:** a separate browser window that the player reads and clicks. No access to the game client, its memory, packets, files or logs. No input simulation, no automation. This is the same as a guide open in a browser on a second screen ([[ADR-0001 Game data from the game files]] already excludes any interaction with the client).
- **What Atlas will not do:**
  - read the combat chat or log files;
  - switch between game windows;
  - read the screen in the background;
  - draw on top of the game's own surface (click-through injection).
- **Exception, decided 2026-11-23 at the owner's request:** the scanner may read the frames of a window the player shares in the browser's own dialog. The browser shows its sharing indicator. Frames are read only when the view changes, never more than once per 1.5 s. It stops after 10 minutes or when the player stops sharing. Pixels only: nothing is sent to the game, nothing leaves the browser ([[Character Sync OCR]]).
- **If something deeper is wanted later:** ask Ankama support first and record the answer here.

## MVP (built 2026-11-21, see [[Companion Window]])
- `/compagnon`: a compact page for a narrow window, with a button that opens it always on top (Picture-in-Picture), or as a popup when the API is missing.
- Content:
  - **step-by-step guide** for a Dofus quest chain, generated from the quest graph, with previous and next. The step is saved per character and guide, and finishing a quest marks it in the tracker;
  - **pinned achievements** with their objectives;
  - quick search over the encyclopaedia.
- Readable at 320–420 px, keyboard (← → to move between steps), respects reduced motion.

## Long-term roadmap
1. More guide sources: a region's quests, a dungeon's achievements, an atelier list as a checklist.
2. A compact « which tool » launcher inside the window; recently opened sheets.
3. Optional user notes per step.
4. Only if needed and allowed: a Tauri shell for a global hotkey to show or hide the window. It would still be read-only.
