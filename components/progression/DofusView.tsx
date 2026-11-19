'use client';
import Link from 'next/link';
import { Egg, ExternalLink } from 'lucide-react';
import type { DofusInfo } from '../../src/load.ts';
import { useGame } from '../quests/useGame';
import { Card, PageHero, ProgressBar, StatusPill } from '../ui';

export default function DofusView({ dofus }: { dofus: DofusInfo[] }) {
  const { status, ch, graph } = useGame();
  const obtained = (d: DofusInfo) =>
    d.quests.some((q) => ch.progress.done.has(`quest:${q.id}`)) || d.achievements.some((a) => ch.progress.done.has(`ach:${a.id}`));
  const owned = dofus.filter(obtained).length;

  return (
    <div className="h-full overflow-y-auto">
      <PageHero color="#7a4a12" kicker="Œufs de dragon" title="Les Dofus">
        <p className="max-w-2xl text-sm text-white/80">
          Les Dofus sont des œufs de dragon aux bonus puissants. Chacun s’obtient en terminant une quête ou un succès précis :
          ouvrez sa source pour voir toute la chaîne qui y mène.
        </p>
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Card className="mt-4">
          <p className="text-sm">{owned} / {dofus.length} Dofus obtenus</p>
          <ProgressBar value={owned} max={dofus.length} className="mt-1.5" label="Dofus obtenus" />
        </Card>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dofus.map((d) => {
            const has = obtained(d);
            return (
              <li key={d.itemId}>
                <Card className={`flex h-full flex-col gap-2 transition hover:-translate-y-0.5 ${has ? 'border-done/60' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border ${has ? 'border-accent/70 bg-accent/15' : 'border-line bg-surface-2'}`}>
                      {d.iconId != null && <img src={`/ankama/items/${d.iconId}.png`} alt="" width={48} height={48} loading="lazy" className={`drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] ${has ? '' : 'opacity-80 saturate-50'}`} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display">{d.name}</h2>
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
