'use client';
// One search over items, monsters, dungeons, zones and sets (names, accents ignored), keyboard friendly.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Search, X } from 'lucide-react';
import { KIND_LABEL, type EncyKind, type SearchEntry } from '../../src/encyclopedia-shared.ts';
import { KIND_ICON } from './icons';

const KINDS: (EncyKind | 'all')[] = ['all', 'monster', 'item', 'dungeon', 'zone', 'set'];
const cache = new Map<string, Promise<SearchEntry[]>>();
export const searchEncy = (q: string, kind: EncyKind | 'all') => {
  const key = `${kind}:${q}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/api/encyclopedie/search?q=${encodeURIComponent(q)}${kind === 'all' ? '' : `&kind=${kind}`}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText)))).then((d: { results: SearchEntry[] }) => d.results);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
};

export default function EncyclopediaSearch({ autoFocus, compact, onPick, only, placeholder }: {
  autoFocus?: boolean; compact?: boolean; onPick?: (e: SearchEntry) => void;
  /** search one kind only (the atelier adds items) */
  only?: EncyKind; placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<EncyKind | 'all'>(only ?? 'all');
  const [res, setRes] = useState<{ q: string; hits: SearchEntry[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(0);
  const listId = useId();
  const query = q.trim();
  useEffect(() => {
    if (query.length < 2) { setRes(null); return; }
    let live = true;
    setFailed(false);
    const t = setTimeout(() => searchEncy(query, kind).then((hits) => { if (live) { setRes({ q: query, hits }); setSel(0); } }, () => live && setFailed(true)), 180);
    return () => { live = false; clearTimeout(t); };
  }, [query, kind]);
  const hits = res?.hits ?? [];
  const pick = (e: SearchEntry) => { if (onPick) { onPick(e); setQ(''); } else router.push(e.href); };

  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <span className="sr-only">Rechercher dans l’encyclopédie</span>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} type="search" role="combobox" aria-expanded={hits.length > 0} aria-controls={listId}
          aria-activedescendant={hits.length ? `${listId}-${sel}` : undefined} placeholder={placeholder ?? 'Monstre, objet, donjon, zone…'}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            else if (e.key === 'Enter' && hits[sel]) { e.preventDefault(); pick(hits[sel]); }
            else if (e.key === 'Escape') setQ('');
          }}
          className={`w-full rounded-md border border-line bg-bg/60 pl-9 pr-9 text-sm transition-colors placeholder:text-faint hover:border-faint focus:border-accent [&::-webkit-search-cancel-button]:appearance-none ${compact ? 'py-1.5' : 'py-2.5'}`} />
        {q && <button onClick={() => setQ('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-faint hover:text-text"><X size={15} aria-hidden /></button>}
      </label>
      {!compact && !only && (
        <div role="group" aria-label="Type de fiche" className="flex flex-wrap gap-1">
          {KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${kind === k ? 'border-accent/70 bg-accent/15 text-text' : 'border-line text-muted hover:text-text'}`}>
              {k === 'all' ? 'Tout' : `${KIND_LABEL[k]}s`}
            </button>
          ))}
        </div>
      )}
      {failed ? <p className="text-sm text-check" role="alert">La recherche n’a pas pu aboutir. Réessayez.</p>
        : query.length >= 2 && res && (
          <div aria-live="polite">
            {hits.length === 0 ? <p className="px-1 text-sm text-muted">Aucune fiche pour « {res.q} ».</p> : (
              <ul id={listId} role="listbox" aria-label="Résultats" className={`divide-y divide-line/60 overflow-hidden rounded-lg border border-line/80 bg-surface/80 ${res.q !== query ? 'opacity-60' : ''}`}>
                {hits.map((h, i) => {
                  const I = KIND_ICON[h.kind];
                  return (
                    <li key={`${h.kind}-${h.id}`} id={`${listId}-${i}`} role="option" aria-selected={i === sel}>
                      <Link href={h.href} onClick={(e) => { if (onPick) { e.preventDefault(); pick(h); } }} onMouseEnter={() => setSel(i)}
                        className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${i === sel ? 'bg-surface-2' : ''}`}>
                        <I size={15} className="shrink-0 text-accent" aria-hidden />
                        <span className="min-w-0 flex-1"><span className="block truncate text-text">{h.name}</span><span className="block truncate text-xs text-faint">{h.sub}</span></span>
                        <span className="shrink-0 text-[10.5px] uppercase tracking-wider text-faint">{KIND_LABEL[h.kind]}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
    </div>
  );
}
