---
type: session
date: 2026-11-23
---
# 2026-11-23 Scanner that saves quests and achievements

## What changed
The owner wants to show the game's « Terminées » quest list (or the obtained achievements), as a screenshot or by sharing the screen, and have Atlas mark them done. Details: [[Character Sync OCR]].
- **The OCR now reads game lists.** Captures are thresholded with two Otsu levels and upscaled to about 2000 px of height. The old grey-level view lost most rows to the striped list backgrounds.
- **Names read with certainty are saved straight away** (switch, on by default). Each save is a history entry and can be undone. The rule is in `isCertain`, `src/recognize.ts`:
  - the whole line is exactly one unshared game name;
  - at most one stray 1–2 character token, for an icon read as letters;
  - OCR confidence ≥ 55 %;
  - at least two words or ten letters.
- **Near-exact names are pre-ticked** (`isLikely`): ≥ 85 % similarity for long names. One click saves them.
- **Window sharing session** (`startShare`, `components/scan/ocr.ts`): share the DOFUS window once, then « Lire maintenant », or automatic reading as you scroll the list in game. A new view is read only when the frame changes, at most every 1.5 s, for 10 minutes at most.
- « Voir le texte lu » shows the raw OCR text of each capture.
- [[Desktop Companion Research]] now records this exception to « no screen reading ».

## Why
The scanner was built on 2026-11-20 but had never been run on game-like lists with stripes and icons. Testing them showed it found 2 names out of 7, and pre-ticked none, because pre-ticking was based on the OCR engine's own confidence.

## Files affected
- `src/recognize.ts`: `similarity`, `ocr`, `exact`, stray-token tolerance, `isCertain`, `isLikely`.
- `components/scan/ocr.ts`: two-level Otsu thresholding, ~2000 px upscaling, `startShare`.
- `components/scan/ScanView.tsx`: auto-save, sharing session, raw text.
- `tests/recognize.test.ts`: two new tests.
- `e2e/scan.spec.ts` (new), four tests:
  - quests in PNG;
  - achievements in JPEG;
  - auto-save off;
  - window sharing with automatic reading.

## Tests performed and results
- Typecheck clean. `npm test`: 108/108. Production build OK.
- E2E, desktop and mobile: **63 passed, 1 skipped** by design, 0 failed.
- How the fix was found: the same game-like image went through 7 preprocessing and layout-mode variants with the same Tesseract version (6.0.1).
  - Grey levels: 0–3 names out of 7.
  - Thresholding at about 2.6× upscaling: 7/7, one with a single wrong letter.

## Follow-up the same day: framing the shared window
The owner reported that « Partager la fenêtre Dofus » did not really read the screen. Causes and fixes:
- **The whole window was read** (scene, chat, every panel): slow and noisy. The player now frames the list on the preview, and only that part is read.
- **Automatic reading never settled**, because the moving scene always counted as a change. Change detection now looks at the frame only, with a sharper detector: the old 64×64 average missed a list that scrolled.
- **No feedback in automatic mode.** There is now a live status for each read.
- E2E: the shared « window » has a moving scene and chat text. The test frames the list by dragging on the preview, checks there are at most 2 reads in 6 s while only the scene moves, and that the new names are read after a scroll.
- Results: typecheck clean, `npm test` 108/108, E2E 63 passed and 1 skipped by design, 0 failed.

## Remaining issues
- **Not measured on real DOFUS screenshots** (UNVERIFIED). The game font, transparency and the scene behind the windows may differ from the synthetic images.
- Names made only of numbers or starting with them (« 3 500 points ») cannot be matched: the matcher drops leading numbers.
- Whether Ankama accepts screenshot reading is still unconfirmed.

## Next recommended actions
1. Owner: scan a real « Terminées » list and an obtained-achievements list. If names are missed, send the screenshot, or the « Voir le texte lu » text, to calibrate.
