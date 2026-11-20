import { appDb } from '../../../../src/server/appdb.ts';
import { Busy, busyResponse, deleteAccount, forgot, login, logout, me, register, reset } from '../../../../src/server/auth.ts';

export const dynamic = 'force-dynamic';

// No e-mail provider is configured yet. A reset link is a password-equivalent secret: it is printed only
// in local development; in production the log records that a request was made, without the link or the
// address (logs are often shipped to third parties and kept for months).
const deliver = (email: string, link: string) => {
  if (process.env.NODE_ENV !== 'production') console.info(`[password reset, dev only] ${email}: ${link}`);
  else console.warn('[password reset] requested, but no e-mail provider is configured: no link was sent');
};

export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  try { return await handle(req, ctx); } catch (e) { if (e instanceof Busy) return busyResponse(); throw e; }
}

async function handle(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const db = appDb();
  switch ((await params).action) {
    case 'register': return register(db, req);
    case 'login': return login(db, req);
    case 'logout': return logout(db, req);
    case 'forgot': return forgot(db, req, deliver);
    case 'reset': return reset(db, req);
    case 'delete': return deleteAccount(db, req);
    default: return Response.json({ error: 'not found' }, { status: 404 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== 'me') return Response.json({ error: 'not found' }, { status: 404 });
  return me(appDb(), req);
}
