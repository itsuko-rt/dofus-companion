import { latestDb, searchItems } from '../../../../src/load.ts';

export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const p = new URL(req.url).searchParams;
  const num = (k: string) => { const v = Number(p.get(k)); return Number.isInteger(v) && v > 0 ? v : undefined; };
  const items = searchItems(db, { q: p.get('q')?.trim() || undefined, type: num('type'), min: num('min'), max: num('max') });
  return Response.json({ items }, { headers: { 'cache-control': 'public, max-age=3600' } });
}
