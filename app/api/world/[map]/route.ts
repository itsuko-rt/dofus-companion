import { latestDb } from '../../../../src/load.ts';
import { loadWorld } from '../../../../src/world.ts';

// Game data only changes on re-import: the browser may keep it an hour.
export async function GET(_req: Request, { params }: { params: Promise<{ map: string }> }) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const id = Number((await params).map);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: 'carte inconnue' }, { status: 404 });
  const world = loadWorld(db, id);
  if (!world) return Response.json({ error: 'carte inconnue (lancez scripts/world-import.ts si la base est ancienne)' }, { status: 404 });
  return Response.json(world, { headers: { 'cache-control': 'public, max-age=3600' } });
}
