---
type: bug
status: fixed
severity: medium
found: 2026-11-20
---
# Server-only objectives counted as met

## What happened
An empty level-1 profile showed **232 achievements "en cours"** and a "Presque terminés" list. Kardorim appeared twice there.

The condition code `Sc` (and `Sv`) is evaluated as always true, as the game client does for quest start conditions. But 232 achievement objectives consist *only* of `Sc=<id>`: the server tracks the real objective. Counting them as "inferred" made those achievements look started.

## Fix
`src/achievements.ts`: an objective whose condition holds only `Sc`/`Sv` codes is `unknown` (to check in game), never met. Quest conditions are unchanged.

## Test that guards it
`tests/achievements.test.ts`, "an objective made only of server-side conditions is never counted as met". After the fix, an empty profile has 0 achievements in progress.
