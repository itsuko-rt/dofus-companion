import { latestDb } from '../../../../src/load.ts';
import { searchEncyclopedia, type EncyKind } from '../../../../src/encyclopedia.ts';

const KINDS = new Set<EncyKind>(['item', 'monster', 'dungeon', 'zone', 'set']);
// ?q=<text>[&kind=monster]: encyclopaedia sheets whose name contains every word (accents ignored), at most 30
export function GET(req: Request) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const p = new URL(req.url).searchParams;
  const q = (p.get('q') ?? '').trim().slice(0, 80);
  const kind = p.get('kind') as EncyKind | null;
  if (kind && !KINDS.has(kind)) return Response.json({ error: 'type inconnu' }, { status: 400 });
  return Response.json({ results: q.length >= 2 ? searchEncyclopedia(db, q, kind ? [kind] : undefined) : [] },
    { headers: { 'cache-control': 'public, max-age=3600' } });
}
