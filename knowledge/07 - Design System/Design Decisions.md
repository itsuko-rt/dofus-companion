# Design decisions

| Date | Decision | Why | Source |
|---|---|---|---|
| 2026-11-19 | Navigation regrouped: Accueil · Progression (Quêtes / Succès / Dofus) · Builds · Équipement · Personnages · Compte (Cartes and Métiers added later) | Many sections without a crowded menu | `docs/RAPPORT_DEVELOPPEMENT.md` §2 |
| 2026-11-19 | "Monde des Douze" visual redesign | Feel of the game's own site | `docs/RAPPORT_REFONTE_VISUELLE.md` |
| 2026-11-19 | Emerald Egg replaces the golden egg | Distinct mark | commit `f558185` |
| 2026-11-19 | Restraint pass: flat panels, one elevation, no glassmorphism, no hover lifts, purposeful icons | Remove "AI-slop" decoration | `docs/DESIGN_SYSTEM.md` |
| 2026-11-19 | Item rarity not shown | Dofus 3 data defines none | `docs/RAPPORT_DEVELOPPEMENT.md` §2 |
| 2026-11-20 | `/carte` is a simple two-card directory, monograms instead of logos | External tools; no copying of branding | [[ADR-0005 Remove the in-site map]] |
| 2026-11-21 | Succès opens on "Pour vous"; the 15 game root categories are grouped in 3 families (main progression first, Temporis and events apart); 5 card states with icon + label (Obtenu, À confirmer, En cours, À faire, Plus tard); a category picker on mobile instead of a sidebar | First-time players did not know where to start, and Temporis (754 achievements of a seasonal server) weighed as much as the main progression | [[2026-11-21 Achievements redesign]] |
| 2026-11-21 | Succès entries are compact dark rows with a category emblem; parchment is kept for the selected achievement's sheet (side panel from 1280 px, inline below); header dashboard instead of the page banner | The owner found the parchment cards repetitive and spreadsheet-like; the game data has no achievement icons | [[2026-11-21 Achievements visual redesign]] |
| 2026-11-21 | Succès points tiers (0–5 plain, 10 bronze, 20–30 silver, 40+ gold) and a medallion ring filled by objectives met | Distinct, data-backed identity per entry without inventing icons; tiers follow the game's own point values | [[2026-11-21 Achievements refinement]] |
