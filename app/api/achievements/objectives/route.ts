import { latestDb, loadObjectiveIndex } from '../../../../src/load.ts';

// achievement id → [objective id, official condition][]: static like /api/graph
export const dynamic = 'force-static';

export function GET() {
  const db = latestDb();
  if (!db) return Response.json({ error: 'no game database, run `npm run import`' }, { status: 503 });
  return Response.json(loadObjectiveIndex(db));
}
