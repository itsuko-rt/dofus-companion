---
type: session
date: 2026-11-21
---
# 2026-11-21 Achievements visual redesign

## What changed
A visual rework of the Succès page, on top of [[2026-11-21 Achievements redesign]]. The logic is unchanged: tracking, recommendations, search, filters, sorting and API queries.
- **Header dashboard** replaces the generic page banner:
  - a progress ring with the overall percentage;
  - three figures: points earned out of the total, achievements obtained out of the total, and how many are « À confirmer »;
  - the search field and the scanner button.

  It takes less height than before.
- **Sidebar:**
  - one icon per root category;
  - a thin progress line and a count per category;
  - the active category is marked by a gold edge;
  - the families can be collapsed. « Événements et serveurs à part » starts collapsed, unless the open category belongs to it.
- **Entries** are compact dark rows instead of big parchment cards:
  - an emblem: the root category's icon, with a state badge;
  - the name, then one line with the reason, the search match or the description;
  - the level, and the category path when it is useful;
  - points, the state label and a small objective bar on the right.

  The game files have no achievement icons, so the category icon is used instead.
- **Details** are a parchment sheet:
  - its sections: header, description, objectives with their own state and a progress bar, « Où aller », rewards (achievement points included), and the actions;
  - from 1280 px they show in a sticky side panel; when nothing is selected, that panel explains the five states;
  - on narrower screens they unfold under the entry, without repeating the entry's header.
- **Category header:**
  - an emblem, a hint and a percentage;
  - points earned out of the category's total;
  - a progress line and sub-category chips.
- **Filters** show a count for each state, and that count follows the level filter.
- **Phones:** a slide-in category drawer (Escape or a tap outside closes it). The filters scroll sideways, and the category figures sit under the title.
- **Loading** shows skeleton rows instead of a text line. Search keeps the previous results dimmed while the next search runs.
- **Motion:** colour transitions and short fades and slides only. The global reduced-motion rule turns them off.

## Why
The owner found the previous version functional but repetitive and too much like a spreadsheet: every achievement was a big beige rectangle with every detail at the same weight.

## Files affected
- `components/progression/AchievementCard.tsx`: entry, `Emblem`, `AchievementDetails`, category icons.
- `components/progression/AchievementsView.tsx`: dashboard, `CategoryNav`, `Drawer`, side panel, skeletons, filter counts.
- `app/globals.css`: the drawer slide-in animation.
- `e2e/ui.spec.ts`: the Succès test finds entries by `li[id^="ach-"]` and the details as the region « Détails : … ». That region is in the side panel or under the entry. The test also checks that the « Obtenus » filter count goes to 1.

## Tests performed and results
- Typecheck clean. `npm test`: 97/97. Production build OK.
- Full E2E, desktop and mobile: 47 passed, 1 skipped by design (the class test is desktop-only), 0 failed. The Succès and class tests were run again on the final build: 5 passed, 1 skipped.
- Screenshots checked:
  - 1440 px: side panel, « Pour vous », a category and search;
  - 768 px: details inline, sidebar visible;
  - 375 px: drawer, details inline, no horizontal overflow.

  Two problems came up and were fixed: a duplicate clear button in the search field (the browser's own) and the steps of « Par où commencer ? » being too narrow at 768 px.

## Remaining issues
- Emblems are category icons, not the game's achievement icons, which the imported data does not include.
- The side panel threshold (1280 px) is a choice of layout, not measured on real devices.

## Next recommended actions
1. Owner: try the page on a real phone and a wide screen.
