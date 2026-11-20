---
type: adr
status: accepted
date: 2026-11-19
---
# ADR-0004 Scanner reads screenshots locally

## Context
There is no official API for personal progress. Real-time sync would require reading the client's memory, capturing packets or injecting code, all sanctioned by Ankama.

## Decision
- Assisted scanning: the player provides a screenshot or window capture, OCR runs in the browser (tesseract.js), and the player confirms before anything is saved.
- Nothing is uploaded, and the game client is never touched.

## Consequences
- Privacy-friendly; works without an account.
- Accuracy depends on screenshot quality and is **not yet measured**.
- The tesseract model comes from jsDelivr (a third party).
- Whether Ankama accepts screenshot reading is unconfirmed.

Source: `docs/RAPPORT_SUCCES_SCAN.md`.
