import { latestDb, loadAchievements, loadAchievementsByIds } from '../../../src/load.ts';

// ?categories=1,2 (a category page) or ?ids=10,11 (recommendations, deep links)
export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const p = new URL(req.url).searchParams;
  const list = (k: string) => [...new Set((p.get(k) ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  // bounded: an unbounded id list would exceed SQLite's parameter limit (500 error) and waste work
  const achievements = p.has('ids') ? loadAchievementsByIds(db, list('ids').slice(0, 100)) : loadAchievements(db, list('categories').slice(0, 200));
  return Response.json({ achievements }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
