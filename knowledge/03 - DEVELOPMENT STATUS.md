---
type: status
updated: 2026-11-25
---
# Development status

A snapshot of where the project stands, checked against the code. Replace this snapshot after each significant session: the dated history belongs in [[Session Summaries]]. The earlier dated sections of this note (until 2026-11-23) stay in its git history and in the summaries they link to.

## Where we are
**Pre-launch. Not deployed.**

| Check | Result | When |
|---|---|---|
| `npm run typecheck` | clean | 2026-11-25 |
| `npm test` | 125/125 | 2026-11-25 |
| E2E (Playwright, desktop and mobile) | 65 passed, 1 skipped by design, 0 failed | 2026-11-25 |
| Production build | OK | 2026-11-23 |

## Branches
| Branch | Holds | State |
|---|---|---|
| `main` | Everything up to 2026-11-20: the map removal, the security audit, the vault | Stable |
| `develop` | +24 commits: game data foundation, all 19 classes, level page, Almanax, profession calculator, PR #2 fixes, Succès redesign | Not merged into `main` (PR #2) |
| `feature/atlas-ecosystem` | +5 on `develop`: encyclopaedia, atelier, drop odds, companion window, scanner that saves | Pushed; whether its PR is open was not checked (no `gh` here) |
| **docs/vault-cleanup** | This reorganisation of the vault, from `feature/atlas-ecosystem` | Local, 2026-11-25 |
| **docs/system-documentation** | One note on the owner's wider tool ecosystem, out of this project's scope | Not merged, on purpose ([[06 - CLEANUP REPORT]]) |

## Completed (implemented and tested)
The modules are listed in [[00 - PROJECT DASHBOARD#What is built (implemented and tested)]]. Each one has unit tests, E2E tests, or both. The session that built it is in [[Session Summaries]].

## In progress
- **Scanner on the real game:** built and tested on synthetic game-like images only. Waiting for the owner to try it on a real « Terminées » list and an obtained-achievements list ([[2026-11-23 Scanner that saves quests and achievements]]).
- **Companion window above the real game:** built and tested in the browser. Not checked over a running DOFUS client ([[Companion Window]]).
- **Windows game companion** (branch feature/game-companion): phases 3–6 built: character from the window title, capture, quest and achievement lists, and sync with the site (pairing, modes, confirmations, idempotent writes). Phases 7–9 next ([[Game Companion Design]]).

## Blocking a public launch
From [[Release Checklist]]:
1. **E-mail provider:** password reset cannot send links in production.
2. **Hosting environment variables:** `NEXT_PUBLIC_SITE_URL` (https), `TRUSTED_IP_HEADER`, `APP_DB_PATH`, `LEGAL_*`.
3. **Backups** of `data/app.sqlite`, with one restore tested.
4. **Staging run:** OWASP ZAP baseline, headers over https.
5. **Legal review** ([[GDPR and Privacy]]): terms of service, DPAs, breach procedure, retention, minors.
6. **Ankama fan-site terms**, Fashionista maintainers informed, trademark check.

## Known limitations
- The scanner's OCR accuracy has not been measured on real DOFUS screenshots (UNVERIFIED). Names made only of numbers, or starting with them, cannot be matched.
- 621 of 1,984 quests have conditions the engine can't fully interpret. They are shown as « à vérifier en jeu », never guessed.
- Builds come from Fashionista. Budget, prices and verified damage are not available.
- Professions:
  - resources are known per zone, not per map, and there are no spot counts;
  - the profession XP table is not in the game files ([[ADR-0007 Profession XP comes from the player's screen]]).
- XP and kamas routes: no verified data, so not implemented.
- Monster XP and profession progress are **not verified in game** (findings M5 and M6 in [[04 - TECHNICAL DEBT]]).

## Missing documentation
- No note yet for the Succès journal's code. [[Achievements]] covers the game facts; the code is described only in the three 2026-11-21 session summaries.
- [[Architecture]]'s versions line dates from 2026-11-20 and was not rechecked.
- The UI notes ([[Visual Identity]], [[UI UX Guidelines]], [[Components]]) predate the Succès and encyclopaedia designs.

Next steps: [[01 - PROJECT ROADMAP]].
