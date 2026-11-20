// The 19 playable classes. Name, title, roles, complexity and summary come from the game files
// (src/breed-data.json, written by scripts/creatures-import.ts); only presentation lives here.
// fashionista = class name in the Dofus Fashionista API (each checked against its tier list on 2026-11-20).
// Artwork paths point to the local copies made by scripts/fetch-assets.ts (© Ankama, not committed); a missing file hides itself.
import data from '../src/breed-data.json' with { type: 'json' };

const PRESENTATION: Record<number, { fashionista: string; hue: string }> = {
  1: { fashionista: 'Feca', hue: '#c9a227' },
  2: { fashionista: 'Osamodas', hue: '#4f8f5f' },
  3: { fashionista: 'Enutrof', hue: '#b08a3e' },
  4: { fashionista: 'Sram', hue: '#8a8fa3' },
  5: { fashionista: 'Xelor', hue: '#4b6fb3' },
  6: { fashionista: 'Ecaflip', hue: '#d08a3a' },
  7: { fashionista: 'Eniripsa', hue: '#d06a9a' },
  8: { fashionista: 'Iop', hue: '#d0533a' },
  9: { fashionista: 'Cra', hue: 'var(--color-class-cra)' },
  10: { fashionista: 'Sadida', hue: '#5f9a3a' },
  11: { fashionista: 'Sacrier', hue: '#b0303a' },
  12: { fashionista: 'Pandawa', hue: 'var(--color-class-pandawa)' },
  13: { fashionista: 'Rogue', hue: '#7a6a5a' },
  14: { fashionista: 'Masqueraider', hue: '#8a5ab0' },
  15: { fashionista: 'Foggernaut', hue: '#3a8a9a' },
  16: { fashionista: 'Eliotrope', hue: '#3aa0b0' },
  17: { fashionista: 'Huppermage', hue: '#6a7ad0' },
  18: { fashionista: 'Ouginak', hue: '#a06a3a' },
  20: { fashionista: 'Forgelance', hue: '#9a9a6a' },
};

const slugOf = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const SUPPORTED_BREEDS = data.map((b) => ({
  id: b.id, slug: slugOf(b.name), name: b.name, title: b.title ?? b.name, roles: b.roles, complexity: b.complexity,
  blurb: b.summary ?? '',
  fashionista: PRESENTATION[b.id]?.fashionista ?? null,
  hue: PRESENTATION[b.id]?.hue ?? 'var(--color-sec-characters)',
  art: { scene: `/ankama/breeds/bg${b.id}.jpg`, portrait: `/ankama/breeds/avatar${b.id}.jpg` },
}));
export type Breed = (typeof SUPPORTED_BREEDS)[number];
