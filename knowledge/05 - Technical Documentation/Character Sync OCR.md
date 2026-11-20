# Character sync and the scanner (OCR)

## Character sync
- **Model:** `src/character.ts` (`Character`, `sanitizeCharacter`). The browser and the server use the same validation.
- **Storage:** in the browser always; with an account, local characters are uploaded at login, then every change is saved through `PUT /api/characters/:id`. A newer copy on the server wins.
- **Fields:** name, level, class, alignment, element, playstyle, done and active quest/achievement nodes, saved builds (Fashionista URLs only), notes, profession levels, change history.

## Scanner (`/progression/scan`)
Code: `components/scan/ScanView.tsx`, `components/scan/ocr.ts`, `src/recognize.ts`.

**How it works** (verified in code, 2026-11-20):
1. The player picks an image, pastes one, or shares a window through the browser's own dialog (one frame, then sharing stops).
2. The image is decoded and read **in the browser** by tesseract.js in a Web Worker. It is never uploaded or stored.
3. The lines are matched to quest and achievement names (`src/recognize.ts`). Only near-perfect matches (≥ 0.9) are pre-ticked.
4. The player confirms; changes go into the history and can be undone.

**Limits:** 25 MB per file, 40 MP.

**Third party:** the tesseract worker, core and French model (≈ 2 MB) are downloaded from `cdn.jsdelivr.net` on first use, so the visitor's IP reaches jsDelivr. The privacy policy says so.

**Rules:** the site never touches the game client (no memory reading, packets or automation), per [[ADR-0004 Scanner reads screenshots locally]].

**Accuracy on real Dofus screenshots: not measured (UNVERIFIED).** Measuring it is a backlog item. Whether Ankama accepts screenshot reading is also unconfirmed (`docs/RAPPORT_SUCCES_SCAN.md` §2).
