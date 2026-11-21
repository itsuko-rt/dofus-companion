import { latestDb } from '../../../src/load.ts';
import { computeAtelier, parseLines } from '../../../src/atelier.ts';

// ?lines=8463:2,44:10[&sub=1]: resources (and intermediate crafts with sub=1) for that list, from the game's recipes
export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const p = new URL(req.url).searchParams;
  const lines = parseLines((p.get('lines') ?? '').slice(0, 2000));
  return Response.json(computeAtelier(db, lines, p.get('sub') === '1'), { headers: { 'cache-control': 'public, max-age=3600' } });
}
