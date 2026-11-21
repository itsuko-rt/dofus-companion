'use client';
// Atelier: the active character's craft list and the resources it needs, from the game's recipes.
// Marking a craft done or ticking what you already have takes it out of what is left to gather.
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCopy, Hammer, Link2, Trash2 } from 'lucide-react';
import { useCharacter } from '../useCharacter';
import { useAtelier } from '../encyclopedia/atelier-store';
import EncyclopediaSearch from '../encyclopedia/EncyclopediaSearch';
import SourceLabel from './SourceLabel';
import { formatLines, parseLines } from '../../src/atelier-shared.ts';
import type { AtelierResult } from '../../src/atelier.ts';
import { EmptyState } from '../ui';

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function AtelierView() {
  const ch = useCharacter();
  const { state, set, add } = useAtelier(ch.character.id);
  const [data, setData] = useState<AtelierResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const open = state.lines.filter((l) => !l.done);
  const key = `${formatLines(state.lines)}|${state.sub}`;
  // every listed item, done or not, so the list can show names; totals only count the open ones
  const allKey = state.lines.map((l) => `${l.id}:${l.qty}`).join(',');

  useEffect(() => { const s = new URLSearchParams(location.search).get('lines'); if (s && parseLines(s).length) setShared(s); }, []);
  useEffect(() => {
    if (!state.lines.length) { setData(null); return; }
    let live = true;
    setFailed(false);
    Promise.all([
      fetch(`/api/atelier?lines=${formatLines(state.lines)}${state.sub ? '&sub=1' : ''}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/atelier?lines=${allKey}`).then((r) => (r.ok ? r.json() : Promise.reject())),
    ]).then(([totals, names]: AtelierResult[]) => live && setData({ ...totals, items: names.items }), () => live && setFailed(true));
    return () => { live = false; };
  }, [key, allKey, state.lines, state.sub]);

  const left = useMemo(() => (data?.resources ?? []).map((r) => ({ ...r, have: Math.min(state.have[r.id] ?? 0, r.qty) }))
    .map((r) => ({ ...r, missing: r.qty - r.have })).sort((a, b) => Number(a.missing === 0) - Number(b.missing === 0) || b.missing - a.missing), [data, state.have]);
  const missingTotal = left.reduce((s, r) => s + r.missing, 0);
  const itemOf = (id: number) => data?.items.find((i) => i.id === id);
  const copy = async (what: 'list' | 'link') => {
    const text = what === 'list'
      ? left.filter((r) => r.missing > 0).map((r) => `${r.missing} × ${r.name}`).join('\n')
      : `${location.origin}/metiers/atelier?lines=${formatLines(state.lines)}`;
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch { setCopied('error'); }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <section className="flex min-w-0 flex-col gap-3">
        <h2 className="font-display text-lg">Mes crafts{ch.hasCharacter ? <span className="text-muted"> · {ch.character.name}</span> : null}</h2>
        {shared && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm">
            <span className="flex-1">Une liste partagée est dans le lien ({parseLines(shared).length} objet(s)).</span>
            <button className="rounded-md border border-accent/60 px-2 py-1 text-xs hover:bg-accent/15" onClick={() => { for (const l of parseLines(shared)) add(l.id, l.qty); setShared(null); history.replaceState(null, '', location.pathname); }}>L’ajouter à mes crafts</button>
            <button className="text-xs text-muted hover:text-text" onClick={() => setShared(null)}>Ignorer</button>
          </div>
        )}
        <EncyclopediaSearch only="item" compact onPick={(e) => add(e.id)} placeholder="Ajouter un objet à fabriquer…" />
        {state.lines.length === 0 ? (
          <EmptyState title="Aucun craft pour l’instant">Cherchez un objet ci-dessus, ou utilisez « Ajouter à l’atelier » sur la fiche d’un objet de l’encyclopédie.</EmptyState>
        ) : (
          <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/80 bg-surface/60">
            {state.lines.map((l) => {
              const it = itemOf(l.id);
              return (
                <li key={l.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${l.done ? 'opacity-60' : ''}`}>
                  <label className="flex shrink-0 cursor-pointer items-center" title="Craft fait : ses ressources sortent du total">
                    <input type="checkbox" checked={!!l.done} className="size-4 accent-[var(--color-done)]" aria-label={`${it?.name ?? 'Craft'} : fait`}
                      onChange={(e) => set((s) => ({ ...s, lines: s.lines.map((x) => (x.id === l.id ? { ...x, done: e.target.checked } : x)) }))} />
                  </label>
                  <span className="min-w-0 flex-1">
                    {it ? <Link href={it.href} className={`block truncate hover:text-accent ${l.done ? 'line-through' : ''}`}>{it.name}</Link> : <span className="block h-4 w-32 animate-pulse rounded bg-surface-2" />}
                    <span className="block text-xs text-faint">{!it ? ' ' : it.craftable ? <><Hammer size={11} className="mr-1 inline" aria-hidden />{it.job} niv. {it.level}</> : 'pas de recette dans le jeu : compté tel quel'}</span>
                  </span>
                  <input type="number" min={1} max={100000} value={l.qty} aria-label={`Quantité de ${it?.name ?? 'cet objet'}`}
                    onChange={(e) => { const q = Math.min(100000, Math.max(1, Math.round(Number(e.target.value)) || 1)); set((s) => ({ ...s, lines: s.lines.map((x) => (x.id === l.id ? { ...x, qty: q } : x)) })); }}
                    className="w-20 rounded-md border border-line bg-bg/60 px-2 py-1 text-right text-sm tabular-nums" />
                  <button onClick={() => set((s) => ({ ...s, lines: s.lines.filter((x) => x.id !== l.id) }))} aria-label={`Retirer ${it?.name ?? 'cet objet'}`} className="rounded p-1 text-faint hover:text-text"><Trash2 size={15} aria-hidden /></button>
                </li>
              );
            })}
          </ul>
        )}
        {state.lines.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-muted">
              <input type="checkbox" checked={state.sub} onChange={(e) => set((s) => ({ ...s, sub: e.target.checked }))} className="accent-[var(--color-accent)]" />
              Détailler les sous-crafts
            </label>
            <button onClick={() => copy('link')} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-muted hover:text-text"><Link2 size={13} aria-hidden />{copied === 'link' ? 'Lien copié' : 'Lien de partage'}</button>
            <button onClick={() => set((s) => ({ ...s, have: {} }))} className="rounded-md border border-line px-2.5 py-1.5 text-muted hover:text-text">Remettre « J’ai » à zéro</button>
          </div>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg">Ressources à réunir</h2>
          {left.length > 0 && <span className="text-sm text-muted"><b className="font-display text-accent">{fmt(missingTotal)}</b> manquantes</span>}
        </div>
        {failed ? <p className="text-sm text-check" role="alert">Le calcul n’a pas pu aboutir. Réessayez.</p>
          : !open.length ? <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">{state.lines.length ? 'Tous les crafts sont faits.' : 'Le total des ressources s’affichera ici.'}</p>
          : !data ? <div className="h-40 animate-pulse rounded-xl border border-line bg-surface" role="status"><span className="sr-only">Calcul…</span></div> : (
            <>
              <ul className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/80 bg-surface/60">
                {left.map((r) => (
                  <li key={r.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${r.missing === 0 ? 'bg-done/[0.06]' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <Link href={r.href} className="block truncate hover:text-accent">{r.name}</Link>
                      <span className="block truncate text-xs"><SourceLabel source={r.source} /></span>
                    </span>
                    <label className="flex shrink-0 items-center gap-1 text-xs text-faint">J’ai
                      <input type="number" min={0} max={r.qty} value={state.have[r.id] ?? 0} aria-label={`Quantité de ${r.name} déjà possédée`}
                        onChange={(e) => { const v = Math.max(0, Math.round(Number(e.target.value)) || 0); set((s) => ({ ...s, have: { ...s.have, [r.id]: v } })); }}
                        className="w-16 rounded-md border border-line bg-bg/60 px-1.5 py-0.5 text-right tabular-nums text-text" />
                    </label>
                    <span className="w-20 shrink-0 text-right">
                      {r.missing === 0 ? <span className="inline-flex items-center gap-1 text-done"><Check size={13} aria-hidden />{fmt(r.qty)}</span>
                        : <><b className="font-display tabular-nums text-accent">{fmt(r.missing)}</b><span className="block text-[11px] tabular-nums text-faint">sur {fmt(r.qty)}</span></>}
                    </span>
                  </li>
                ))}
              </ul>
              <button onClick={() => copy('list')} className="inline-flex items-center gap-1.5 self-start rounded-md border border-line px-2.5 py-1.5 text-xs text-muted hover:text-text">
                <ClipboardCopy size={13} aria-hidden />{copied === 'list' ? 'Liste copiée' : copied === 'error' ? 'Copie refusée par le navigateur' : 'Copier ce qui manque'}
              </button>
              {state.sub && data.intermediates.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Crafts intermédiaires</h3>
                  <ul className="flex flex-wrap gap-1.5 text-xs">
                    {data.intermediates.map((r) => <li key={r.id}><Link href={r.href} className="inline-block rounded border border-line px-2 py-1 hover:border-accent/60">{fmt(r.qty)} × {r.name} <span className="text-faint"><SourceLabel source={r.source} /></span></Link></li>)}
                  </ul>
                </div>
              )}
            </>
          )}
        <p className="text-[11px] text-faint">Quantités tirées des recettes du jeu (3.7.14.18). Votre liste reste dans ce navigateur, pour le personnage actif.</p>
      </section>
    </div>
  );
}
