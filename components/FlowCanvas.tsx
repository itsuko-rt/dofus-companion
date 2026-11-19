'use client';
import { memo, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { ArrowUpRight } from 'lucide-react';
import type { GEdge, Graph, Status } from '../src/graph.ts';
import { STATUS } from './ui';

// Top-to-bottom: a quest chain reads like a story, each column is one storyline.
const W = 248, H = 72, GATE = 40;
const KIND_LABEL = { quest: 'Quête', achievement: 'Succès', dungeon: 'Donjon', gate: '' } as const;
const STROKE: Record<Status, string> = { done: '#3fb57a', available: '#e9b44c', locked: '#3a4556', unknown: '#8b7cf6' };

type QData = {
  label: string; level?: number | null; status: Status; kind: keyof typeof KIND_LABEL;
  selected: boolean; external: string | null;
};

const QuestNode = memo(function QuestNode({ data }: NodeProps<Node<QData>>) {
  const s = STATUS[data.status];
  const Icon = s.icon;
  return (
    <div className={`flex h-[72px] w-[248px] items-center gap-2.5 rounded-xl border-2 px-3 text-left shadow-lg shadow-black/30 ${s.border} ${s.bg} bg-surface
      ${data.selected ? 'ring-2 ring-text/80 ring-offset-2 ring-offset-bg' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-1.5 !w-1.5 !border-0 !bg-faint" />
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.bg} ${s.text}`} aria-hidden>
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-[14px] font-medium leading-snug text-text" title={data.label}>{data.label}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
          <span>{KIND_LABEL[data.kind]}{data.level ? ` · niv. ${data.level}` : ''}</span>
          {data.external && (
            <span className="inline-flex items-center gap-0.5 text-check" title={`Demande aussi une quête de ${data.external}`}>
              <ArrowUpRight size={11} aria-hidden />{data.external}
            </span>
          )}
        </div>
      </div>
      <span className="sr-only">{s.label}</span>
      <Handle type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !border-0 !bg-faint" />
    </div>
  );
});

const GateNode = memo(function GateNode({ data }: NodeProps<Node<QData>>) {
  return (
    <div title="Une seule de ces quêtes suffit"
      className={`flex h-[40px] w-[40px] items-center justify-center rounded-full border-2 bg-surface text-[11px] font-bold
        ${data.status === 'done' ? 'border-done text-done' : 'border-el-eau/70 text-el-eau'}`}>
      <Handle type="target" position={Position.Top} className="!border-0 !bg-faint" />
      OU
      <Handle type="source" position={Position.Bottom} className="!border-0 !bg-faint" />
    </div>
  );
});

const nodeTypes = { quest: QuestNode, gate: GateNode };

interface Props {
  graph: Graph;
  nodeIds: Set<string>;
  edges: GEdge[];
  status: (id: string) => Status;
  selected: string | null;
  onSelect: (id: string) => void;
  viewKey: string;
  /** Region shown as a badge on quests that also need a quest from elsewhere. */
  external?: (id: string) => string | null;
  /** Nodes framed on open; by default the first rows, never zoomed below a readable size. */
  fitIds?: string[];
}

export default function FlowCanvas({ graph, nodeIds, edges, status, selected, onSelect, viewKey, external, fitIds }: Props) {
  // Layout depends only on the view, not on progress: positions stay put when you tick a quest.
  const positions = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 46, marginx: 24, marginy: 24 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const id of nodeIds) {
      const gate = id.startsWith('gate:');
      g.setNode(id, { width: gate ? GATE : W, height: gate ? GATE : H });
    }
    for (const e of edges) if (e.kind !== 'excludes' && nodeIds.has(e.from) && nodeIds.has(e.to)) g.setEdge(e.from, e.to);
    dagre.layout(g);
    const pos = new Map<string, { x: number; y: number }>();
    for (const id of nodeIds) {
      const n = g.node(id);
      const size = id.startsWith('gate:') ? GATE : W;
      pos.set(id, { x: n.x - size / 2, y: n.y - (id.startsWith('gate:') ? GATE : H) / 2 });
    }
    return pos;
  }, [nodeIds, edges]);

  const nodes = useMemo<Node<QData>[]>(() => [...nodeIds].map((id) => {
    const n = graph.nodes.get(id)!;
    const gate = n.kind === 'gate';
    return {
      id, type: gate ? 'gate' : 'quest', position: positions.get(id)!,
      width: gate ? GATE : W, height: gate ? GATE : H, draggable: false,
      data: { label: n.label, level: n.level, status: status(id), kind: n.kind, selected: id === selected, external: external?.(id) ?? null },
    };
  }), [nodeIds, positions, graph, status, selected, external]);

  const flowEdges = useMemo<Edge[]>(() => edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to)).map((e, i) => {
    const src = status(e.from);
    return {
      id: `${i}:${e.from}>${e.to}`, source: e.from, target: e.to,
      style: e.kind === 'excludes'
        ? { stroke: '#ef4444', strokeDasharray: '3 5', strokeWidth: 1.5 }
        : { stroke: STROKE[src === 'done' ? 'done' : 'locked'], strokeWidth: src === 'done' ? 2.5 : 2, strokeDasharray: e.kind === 'any_of' ? '6 4' : undefined },
    } as Edge;
  }), [edges, nodeIds, status]);

  // Frame the top of the layout (where stories start) instead of shrinking everything to fit.
  const fit = useMemo(() => {
    if (fitIds?.length) return fitIds;
    const ys = [...positions.entries()].sort((a, b) => a[1].y - b[1].y || a[1].x - b[1].x);
    return ys.slice(0, 12).map(([id]) => id);
  }, [fitIds, positions]);

  return (
    <ReactFlow
      key={viewKey}
      nodes={nodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => onSelect(n.id)}
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.55, nodes: fit.map((id) => ({ id })) }}
      minZoom={0.15}
      className="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1d2532" gap={28} />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap pannable zoomable maskColor="rgba(11,14,19,0.75)" nodeColor={(n) => STROKE[(n.data as QData).status]} className="!bg-surface" />
    </ReactFlow>
  );
}
