import type { MetadataRoute } from 'next';
import { SUPPORTED_BREEDS } from '../components/breeds';
import { dofusSlugs, guideContext, regions } from '../src/guides-data.ts';
import { SITE_URL } from '../src/site.ts';
import { latestDb } from '../src/load.ts';
import { loadJobs } from '../src/world.ts';

// Only pages with real content: guides, tools, class pages. Account and profile pages are left out (noindex).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const c = guideContext();
  const url = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') =>
    ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });
  const rs = c ? regions(c) : [];
  const db = latestDb();
  const jobs = db ? loadJobs(db) ?? [] : [];
  return [
    url('/', 1, 'daily'),
    url('/guides', 0.9), url('/guides/quetes', 0.9), url('/guides/dofus', 0.9),
    url('/progression/quetes', 0.8), url('/progression/succes', 0.8), url('/progression/dofus', 0.7),
    url('/carte', 0.8), url('/metiers', 0.8), ...jobs.map((j) => url(`/metiers/${j.slug}`, 0.7)),
    url('/builds', 0.8, 'daily'), url('/equipement', 0.6), url('/personnage/sorts', 0.7), url('/progression/scan', 0.5),
    ...SUPPORTED_BREEDS.map((b) => url(`/personnage/sorts/${b.slug}`, 0.7)),
    ...rs.map((r) => url(`/guides/quetes/${r.slug}`, 0.7)),
    ...rs.map((r) => url(`/progression/quetes/${r.slug}`, 0.5)),
    ...(c ? [...dofusSlugs(c.dofus).values()].map((s) => url(`/guides/dofus/${s}`, 0.7)) : []),
    url('/a-propos', 0.3, 'monthly'), url('/confidentialite', 0.2, 'monthly'), url('/mentions-legales', 0.1, 'monthly'),
  ];
}
