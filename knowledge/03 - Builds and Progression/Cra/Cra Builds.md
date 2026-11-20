---
type: research
topic: Community builds
source_name: Dofus Fashionista API
source_url: https://dofusfashionista.gg/api/v1/
source_type: community-tool
game_version: "3.7.14.18"
researched: 2026-11-19
last_verified: 2026-11-20
confidence: medium
verification: COMMUNITY
---

# Crâ builds

- **Source:** Dofus Fashionista's public read-only API (tier list + recent shared builds), fetched by `/api/builds?breed=9` and cached one hour. Fashionista is LGPL-3.0 open source.
- **Snapshot (2026-11-19, `docs/RAPPORT_DEVELOPPEMENT.md` §1):** 40 Crâ builds resolved, of which 22 were marked solved for patch 3.7. The numbers change with Fashionista's data; they are not stored.
- **How the site uses them:**
  - each build's items are resolved against our own item data, and stats recomputed;
  - builds whose `solved_patch` differs from the current patch are flagged;
  - a build Crâ "top" set on 3.3 was seen, so the filter matters.
- **Not available, so not shown:** budget and prices, verified damage, PvM/PvP style, other game versions.
- **Label:** COMMUNITY. A build is never presented as "optimal".

Class facts: [[Cra]].
