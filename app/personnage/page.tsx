import type { Metadata } from 'next';
import CharacterProfile from '../../components/character/CharacterProfile';

export const metadata: Metadata = { title: 'Mon personnage' };

export default function Page() {
  return <CharacterProfile />;
}
