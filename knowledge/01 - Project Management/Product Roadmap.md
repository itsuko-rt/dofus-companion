# Product roadmap

This is the original five-phase plan from `docs/RAPPORT_ARCHITECTURE.md` §9 (2026-11-19), with today's status. The implementation differs from the plan in places; those differences are recorded as decisions.

| Phase | Plan | Status (2026-11-20) |
|---|---|---|
| 1. Data foundations | Import dofus-sqlite, condition parser, graph compiler, report of unknown codes | **Done.** `scripts/import.ts`, `src/criteria.ts`, `src/graph.ts`, `data/report-<version>.json` |
| 2. Quest map | Focused graph views, quest sheet, local tracking | **Done**, redesigned after N1ark (`docs/RAPPORT_SUIVI_QUETES.md`) |
| 3. Encyclopedia + Crâ / Pandawa | Spell pages, dungeons, achievements, Dofus planner, Fashionista builds filtered by patch | **Mostly done:** spells, achievements, Dofus, equipment, builds. *No dedicated dungeon view yet.* |
| 4. Accounts and progress | Auth, Postgres, several characters, N1ark import, dashboard | **Done with SQLite instead of Postgres** ([[ADR-0002 SQLite for game and account data]]). *N1ark import not implemented.* |
| 5. Community content | Recommended routes (layer C), sourced guides, post-patch review workflow, self-hosted solver if justified | **Not started** |

## Added along the way
- **Scanner (OCR) and achievements tracking:** done.
- **Public launch preparation:** SEO, icons, legal pages, consent. Done, except the steps in [[Release Checklist]].
- **Professions guide:** done.
- **In-site world map:** built, then **removed** on 2026-11-20 ([[ADR-0005 Remove the in-site map]]).

- **Connected encyclopaedia, atelier, drop odds and companion window:** done on 2026-11-21 on branch feature/atlas-ecosystem ([[Ecosystem Architecture]], [[Companion Window]]). This closes the « no dedicated dungeon view » gap of phase 3.

## Next
See [[Ecosystem Architecture]] (next steps), [[Priorities]] and [[Feature Backlog]].
