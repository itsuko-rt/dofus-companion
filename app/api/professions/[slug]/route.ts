import { latestDb } from '../../../../src/load.ts';
import { loadJob } from '../../../../src/professions.ts';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const slug = (await params).slug;
  const job = /^[a-z-]{2,40}$/.test(slug) ? loadJob(db, slug) : null;
  if (!job) return Response.json({ error: 'métier inconnu' }, { status: 404 });
  return Response.json(job, { headers: { 'cache-control': 'public, max-age=3600' } });
}
