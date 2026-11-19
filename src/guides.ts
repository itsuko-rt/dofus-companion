// External quest guides. Dofus Pour Les Noobs page URLs come from its public sitemap
// (allowed by its robots.txt); a quest gets a link only when a page title matches its name exactly.
// We only link: no page content is fetched or copied (DPLN terms forbid reproduction).

const ENTITY = /(a|e|i|o|u|y|c|n)(grave|acute|circ|uml|cedil|tilde)/g;

/** Normalised words of a quest name: lowercase, accents removed, punctuation dropped. */
export function nameKey(name: string): string {
  return name
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Same key from a DPLN (Weebly) page slug: "au-delagrave-du-mur" → "au dela du mur".
 * Accented letters are written as HTML entity names in their slugs.
 */
export function slugKey(slug: string): string {
  return slug.toLowerCase().replace(/\.html$/, '').replace(ENTITY, '$1').replace(/oelig/g, 'oe')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

export interface GuideMatch { questId: number; url: string }

/** Exact title matches only; an ambiguous key (several pages) gives no link rather than a guess. */
export function matchGuides(quests: { id: number; name: string }[], urls: string[]): GuideMatch[] {
  const byKey = new Map<string, string[]>();
  for (const url of urls) {
    const slug = url.split('/').pop() ?? '';
    const k = slugKey(slug);
    if (k) byKey.set(k, [...(byKey.get(k) ?? []), url]);
  }
  const out: GuideMatch[] = [];
  for (const q of quests) {
    const hits = byKey.get(nameKey(q.name));
    if (hits?.length === 1) out.push({ questId: q.id, url: hits[0] });
  }
  return out;
}
