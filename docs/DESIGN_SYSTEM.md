# Design system

Goal: look like a carefully made DOFUS companion, not a generic fantasy dashboard. Every visual element has a job.

## Audit (2026-11-19): what was removed and why

| Found | Problem | Now |
|---|---|---|
| Nav logo "12" in a green diamond | Leftover from the golden-egg era, did not match the favicon | Emerald Egg image (`/favicon-96x96.png`) |
| Amber radial glow over the whole page | Decorative light with no meaning | Only the faint parchment grain remains |
| Page heroes: two stacked gradients, double text glow | Generic "epic banner" | Dark band tinted with the section colour, 2 px underline in that colour; one scrim only when official artwork is shown, 1 px title shadow |
| Diamonds with gradient, inner highlight and drop shadow | Glossy, plastic | Flat fill, 1 px dark border |
| Cards, nodes, buttons each with their own shadow | Everything floated | Flat panels; shadows only on layers above the page (popovers, drawer, toasts) |
| Glass panels (`backdrop-blur`) on home gauges and quest help | Glassmorphism | Opaque panels |
| Hover lifts (`-translate-y`) and image zoom | Motion for its own sake | Border colour change only |
| Gradient progress bars | Decoration | Flat green fill |
| `Sparkles` icons on "almost done", "unlocked", "create a build", "recommended regions" | Magic decoration | Icons that say what it is: Hourglass, Unlock, Wrench, MapPin |
| Rounded pills everywhere, 12 px radii | Web-app look | Square-ish tags (2 px), panels 6–8 px, like the game's windows |
| 2 777 achievements as separate floating parchment cards | Noisy, slow to scan | One journal page with ruled rows; obtained rows get a green left rule |
| Achievement totals repeated ("2777 succès", "2777 restants") | Redundant numbers | "obtenus sur 2777", à confirmer, en cours, points |

## Rules

- **Colour**: warm night browns (`bg`, `surface`, `surface-2`, `line`), parchment for reading content (journal, quest sheet), green `cta` only for the main action of a screen, gold `accent` for "available now". Each section keeps its hue (`--color-sec-*`), used for the page band and its underline, never as a full-page fill.
- **Type**: Rowdies (display) for page titles, section titles, navigation and primary buttons; Roboto for everything else. Uppercase for page titles, nav and primary buttons only.
- **Radii**: tags `rounded-sm`, controls and panels `rounded-md` (the `lg/xl/2xl` scale is capped at 6–8 px in `globals.css`).
- **Elevation**: none for panels. `shadow-lg/xl/2xl` all resolve to one shadow, for floating layers only.
- **Gradients**: only as the scrim that keeps text legible over official artwork.
- **Motion**: colour transitions, the drawer's short rise, progress width. Nothing loops, nothing lifts. `prefers-reduced-motion` turns it all off.
- **Icons**: lucide, one per meaning, always next to text or with an `aria-label`. No decorative icons.
- **Status**: never colour alone; icon + word (`STATUS` in `components/ui.tsx`).
- **Artwork**: official class art from local copies only (see `scripts/fetch-assets.ts`), on heroes and class cards; the site's own mark is the Emerald Egg.
