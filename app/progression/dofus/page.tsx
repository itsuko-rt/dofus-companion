import type { Metadata } from 'next';
import { latestDb, loadDofus } from '../../../src/load.ts';
import DofusView from '../../../components/progression/DofusView';

export const metadata: Metadata = { title: 'Dofus' };
export default function Page() {
  const db = latestDb();
  return <DofusView dofus={db ? loadDofus(db) : []} />;
}
