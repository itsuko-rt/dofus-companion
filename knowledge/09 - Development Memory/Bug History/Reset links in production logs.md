---
type: bug
status: fixed
severity: high
found: 2026-11-20
---
# Reset links in production logs

## What happened
Password-reset links and e-mail addresses were written to the server log in every environment; a link is password-equivalent.

## Fix
Logged only in development (`app/api/auth/[action]/route.ts`).

## Test that guards it
code review; probe; documented in `docs/SECURITY_FIXES.md` F1
