import { appDb } from '../../../../src/server/appdb.ts';
import { forgot, login, logout, me, register, reset } from '../../../../src/server/auth.ts';

export const dynamic = 'force-dynamic';

// No e-mail provider is configured yet: reset links are written to the server log.
const deliver = (email: string, link: string) => console.info(`[password reset] ${email}: ${link}`);

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const db = appDb();
  switch ((await params).action) {
    case 'register': return register(db, req);
    case 'login': return login(db, req);
    case 'logout': return logout(db, req);
    case 'forgot': return forgot(db, req, deliver);
    case 'reset': return reset(db, req);
    default: return Response.json({ error: 'not found' }, { status: 404 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== 'me') return Response.json({ error: 'not found' }, { status: 404 });
  return me(appDb(), req);
}
