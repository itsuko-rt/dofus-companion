'use client';
// Search palette (Ctrl+K or /): coordinates, zones, regions, resources, professions, monsters, dungeons, points of interest.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { parseCoords, type WorldData } from '../../src/world-shared.ts';
import { LAYER, type Poi } from './layers';

export type SearchHit =
  | { kind: 'cell'; x: number; y: number }
  | { kind: 'zone'; id: number }
  | { kind: 'area'; name: string }
  | { kind: 'resource'; id: number }
  | { kind: 'job'; id: number }
  | { kind: 'monster'; id: number }
  | { kind: 'poi'; poi: Poi };

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function MapSearch({ data, pois, onPick, onClose }: { data: WorldData; pois: Poi[]; onPick: (h: SearchHit) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const results = useMemo(() => {
    const out: { key: string; group: string; label: string; hint: string; hit: SearchHit }[] = [];
    const c = parseCoords(q);
    if (c) out.push({ key: 'cell', group: 'Coordonnées', label: `[${c.x}, ${c.y}]`, hint: 'Aller à cette carte', hit: { kind: 'cell', ...c } });
    const n = norm(q.trim());
    if (n.length < 2) return out;
    const has = (s: string | null | undefined) => !!s && norm(s).includes(n);
    const areas = [...new Set(data.zones.map((z) => z.area).filter((a): a is string => !!a))];
    for (const a of areas.filter(has).slice(0, 4)) out.push({ key: `a${a}`, group: 'Régions', label: a, hint: `${data.zones.filter((z) => z.area === a).length} zones`, hit: { kind: 'area', name: a } });
    for (const z of data.zones.filter((z) => has(z.name)).slice(0, 6)) out.push({ key: `z${z.id}`, group: 'Zones', label: z.name, hint: `${z.area ?? ''} · niv. ${z.level}`, hit: { kind: 'zone', id: z.id } });
    for (const j of data.jobs.filter((j) => j.kind === 'gathering' && has(j.name))) out.push({ key: `j${j.id}`, group: 'Métiers', label: j.name, hint: 'Afficher ses ressources', hit: { kind: 'job', id: j.id } });
    const job = new Map(data.jobs.map((j) => [j.id, j.name]));
    for (const r of data.resources.filter((r) => has(r.name)).slice(0, 8)) out.push({ key: `r${r.id}`, group: 'Ressources', label: r.name, hint: `${job.get(r.jobId)} niv. ${r.levelMin}`, hit: { kind: 'resource', id: r.id } });
    for (const m of data.monsters.filter((m) => has(m.name)).slice(0, 6)) out.push({ key: `m${m.id}`, group: 'Monstres', label: m.name, hint: `niv. ${m.levelMin ?? '?'}–${m.levelMax ?? '?'}`, hit: { kind: 'monster', id: m.id } });
    for (const p of pois.filter((p) => has(p.name)).slice(0, 10)) out.push({ key: p.key, group: LAYER[p.layer].label, label: p.name, hint: `[${p.x}, ${p.y}]${p.detail ? ` · ${p.detail}` : ''}`, hit: { kind: 'poi', poi: p } });
    return out.slice(0, 40);
  }, [q, data, pois]);
  useEffect(() => setActive(0), [q]);
  const pick = (i: number) => { const r = results[i]; if (r) { onPick(r.hit); onClose(); } };

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/50 p-3 pt-16" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Recherche sur la carte" className="w-full max-w-lg overflow-hidden rounded-md border border-line bg-surface shadow-xl">
        <label className="flex items-center gap-2 border-b border-line px-3">
          <Search size={16} className="text-faint" aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher sur la carte"
            placeholder="Coordonnées (5,-18), zone, ressource, métier, monstre, donjon…" className="w-full bg-transparent py-3 text-sm outline-none"
            role="combobox" aria-expanded={results.length > 0} aria-controls="map-search-results" aria-activedescendant={results[active] ? `msr-${active}` : undefined}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
              else if (e.key === 'Enter') { e.preventDefault(); pick(active); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
            }} />
          <kbd className="rounded-sm border border-line px-1.5 text-[10px] text-faint">Échap</kbd>
        </label>
        <ul id="map-search-results" role="listbox" className="max-h-[60vh] overflow-y-auto py-1">
          {results.map((r, i) => (
            <li key={r.key} id={`msr-${i}`} role="option" aria-selected={i === active}
              className={`flex cursor-pointer items-baseline gap-3 px-3 py-1.5 text-sm ${i === active ? 'bg-surface-2' : ''}`}
              onMouseEnter={() => setActive(i)} onClick={() => pick(i)}>
              <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-faint">{r.group}</span>
              <span className="min-w-0 flex-1 truncate text-text">{r.label}</span>
              <span className="shrink-0 text-xs text-muted">{r.hint}</span>
            </li>
          ))}
          {!results.length && <li className="px-3 py-3 text-sm text-muted">{q.trim().length < 2 ? 'Tapez au moins deux lettres, ou des coordonnées comme 5,-18.' : 'Aucun résultat.'}</li>}
        </ul>
      </div>
    </div>
  );
}
