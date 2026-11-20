---
type: bug
status: fixed
severity: high
found: 2026-11-19
---
# Item effects lost through rounded ids

## What happened
dofus-sqlite's JSON rounds 64-bit Unity reference ids, which broke the item → effect links.

## Fix
Items and sets are imported from dofusdude's release of the same version.

## Test that guards it
data import checks (`tests/data.test.ts`)
