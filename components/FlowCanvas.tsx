'use client';
import { memo, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import type { Graph, Status } from '../src/graph.ts';
import type { View } from '../src/views.ts';

const W = 220, H = 58, GATE = 34;

export const STATUS_STYLE: Record<Status, { box: string; dot: string; label: string }> = {
  done: { box: 'border-emerald-600/70 bg-emerald-950/70', dot: 'bg-emerald-400', label: 'Terminée' },
  available: { box: 'border-amber-400 bg-amber-950/50 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]', dot: 'bg-amber-400', label: 'Disponible' },
  locked: { box: 'border-zinc-700 bg-zinc-900 text-zinc-400', dot: 'bg-zinc-500', label: 'Bloquée' },
  unknown: { box: 'border-dashed border-violet-500/60 bg-violet-950/30', dot: 'bg-violet-400', label: 'Incertaine' },
};

const KIND_LABEL = { quest: 'Quête', achievement: 'Succès', dungeon: 'Donjon', gate: '' } as const;

type QData = { label: string; level?: number | null; status: Status; kind: keyof typeof KIND_LABEL; faded: boolean; selected: boolean };

const QuestNode = memo(function QuestNode({ data }: NodeProps<Node<QData>>) {
  const s = STATUS_STYLE[data.status];
  return (
    <div
      className={`flex h-[58px] w-[220px] flex-col justify-center rounded-md border px-2.5 text-left transition-opacity ${s.box}
        ${data.faded ? 'opacity-50' : ''} ${data.selected ? 'ring-2 ring-sky-400' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-zinc-600" />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-400">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {KIND_LABEL[data.kind]}{data.level ? ` · niv. ${data.level}` : ''}
      </div>
      <div className="truncate text-[13px] font-medium leading-tight text-zinc-100" title={data.label}>{data.label}</div>
      <Handle type="source" position={Position.Right} className="!border-0 !bg-zinc-600" />
    </div>
  );
});

const GateNode = memo(function GateNode({ data }: NodeProps<Node<QData>>) {
  return (
    <div
      title="Une seule de ces quêtes suffit"
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[10px] font-semibold
        ${data.status === 'done' ? 'border-emerald-600 bg-emerald-950 text-emerald-300' : 'border-sky-700 bg-zinc-900 text-sky-300'}`}
    >
      <Handle type="target" position={Position.Left} className="!border-0 !bg-zinc-600" />
      OU
      <Handle type="source" position={Position.Right} className="!border-0 !bg-zinc-600" />
    </div>
  );
});

const nodeTypes = { quest: QuestNode, gate: GateNode };

const EDGE_STYLE = {
  requires: { stroke: '#71717a' },
  any_of: { stroke: '#0ea5e9', strokeDasharray: '4 3' },
  excludes: { stroke: '#ef4444', strokeDasharray: '2 4' },
  in_dungeon: { stroke: '#71717a' },
} as const;

interface Props {
  graph: Graph;
  view: View;
  status: (id: string) => Status;
  /** Nodes drawn at full opacity (the rest is context, e.g. prerequisites from another region). */
  primary: (id: string) => boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  viewKey: string;
  /** Frame only these nodes on open (long chains would otherwise shrink to unreadable size). */
  fitIds?: string[];
}

export default function FlowCanvas({ graph, view, status, primary, selected, onSelect, viewKey, fitIds }: Props) {
  // Layout depends only on the view, not on progress: positions stay put when you tick a quest.
  const positions = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', nodesep: 14, ranksep: 70, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const id of view.nodes) {
      const gate = id.startsWith('gate:');
      g.setNode(id, { width: gate ? GATE : W, height: gate ? GATE : H });
    }
    for (const e of view.edges) if (e.kind !== 'excludes') g.setEdge(e.from, e.to);
    dagre.layout(g);
    const pos = new Map<string, { x: number; y: number }>();
    for (const id of view.nodes) {
      const n = g.node(id);
      const size = id.startsWith('gate:') ? GATE : W;
      pos.set(id, { x: n.x - size / 2, y: n.y - (id.startsWith('gate:') ? GATE : H) / 2 });
    }
    return pos;
  }, [view]);

  const nodes = useMemo<Node<QData>[]>(() => [...view.nodes].map((id) => {
    const n = graph.nodes.get(id)!;
    const gate = n.kind === 'gate';
    return {
      id,
      type: gate ? 'gate' : 'quest',
      position: positions.get(id)!,
      // known size up front so fitView frames the whole view before React Flow measures the DOM
      width: gate ? GATE : W,
      height: gate ? GATE : H,
      data: { label: n.label, level: n.level, status: status(id), kind: n.kind, faded: !primary(id), selected: id === selected },
      draggable: false,
    };
  }), [view, positions, graph, status, primary, selected]);

  const edges = useMemo<Edge[]>(() => view.edges.map((e, i) => ({
    id: `${i}:${e.from}>${e.to}`,
    source: e.from,
    target: e.to,
    style: EDGE_STYLE[e.kind],
    animated: false,
  })), [view]);

  return (
    <ReactFlow
      key={viewKey}
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => onSelect(n.id)}
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.15, maxZoom: 1.1, nodes: fitIds?.map((id) => ({ id })) }}
      minZoom={0.1}
      className="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#27272a" gap={24} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable maskColor="rgba(11,13,16,0.7)" nodeColor="#3f3f46" className="!bg-zinc-900" />
    </ReactFlow>
  );
}
