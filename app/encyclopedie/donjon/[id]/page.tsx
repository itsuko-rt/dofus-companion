import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Gauge, Key, MapPin, Skull } from 'lucide-react';
import { AchievementList, RefList, Section, SheetLayout } from '../../../../components/encyclopedia/Sheet';
import { latestDb } from '../../../../src/load.ts';
import { encyHref, idFromParam, loadDungeon } from '../../../../src/encyclopedia.ts';
import { pageMeta } from '../../../../src/seo.ts';

const find = async (params: Promise<{ id: string }>) => {
  const id = idFromParam((await params).id);
  const db = latestDb();
  return id && db ? loadDungeon(db, id) : null;
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await find(params);
  if (!d) return {};
  return pageMeta({ title: `${d.name} : donjon DOFUS`, path: encyHref('dungeon', d.id, d.name),
    description: `${d.name}${d.level ? `, niveau ${d.level}` : ''} : boss ${d.bosses.map((b) => b.name).join(', ') || 'non renseigné'}, clé, ${d.achievements.length} succès.` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const d = await find(params);
  if (!d) notFound();
  return (
    <SheetLayout kind="dungeon" kicker="Donjon" title={d.name} crumbs={[[d.name, encyHref('dungeon', d.id, d.name)]]}
      meta={<>{d.level && <span>Niveau conseillé {d.level}</span>}{d.minLevel && d.minLevel !== d.level && <span>accès dès le niveau {d.minLevel}</span>}
        {d.level && <Link href={`/progression/niveau?niveau=${d.level}`} className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"><Gauge size={14} aria-hidden /> Que faire à ce niveau</Link>}</>}
      aside={<>
        <Section title="Clé">
          <RefList icon={Key} items={d.keys.map((k) => ({ ...k, right: k.qty > 1 ? <span className="text-xs text-faint">× {k.qty}</span> : undefined }))} empty="Aucune clé requise d’après les données du jeu." />
        </Section>
        {d.zone && <Section title="Zone"><RefList icon={MapPin} items={[d.zone]} /></Section>}
      </>}>
      <Section title={d.bosses.length > 1 ? 'Boss' : 'Boss'} count={d.bosses.length}>
        <RefList icon={Skull} items={d.bosses.map((b) => ({ ...b, sub: b.level ?? undefined }))} empty="Boss non renseigné dans les données du jeu." />
      </Section>
      {d.monsters.length > 0 && (
        <Section title="Monstres du donjon" count={d.monsters.length} hint="Monstres de la zone du même nom dans les données du jeu.">
          <RefList icon={Skull} items={d.monsters} columns />
        </Section>
      )}
      <Section title="Succès du donjon" count={d.achievements.length}>
        {d.achievements.length ? <AchievementList items={d.achievements} /> : <p className="px-4 py-3 text-sm text-muted">Aucun succès lié dans les données du jeu.</p>}
      </Section>
    </SheetLayout>
  );
}
