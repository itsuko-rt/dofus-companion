'use client';
// Today's Almanax from the game's calendar (Paris day): the offering and where it comes from, the day's bonus,
// the period's bonuses, and the next days' offerings so players can prepare them.
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { addDays, almanaxFor, parisDay, type AlmanaxEntry } from '../src/almanax-shared.ts';
import SourceLabel from './professions/SourceLabel';
import { Card, SectionTitle } from './ui';

let cache: Promise<AlmanaxEntry[]> | null = null;
const fetchAlmanax = () => (cache ??= fetch('/api/almanax').then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
  .then((d: { entries: AlmanaxEntry[] }) => d.entries).catch((e) => { cache = null; throw e; }));

const DAYS_AHEAD = 6;
const fmt = (d: { day: number; month: number }) => `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}`;

export default function AlmanaxCard() {
  const [entries, setEntries] = useState<AlmanaxEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchAlmanax().then(setEntries, () => setFailed(true)); }, []);
  const today = useMemo(() => parisDay(), []);
  if (failed) return null; // a missing calendar must not break the home page
  if (!entries) return <Card><SectionTitle>Almanax du jour</SectionTitle><p className="text-sm text-muted">Chargement…</p></Card>;
  const { offering, period } = almanaxFor(entries, today);
  const next = Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i + 1)).map((d) => ({ d, e: almanaxFor(entries, d).offering }));
  return (
    <Card className="appear">
      <SectionTitle hint={fmt(today)}><span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="text-accent" aria-hidden /> Almanax du jour</span></SectionTitle>
      {offering ? (
        <>
          <p className="text-sm text-text">Offrande : <b>{offering.qty} × {offering.item}</b></p>
          <p className="text-xs"><SourceLabel source={offering.source} /></p>
          {offering.name && <p className="mt-2 text-sm font-medium text-text">{offering.name}</p>}
          {offering.description && <p className="text-xs text-muted">{offering.description}</p>}
        </>
      ) : <p className="text-sm text-muted">Le calendrier du jeu ne donne pas d’offrande pour ce jour.</p>}
      {period.length > 0 && <p className="mt-2 text-xs text-faint">Bonus de la période : {period.map((p) => p.name).filter(Boolean).join(' · ')}</p>}
      <h3 className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Prochains jours</h3>
      <ul className="flex flex-col text-xs">
        {next.map(({ d, e }) => (
          <li key={fmt(d)} className="flex justify-between gap-2 border-b border-line/60 py-1 last:border-0">
            <span className="text-faint">{fmt(d)}</span>
            <span className="truncate text-right text-text">{e ? `${e.qty} × ${e.item}` : '—'}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-faint">D’après le calendrier de l’Almanax des fichiers du jeu (jour de Paris).</p>
    </Card>
  );
}
