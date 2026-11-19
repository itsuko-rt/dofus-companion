// Page metadata in one place: title, description, canonical URL, social cards, indexing.
import type { Metadata } from 'next';
import { BRAND } from './brand.ts';
import { SITE_URL } from './site.ts';

export function pageMeta({ title, description, path, noindex }: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  return {
    title, description,
    alternates: { canonical: path },
    // Next replaces openGraph as a whole per page, so the shared fields are repeated here
    openGraph: {
      type: 'website', locale: 'fr_FR', siteName: BRAND.name, url: path, title: `${title} · ${BRAND.name}`, description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: BRAND.name }],
    },
    twitter: { card: 'summary_large_image', title: `${title} · ${BRAND.name}`, description, images: ['/og-image.png'] },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** schema.org BreadcrumbList for a trail of [name, path]. */
export const breadcrumbLd = (trail: [string, string][]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE_URL}${path}` })),
});
