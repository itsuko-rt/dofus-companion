import type { Metadata } from 'next';
import { ResetView } from '../../../components/account/AccountView';

export const metadata: Metadata = { title: 'Nouveau mot de passe', robots: { index: false } };
export default function Page() { return <ResetView />; }
