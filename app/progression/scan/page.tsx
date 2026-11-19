import type { Metadata } from 'next';
import { pageMeta } from '../../../src/seo.ts';
import ScanView from '../../../components/scan/ScanView';

export const metadata: Metadata = pageMeta({ title: 'Scanner ma progression', description: "Mettez à jour votre progression DOFUS à partir d'une capture d'écran, lue dans votre navigateur.", path: '/progression/scan' });
export default function Page() {
  return <ScanView />;
}
