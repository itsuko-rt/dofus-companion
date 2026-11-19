import type { Metadata } from 'next';
import CharacterProfile from '../../components/character/CharacterProfile';

export const metadata: Metadata = { title: 'Mon personnage · Atlas des Douze' };

export default function Page() {
  return <CharacterProfile />;
}
