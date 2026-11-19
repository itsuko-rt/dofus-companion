import type { MetadataRoute } from 'next';
import { SITE_URL } from '../src/site.ts';

// Everything public is crawlable (AI crawlers included: no special rule, no promise either).
// Only the JSON API is blocked; account and profile pages carry "noindex" instead (a robots.txt
// block would stop crawlers from ever reading that noindex).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
