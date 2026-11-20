'use client';
// Left panel: resources by gathering profession (accordion, multi-select, level filter) and point-of-interest layers.
import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, Search, X } from 'lucide-react';
import type { WorldData } from '../../src/world-shared.ts';
import { jobIcon } from '../professions/jobIcons';
import { LAYERS, type LayerId, type Poi } from './layers';

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function ResourceFilters({ data, selected, setSelected, levels, setLevel, open, setOpen }: {
  data: WorldData; selected: Set<number>; setSelected: (s: Set<number>) => void;
  levels: Record<number, number>; setLevel: (job: number, lv: number) => void;
  open: Set<number>; setOpen: (s: Set<number>) => void;
}) {
  const [q, setQ] = useState('');
  const jobs = data.jobs.filter((j) => j.kind === 'gathering');
  const zonesOf = new Map<number, number>();
  for (const z of data.zones) for (const r of z.resources) zonesOf.set(r, (zonesOf.get(r) ?? 0) + 1);
  const toggle = (id: number) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); setSelected(n); };
  const nq = norm(q.trim());
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-2 top-2 text-faint" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer les ressources" aria-label="Filtrer les ressources"
            className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-2 text-sm" />
        </label>
        {selected.size > 0 && <button className="shrink-0 text-xs text-muted underline hover:text-text" onClick={() => setSelected(new Set())}>Tout effacer ({selected.size})</button>}
      </div>
      {jobs.map((j) => {
        const Icon = jobIcon(j.name);
        const lv = levels[j.id] ?? 200;
        const list = data.resources.filter((r) => r.jobId === j.id && (!nq || norm(r.name).includes(nq))).sort((a, b) => a.levelMin - b.levelMin || a.name.localeCompare(b.name));
        if (nq && !list.length) return null;
        const reachable = list.filter((r) => r.levelMin <= lv);
        const count = list.filter((r) => selected.has(r.id)).length;
        const isOpen = open.has(j.id) || !!nq;
        return (
          <section key={j.id} className="rounded-md border border-line" aria-label={j.name}>
            <div className="flex items-center gap-2 px-2.5 py-2">
              <button className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen}
                onClick={() => { const n = new Set(open); if (n.has(j.id)) n.delete(j.id); else n.add(j.id); setOpen(n); }}>
                {isOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                <Icon size={15} aria-hidden className="text-accent" />
                <span className="truncate text-sm font-medium text-text">{j.name}</span>
                {count > 0 && <span className="rounded-sm bg-accent/20 px-1.5 text-[11px] text-accent">{count}</span>}
              </button>
              <label className="flex items-center gap-1 text-[11px] text-faint">niv.
                <input type="number" min={1} max={200} value={lv} aria-label={`Niveau de ${j.name}`}
                  onChange={(e) => setLevel(j.id, Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-12 rounded-sm border border-line bg-bg px-1 py-0.5 text-center text-xs text-text" />
              </label>
            </div>
            {isOpen && (
              <div className="border-t border-line px-2.5 pb-2.5 pt-2">
                <div className="mb-2 flex gap-3 text-xs">
                  <button className="text-accent hover:underline" onClick={() => setSelected(new Set([...selected, ...reachable.map((r) => r.id)]))}>Tout afficher (≤ niv. {lv})</button>
                  <button className="text-muted hover:underline" onClick={() => setSelected(new Set([...selected].filter((id) => !list.some((r) => r.id === id))))}>Masquer</button>
                </div>
                <ul className="grid grid-cols-2 gap-1">
                  {list.map((r) => {
                    const locked = r.levelMin > lv;
                    const on = selected.has(r.id);
                    return (
                      <li key={r.id}>
                        <label title={locked ? `Niveau ${r.levelMin} requis (votre niveau : ${lv})` : `${zonesOf.get(r.id) ?? 0} zone(s)`}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-1.5 py-1 text-xs ${on ? 'border-accent bg-accent/10 text-text' : 'border-line'} ${locked ? 'opacity-55' : ''}`}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(r.id)} aria-label={`${r.name}, niveau ${r.levelMin}`} />
                          {r.iconId != null && <img src={`/ankama/items/${r.iconId}.png`} alt="" width={20} height={20} className="shrink-0" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
                          <span className="min-w-0 flex-1 truncate">{r.name}</span>
                          {locked ? <Lock size={10} aria-hidden /> : null}<span className="tabular-nums text-faint">{r.levelMin}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>
        );
      })}
      <p className="text-[11px] leading-relaxed text-faint">Les fichiers du jeu disent dans quelles <b>zones</b> pousse chaque ressource, pas le nombre ni la case exacte de chaque spot : les marqueurs sont placés au centre des zones, sans quantité.</p>
    </div>
  );
}

export function LayerFilters({ pois, layers, toggle }: { pois: Poi[]; layers: Set<LayerId>; toggle: (l: LayerId) => void }) {
  const count = (id: LayerId) => pois.filter((p) => p.layer === id).length;
  return (
    <div className="flex flex-col gap-1">
      {LAYERS.filter((l) => count(l.id) > 0).map((l) => {
        const Icon = l.icon;
        return (
          <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-surface-2" title={`Source : ${l.source}`}>
            <input type="checkbox" checked={layers.has(l.id)} onChange={() => toggle(l.id)} className="accent-[var(--color-brand)]" />
            <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: l.color }}><Icon size={12} color="#fff" aria-hidden /></span>
            <span className="flex-1">{l.label}</span>
            <span className="text-xs tabular-nums text-faint">{count(l.id)}</span>
          </label>
        );
      })}
      <p className="mt-1 text-[11px] leading-relaxed text-faint">Cartes cachées : absentes des fichiers du jeu, donc non affichées. Survolez un calque pour voir sa source.</p>
    </div>
  );
}

export function ActiveFilter({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-2 py-0.5 text-xs">
      {label}<button aria-label={`Retirer ${label}`} className="text-faint hover:text-text" onClick={onClear}><X size={12} /></button>
    </span>
  );
}
