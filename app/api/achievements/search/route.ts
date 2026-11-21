import { latestDb, loadAchievementsByIds, searchAchievements } from '../../../../src/load.ts';

// ?q=<text>: achievements matching by name, dungeon, objective (monster, quest, place), category or description,
// each with what matched, plus the full achievement rows so results open in place.
export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80);
  const hits = q.length >= 2 ? searchAchievements(db, q) : [];
  const rows = new Map(loadAchievementsByIds(db, hits.map((h) => h.id)).map((a) => [a.id, a]));
  return Response.json({ results: hits.filter((h) => rows.has(h.id)).map((h) => ({ ...h, achievement: rows.get(h.id)! })) },
    { headers: { 'cache-control': 'public, max-age=3600' } });
}
