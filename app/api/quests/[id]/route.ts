import { latestDb, loadQuestDetails } from '../../../../src/load.ts';

// Game data only changes on re-import: responses can be cached by the browser for an hour.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente' }, { status: 503 });
  const details = loadQuestDetails(db, Number((await params).id));
  if (!details) return Response.json({ error: 'quête inconnue' }, { status: 404 });
  return Response.json(details, { headers: { 'cache-control': 'public, max-age=3600' } });
}
