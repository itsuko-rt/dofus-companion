import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Castle, Hammer, MapPin, Package, Shirt, Skull } from 'lucide-react';
import { DROP_HINT, DofusLink, QuestList, RefList, Section, SheetLayout, rateText } from '../../../../components/encyclopedia/Sheet';
import DropOdds from '../../../../components/encyclopedia/DropOdds';
import AddToAtelier from '../../../../components/encyclopedia/AddToAtelier';
import ItemIcon from '../../../../components/encyclopedia/ItemImage';
import { latestDb } from '../../../../src/load.ts';
import { encyHref, idFromParam, loadItem } from '../../../../src/encyclopedia.ts';
import { pageMeta } from '../../../../src/seo.ts';

const find = async (params: Promise<{ id: string }>) => {
  const id = idFromParam((await params).id);
  const db = latestDb();
  return id && db ? loadItem(db, id) : null;
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const i = await find(params);
  if (!i) return {};
  return pageMeta({ title: `${i.name} : ${i.type ?? 'objet'} DOFUS`, path: encyHref('item', i.id, i.name),
    description: `${i.name}${i.level ? `, niveau ${i.level}` : ''} : ${[i.recipe && 'recette', i.droppedBy.length && `${i.droppedBy.length} monstre(s) qui le lâchent`, i.usedIn.length && `utilisé dans ${i.usedIn.length} recette(s)`, i.harvestedIn.length && 'zones de récolte'].filter(Boolean).join(', ') || 'fiche de l’objet'}.` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const i = await find(params);
  if (!i) notFound();
  const best = i.droppedBy.find((d) => !d.conditional && d.rates.length);
  return (
    <SheetLayout kind="item" kicker={i.type ?? 'Objet'} title={i.name} crumbs={[[i.name, encyHref('item', i.id, i.name)]]}
      meta={<>{i.level && <span>Niveau {i.level}</span>}{i.set && <Link href={i.set.href} className="text-accent underline-offset-2 hover:underline">{i.set.name}</Link>}{i.dofusGuide && <DofusLink href={i.dofusGuide} />}</>}
      aside={<>
        {(i.effects.length > 0 || i.iconId) && (
          <Section title="Effets">
            <div className="flex gap-3 px-4 py-3">
              <ItemIcon iconId={i.iconId} size={48} />
              {i.effects.length ? <ul className="flex flex-col gap-0.5 text-sm">{i.effects.map((e, n) => <li key={n}>{e}</li>)}</ul> : <p className="text-sm text-muted">Aucun effet.</p>}
            </div>
          </Section>
        )}
        {best && <DropOdds rate={Math.max(...best.rates)} label={`Préréglé sur « ${best.monster.name} » (meilleur taux de base).`} />}
      </>}>
      {i.recipe && (
        <Section title="Recette" hint={<span className="flex flex-wrap items-center gap-x-3 gap-y-1">{i.recipe.job && i.recipe.jobSlug ? <Link href={`/metiers/${i.recipe.jobSlug}`} className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline"><Hammer size={13} aria-hidden />{i.recipe.job}</Link> : null} niveau {i.recipe.level}<AddToAtelier id={i.id} name={i.name} /></span>}>
          <RefList icon={Package} items={i.recipe.ingredients.map((g) => ({ ...g, right: <span className="font-display text-sm tabular-nums text-accent">× {g.qty}</span> }))} />
        </Section>
      )}
      {i.droppedBy.length > 0 && (
        <Section title="Lâché par" count={i.droppedBy.length} hint={DROP_HINT}>
          <RefList icon={Skull} items={i.droppedBy.map((d) => ({ ...d.monster, sub: d.conditional ? 'sous condition' : undefined, right: <span className="font-display text-sm tabular-nums text-accent">{rateText(d.rates)}</span> }))} />
        </Section>
      )}
      {i.harvestedIn.length > 0 && <Section title="Se récolte dans" count={i.harvestedIn.length}><RefList icon={MapPin} items={i.harvestedIn} columns /></Section>}
      {i.opens.length > 0 && <Section title="Ouvre le donjon"><RefList icon={Castle} items={i.opens} /></Section>}
      {i.quests.length > 0 && <Section title="Demandé par les quêtes" count={i.quests.length}><QuestList quests={i.quests} /></Section>}
      {i.usedIn.length > 0 && <Section title="Sert à fabriquer" count={i.usedIn.length}><RefList icon={i.type === 'Panoplie' ? Shirt : Package} columns items={i.usedIn.map((u) => ({ ...u, sub: u.level ? `niv. ${u.level}` : undefined }))} /></Section>}
      {!i.recipe && !i.droppedBy.length && !i.harvestedIn.length && !i.quests.length && (
        <Section title="Obtention"><p className="px-4 py-3 text-sm text-muted">Les données du jeu n’indiquent ni recette, ni butin, ni récolte pour cet objet (boutique, récompense de quête ou d’événement, par exemple).</p></Section>
      )}
    </SheetLayout>
  );
}
