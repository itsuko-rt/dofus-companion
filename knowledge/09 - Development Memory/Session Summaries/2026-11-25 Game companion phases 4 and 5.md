---
type: session
date: 2026-11-25
---
# 2026-11-25 Game companion phases 4 and 5

## What changed
- **The companion reads lists.** The player declares the list shown (*Quêtes terminées*, *Succès obtenus*) and frames it on the capture preview. Each capture, by button, hotkey or changed frame at an interval, is read with the site's own pipeline and becomes `quest.completed` / `achievement.completed` events marked sûr or à confirmer. Details: [[Game Companion Design#11. Phases 4 and 5: built (quest and achievement lists)]].
- **Shared code instead of copies:**
  - the thresholding moved from `components/scan/ocr.ts` to `src/threshold.ts`, used by the browser and the companion;
  - the evidence rules are in `src/companion-read.ts`.
- **Test modes:**
  - `--self-test-read <image> <list>`, `--self-test-ui`, and `--self-test <list>` for a live read;
  - test runs use their own folder and never take the real companion's lock.

## Why
Phase 4 of the approved plan (quests). Phase 5 (achievements) is the same pipeline with another list, so both were built together.

## Files affected
- **New:**
  - `src/threshold.ts`, `src/companion-read.ts`;
  - `tests/threshold.test.ts`, `tests/companion-read.test.ts`;
  - `companion/read.mjs`.
- **Changed:**
  - `components/scan/ocr.ts`;
  - `companion/main.mjs`, `companion/ui.html`, `companion/preload.cjs`, `companion/package.json` (tesseract.js 6.0.1).
- **Vault:** [[Game Companion Design]], [[Character Sync OCR]], [[Integrations]], [[01 - PROJECT ROADMAP]], [[02 - PROJECT ARCHITECTURE]], [[03 - DEVELOPMENT STATUS]].

## Tests performed and results
- `npm test`: 117/117. Typecheck clean. Production build OK.
- `e2e/scan.spec.ts` desktop: 4/4.
- **Companion on the synthetic game lists:**
  - quests: 7/7 read, all certain;
  - achievements: 4/5, all certain. One name was misread and not proposed.
- **Real game, whole window, no list open:** 0 false completions out of 109 lines.
- **Companion window:** no renderer error. One display bug was found and fixed.

## Remaining issues
- Not measured on a real « Terminées » or obtained-achievements list.
- Reading a whole 4K window takes about 9 s; a framed list is faster.
- Events stay in the companion until phase 6.

## Next recommended actions
1. **Owner:** open the « Terminées » quest tab in DOFUS, pick *Quêtes terminées* in the companion, frame the list, press Ctrl+Shift+F9, and check « Voir le texte lu ».
2. **Phase 6:** local API, pairing and the site's sync panel.
