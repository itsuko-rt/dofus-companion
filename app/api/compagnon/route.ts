import { listGuides, loadGuide } from '../../../src/companion.ts';

// without parameters: the guides (Dofus quest chains) available; ?guide=<slug>: that guide's steps
export function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('guide');
  const headers = { 'cache-control': 'public, max-age=3600' };
  if (!slug) return Response.json({ guides: listGuides() }, { headers });
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return Response.json({ error: 'guide inconnu' }, { status: 400 });
  const g = loadGuide(slug);
  return g ? Response.json(g, { headers }) : Response.json({ error: 'guide inconnu' }, { status: 404 });
}
