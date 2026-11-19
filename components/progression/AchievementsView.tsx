'use client';
import { useEffect, useMemo, useState } from 'react';
import { Check, Search, Trophy } from 'lucide-react';
import type { AchievementCategory, AchievementInfo } from '../../src/load.ts';
import { useGame } from '../quests/useGame';
import { Button, Card, EmptyState, ProgressBar, StatusPill } from '../ui';

export default function AchievementsView({ categories }: { categories: AchievementCategory[] }) {
  const { status, ch } = useGame();
  const roots = useMemo(() => categories.filter((c) => c.parentId == null), [categories]);
  const children = useMemo(() => {
    const m = new Map<number, AchievementCategory[]>();
    for (const c of categories) if (c.parentId != null) m.set(c.parentId, [...(m.get(c.parentId) ?? []), c]);
    return m;
  }, [categories]);
  const [root, setRoot] = useState<number | null>(roots[0]?.id ?? null);
  const [sub, setSub] = useState<number | null>(null);
  const [list, setList] = useState<AchievementInfo[] | null>(null);
  const [query, setQuery] = useState('');

  const selected = sub ?? root;
  useEffect(() => {
    if (selected == null) return;
    const ids = sub != null ? [sub] : [selected, ...(children.get(selected) ?? []).map((c) => c.id)];
    setList(null);
    fetch(`/api/achievements?categories=${ids.join(',')}`).then((r) => r.json()).then((d) => setList(d.achievements ?? []), () => setList([]));
  }, [selected, sub, children]);

  const shown = (list ?? []).filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()));
  const done = shown.filter((a) => ch.progress.done.has(`ach:${a.id}`));
  const points = done.reduce((s, a) => s + a.points, 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 md:grid-cols-[240px_1fr]">
        <nav aria-label="Catégories de succès" className="flex flex-col gap-0.5">
          <h1 className="mb-2 flex items-center gap-2 font-display text-xl font-semibold"><Trophy size={20} className="text-accent" /> Succès</h1>
          {roots.map((c) => (
            <button key={c.id} onClick={() => { setRoot(c.id); setSub(null); }} aria-current={root === c.id}
              className={`rounded-lg px-3 py-1.5 text-left text-sm ${root === c.id ? 'bg-surface-2 text-text' : 'text-muted hover:bg-surface hover:text-text'}`}>
              {c.name}
            </button>
          ))}
        </nav>
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(children.get(root ?? -1) ?? []).length > 0 && (
              <select aria-label="Sous-catégorie" value={sub ?? ''} onChange={(e) => setSub(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <option value="">Toutes les sous-catégories</option>
                {(children.get(root ?? -1) ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
              </select>
            )}
            <label className="relative ml-auto w-full sm:w-64">
              <span className="sr-only">Rechercher un succès</span>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm" />
            </label>
          </div>
          {list === null ? <p className="text-sm text-muted">Chargement…</p> : shown.length === 0 ? <EmptyState title="Aucun succès ici" /> : (
            <>
              <Card className="mb-3 flex flex-wrap items-center gap-4">
                <div className="min-w-48 flex-1">
                  <p className="text-sm">{done.length} / {shown.length} succès · {points} points</p>
                  <ProgressBar value={done.length} max={shown.length} className="mt-1.5" label="Succès obtenus" />
                </div>
                <p className="text-xs text-muted">Cochez les succès que vous avez déjà obtenus en jeu : ils débloquent des quêtes et des Dofus.</p>
              </Card>
              <ul className="grid gap-2 lg:grid-cols-2">
                {shown.map((a) => {
                  const id = `ach:${a.id}`;
                  const isDone = ch.progress.done.has(id);
                  return (
                    <li key={a.id}>
                      <Card className={`flex h-full flex-col gap-1.5 p-3 ${isDone ? 'border-done/50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium leading-snug">{a.name}</h3>
                            <p className="text-xs text-muted">niv. {a.level} · {a.points} points</p>
                          </div>
                          <StatusPill status={status(id)} />
                        </div>
                        {/* game markup such as "[challenge,102]" names a challenge by id: dropped from the sentence */}
                        {a.description && <p className="text-sm text-muted">{a.description.replace(/\s*\[challenge,\d+\]/g, '')}</p>}
                        {a.objectives.length > 1 && (
                          <ul className="text-xs text-muted">{a.objectives.slice(0, 6).map((o, i) => <li key={i}>• {o}</li>)}{a.objectives.length > 6 && <li>… et {a.objectives.length - 6} autres</li>}</ul>
                        )}
                        <Button variant={isDone ? 'ghost' : 'secondary'} className="mt-auto self-start !px-2.5 !py-1 text-xs" onClick={() => ch.setMark(id, isDone ? null : 'done')}>
                          <Check size={13} /> {isDone ? 'Obtenu (annuler)' : 'Je l’ai obtenu'}
                        </Button>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
