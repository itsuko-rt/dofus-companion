# Feature backlog

Status values: **planned** (agreed, not started), **idea** (not agreed), **blocked** (waiting on something). Sources are the "remaining work" sections of the reports in `docs/`.

| Feature | Status | Notes / source |
|---|---|---|
| Fix first-visit blank pages, Succès query indexes, quest graph cache | **implemented** 2026-11-20 (unit + E2E tests, measured) | `docs/GAME_DATA_AND_PRODUCT_AUDIT.md` §4 |
| All 19 classes and a class hub page | planned (phases 1–2, awaiting approval) | same audit §2–3 |
| **Game data foundation**: quest objectives with game ids, all subareas (dungeons), full monster grades (resistances), drop fields, class characteristic costs, keys and an integrity gate after import | planned, **before** the equipment builder and the progression planner | `docs/PR2_TECHNICAL_REVIEW.md` M2–M8, §11 step 1 |
| In-game checks: monster XP (2–3 monsters), profession XP panel, one spell tooltip | planned (owner, in game) | `docs/PR2_TECHNICAL_REVIEW.md` M5, M6 |
| Label event-only zones (Nowel) on the level page | idea (no game-data flag found yet) | `docs/PR2_TECHNICAL_REVIEW.md` §12 |
| E-mail provider for password reset and verification | blocked (choice of provider) | `docs/RELEASE_READINESS.md` |
| "Log out other devices", idle session timeout | planned | `docs/SECURITY_AUDIT.md` F10 |
| E-mail verification at sign-up | planned | needs the e-mail provider; also stops registration enumeration |
| Nonce-based CSP | idea | removes `'unsafe-inline'` |
| Measure OCR accuracy on real Dofus screenshots | planned | `docs/RAPPORT_SUCCES_SCAN.md` §8 |
| Self-host the tesseract model (≈ 10 MB in `public/`) | idea | removes the jsDelivr dependency |
| "Que faire maintenant ?" on the home page (achievements almost done, dungeons in range) | planned | `docs/RAPPORT_SUCCES_SCAN.md` §8 |
| Dedicated dungeon view | planned | roadmap phase 3 |
| Full scan history page (only the last 8 shown) | planned | `docs/RAPPORT_SUCCES_SCAN.md` §8 |
| N1ark progress import | idea | export format UNVERIFIED |
| Class guides with sourced advice (layer B) | planned | needs sources; see [[Cra]], [[Pandawa]] |
| Recommended routes, XP and kamas routes (layer C) | blocked (no verified data) | [[XP Routes]], [[Kamas Routes]] |
| Almanax calendar | **implemented** 2026-11-20 (home card: today's offering, bonus, next 6 days; unit, data and E2E tests) | from `almanaxcalendarsdata`, which the import did not read before (`docs/RAPPORT_SUIVI_QUETES.md` §4 said blocked) |
| Keyboard navigation of the quest graph | idea | search, sheet and prerequisite list work with the keyboard |
| Terms of service page | planned | [[GDPR and Privacy]] |
| tesseract.js 7 | idea | needs a scanner retest |

Use [[Feature Specification]] before starting any of these.
