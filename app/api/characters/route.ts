import { appDb } from '../../../src/server/appdb.ts';
import { listCharacters } from '../../../src/server/auth.ts';

export const dynamic = 'force-dynamic';
export function GET(req: Request) { return listCharacters(appDb(), req); }
