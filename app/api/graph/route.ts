import { latestDb, loadGraphData } from '../../../src/load.ts';

// Game data only changes on re-import: build it once, serve it as a static file.
export const dynamic = 'force-static';

export function GET() {
  const db = latestDb();
  if (!db) return Response.json({ error: 'no game database, run `npm run import`' }, { status: 503 });
  return Response.json(loadGraphData(db));
}
