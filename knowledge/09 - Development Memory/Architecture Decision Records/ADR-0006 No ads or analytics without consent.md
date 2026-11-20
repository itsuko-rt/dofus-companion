---
type: adr
status: accepted
date: 2026-11-19
---
# ADR-0006 No ads or analytics without consent

## Context
The site may later be funded by ads. EU and Spanish users need consent before non-essential cookies.

## Decision
- AdSense and Cloudflare Web Analytics are wired but **off** unless their environment variables are set.
- AdSense requires a certified consent platform first.
- The privacy page describes each only when it is enabled.

## Consequences
- No consent banner is needed today: only strictly necessary storage is used.
- Enabling either needs a policy update and, for analytics in Spain, a legal check.

Source: `docs/LANCEMENT_PUBLIC.md` §5–7, `.env.example`.
