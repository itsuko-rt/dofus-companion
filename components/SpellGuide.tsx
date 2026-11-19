'use client';
import { useMemo, useState } from 'react';
import type { ClassData, SpellInfo } from '../src/load.ts';
import type { RenderedEffect } from '../src/effects.ts';
import { ELEMENTS, classStates, gradeAt, spellElements, type Element } from '../src/spells.ts';
import { useCharacter } from './useCharacter';

const ELEMENT_STYLE: Record<Element, string> = {
  Feu: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  Eau: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  Terre: 'bg-amber-700/20 text-amber-300 border-amber-600/40',
  Air: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  Neutre: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
};

export default function SpellGuide({ data }: { data: ClassData }) {
  const ch = useCharacter();
  const level = ch.character.level;
  const [element, setElement] = useState<Element | null>(null);

  const elements = useMemo(() => new Map(data.spells.map((s) => [s.id, spellElements(s)])), [data]);
  const slots = useMemo(() => {
    const m = new Map<number, SpellInfo[]>();
    for (const s of data.spells) m.set(s.slot, [...(m.get(s.slot) ?? []), s]);
    return [...m.values()];
  }, [data]);
  const states = useMemo(() => classStates(data.spells), [data]);
  const unlocked = data.spells.filter((s) => gradeAt(s, level)).length;
  const shown = element ? slots.filter((vs) => vs.some((s) => elements.get(s.id)!.includes(element))) : slots;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <h1 className="text-xl font-semibold">{data.breed.name}</h1>
            <p className="text-xs text-zinc-500">
              {data.spells.length} sorts · 22 emplacements, 2 variantes chacun (une seule active à la fois) · données {data.version}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            Mon niveau
            <input type="number" min={1} max={200} value={level} onChange={(e) => ch.setLevel(Number(e.target.value))}
              className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-sm text-zinc-100" />
            <span>{unlocked}/{data.spells.length} sorts obtenus</span>
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par élément">
            <Chip active={element === null} onClick={() => setElement(null)}>Tous</Chip>
            {ELEMENTS.filter((el) => data.spells.some((s) => elements.get(s.id)!.includes(el))).map((el) => (
              <Chip key={el} active={element === el} onClick={() => setElement(element === el ? null : el)} className={ELEMENT_STYLE[el]}>{el}</Chip>
            ))}
          </div>
        </div>

        {states.length > 0 && (
          <details className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-zinc-200">
              États de la classe ({states.length}) — quels sorts les posent ou les retirent
            </summary>
            <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
              {states.slice(0, 30).map((st) => (
                <li key={st.state} className="text-[13px] text-zinc-300">
                  <b className="text-zinc-100">{st.state}</b>
                  {st.applies.length > 0 && <> — posé par {st.applies.join(', ')}</>}
                  {st.removes.length > 0 && <> — retiré par {st.removes.join(', ')}</>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">Relevé automatique des effets « État … » des sorts. Le rôle de chaque état n&apos;est pas décrit par les données.</p>
          </details>
        )}

        <ol className="mt-5 flex flex-col gap-3">
          {shown.map((vs) => (
            <li key={vs[0].slot} className="grid gap-3 md:grid-cols-2">
              {vs.map((s) => <SpellCard key={s.id} spell={s} level={level} elements={elements.get(s.id)!} />)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children, className = '' }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? 'ring-1 ring-zinc-300' : 'opacity-70 hover:opacity-100'} ${className || 'border-zinc-700 text-zinc-300'}`}>
      {children}
    </button>
  );
}

function SpellCard({ spell, level, elements }: { spell: SpellInfo; level: number; elements: Element[] }) {
  const current = gradeAt(spell, level);
  const shown = current ?? spell.levels[0];
  const [open, setOpen] = useState(false);
  if (!shown) return null;
  const range = shown.minRange === shown.range ? `${shown.range}` : `${shown.minRange}–${shown.range}`;
  const limits = [
    shown.perTurn > 0 && `${shown.perTurn}/tour`,
    shown.perTarget > 0 && `${shown.perTarget}/cible`,
    shown.interval > 0 && `relance ${shown.interval} t.`,
    shown.initialCooldown > 0 && `1er lancer au tour ${shown.initialCooldown + 1}`,
  ].filter(Boolean).join(' · ');

  return (
    <article className={`rounded-lg border p-3 ${current ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-800/60 bg-zinc-950 opacity-60'}`}>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[15px] font-medium text-zinc-50">{spell.name}</h2>
            {spell.variant === 1 && <span className="rounded bg-zinc-800 px-1.5 text-[10px] uppercase tracking-wide text-zinc-400">variante</span>}
            {elements.map((el) => <span key={el} className={`rounded-full border px-1.5 text-[10px] ${ELEMENT_STYLE[el]}`}>{el}</span>)}
          </div>
          <p className="text-[11px] text-zinc-500">
            {current ? `Grade ${current.grade}/${spell.levels.length}` : `Obtenu au niveau ${spell.levels[0].minLevel}`}
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-x-3 text-center text-[11px] text-zinc-500">
          <div><dt>PA</dt><dd className="text-sm font-semibold text-zinc-100">{shown.ap}</dd></div>
          <div><dt>PO</dt><dd className="text-sm font-semibold text-zinc-100">{range}</dd></div>
          <div><dt>Crit.</dt><dd className="text-sm font-semibold text-zinc-100">{shown.crit}%</dd></div>
        </dl>
      </header>
      {spell.description && <p className="mt-2 text-[13px] text-zinc-400">{spell.description}</p>}
      <Effects list={shown.effects} />
      {limits && <p className="mt-2 text-[11px] text-zinc-500">{limits}</p>}
      {spell.levels.length > 1 && (
        <button className="mt-2 text-[11px] text-sky-400 hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Masquer' : 'Voir'} les grades et coups critiques
        </button>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-2 border-t border-zinc-800 pt-2">
          {spell.levels.map((l) => (
            <div key={l.grade} className="text-[12px]">
              <div className="text-zinc-400">Grade {l.grade} · niveau {l.minLevel} · {l.ap} PA · PO {l.minRange === l.range ? l.range : `${l.minRange}–${l.range}`}</div>
              <Effects list={l.effects} />
              {l.criticalEffects.length > 0 && <div className="mt-1 text-zinc-500">Critique :<Effects list={l.criticalEffects} /></div>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function Effects({ list }: { list: RenderedEffect[] }) {
  if (!list.length) return null;
  return (
    <ul className="mt-1.5 flex flex-col gap-0.5 text-[13px] text-zinc-200">
      {list.map((e, i) => (
        <li key={i}>
          {e.text}
          {(e.duration || e.zone) && <span className="text-zinc-500"> ({[e.duration, e.zone].filter(Boolean).join(', ')})</span>}
        </li>
      ))}
    </ul>
  );
}
