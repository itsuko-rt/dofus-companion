---
type: adr
status: accepted
date: 2026-11-19
---
# ADR-0002 SQLite for game and account data

## Context
The original plan (`docs/RAPPORT_ARCHITECTURE.md` §4, §8) used SQLite for game data, then PostgreSQL with Kysely and better-sqlite3 once accounts existed.

## Decision
Use Node's built-in `node:sqlite` for both:
- a game database per version, rebuilt by the import;
- `data/app.sqlite` for accounts, with forward-only migrations.

No ORM, no extra database server.

## Alternatives considered
PostgreSQL (Neon, Supabase), Kysely, better-sqlite3.

## Consequences
- **Gains:** zero added dependencies and simple hosting (one Node process and one file to back up).
- **Costs:** one writer process. Scaling out to several servers would need a shared database, which means revisiting this decision.

Source: `docs/RAPPORT_DEVELOPPEMENT.md` §5–6.
