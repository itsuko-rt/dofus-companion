# UI and UX guidelines

From `docs/DESIGN_SYSTEM.md` (rules section) and `docs/AUDIT_UX.md`.

- **Radii:** tags `rounded-sm`, controls and panels `rounded-md` (capped at 6–8 px).
- **Elevation:** none for panels; one shadow only, for floating layers (popovers, drawer, toasts).
- **Gradients:** only as a scrim over official artwork.
- **Motion:** colour transitions, the drawer's short rise, progress width. Nothing loops or lifts. `prefers-reduced-motion` turns it all off.
- **Icons:** lucide, one per meaning, always with text or an `aria-label`. No decorative icons.
- **Status:** never colour alone; icon + word (`STATUS` in `components/ui.tsx`).
- **Honesty in the UI:** missing data is shown as missing ("à vérifier en jeu", "butin ou achat"), never filled with guesses.
- **Accessibility:** one h1 per page (checked by E2E), keyboard-reachable navigation with a skip link, labels on every control.
- **Mobile:** layouts work at phone width (E2E runs a 375 px profile).
