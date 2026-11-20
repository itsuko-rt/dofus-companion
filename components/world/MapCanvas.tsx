'use client';
// SVG world map drawn from the game's map coordinates: one unit = one in-game map ([x, y], y grows southwards).
// Pan with drag, zoom with wheel / pinch / buttons. Markers keep a constant on-screen size.
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cellsOutline } from '../../src/world-shared.ts';

export interface MapMarker { key: string; x: number; y: number; color: string; glyph: ReactNode; label: string; onClick: () => void; selected?: boolean }
export interface MapFocus { x: number; y: number; w?: number; seq: number }

interface Props {
  cells: [number, number, number][];
  zoneFill: (zoneId: number) => string;
  /** zones drawn on top with a gold fill (resource / profession layer) */
  highlight: Set<number>;
  /** zones outlined in red (monster search) */
  outline: Set<number>;
  dimOthers: boolean;
  labels: { key: string; x: number; y: number; text: string; minZoom: number; big?: boolean }[];
  markers: MapMarker[];
  route: { x: number; y: number }[];
  selectedZone: number | null;
  onZone: (zoneId: number) => void;
  focus: MapFocus | null;
}

const MIN_W = 8;   // most zoomed-in: 8 maps across
const PAD = 2;

function MapCanvas({ cells, zoneFill, highlight, outline, dimOthers, labels, markers, route, selectedZone, onZone, focus }: Props) {
  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
    return { x0: x0 - PAD, y0: y0 - PAD, w: x1 - x0 + 2 * PAD, h: y1 - y0 + 2 * PAD };
  }, [cells]);
  const byZone = useMemo(() => {
    const m = new Map<number, [number, number][]>();
    for (const [x, y, z] of cells) (m.get(z) ?? m.set(z, []).get(z)!).push([x, y]);
    return [...m].map(([id, cs]) => ({ id, fill: cs.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join(''), border: cellsOutline(cs) }));
  }, [cells]);
  const cellZone = useMemo(() => new Map(cells.map(([x, y, z]) => [`${x},${y}`, z])), [cells]);

  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [view, setView] = useState<{ cx: number; cy: number; w: number } | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width || 1, h: e.contentRect.height || 1 }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fit = useCallback(() => setView({ cx: box.x0 + box.w / 2, cy: box.y0 + box.h / 2, w: Math.max(box.w, (box.h * size.w) / size.h) }), [box, size]);
  useEffect(() => { if (!view) fit(); }, [view, fit]);
  useEffect(() => { if (focus) setView((v) => ({ cx: focus.x, cy: focus.y, w: focus.w ?? Math.min(v?.w ?? 40, 30) })); }, [focus]);

  const v = view ?? { cx: 0, cy: 0, w: 100 };
  const h = (v.w * size.h) / size.w;
  const upp = v.w / size.w; // map units per screen pixel
  const maxW = Math.max(box.w, (box.h * size.w) / size.h) * 1.2;
  const clampW = (w: number) => Math.min(maxW, Math.max(MIN_W, w));
  const toMap = (px: number, py: number) => ({ x: v.cx - v.w / 2 + px * upp, y: v.cy - h / 2 + py * upp });

  const zoomAt = (factor: number, px = size.w / 2, py = size.h / 2) => setView((cur) => {
    if (!cur) return cur;
    const w = clampW(cur.w * factor);
    const ch = (cur.w * size.h) / size.w;
    const mx = cur.cx - cur.w / 2 + (px / size.w) * cur.w, my = cur.cy - ch / 2 + (py / size.h) * ch;
    const k = w / cur.w;
    return { w, cx: mx + (cur.cx - mx) * k, cy: my + (cur.cy - my) * k };
  });

  // pointers: one = pan, two = pinch; a press that barely moves is a click
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    const p = toMap(e.clientX - r.left, e.clientY - r.top);
    setHover([Math.floor(p.x), Math.floor(p.y)]);
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomAt(pinch.current / d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.current = d;
      moved.current += 10;
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    setView((cur) => (cur ? { ...cur, cx: cur.cx - dx * upp, cy: cur.cy - dy * upp } : cur));
  };
  // pointer capture sends the click to the <svg>, so what was clicked is found here: nearest marker, else the zone
  const onUp = (e: React.PointerEvent) => {
    const was = pointers.current.size;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (was !== 1 || moved.current >= 6) return;
    const rect = wrap.current!.getBoundingClientRect();
    const p = toMap(e.clientX - rect.left, e.clientY - rect.top);
    let best: MapMarker | null = null, bd = (r * 1.3) ** 2;
    for (const m of markers) { const d = (m.x - p.x) ** 2 + (m.y - p.y) ** 2; if (d <= bd) { bd = d; best = m; } }
    if (best) { best.onClick(); return; }
    const z = cellZone.get(`${Math.floor(p.x)},${Math.floor(p.y)}`);
    if (z != null) onZone(z);
  };
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });
  const zoom = size.w / v.w; // pixels per map

  // marker radius in screen pixels: small when the whole world is shown, 9 px from ~10 px per map
  const r = Math.min(9, Math.max(4, zoom * 0.9)) * upp;
  return (
    <div ref={wrap} className="relative h-full w-full touch-none select-none overflow-hidden bg-[#0f1a1e]" data-testid="world-map">
      <svg role="img" aria-label="Carte du monde" width={size.w} height={size.h} viewBox={`${v.cx - v.w / 2} ${v.cy - h / 2} ${v.w} ${h}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setHover(null)}
        className="absolute inset-0 block cursor-grab active:cursor-grabbing">
        {byZone.map((z) => {
          const dim = dimOthers && !highlight.has(z.id);
          return (
            <path key={z.id} d={z.fill} data-zone={z.id} fill={zoneFill(z.id)} fillOpacity={dim ? 0.35 : 1} />
          );
        })}
        {byZone.filter((z) => highlight.has(z.id)).map((z) => <path key={`h${z.id}`} d={z.fill} fill="#e8b33a" fillOpacity={0.55} pointerEvents="none" />)}
        <path d={byZone.map((z) => z.border).join('')} stroke="#0b0907" strokeOpacity={0.55} strokeWidth={1.2 * upp} fill="none" pointerEvents="none" />
        {byZone.filter((z) => outline.has(z.id)).map((z) => <path key={`o${z.id}`} d={z.border} stroke="#e0503f" strokeWidth={2.5 * upp} fill="none" pointerEvents="none" />)}
        {selectedZone != null && byZone.filter((z) => z.id === selectedZone).map((z) => (
          <path key="sel" d={z.border} stroke="#fdf5cb" strokeWidth={3 * upp} fill="none" pointerEvents="none" />
        ))}
        {route.length > 1 && <polyline points={route.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#fdf5cb" strokeWidth={2.5 * upp} strokeDasharray={`${6 * upp} ${4 * upp}`} pointerEvents="none" />}
        {route.map((p, i) => (
          <g key={`r${i}`} pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={r * 1.1} fill="#fdf5cb" stroke="#15110d" strokeWidth={1.5 * upp} />
            <text x={p.x} y={p.y} dy="0.35em" textAnchor="middle" fontSize={11 * upp} fontWeight={700} fill="#15110d">{i + 1}</text>
          </g>
        ))}
        {labels.filter((l) => zoom >= l.minZoom).map((l) => (
          <text key={l.key} x={l.x} y={l.y} textAnchor="middle" fontSize={(l.big ? 11 : 11) * upp} fontWeight={l.big ? 700 : 500}
            fill={l.big ? '#fdf5cb' : '#f4ecdc'} stroke="#0b0907" strokeWidth={3 * upp} paintOrder="stroke" pointerEvents="none"
            style={l.big ? { textTransform: 'uppercase', letterSpacing: '0.05em' } : undefined}>{l.text}</text>
        ))}
        {markers.map((m) => (
          <g key={m.key} transform={`translate(${m.x} ${m.y})`} aria-label={m.label}>
            <title>{m.label}</title>
            <circle r={r} fill={m.color} stroke={m.selected ? '#fdf5cb' : '#0b0907'} strokeWidth={(m.selected ? 2.5 : 1.2) * upp} />
            <svg x={-r * 0.62} y={-r * 0.62} width={r * 1.24} height={r * 1.24} viewBox="0 0 24 24" overflow="visible">{m.glyph}</svg>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 left-3 rounded-md border border-line bg-bg/90 px-2 py-1 font-mono text-xs text-muted" aria-live="off">
        {hover ? `[${hover[0]}, ${hover[1]}]` : 'Survolez la carte'}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md border border-line bg-surface">
        <button aria-label="Zoomer" className="p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={() => zoomAt(0.7)}><Plus size={16} /></button>
        <button aria-label="Dézoomer" className="border-t border-line p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={() => zoomAt(1.4)}><Minus size={16} /></button>
        <button aria-label="Voir toute la carte" className="border-t border-line p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={fit}><Maximize2 size={16} /></button>
      </div>
    </div>
  );
}
export default memo(MapCanvas);
