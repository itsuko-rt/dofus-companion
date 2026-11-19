import type { Metadata } from 'next';
import { pageMeta } from '../../src/seo.ts';
import CharacterProfile from '../../components/character/CharacterProfile';

export const metadata: Metadata = pageMeta({ title: 'Mon personnage', description: 'Profils de personnages, progression et sauvegarde.', path: '/personnage', noindex: true });

export default function Page() {
  return <CharacterProfile />;
}
