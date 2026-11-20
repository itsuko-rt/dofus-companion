import { latestDb, loadAchievements } from '../../../src/load.ts';

export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const ids = (new URL(req.url).searchParams.get('categories') ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  // bounded: an unbounded id list would exceed SQLite's parameter limit (500 error) and waste work
  const wanted = [...new Set(ids)].slice(0, 200);
  return Response.json({ achievements: loadAchievements(db, wanted) }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
