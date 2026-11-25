---
type: bug
status: fixed then removed
severity: medium
found: 2026-11-20
---
# Wrong zone at (0, 0) on the removed map

## What happened
About 1,800 unplaced instance maps parked at [0, 0] outvoted the real map, so [0, 0] showed Cité d'Astrub instead of Village d'Amakna (22 coordinates wrong).

## Fix
Placed maps filtered by flag bit 20, which the professions import still uses to assign zones to worlds.

## Test that guards it
covered by the profession zone tests
