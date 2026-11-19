'use client';
import { Check, GitBranch, RotateCcw, Timer } from 'lucide-react';
import { reference, type Atom } from '../../src/criteria.ts';
import { describe } from '../../src/codes.ts';
import type { GNode, Graph, Status } from '../../src/graph.ts';
import { SUPPORTED_BREEDS } from '../breeds';
import { Button, Drawer, STATUS, StatusPill } from '../ui';
import type { useCharacter } from '../useCharacter';

/** One game condition as a sentence a new player understands. */
function plain(a: Atom, g: Graph): { text: string; link?: string } {
  const ref = reference(a);
  if (ref) {
    const n = g.nodes.get(ref.node);
    const name = n ? `« ${n.label} »` : ref.node;
    const what = ref.node.startsWith('ach:') ? 'le succès' : 'la quête';
    return { text: ref.negated ? `Ne pas avoir terminé ${what} ${name} (choix exclusif)` : `Terminer ${what} ${name}`, link: n?.id };
  }
  const v = Number(a.value.split(',')[0]);
  switch (a.code) {
    case 'PL': return { text: a.op === '>' ? `Atteindre le niveau ${v + 1}` : a.op === '<' ? `Être en dessous du niveau ${v}` : describe(a) };
    case 'Qa': {
      const n = g.nodes.get(`quest:${v}`);
      return { text: `${a.op === '!' ? 'Ne pas avoir en cours' : 'Avoir commencé'} « ${n?.label ?? v} »`, link: n?.id };
    }
    case 'Ps': return { text: a.op === '=' ? `Être d'alignement ${v === 1 ? 'Bontarien' : v === 2 ? 'Brâkmarien' : 'neutre'}` : describe(a) };
    case 'Pa': return { text: a.op === '>' ? `Niveau d'alignement ${v + 1} ou plus` : `Niveau d'alignement ${v}` };
    case 'PG': return { text: `${a.op === '!' ? 'Ne pas être' : 'Être'} ${SUPPORTED_BREEDS.find((b) => b.id === v)?.name ?? `de la classe n°${v}`}` };
    case 'PZ': return { text: v === 1 ? 'Être abonné' : 'Ne pas être abonné' };
    default: return { text: describe(a) };
  }
}

const INTRO: Record<Status, string> = {
  done: 'Vous avez terminé cette quête.',
  available: 'Vous pouvez la faire dès maintenant.',
  locked: 'Pour la débloquer :',
  unknown: 'Une condition doit être vérifiée en jeu :',
};

export default function QuestDrawer({ node, graph, status, ch, region, onSelect, onFocusChain, onClose }: {
  node: GNode; graph: Graph; status: (id: string) => Status; ch: ReturnType<typeof useCharacter>;
  region?: string; onSelect: (id: string) => void; onFocusChain?: (id: string) => void; onClose: () => void;
}) {
  const st = status(node.id);
  const missing = st === 'done' || st === 'available' ? [] : graph.blockers(node.id, ch.progress);
  const next = [...(graph.dependents.get(node.id) ?? [])].map((id) => graph.nodes.get(id)!).filter((n) => n && n.kind !== 'gate');
  const isActive = ch.progress.active.has(node.id);
  const kind = node.kind === 'quest' ? 'Quête' : node.kind === 'achievement' ? 'Succès' : 'Donjon';

  const row = (n: GNode) => {
    const s = STATUS[status(n.id)];
    const Icon = s.icon;
    return (
      <button key={n.id} onClick={() => onSelect(n.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
        <Icon size={14} className={s.text} aria-label={s.label} />
        <span className="min-w-0 flex-1 truncate">{n.label}</span>
        {n.level ? <span className="text-xs text-muted">niv. {n.level}</span> : null}
      </button>
    );
  };

  return (
    <Drawer open onClose={onClose} title={
      <>
        <p className="text-xs uppercase tracking-wide text-muted">{kind}{region ? ` · ${region}` : ''}</p>
        <h2 className="font-display text-lg font-semibold leading-snug">{node.label}</h2>
        <div className="mt-1.5"><StatusPill status={st} /></div>
      </>
    }>
      <div className="flex flex-wrap gap-2">
        {st === 'done'
          ? <Button onClick={() => ch.setMark(node.id, null)}><RotateCcw size={15} /> Annuler « terminée »</Button>
          : <Button variant="primary" onClick={() => ch.setMark(node.id, 'done')}><Check size={16} /> J&apos;ai terminé {node.kind === 'achievement' ? 'ce succès' : 'cette quête'}</Button>}
        {node.kind === 'quest' && st !== 'done' && (
          <Button variant="ghost" onClick={() => ch.setMark(node.id, isActive ? null : 'active')}>
            <Timer size={15} /> {isActive ? 'Plus en cours' : 'Je l’ai commencée'}
          </Button>
        )}
      </div>

      <section className="mt-5">
        <p className="text-sm text-text">{INTRO[st]}</p>
        {missing.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {missing.map((a, i) => {
              const p = plain(a, graph);
              return (
                <li key={i} className="flex gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-muted">•</span>
                  {p.link ? <button className="text-left underline decoration-faint underline-offset-2 hover:text-accent" onClick={() => onSelect(p.link!)}>{p.text}</button> : <span>{p.text}</span>}
                </li>
              );
            })}
          </ul>
        )}
        {node.level ? (
          <p className="mt-3 text-xs text-muted">Niveau {node.level} conseillé : c&apos;est une indication, pas une obligation.</p>
        ) : null}
      </section>

      {next.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 text-sm font-semibold">Ensuite, vous pourrez faire</h3>
          <div className="flex flex-col">{next.slice(0, 30).map(row)}</div>
        </section>
      )}

      {onFocusChain && (
        <Button variant="ghost" className="mt-4 -ml-2" onClick={() => onFocusChain(node.id)}>
          <GitBranch size={15} /> Voir toute la chaîne qui mène à cette quête
        </Button>
      )}

      <details className="mt-5 text-xs text-muted">
        <summary className="cursor-pointer select-none">Détails techniques</summary>
        <p className="mt-2">Condition exacte dans les fichiers du jeu :</p>
        <code className="mt-1 block break-all rounded-lg bg-bg p-2 text-text">{node.criterion || '(aucune)'}</code>
      </details>
    </Drawer>
  );
}
