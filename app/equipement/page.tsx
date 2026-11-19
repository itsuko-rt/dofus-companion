import type { Metadata } from 'next';
import { latestDb, loadEquipmentTypes } from '../../src/load.ts';
import EquipmentView from '../../components/equipment/EquipmentView';

export const metadata: Metadata = { title: 'Équipement' };
export default function Page() {
  const db = latestDb();
  return <EquipmentView types={db ? loadEquipmentTypes(db) : []} />;
}
