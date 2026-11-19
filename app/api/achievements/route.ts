import { latestDb, loadAchievements } from '../../../src/load.ts';

export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const ids = (new URL(req.url).searchParams.get('categories') ?? '').split(',').map(Number).filter(Number.isInteger);
  return Response.json({ achievements: loadAchievements(db, ids) }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
