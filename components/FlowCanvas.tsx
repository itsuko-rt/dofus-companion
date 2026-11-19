'use client';
import { memo, useEffect, useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, useReactFlow,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowUpRight, ChevronDown, ChevronRight, Egg, Timer } from 'lucide-react';
import type { GEdge, Graph, Status } from '../src/graph.ts';
import { CHAIN_HEADER, packLayout } from '../src/layout.ts';
import { connected } from '../src/views.ts';
import { STATUS } from './ui';

// Compact nodes: a region shows dozens of chains, so each quest is a small card.
const W = 204, H = 54, GATE = 30;
const STROKE: Record<Status, string> = { done: '#3fb57a', available: '#e9b44c', locked: '#3a4660', unknown: '#9a7cf6' };
const ACTIVE = '#5b9cf5';
const size = (id: string) => (id.startsWith('gate:') ? { w: GATE, h: GATE } : { w: W, h: H });

type QData = {
  label: string; level?: number | null; status: Status; kind: string; active: boolean;
  selected: boolean; dim: boolean; external: string | null; dofus: boolean;
};
type CData = { title: string; done: number; total: number; collapsed: boolean; onToggle: () => void; dim: boolean };

const QuestNode = memo(function QuestNode({ data }: NodeProps<Node<QData>>) {
  const s = STATUS[data.status];
  const Icon = data.active ? Timer : s.icon;
  const tone = data.active ? 'border-info text-info' : `${s.border} ${s.text}`;
  return (
    <div title={`${data.label}${data.level ? ` · niv. ${data.level}` : ''} · ${data.active ? 'En cours' : s.label}`}
      className={`flex h-[54px] w-[204px] items-center gap-2 rounded-lg border bg-gradient-to-b from-surface-2 to-surface px-2 text-left shadow-[inset_0_1px_0_rgba(255,240,210,0.06)] transition-[opacity,box-shadow] duration-150 hover:shadow-md hover:shadow-black/40
        ${tone} ${data.selected ? 'ring-2 ring-text ring-offset-2 ring-offset-bg' : ''} ${data.dim ? 'opacity-30' : ''} ${data.status === 'locked' && !data.active ? 'bg-surface/70' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !min-w-0 !border-0 !bg-faint" />
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${data.active ? 'bg-info/15' : s.bg}`} aria-hidden>
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`line-clamp-2 text-[12.5px] font-medium leading-tight ${data.status === 'locked' ? 'text-muted' : 'text-text'}`}>{data.label}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-faint">
          {data.level ? <span>niv. {data.level}</span> : data.kind === 'achievement' ? <span>Succès</span> : null}
          {data.dofus && <span className="inline-flex items-center gap-0.5 text-accent"><Egg size={10} aria-hidden />Dofus</span>}
          {data.external && <span className="inline-flex min-w-0 items-center gap-0.5 truncate text-check"><ArrowUpRight size={10} aria-hidden />{data.external}</span>}
        </div>
      </div>
      <span className="sr-only">{data.active ? 'En cours' : s.label}</span>
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !min-w-0 !border-0 !bg-faint" />
    </div>
  );
});

const GateNode = memo(function GateNode({ data }: NodeProps<Node<QData>>) {
  return (
    <div title="Une seule de ces quêtes suffit"
      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border bg-surface text-[9.5px] font-bold
        ${data.status === 'done' ? 'border-done text-done' : 'border-info/70 text-info'} ${data.dim ? 'opacity-30' : ''}`}>
      <Handle type="target" position={Position.Top} className="!h-1 !w-1 !min-w-0 !border-0 !bg-faint" />
      OU
      <Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !min-w-0 !border-0 !bg-faint" />
    </div>
  );
});

/** Frame around one quest chain, with a header to fold it. */
const ChainNode = memo(function ChainNode({ data, width, height }: NodeProps<Node<CData>>) {
  const pct = data.total ? Math.round((data.done / data.total) * 100) : 0;
  return (
    <div style={{ width, height }} className={`rounded-xl border border-line/80 bg-surface-2/35 ${data.dim ? 'opacity-50' : ''}`}>
      <button onClick={(e) => { e.stopPropagation(); data.onToggle(); }} aria-expanded={!data.collapsed}
        className="nodrag flex w-full items-center gap-1.5 rounded-t-xl px-2.5 text-left text-[11.5px] text-muted hover:text-text" style={{ height: CHAIN_HEADER }}>
        {data.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        <span className="min-w-0 flex-1 truncate font-medium">{data.title}</span>
        <span className="shrink-0 tabular-nums">{data.done}/{data.total}</span>
        <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-line" aria-hidden><span className="block h-full bg-done" style={{ width: `${pct}%` }} /></span>
      </button>
    </div>
  );
});

const nodeTypes = { quest: QuestNode, gate: GateNode, chain: ChainNode };

interface Props {
  graph: Graph;
  nodeIds: Set<string>;
  edges: GEdge[];
  status: (id: string) => Status;
  isActive: (id: string) => boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Right-click: toggle done; with Shift/Ctrl also the prerequisites. */
  onToggleDone?: (id: string, withPrerequisites: boolean) => void;
  viewKey: string;
  /** Region shown as a badge on quests that also need a quest from elsewhere. */
  external?: (id: string) => string | null;
  dofus?: (id: string) => boolean;
  /** Nodes not matching the status filter are dimmed (kept so chains stay readable). */
  dim?: (id: string) => boolean;
  collapsed?: ReadonlySet<string>;
  onToggleChain?: (chainId: string) => void;
  /** Node to bring into view when it changes (search, deep link). */
  centerOn?: string | null;
  /** Nodes framed on open; by default the first chains. */
  fitIds?: string[];
}

function CenterOn({ id, pos }: { id?: string | null; pos: Map<string, { x: number; y: number }> }) {
  const flow = useReactFlow();
  useEffect(() => {
    const p = id ? pos.get(id) : undefined;
    if (p) void flow.setCenter(p.x + W / 2, p.y + H / 2, { zoom: Math.max(flow.getZoom(), 0.9), duration: 400 });
  }, [id]); // only when a new node is requested, not on every layout change
  return null;
}

export default function FlowCanvas(p: Props) {
  const { graph, nodeIds, edges, status, isActive, selected, onSelect, onToggleDone, viewKey, external, dofus, dim, collapsed, onToggleChain, centerOn, fitIds } = p;
  const viewEdges = useMemo(() => edges.filter((e) => e.kind !== 'excludes' && nodeIds.has(e.from) && nodeIds.has(e.to)), [edges, nodeIds]);

  // Layout depends only on the view, not on progress: positions stay put when you tick a quest.
  const layout = useMemo(
    () => packLayout([...nodeIds], viewEdges, size, (id) => graph.nodes.get(id)?.level ?? 0, collapsed),
    [nodeIds, viewEdges, graph, collapsed],
  );

  const lit = useMemo(() => {
    if (!selected || !nodeIds.has(selected)) return null;
    const { up, down } = connected(viewEdges, selected);
    return new Set([selected, ...up, ...down]);
  }, [selected, nodeIds, viewEdges]);

  const nodes = useMemo<Node[]>(() => {
    const frames: Node<CData>[] = layout.chains.map((c) => {
      const quests = c.nodes.filter((n) => !n.startsWith('gate:'));
      const first = graph.nodes.get(c.id);
      return {
        id: `chain:${c.id}`, type: 'chain', position: { x: c.x, y: c.y }, width: c.w, height: c.h,
        draggable: false, selectable: false, focusable: false, zIndex: 0,
        data: {
          title: c.id === 'singles' ? `Quêtes indépendantes (${quests.length})` : `${first?.label ?? 'Chaîne'}${first?.level ? ` · niv. ${first.level}` : ''}`,
          done: quests.filter((n) => status(n) === 'done').length, total: quests.length, collapsed: c.collapsed,
          onToggle: () => onToggleChain?.(c.id), dim: !!lit && !c.nodes.some((n) => lit.has(n)),
        },
      };
    });
    const items: Node<QData>[] = [...layout.pos.entries()].map(([id, position]) => {
      const n = graph.nodes.get(id)!;
      const st = status(id);
      return {
        id, type: n.kind === 'gate' ? 'gate' : 'quest', position, ...(n.kind === 'gate' ? { width: GATE, height: GATE } : { width: W, height: H }),
        draggable: false, zIndex: 1, ariaLabel: n.label,
        data: {
          label: n.label, level: n.level, status: st, kind: n.kind, active: st !== 'done' && isActive(id), selected: id === selected,
          dim: lit ? !lit.has(id) : !!dim?.(id), external: external?.(id) ?? null, dofus: dofus?.(id) ?? false,
        },
      };
    });
    return [...frames, ...items];
  }, [layout, graph, status, isActive, selected, lit, dim, external, dofus, onToggleChain]);

  const flowEdges = useMemo<Edge[]>(() => {
    const fanIn = new Map<string, number>();
    for (const e of viewEdges) fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
    return edges.filter((e) => layout.pos.has(e.from) && layout.pos.has(e.to)).map((e, i) => {
    const src = status(e.from);
    const on = lit?.has(e.from) && lit.has(e.to);
    // edges into a quest with many prerequisites cross the map: kept faint until it is selected
    const crowd = (fanIn.get(e.to) ?? 0) > 8 && !on;
    const stroke = e.kind === 'excludes' ? '#ef4444' : on ? '#e7eaf0' : STROKE[src === 'done' ? 'done' : 'locked'];
    return {
      id: `${i}:${e.from}>${e.to}`, source: e.from, target: e.to, zIndex: 1, focusable: false,
      style: {
        stroke, strokeWidth: on ? 2.4 : src === 'done' ? 2 : 1.6, opacity: (lit && !on) || crowd ? 0.2 : 1,
        strokeDasharray: e.kind === 'excludes' ? '3 5' : e.kind === 'any_of' ? '5 4' : undefined,
      },
    } as Edge;
    });
  }, [edges, viewEdges, layout, status, lit]);

  // Frame the first chains (lowest level) at a readable zoom instead of shrinking the whole region.
  const fit = useMemo(() => {
    if (fitIds?.length) return fitIds.filter((id) => layout.pos.has(id));
    // the start of the first chain (top-left), so a 200-quest region still opens at a readable zoom
    const first = layout.chains[0];
    if (!first) return [];
    const placed = first.nodes.filter((n) => layout.pos.has(n));
    const left = Math.min(...placed.map((n) => layout.pos.get(n)!.x));
    const start = placed.filter((n) => layout.pos.get(n)!.x < left + 900)
      .sort((a, b) => layout.pos.get(a)!.y - layout.pos.get(b)!.y || layout.pos.get(a)!.x - layout.pos.get(b)!.x).slice(0, 6);
    return first.nodes.length <= 24 ? [`chain:${first.id}`, ...layout.chains.slice(1, 3).map((c) => `chain:${c.id}`)] : start;
  }, [fitIds, layout]);

  return (
    <ReactFlow
      key={viewKey}
      nodes={nodes}
      edges={flowEdges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, n) => n.type !== 'chain' && n.type !== 'gate' && onSelect(n.id)}
      onNodeContextMenu={(e, n) => {
        if (n.type !== 'quest' || !onToggleDone) return;
        e.preventDefault();
        onToggleDone(n.id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onPaneContextMenu={(e) => e.preventDefault()}
      nodesConnectable={false}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ padding: 0.12, maxZoom: 1, minZoom: 0.55, nodes: fit.map((id) => ({ id })) }}
      minZoom={0.1}
      className="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#1b2335" gap={24} />
      <Controls showInteractive={false} position="bottom-left" />
      <MiniMap pannable zoomable maskColor="rgba(9,12,20,0.78)" className="!bg-surface max-md:!hidden"
        nodeColor={(n) => (n.type === 'chain' ? '#1a2232' : (n.data as QData).active ? ACTIVE : STROKE[(n.data as QData).status])} />
      <CenterOn id={centerOn} pos={layout.pos} />
    </ReactFlow>
  );
}
