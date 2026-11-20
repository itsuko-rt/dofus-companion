'use client';
import type { IngredientSource } from '../../src/professions-shared.ts';
import SourceLabel from '../professions/SourceLabel';
import { useEffect, useState } from 'react';
import { Search, Shirt } from 'lucide-react';
import { useCharacter } from '../useCharacter';
import { Card, EmptyState, PageHero, SECTION } from '../ui';

interface ItemRow { id: number; name: string; type: string; level: number; setName: string | null; effects: string[]; obtain: IngredientSource; ingredients: { qty: number; name: string }[] }

export default function EquipmentView({ types }: { types: { id: number; name: string; count: number }[] }) {
  const ch = useCharacter();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [mine, setMine] = useState(true);
  const [items, setItems] = useState<ItemRow[] | null>(null);
  const level = ch.character.level;

  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (type) p.set('type', type);
    if (mine) p.set('max', String(level));
    const t = setTimeout(() => {
      setItems(null);
      fetch(`/api/items/search?${p}`).then((r) => r.json()).then((d) => setItems(d.items ?? []), () => setItems([]));
    }, 250); // debounce typing
    return () => clearTimeout(t);
  }, [q, type, mine, level]);

  return (
    <div className="h-full overflow-y-auto">
      <PageHero color={SECTION.builds} kicker="Encyclopédie" title="Équipement">
        <p className="text-sm text-white/80">Tous les objets équipables du jeu, avec leurs effets officiels.</p>
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Rechercher un objet</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom d’un objet…" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm" />
          </label>
          <select aria-label="Type d’objet" value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <option value="">Tous les types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.count})</option>)}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[var(--color-accent)]" />
            Portable à mon niveau ({level})
          </label>
        </div>
        {items === null ? <p className="mt-6 text-sm text-muted">Recherche…</p> : items.length === 0 ? (
          <div className="mt-6"><EmptyState title="Aucun objet ne correspond">Changez le nom, le type ou décochez le filtre de niveau.</EmptyState></div>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted">{items.length >= 60 ? '60 premiers résultats, du plus haut niveau au plus bas : affinez la recherche pour en voir d’autres.' : `${items.length} résultat(s)`}</p>
            <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <li key={it.id}>
                  <Card className="h-full p-3">
                    <h2 className="font-medium leading-snug">{it.name}</h2>
                    <p className="text-xs text-muted">{it.type} · niveau {it.level}{it.setName ? ` · ${it.setName}` : ''}</p>
                    <ul className="mt-2 grid gap-0.5 text-[13px] text-text">{it.effects.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}</ul>
                    {(it.obtain.kind !== 'other' || it.obtain.drops.length > 0) && (
                      <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
                        <span className="font-semibold text-text">Obtention :</span> {it.obtain.kind === 'crafted' ? 'fabriqué par ' : it.obtain.kind === 'gathered' ? 'récolté par ' : ''}<SourceLabel source={it.obtain} />
                        {it.ingredients.length > 0 && <span className="block text-faint">{it.ingredients.map((g) => `${g.qty} × ${g.name}`).join(', ')}</span>}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-6 text-xs text-faint">Les données du jeu ne définissent pas de « rareté » pour les objets de Dofus 3 : aucune n’est affichée.</p>
      </div>
    </div>
  );
}
