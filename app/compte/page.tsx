import type { Metadata } from 'next';
import { pageMeta } from '../../src/seo.ts';
import AccountView from '../../components/account/AccountView';

export const metadata: Metadata = pageMeta({ title: 'Mon compte', description: 'Connexion et synchronisation de vos personnages sur Atlas des Douze.', path: '/compte', noindex: true });
export default function Page() { return <AccountView />; }
