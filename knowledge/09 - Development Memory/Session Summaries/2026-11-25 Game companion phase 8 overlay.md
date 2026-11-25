---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion phase 8 overlay

## What changed
- **An optional always-on-top overlay** in the companion. It shows the character played, the mode, the list being read, whether the site is linked, and the last readings with their site status, with capture and emergency-stop buttons.
- Shown or hidden by Ctrl+Shift+F10, the tray, a button, or `npm start -- --overlay`. Its position is kept.
- **Not focusable:** clicking it never takes the keyboard from DOFUS.
- Above borderless windows (« screen-saver » level). Never part of a capture, which reads the DOFUS window only.

Details: [[Game Companion Design#14. Phase 8: built (the overlay)]].

This overlay is the desktop companion's own. The site's guide window ([[Companion Window]], Document Picture-in-Picture) still exists for step-by-step guides.

## Why
Phase 8 of the approved plan: an optional overlay with status, recent events and the emergency stop.

## Files affected
- **New:** `companion/overlay.html`.
- **Changed:** `companion/main.mjs`, `companion/preload.cjs`, `companion/ui.html`.
- **Vault:** [[Game Companion Design]], [[01 - PROJECT ROADMAP]], [[03 - DEVELOPMENT STATUS]].

## Tests performed and results
- **`--self-test-ui`:**
  - main window and overlay, no renderer error;
  - overlay always on top: true; focusable: false.
- **Real PC with DOFUS running:** Windows reports the overlay as visible, `WS_EX_TOPMOST` and `WS_EX_NOACTIVATE`.
- No site code changed. The site checks of phase 7 still stand (125/125 unit, 66 E2E passed, 1 skipped).

## Remaining issues
- Its look above the game was not seen in this session.
- Exclusive full screen may hide it.
- Dragging it was not tested.

## Next recommended actions
1. **Owner:** press Ctrl+Shift+F10 in game, move the overlay where it suits you, and check that clicking it leaves the game focused.
2. **Phase 9:** hardening:
   - false readings on real screens;
   - restarts during a read;
   - a very long event log.
