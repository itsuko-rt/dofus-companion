# Character sync and the scanner (OCR)

## Character sync
- **Model:** `src/character.ts` (`Character`, `sanitizeCharacter`). The browser and the server use the same validation.
- **Storage:** in the browser always; with an account, local characters are uploaded at login, then every change is saved through `PUT /api/characters/:id`. A newer copy on the server wins.
- **Fields:** name, level, class, alignment, element, playstyle, done and active quest/achievement nodes, saved builds (Fashionista URLs only), notes, profession levels, change history.

## Scanner (`/progression/scan`)
Code: `components/scan/ScanView.tsx`, `components/scan/ocr.ts`, `src/recognize.ts`.

**Since 2026-11-23** ([[2026-11-23 Scanner that saves quests and achievements]]):
- **Thresholded reading.** Each capture is thresholded (two Otsu levels: the second, on the bright side only, isolates the text) and upscaled to about 2000 px of height before the OCR. Before this, the row stripes of game lists made Tesseract skip most rows: 3 lines read out of 7 on a game-like list.
- **Saved at once** (switch, on by default): the whole line is exactly one game name that no other entry shares, with at most one stray 1–2 character token (an icon read as letters), read with OCR confidence ≥ 55 %, and at least two words or ten letters. It goes into the history and can be undone.
- **Pre-ticked** for one click: near-exact names (≥ 85 % for names of 15+ characters, ≥ 92 % otherwise).
- **Window sharing session.** Share the DOFUS window once, then « Lire maintenant », or automatic reading while you scroll the list in game. A new view is read only when the frame changes. It stops after 10 minutes, or with « Arrêter le partage ».
- « Voir le texte lu » shows what the OCR read from each capture.
- **Framing** (2026-11-23, after the owner reported that sharing did not really read the screen): the player drags a frame around the list on the live preview (`components/scan/FramePicker.tsx`). The frame is kept in this browser (`atlas:scan:region`).
  - Only the framed part is read. That is faster and cleaner: the whole window used to include the game scene and the chat.
  - Automatic reading ignores the moving scene outside the frame. A change counts when at least 0.4 % of a 200 px grey thumbnail changes by more than 24 levels.
  - A live status shows « Lecture… », then « Vue lue : N noms reconnus, M nouveaux, K enregistrés », and says to frame the list when nothing matched.
- **Real data seen:** on 2026-11-23 a capture by the owner saved 18 finished Incarnam quests (« Le village dans les nuages », « Mort au rat ! »…), all real quest names. Not checked against the game list itself.

**How it worked before** (verified in code, 2026-11-20):
1. The player picks an image, pastes one, or shares a window through the browser's own dialog (one frame, then sharing stops).
2. The image is decoded and read **in the browser** by tesseract.js in a Web Worker. It is never uploaded or stored.
3. The lines are matched to quest and achievement names (`src/recognize.ts`). Only near-perfect matches (≥ 0.9) are pre-ticked.
4. The player confirms; changes go into the history and can be undone.

**Limits:** 25 MB per file, 40 MP.

**Third party:** the tesseract worker, core and French model (≈ 2 MB) are downloaded from `cdn.jsdelivr.net` on first use, so the visitor's IP reaches jsDelivr. The privacy policy says so.

**Rules:** the site never touches the game client (no memory reading, packets or automation), per [[ADR-0004 Scanner reads screenshots locally]].

**Accuracy on real Dofus screenshots: still not measured (UNVERIFIED).** On game-like synthetic lists (E2E `e2e/scan.spec.ts`): 7/7 quest names found, at least 5 saved at once, the rest pre-ticked; achievements in compressed JPEG: every name found or proposed. Measuring it is a backlog item. Whether Ankama accepts screenshot reading is also unconfirmed (`docs/RAPPORT_SUCCES_SCAN.md` §2).
