import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Castle, Gauge, Leaf, Skull } from 'lucide-react';
import { AchievementList, RefList, Section, SheetLayout } from '../../../../components/encyclopedia/Sheet';
import { latestDb } from '../../../../src/load.ts';
import { encyHref, idFromParam, loadZone } from '../../../../src/encyclopedia.ts';
import { pageMeta } from '../../../../src/seo.ts';

const find = async (params: Promise<{ id: string }>) => {
  const id = idFromParam((await params).id);
  const db = latestDb();
  return id && db ? loadZone(db, id) : null;
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const z = await find(params);
  if (!z) return {};
  return pageMeta({ title: `${z.name}${z.area ? ` (${z.area})` : ''} : zone DOFUS`, path: encyHref('zone', z.id, z.name),
    description: `${z.name}${z.level ? `, niveau ${z.level}` : ''} : ${z.monsters.length} monstre(s), ${z.resources.length} ressource(s) à récolter, donjons et succès liés.` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const z = await find(params);
  if (!z) notFound();
  const regular = z.monsters.filter((m) => m.regular), other = z.monsters.filter((m) => !m.regular);
  return (
    <SheetLayout kind="zone" kicker={z.area ?? 'Zone'} title={z.name} crumbs={[[z.name, encyHref('zone', z.id, z.name)]]}
      meta={<>{z.level && <span>Niveau {z.level}</span>}{z.zaap && <span>Zaap [{z.zaap[0]},{z.zaap[1]}]</span>}
        {z.level && <Link href={`/progression/niveau?niveau=${z.level}`} className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"><Gauge size={14} aria-hidden /> Que faire à ce niveau</Link>}</>}
      aside={z.dungeons.length > 0 ? <Section title="Donjons liés" hint="Donjon du même nom, ou dont le boss vit ici."><RefList icon={Castle} items={z.dungeons} /></Section> : undefined}>
      <Section title="Monstres" count={regular.length}>
        <RefList icon={Skull} items={regular} columns empty="Aucun monstre habituel dans les données du jeu." />
      </Section>
      {other.length > 0 && <Section title="Autres monstres" count={other.length} hint="Quête, archimonstres, avis de recherche, Dopeuls ou invocations : présents ici seulement dans certaines conditions."><RefList icon={Skull} items={other} columns /></Section>}
      <Section title="Ressources à récolter" count={z.resources.length}>
        <RefList icon={Leaf} items={z.resources} columns empty="Aucune ressource récoltable dans les données du jeu." />
      </Section>
      {z.achievements.length > 0 && <Section title="Succès liés" count={z.achievements.length}><AchievementList items={z.achievements} /></Section>}
    </SheetLayout>
  );
}
