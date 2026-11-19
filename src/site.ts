// Public address of the site, for canonical URLs, sitemap and social cards.
// Set NEXT_PUBLIC_SITE_URL at build time (e.g. https://atlasdesdouze.fr); localhost until a domain exists.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** URL-safe slug from a French name: "Île de Frigost" → "ile-de-frigost". */
export const slugify = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
