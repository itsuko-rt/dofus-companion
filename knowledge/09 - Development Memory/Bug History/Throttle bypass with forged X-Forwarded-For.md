---
type: bug
status: fixed
severity: high
found: 2026-11-19
---
# Throttle bypass with forged X-Forwarded-For

## What happened
Login throttling read a client-chosen header, so rotating it reset the limit.

## Fix
IP read only from `TRUSTED_IP_HEADER`.

## Test that guards it
`tests/auth.test.ts`, live probe
