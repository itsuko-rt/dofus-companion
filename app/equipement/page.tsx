import type { Metadata } from 'next';
import { pageMeta } from '../../src/seo.ts';
import { latestDb, loadEquipmentTypes } from '../../src/load.ts';
import EquipmentView from '../../components/equipment/EquipmentView';

export const metadata: Metadata = pageMeta({ title: 'Équipement', description: 'Encyclopédie des objets équipables de DOFUS : recherche par nom, type et niveau, avec les effets officiels du jeu.', path: '/equipement' });
export default function Page() {
  const db = latestDb();
  return <EquipmentView types={db ? loadEquipmentTypes(db) : []} />;
}
