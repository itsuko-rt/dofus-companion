import { latestDb, loadHeadingNames } from '../../../../src/load.ts';

// Game data only (category, area and subarea names), for the Windows companion's evidence rules. Built once.
export const dynamic = 'force-static';

export function GET() {
  const db = latestDb();
  if (!db) return Response.json({ error: 'no game database, run `npm run import`' }, { status: 503 });
  return Response.json(loadHeadingNames(db));
}
