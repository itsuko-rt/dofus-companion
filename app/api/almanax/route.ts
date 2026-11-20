import { latestDb, loadAlmanax } from '../../../src/load.ts';

// The calendar only changes on re-import: built once and served as a static file.
export const dynamic = 'force-static';

export function GET() {
  const db = latestDb();
  const entries = db ? loadAlmanax(db) : null;
  if (!entries) return Response.json({ error: 'données absentes : lancez `npm run import`' }, { status: 503 });
  return Response.json({ entries });
}
