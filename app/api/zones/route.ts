import { latestDb } from '../../../src/load.ts';
import { loadZoneData } from '../../../src/zones.ts';

// Game data only changes on re-import: built once, served as a static file (like /api/graph).
export const dynamic = 'force-static';

export function GET() {
  const db = latestDb();
  const data = db ? loadZoneData(db) : null;
  if (!data) return Response.json({ error: 'données absentes : lancez `npm run import`' }, { status: 503 });
  return Response.json(data);
}
