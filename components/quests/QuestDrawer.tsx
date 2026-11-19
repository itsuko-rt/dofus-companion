'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Check, ExternalLink, Gift, GitBranch, MapPin, RotateCcw, Sparkles, Timer } from 'lucide-react';
import type { QuestDetails } from '../../src/load.ts';
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
  const [details, setDetails] = useState<QuestDetails | null>(null);
  const [unlocked, setUnlocked] = useState<GNode[]>([]);
  useEffect(() => {
    setDetails(null); setUnlocked([]);
    if (node.kind !== 'quest') return;
    const ctrl = new AbortController();
    fetch(`/api/quests/${node.refId}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : null)).then(setDetails, () => {});
    return () => ctrl.abort();
  }, [node.id, node.kind, node.refId]);
  const complete = () => {
    // what this completion opens, computed before saving it
    setUnlocked(graph.unlockedBy(node.id, ch.progress).map((id) => graph.nodes.get(id)!).filter((n) => n && n.kind !== 'gate'));
    ch.setMark(node.id, 'done');
  };
  const description = details?.steps.find((s) => s.description)?.description;
  const rewards = details?.steps.flatMap((s) => s.rewards) ?? [];
  const rewardItems = rewards.flatMap((r) => r.items);
  const guide = details?.guides[0];
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
          : <Button variant="primary" onClick={complete}><Check size={16} /> J&apos;ai terminé {node.kind === 'achievement' ? 'ce succès' : 'cette quête'}</Button>}
        {node.kind === 'quest' && st !== 'done' && (
          <Button variant="ghost" onClick={() => ch.setMark(node.id, isActive ? null : 'active')}>
            <Timer size={15} /> {isActive ? 'Plus en cours' : 'Je l’ai commencée'}
          </Button>
        )}
      </div>

      {unlocked.length > 0 && (
        <div role="status" className="mt-4 rounded-xl border border-accent/50 bg-accent/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent"><Sparkles size={15} /> Nouvelles quêtes débloquées</p>
          <div className="mt-1 flex flex-col">{unlocked.slice(0, 12).map(row)}</div>
        </div>
      )}

      {description && <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>}
      {details && (details.start.npc || details.start.zone) && (
        <p className="mt-3 flex items-start gap-2 text-sm"><MapPin size={15} className="mt-0.5 shrink-0 text-accent" />
          <span>Pour commencer : parlez à <b className="font-medium">{details.start.npc ?? 'un PNJ'}</b>{details.start.zone ? <> ({details.start.zone})</> : null}.</span>
        </p>
      )}

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

      {details && details.steps.some((s) => s.objectives.length) && (
        <section className="mt-5">
          <h3 className="mb-1 text-sm font-semibold">Étapes et objectifs</h3>
          <ol className="flex flex-col gap-2">
            {details.steps.map((s, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface-2 p-2.5 text-sm">
                {details.steps.length > 1 && <p className="mb-1 text-xs font-medium text-muted">Étape {i + 1}{s.name && s.name !== node.label ? ` · ${s.name}` : ''}</p>}
                <ul className="flex flex-col gap-0.5">{s.objectives.map((o, j) => <li key={j}>• {o}</li>)}</ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rewards.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><Gift size={15} className="text-accent" /> Récompenses</h3>
          <ul className="flex flex-wrap gap-1.5 text-sm">
            {rewards.some((r) => r.xp) && <li className="rounded-full bg-surface-2 px-2.5 py-1">Expérience</li>}
            {rewards.some((r) => r.kamas) && <li className="rounded-full bg-surface-2 px-2.5 py-1">Kamas</li>}
            {rewardItems.map((it, i) => <li key={i} className="rounded-full bg-surface-2 px-2.5 py-1">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name ?? `objet n°${it.id}`}</li>)}
            {rewards.flatMap((r) => r.spells).map((sp, i) => <li key={`s${i}`} className="rounded-full bg-check/15 px-2.5 py-1 text-check">Sort : {sp}</li>)}
            {rewards.reduce((n, r) => n + r.titles, 0) > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Titre</li>}
            {rewards.reduce((n, r) => n + r.emotes, 0) > 0 && <li className="rounded-full bg-surface-2 px-2.5 py-1">Attitude</li>}
          </ul>
          <p className="mt-1 text-xs text-faint">Les montants d’expérience et de kamas dépendent de votre niveau.</p>
        </section>
      )}

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

      {node.kind === 'quest' && details && (
        <section className="mt-6 rounded-xl border border-line bg-surface-2 p-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><BookOpen size={15} className="text-accent" /> Besoin d’aide pour cette quête ?</h3>
          {guide ? (
            <>
              <a href={guide.url} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-2">
                Voir le tutoriel complet sur {guide.site} <ExternalLink size={13} />
              </a>
              <p className="mt-1 text-xs text-faint">Lien trouvé automatiquement (page au titre identique), vérifié le {new Date(guide.checkedAt).toLocaleDateString('fr-FR')}. Guide externe, non officiel.</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Aucun tutoriel au titre identique n’a été trouvé sur Dofus Pour Les Noobs pour cette quête.</p>
          )}
        </section>
      )}

      <details className="mt-5 text-xs text-muted">
        <summary className="cursor-pointer select-none">Détails techniques</summary>
        <p className="mt-2">Condition exacte dans les fichiers du jeu :</p>
        <code className="mt-1 block break-all rounded-lg bg-bg p-2 text-text">{node.criterion || '(aucune)'}</code>
      </details>
    </Drawer>
  );
}
