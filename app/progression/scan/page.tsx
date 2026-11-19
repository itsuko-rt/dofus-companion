import type { Metadata } from 'next';
import ScanView from '../../../components/scan/ScanView';

export const metadata: Metadata = { title: 'Scanner ma progression' };
export default function Page() {
  return <ScanView />;
}
