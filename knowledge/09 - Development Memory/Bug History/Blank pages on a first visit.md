---
type: bug
status: fixed
severity: high
found: 2026-11-20
---
# Blank pages on a first visit

## What happened
A visitor with no saved character opened `/personnage` or `/builds` directly and got a blank page, with no error. The pages appeared only after a navigation inside the site.

`components/useCharacter.ts` uses `useSyncExternalStore`. With empty storage, `load()` returned the shared `EMPTY_STORE` object, which is also the server snapshot. The snapshot never changed, so React never re-rendered, and `ready` stayed `false`.

## Fix
- `load()` returns a new empty object.
- `ready` is derived from the snapshot (`s !== EMPTY_STORE`).

## Test that guards it
`e2e/ui.spec.ts`, "first visit without a saved character". The other E2E tests seed a character first, which is why they missed this bug.
