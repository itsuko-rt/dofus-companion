---
type: bug
status: fixed
severity: low
found: 2026-11-20
---
# JSON-LD escape did nothing

## What happened
In TypeScript source, `'\u003c'` is the character `<` itself, so `.replace(/</g, '\u003c')` replaced `<` with `<`.

## Fix
`src/jsonld.ts` replaces with the two-character escape (backslash + u003c).

## Test that guards it
`tests/security.test.ts`
