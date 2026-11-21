import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Package } from 'lucide-react';
import { RefList, Section, SheetLayout } from '../../../../components/encyclopedia/Sheet';
import { latestDb } from '../../../../src/load.ts';
import { encyHref, idFromParam, loadSet } from '../../../../src/encyclopedia.ts';
import { pageMeta } from '../../../../src/seo.ts';

const find = async (params: Promise<{ id: string }>) => {
  const id = idFromParam((await params).id);
  const db = latestDb();
  return id && db ? loadSet(db, id) : null;
};
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await find(params);
  if (!s) return {};
  return pageMeta({ title: `${s.name} : panoplie DOFUS`, path: encyHref('set', s.id, s.name), description: `${s.name} : ${s.items.length} objets et les bonus par nombre d’objets portés.` });
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await find(params);
  if (!s) notFound();
  const lv = s.items.map((i) => i.level).filter((x): x is number => !!x);
  return (
    <SheetLayout kind="set" kicker="Panoplie" title={s.name} crumbs={[[s.name, encyHref('set', s.id, s.name)]]}
      meta={lv.length ? <span>Niveau {Math.min(...lv) === Math.max(...lv) ? lv[0] : `${Math.min(...lv)}–${Math.max(...lv)}`}</span> : undefined}
      aside={
        <Section title="Bonus de panoplie">
          {s.bonuses.length === 0 ? <p className="px-4 py-3 text-sm text-muted">Aucun bonus.</p> : (
            <ul className="divide-y divide-line/60">
              {s.bonuses.map((b) => (
                <li key={b.count} className="px-4 py-2.5 text-sm">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{b.count} objets</p>
                  <ul className="flex flex-col gap-0.5">{b.effects.map((e, n) => <li key={n}>{e}</li>)}</ul>
                </li>
              ))}
            </ul>
          )}
        </Section>
      }>
      <Section title="Objets" count={s.items.length}>
        <RefList icon={Package} items={s.items.map((i) => ({ ...i, sub: [i.type, i.level ? `niv. ${i.level}` : null].filter(Boolean).join(' · ') }))} />
      </Section>
    </SheetLayout>
  );
}
