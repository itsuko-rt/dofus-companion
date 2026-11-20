# Visual identity

Source: `docs/DESIGN_SYSTEM.md`, `docs/RAPPORT_REFONTE_VISUELLE.md`, `app/globals.css`.

- **Goal:** look like a carefully made DOFUS companion, not a generic fantasy dashboard. Every visual element has a job.
- **Mark:** the Emerald Egg. Sources are in `brand/`: the master artwork for 96 px and up (nav logo, app and manifest icons), and a simplified SVG (egg, ten-ray sun, gold ring) for the 16–48 px tab icons and `public/favicon.svg` (since 2026-11-20; before, only 16 px used it). All icons are made by `node scripts/make-icons.ts`.
- **Colours:** warm night browns (`bg`, `surface`, `surface-2`, `line`), parchment for reading content, green `cta` only for a screen's main action, gold `accent` for "available now". Each section has its own hue (`--color-sec-*`), used on the page band and its underline only. Class colours: Crâ green, Pandawa ochre.
- **Type:** Rowdies for page titles, section titles, navigation and primary buttons; Roboto for the rest.
- **Artwork:** official class art from local copies only (© Ankama, not committed).

Related: [[UI UX Guidelines]] · [[Design Decisions]].
