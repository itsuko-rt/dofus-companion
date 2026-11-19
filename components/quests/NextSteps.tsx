'use client';
import Link from 'next/link';
import { ArrowRight, KeyRound, Play } from 'lucide-react';
import type { GNode, Graph, Status } from '../../src/graph.ts';
import type { Progress } from '../../src/criteria.ts';
import { nextSteps } from '../../src/regions.ts';
import { EmptyState } from '../ui';

export const questHref = (n: GNode) => `/progression/quetes/${n.category}#${n.id}`;

export default function NextSteps({ graph, status, progress, categoryName, limit = 5 }: {
  graph: Graph; status: (id: string) => Status; progress: Progress; categoryName: Map<number, string>; limit?: number;
}) {
  const { now, soon } = nextSteps(graph, status, progress, limit);
  if (!now.length && !soon.length) {
    return <EmptyState title="Rien de disponible pour l’instant">Vérifiez votre niveau dans votre profil, ou parcourez les régions.</EmptyState>;
  }
  const where = (n: GNode) => [categoryName.get(n.category ?? -1), n.level ? `niv. ${n.level}` : null].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-4">
      {now.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent"><Play size={12} /> À faire maintenant</h3>
          <ul className="flex flex-col">
            {now.map(({ node }) => (
              <li key={node.id}>
                <Link href={questHref(node)} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{node.label}</span>
                    <span className="block text-xs text-muted">{where(node)}</span>
                  </span>
                  <ArrowRight size={14} className="text-faint group-hover:text-accent" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {soon.length > 0 && (
        <div>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted"><KeyRound size={12} /> Presque débloquées</h3>
          <ul className="flex flex-col">
            {soon.map(({ node, missing }) => (
              <li key={node.id}>
                <Link href={questHref(missing!.via)} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                  Terminez <b className="font-medium text-text">« {missing!.via.label} »</b>
                  <span className="text-muted"> pour débloquer « {node.label} »</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
