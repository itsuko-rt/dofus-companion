import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Castle, MapPin } from 'lucide-react';
import { AchievementList, DROP_HINT, Empty, QuestList, RefList, Section, SheetLayout, rateText } from '../../../../components/encyclopedia/Sheet';
import DropOdds from '../../../../components/encyclopedia/DropOdds';
import { latestDb } from '../../../../src/load.ts';
import { encyHref, idFromParam, loadMonster } from '../../../../src/encyclopedia.ts';
import { pageMeta } from '../../../../src/seo.ts';

const find = async (params: Promise<{ id: string }>) => {
  const id = idFromParam((await params).id);
  const db = latestDb();
  return id && db ? loadMonster(db, id) : null;
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const m = await find(params);
  if (!m) return {};
  const lv = m.grades.map((g) => g.level).filter((x): x is number => x != null);
  return pageMeta({ title: `${m.name} : monstre DOFUS`, path: encyHref('monster', m.id, m.name),
    description: `${m.name}${m.race ? ` (${m.race})` : ''}${lv.length ? `, niveau ${Math.min(...lv)} à ${Math.max(...lv)}` : ''} : ${m.zones.length} zone(s), ${m.drops.length} butin(s) avec leurs taux, quêtes et succès liés.` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const m = await find(params);
  if (!m) notFound();
  const lv = m.grades.map((g) => g.level).filter((x): x is number => x != null);
  const best = m.drops.find((d) => !d.conditional && d.rates.length);
  return (
    <SheetLayout kind="monster" kicker={m.race ?? 'Monstre'} title={m.name} crumbs={[[m.name, encyHref('monster', m.id, m.name)]]}
      meta={<>{lv.length > 0 && <span>Niveau {Math.min(...lv) === Math.max(...lv) ? lv[0] : `${Math.min(...lv)}–${Math.max(...lv)}`}</span>}
        {!m.regular && <span className="text-check">Hors peuplement habituel (quête, invocation, archimonstre, avis de recherche ou Dopeul)</span>}</>}
      aside={<>
        {m.grades.length > 0 && (
          <Section title="Grades">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-faint"><th className="px-4 py-1.5 font-medium">Grade</th><th className="py-1.5 font-medium">Niveau</th><th className="py-1.5 font-medium">PV</th><th className="px-4 py-1.5 text-right font-medium">XP</th></tr></thead>
              <tbody className="divide-y divide-line/50 tabular-nums">
                {m.grades.map((g) => <tr key={g.grade}><td className="px-4 py-1.5">{g.grade}</td><td>{g.level ?? '—'}</td><td>{g.life?.toLocaleString('fr-FR') ?? '—'}</td><td className="px-4 text-right">{g.xp ? g.xp.toLocaleString('fr-FR') : <span className="text-faint">non renseignée</span>}</td></tr>)}
              </tbody>
            </table>
          </Section>
        )}
        {best && <DropOdds rate={Math.max(...best.rates)} label={`Préréglé sur « ${best.item.name} » (meilleur taux de base de ce monstre).`} />}
      </>}>
      <Section title="Où le trouver" count={m.zones.length}>
        <RefList icon={MapPin} items={m.zones} columns empty="Aucune zone dans les données du jeu (monstre de quête, de donjon ou d’événement)." />
      </Section>
      {m.bossOf.length > 0 && <Section title="Boss du donjon"><RefList icon={Castle} items={m.bossOf} /></Section>}
      <Section title="Butin" count={m.drops.length} hint={DROP_HINT}>
        {m.drops.length === 0 ? <Empty>Aucun butin dans les données du jeu.</Empty> : (
          <ul className="divide-y divide-line/60">
            {m.drops.map((d) => (
              <li key={d.item.id}>
                <a href={d.item.href} className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-surface-2/60">
                  <span className="min-w-0 flex-1"><span className="block truncate">{d.item.name}</span><span className="block text-xs text-faint">{d.type}{d.conditional ? ' · sous condition' : ''}</span></span>
                  <span className="shrink-0 text-right font-display text-sm tabular-nums text-accent">{rateText(d.rates)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {m.quests.length > 0 && <Section title="Quêtes où il faut le vaincre" count={m.quests.length}><QuestList quests={m.quests} /></Section>}
      {m.achievements.length > 0 && <Section title="Succès liés" count={m.achievements.length}><AchievementList items={m.achievements} /></Section>}
    </SheetLayout>
  );
}
