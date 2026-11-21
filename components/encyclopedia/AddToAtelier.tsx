'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, ListPlus } from 'lucide-react';
import { useCharacter } from '../useCharacter';
import { useAtelier } from './atelier-store';

/** "Ajouter à l'atelier" on an item sheet: one more of this craft in the active character's list. */
export default function AddToAtelier({ id, name }: { id: number; name: string }) {
  const ch = useCharacter();
  const { add } = useAtelier(ch.character.id);
  const [added, setAdded] = useState(false);
  return added ? (
    <span className="inline-flex items-center gap-1 text-done" role="status"><Check size={13} aria-hidden /> Ajouté · <Link href="/metiers/atelier" className="underline underline-offset-2">voir l’atelier</Link></span>
  ) : (
    <button onClick={() => { add(id); setAdded(true); }} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent/60 hover:text-text"
      aria-label={`Ajouter « ${name} » à l’atelier`}>
      <ListPlus size={13} aria-hidden /> Ajouter à l’atelier
    </button>
  );
}
