'use client';
import Link from 'next/link';
import { Pin, PinOff } from 'lucide-react';
import { useCharacter } from '../useCharacter';
import { useCompanion } from './companion-store';

/** Pins an achievement to the companion window (per character), to follow its objectives over the game. */
export default function PinButton({ id, name }: { id: number; name: string }) {
  const ch = useCharacter();
  const { state, togglePin } = useCompanion(ch.character.id);
  const pinned = state.pins.includes(id);
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <button onClick={() => togglePin(id)} aria-pressed={pinned} aria-label={pinned ? `Retirer « ${name} » du compagnon` : `Épingler « ${name} » au compagnon`}
        className={`inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline ${pinned ? 'text-done' : 'text-accent'}`}>
        {pinned ? <PinOff size={13} aria-hidden /> : <Pin size={13} aria-hidden />}{pinned ? 'Épinglé au compagnon' : 'Épingler au compagnon'}
      </button>
      {pinned && <Link href="/compagnon" className="text-faint hover:text-text hover:underline">ouvrir</Link>}
    </span>
  );
}
