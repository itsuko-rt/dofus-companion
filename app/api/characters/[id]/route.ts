import { appDb } from '../../../../src/server/appdb.ts';
import { deleteCharacter, saveCharacter } from '../../../../src/server/auth.ts';

export const dynamic = 'force-dynamic';
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) { return saveCharacter(appDb(), req, (await params).id); }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) { return deleteCharacter(appDb(), req, (await params).id); }
