// Classes shipped in the first release (fashionista = class name in the Fashionista API); adding one = adding a line (its data is already imported).
// Title and roles as shown on the official class pages (dofus.com/fr/mmorpg/encyclopedie/classes).
// Artwork paths point to the local copies made by scripts/fetch-assets.ts (© Ankama, not committed).
export const SUPPORTED_BREEDS = [
  {
    id: 9, name: 'Crâ', title: 'Archer', fashionista: 'Cra', color: 'text-class-cra bg-class-cra/15', hue: 'var(--color-class-cra)',
    blurb: 'Archer à distance : 44 sorts, 22 emplacements à 2 variantes.',
    roles: ['Dégâts', 'Entrave', 'Amélioration'],
    art: { scene: '/ankama/breeds/bg9.jpg', portrait: '/ankama/breeds/avatar9.jpg' },
  },
  {
    id: 12, name: 'Pandawa', title: 'Bagarreur assoiffé', fashionista: 'Pandawa', color: 'text-class-pandawa bg-class-pandawa/15', hue: 'var(--color-class-pandawa)',
    blurb: 'Bagarreur : états Sobre / Saoul, porter et lancer, Tonneau.',
    roles: ['Placement', 'Dégâts', 'Tank'],
    art: { scene: '/ankama/breeds/bg12.jpg', portrait: '/ankama/breeds/avatar12.jpg' },
  },
];
