'use client';
import { useMemo, useState } from 'react';
import type { ClassData, SpellInfo } from '../src/load.ts';
import type { RenderedEffect } from '../src/effects.ts';
import { ELEMENTS, classStates, gradeAt, spellElements, type Element } from '../src/spells.ts';
import { useCharacter } from './useCharacter';
import { ELEMENT_CLASS } from './ui';

const ELEMENT_STYLE = ELEMENT_CLASS;

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
            <h1 className="font-display text-xl font-semibold">{data.breed.name}</h1>
            <p className="text-xs text-text0">
              {data.spells.length} sorts · 22 emplacements, 2 variantes chacun (une seule active à la fois) · données {data.version}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            Mon niveau
            <input type="number" min={1} max={200} value={level} onChange={(e) => ch.setLevel(Number(e.target.value))}
              className="w-16 rounded border border-line bg-bg px-1.5 py-1 text-sm text-text" />
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
          <details className="mt-5 rounded-lg border border-line bg-surface p-3 text-sm">
            <summary className="cursor-pointer select-none font-medium text-text">
              États de la classe ({states.length}) — quels sorts les posent ou les retirent
            </summary>
            <ul className="mt-2 grid gap-1.5 md:grid-cols-2">
              {states.slice(0, 30).map((st) => (
                <li key={st.state} className="text-[13px] text-text">
                  <b className="text-text">{st.state}</b>
                  {st.applies.length > 0 && <> — posé par {st.applies.join(', ')}</>}
                  {st.removes.length > 0 && <> — retiré par {st.removes.join(', ')}</>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-text0">Relevé automatique des effets « État … » des sorts. Le rôle de chaque état n&apos;est pas décrit par les données.</p>
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
      className={`rounded-full border px-2.5 py-0.5 text-xs ${active ? 'ring-1 ring-text' : 'opacity-70 hover:opacity-100'} ${className || 'border-line text-text'}`}>
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
    <article className={`rounded-lg border p-3 ${current ? 'border-line bg-surface' : 'border-line bg-bg opacity-60'}`}>
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-display text-[15px] font-semibold text-text">{spell.name}</h2>
            {spell.variant === 1 && <span className="rounded bg-surface-2 px-1.5 text-[10px] uppercase tracking-wide text-muted">variante</span>}
            {elements.map((el) => <span key={el} className={`rounded-full border px-1.5 text-[10px] ${ELEMENT_STYLE[el]}`}>{el}</span>)}
          </div>
          <p className="text-[11px] text-text0">
            {current ? `Grade ${current.grade}/${spell.levels.length}` : `Obtenu au niveau ${spell.levels[0].minLevel}`}
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-3 gap-x-3 text-center text-[11px] text-text0">
          <div><dt>PA</dt><dd className="text-sm font-semibold text-text">{shown.ap}</dd></div>
          <div><dt>PO</dt><dd className="text-sm font-semibold text-text">{range}</dd></div>
          <div><dt>Crit.</dt><dd className="text-sm font-semibold text-text">{shown.crit}%</dd></div>
        </dl>
      </header>
      {spell.description && <p className="mt-2 text-[13px] text-muted">{spell.description}</p>}
      <Effects list={shown.effects} />
      {limits && <p className="mt-2 text-[11px] text-text0">{limits}</p>}
      {spell.levels.length > 1 && (
        <button className="mt-2 text-[11px] text-accent hover:underline" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Masquer' : 'Voir'} les grades et coups critiques
        </button>
      )}
      {open && (
        <div className="mt-2 flex flex-col gap-2 border-t border-line pt-2">
          {spell.levels.map((l) => (
            <div key={l.grade} className="text-[12px]">
              <div className="text-muted">Grade {l.grade} · niveau {l.minLevel} · {l.ap} PA · PO {l.minRange === l.range ? l.range : `${l.minRange}–${l.range}`}</div>
              <Effects list={l.effects} />
              {l.criticalEffects.length > 0 && <div className="mt-1 text-text0">Critique :<Effects list={l.criticalEffects} /></div>}
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
    <ul className="mt-1.5 flex flex-col gap-0.5 text-[13px] text-text">
      {list.map((e, i) => (
        <li key={i}>
          {e.text}
          {(e.duration || e.zone) && <span className="text-text0"> ({[e.duration, e.zone].filter(Boolean).join(', ')})</span>}
        </li>
      ))}
    </ul>
  );
}
