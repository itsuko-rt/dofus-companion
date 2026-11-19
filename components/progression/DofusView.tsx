'use client';
import Link from 'next/link';
import { Egg, ExternalLink } from 'lucide-react';
import type { DofusInfo } from '../../src/load.ts';
import { useGame } from '../quests/useGame';
import { Card, ProgressBar, StatusPill } from '../ui';

export default function DofusView({ dofus }: { dofus: DofusInfo[] }) {
  const { status, ch, graph } = useGame();
  const obtained = (d: DofusInfo) =>
    d.quests.some((q) => ch.progress.done.has(`quest:${q.id}`)) || d.achievements.some((a) => ch.progress.done.has(`ach:${a.id}`));
  const owned = dofus.filter(obtained).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold"><Egg size={20} className="text-accent" /> Les Dofus</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Les Dofus sont des œufs de dragon aux bonus puissants. Chacun s’obtient en terminant une quête ou un succès précis :
          ouvrez sa source pour voir toute la chaîne qui y mène.
        </p>
        <Card className="mt-4">
          <p className="text-sm">{owned} / {dofus.length} Dofus obtenus</p>
          <ProgressBar value={owned} max={dofus.length} className="mt-1.5" label="Dofus obtenus" />
        </Card>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dofus.map((d) => {
            const has = obtained(d);
            return (
              <li key={d.itemId}>
                <Card className={`flex h-full flex-col gap-2 ${has ? 'border-done/60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display font-semibold">{d.name}</h2>
                      <p className="text-xs text-muted">niveau {d.level}</p>
                    </div>
                    {has && <StatusPill status="done" />}
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    {d.quests.map((q) => (
                      <Link key={`q${q.id}`} href={`/progression/quetes/${q.category}#quest:${q.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 hover:bg-line">
                        <span className="truncate">Quête : {q.name}</span>{graph && <StatusPill status={status(`quest:${q.id}`)} />}
                      </Link>
                    ))}
                    {d.achievements.map((a) => (
                      <Link key={`a${a.id}`} href="/progression/succes" className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 hover:bg-line">
                        <span className="truncate">Succès : {a.name}</span>{graph && <StatusPill status={status(`ach:${a.id}`)} />}
                      </Link>
                    ))}
                    {d.quests.length + d.achievements.length === 0 && (
                      <p className="text-xs text-faint">Aucune quête ni succès ne le donne dans les données du jeu (butin, échange ou évènement).</p>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 flex items-center gap-1 text-xs text-faint"><ExternalLink size={12} /> Source : récompenses de quêtes et de succès des fichiers du jeu.</p>
      </div>
    </div>
  );
}
