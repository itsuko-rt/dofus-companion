import type { Metadata } from 'next';
import BuildsView from '../../../components/builds/BuildsView';

export const metadata: Metadata = { title: 'Builds · Atlas des Douze' };

export default function Page() {
  return <BuildsView />;
}
