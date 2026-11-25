---
type: technical
---
# Integrations and dependencies

## External services
| Service | Used for | Direction | Data sent | Status |
|---|---|---|---|---|
| dofus-sqlite (GitHub releases) | Game data | import time only | none | active |
| dofusdude (GitHub releases) | Items and sets | import time only | none | active |
| Dofus Pour Les Noobs | Tutorial links (sitemap at import; users click links) | import + user click | none from us | active |
| Dofus Fashionista API (`/api/v1`) | Community builds | server → Fashionista, cached 1 h | none about users | active. **Inform the maintainers before launch** |
| jsDelivr | tesseract.js worker and model | browser, only when the scanner is used | the visitor's IP | active |
| DofusDB, Dofus Maps | `/carte` links | user click, new tab, `noreferrer` | none | active since 2026-11-20 |
| Cloudflare Web Analytics | Audience | browser | aggregated page views | **off** (needs `NEXT_PUBLIC_CF_BEACON_TOKEN`) |
| Google AdSense | Ads | browser | ad cookies | **off** (needs consent setup; [[ADR-0006 No ads or analytics without consent]]) |
| E-mail provider | Password reset | server | e-mail address, link | **missing** |

## npm dependencies (runtime)
`next`, `react`, `react-dom`, `@xyflow/react` and `@dagrejs/dagre` (quest graph), `lucide-react` (icons), `tesseract.js` (scanner).

Dev: `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `@playwright/test`, `@types/*`.

`npm audit`: 0 vulnerabilities (2026-11-20).

Rule: record every new service or dependency here, with what data it receives.
