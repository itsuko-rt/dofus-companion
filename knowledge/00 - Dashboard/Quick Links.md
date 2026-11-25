---
type: reference
---
# Quick links

## Commands (from the repository root)
| Task | Command |
|---|---|
| Dev server | `npm run dev` (http://localhost:3000) |
| Unit tests | `npm test` |
| Typecheck | `npm run typecheck` |
| E2E (needs a production server on 3100) | `npm run build`, `npm start -- -p 3100`, then `npx playwright test` |
| Import game data (≈ 8 GB RAM) | `npm run import` |
| Rebuild profession tables only | `node --max-old-space-size=8192 scripts/professions-import.ts` |
| Rebuild classes, monsters, XP, activities, Almanax only | `node --max-old-space-size=8192 scripts/creatures-import.ts` |
| Rebuild favicons and app icons from `brand/` | `node scripts/make-icons.ts` |
| Official icons (local only, not in Git) | `npm run assets` |
| Security probe (local or staging only) | `node scripts/security-probe.mjs http://127.0.0.1:3100` |
| Broken links | `node scripts/check-links.ts http://localhost:3000` |
| Check this vault (links, paths, secrets) | `node scripts/check-knowledge.ts` |

## Key files
`src/brand.ts` (name) · `src/codes.ts` (condition codes) · `src/server/auth.ts` (accounts) · `src/character.ts` (character model) · `scripts/import.ts` (data import) · `next.config.ts` (security headers) · `.env.example` (configuration)

## Detailed reports in `docs/`
| Report | Topic |
|---|---|
| `docs/RAPPORT_ARCHITECTURE.md` | Original source study and architecture plan (2026-11-19) |
| `docs/RAPPORT_DEVELOPPEMENT.md` | First development session |
| `docs/RAPPORT_SUIVI_QUETES.md` | Quest tracker redesign |
| `docs/RAPPORT_SUCCES_SCAN.md` | Achievements and the scanner |
| `docs/AUDIT_UX.md` · `docs/RAPPORT_REFONTE_VISUELLE.md` · `docs/DESIGN_SYSTEM.md` | UX audit, visual redesign, design system |
| `docs/LANCEMENT_PUBLIC.md` | Launch: SEO, hosting, ads, steps |
| `docs/PROFESSIONS_SYSTEM.md` | Professions |
| `docs/AUDIT_SECURITE.md` · `docs/SECURITY_AUDIT.md` · `docs/SECURITY_FIXES.md` | Security audits |
| `docs/PRIVACY_GDPR_REVIEW.md` · `docs/RELEASE_READINESS.md` | Privacy review, release readiness |
| `docs/MAP_REMOVAL_REPORT.md` | Map removal |
| `docs/GAME_DATA_INVENTORY.md` | Every game dataset, coverage, relationships, what is missing (2026-11-20) |
| `docs/GAME_DATA_AND_PRODUCT_AUDIT.md` | Game data, all classes, performance, UX, roadmap (2026-11-20) |

## External
Repository: https://github.com/itsuko-rt/dofus-companion · Game data: https://github.com/ledouxm/dofus-sqlite/releases · Builds: https://dofusfashionista.gg
