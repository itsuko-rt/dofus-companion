'use client';
// World map drawn in the pixel space of the official artwork (worldmapsdata geometry): map (x, y) is the
// rectangle origin + (x·mapW, y·mapH). Artwork tiles (when copied locally) underneath, zones and markers on top.
// Pan: drag / arrow keys. Zoom: wheel, pinch, +/- buttons or keys. Clicks are hit-tested (pointer capture).
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { cellsOutline, TILE_PX, type TileScale, type WorldGeometry } from '../../src/world-shared.ts';

export interface MapMarker {
  key: string; x: number; y: number; color: string; glyph: ReactNode; label: string; onClick: () => void;
  /** item icon instead of a glyph (resource markers) */
  image?: string; count?: number; selected?: boolean;
}
export interface MapHandle { focus: (x: number, y: number, mapsAcross?: number) => void; fit: () => void }

interface Props {
  handle?: Ref<MapHandle>;
  worldId: number;
  geom: WorldGeometry;
  tiles: TileScale[] | null;
  cells: [number, number, number][];
  zoneFill: (zoneId: number) => string;
  highlight: Set<number>;
  outline: Set<number>;
  labels: { key: string; x: number; y: number; text: string; minZoom: number; big?: boolean }[];
  markers: MapMarker[];
  route: { x: number; y: number }[];
  selected: { x: number; y: number } | null;
  selectedZone: number | null;
  zoneName: (zoneId: number) => string;
  onCell: (x: number, y: number) => void;
  /** pixels per map along x, reported so the parent can cluster markers */
  onZoom?: (pxPerMap: number) => void;
}

function MapCanvas({ handle, worldId, geom, tiles, cells, zoneFill, highlight, outline, labels, markers, route, selected, selectedZone, zoneName, onCell, onZoom }: Props) {
  const { originX: ox, originY: oy, mapW: mw, mapH: mh } = geom;
  const X = (x: number) => ox + x * mw, Y = (y: number) => oy + y * mh;
  const cellZone = useMemo(() => new Map(cells.map(([x, y, z]) => [`${x},${y}`, z])), [cells]);
  const byZone = useMemo(() => {
    const m = new Map<number, [number, number][]>();
    for (const [x, y, z] of cells) (m.get(z) ?? m.set(z, []).get(z)!).push([x, y]);
    return [...m].map(([id, cs]) => ({ id, fill: cs.map(([x, y]) => `M${x} ${y}h1v1h-1z`).join(''), border: cellsOutline(cs) }));
  }, [cells]);
  const box = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
    return { x0: ox + (x0 - 1) * mw, y0: oy + (y0 - 1) * mh, w: (x1 - x0 + 2) * mw, h: (y1 - y0 + 2) * mh };
  }, [cells, ox, oy, mw, mh]);

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
  const fitW = Math.max(box.w, (box.h * size.w) / size.h);
  const fit = useCallback(() => setView({ cx: box.x0 + box.w / 2, cy: box.y0 + box.h / 2, w: fitW }), [box, fitW]);
  useEffect(() => { setView(null); }, [worldId]);
  useEffect(() => { if (!view) fit(); }, [view, fit]);
  const minW = mw * 6, maxW = fitW * 1.3;
  useImperativeHandle(handle, () => ({
    focus: (x, y, across = 14) => setView({ cx: ox + (x + 0.5) * mw, cy: oy + (y + 0.5) * mh, w: Math.min(maxW, Math.max(minW, across * mw)) }),
    fit,
  }), [ox, oy, mw, mh, maxW, minW, fit]);

  const v = view ?? { cx: 0, cy: 0, w: 1000 };
  const h = (v.w * size.h) / size.w;
  const upp = v.w / size.w;           // world px per screen px
  const pxPerMap = mw / upp;
  const zoomBucket = Math.round(pxPerMap * 2);
  useEffect(() => { onZoom?.(pxPerMap); }, [zoomBucket]); // eslint-disable-line react-hooks/exhaustive-deps
  const toWorld = (px: number, py: number) => ({ x: v.cx - v.w / 2 + px * upp, y: v.cy - h / 2 + py * upp });
  const toCell = (wx: number, wy: number): [number, number] => [Math.floor((wx - ox) / mw), Math.floor((wy - oy) / mh)];

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => setView((cur) => {
    if (!cur) return cur;
    const sx = px ?? size.w / 2, sy = py ?? size.h / 2;
    const w = Math.min(maxW, Math.max(minW, cur.w * factor));
    const ch = (cur.w * size.h) / size.w;
    const mx = cur.cx - cur.w / 2 + (sx / size.w) * cur.w, my = cur.cy - ch / 2 + (sy / size.h) * ch;
    const k = w / cur.w;
    return { w, cx: mx + (cur.cx - mx) * k, cy: my + (cur.cy - my) * k };
  }), [size, maxW, minW]);
  const pan = useCallback((dx: number, dy: number) => setView((cur) => (cur ? { ...cur, cx: cur.cx + dx * (cur.w / size.w), cy: cur.cy + dy * (cur.w / size.w) } : cur)), [size]);

  // pointers: one = pan, two = pinch; release without movement = click (hit-tested: markers first, then the map cell)
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const pinch = useRef<number | null>(null);
  const r = Math.min(10, Math.max(5, pxPerMap * 0.6)) * upp; // marker radius
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = 0;
  };
  const onMove = (e: React.PointerEvent) => {
    const rect = wrap.current!.getBoundingClientRect();
    const p = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    const c = toCell(p.x, p.y);
    setHover((hv) => (hv && hv[0] === c[0] && hv[1] === c[1] ? hv : c));
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoomAt(pinch.current / d, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinch.current = d;
      moved.current += 10;
      return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    moved.current += Math.abs(dx) + Math.abs(dy);
    pan(-dx, -dy);
  };
  const onUp = (e: React.PointerEvent) => {
    const was = pointers.current.size;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (was !== 1 || moved.current >= 6) return;
    const rect = wrap.current!.getBoundingClientRect();
    const p = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    let best: MapMarker | null = null, bd = (r * 1.3) ** 2;
    for (const m of markers) { const d = (X(m.x) - p.x) ** 2 + (Y(m.y) - p.y) ** 2; if (d <= bd) { bd = d; best = m; } }
    if (best) { best.onClick(); return; }
    const [cx, cy] = toCell(p.x, p.y);
    onCell(cx, cy);
  };
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); const rect = el.getBoundingClientRect(); zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [zoomAt]);
  const onKey = (e: React.KeyboardEvent) => {
    const step = 80;
    const k: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0), ArrowRight: () => pan(step, 0), ArrowUp: () => pan(0, -step), ArrowDown: () => pan(0, step),
      '+': () => zoomAt(0.7), '=': () => zoomAt(0.7), '-': () => zoomAt(1.4), '0': fit,
    };
    if (k[e.key]) { e.preventDefault(); k[e.key](); }
  };

  // artwork: the smallest scale at least as sharp as the screen, tiles in view only
  const tileLayer = useMemo(() => {
    if (!tiles?.length || !view) return [];
    const need = 1 / upp;
    const s = tiles.find((t) => t.scale >= need) ?? tiles[tiles.length - 1];
    const span = TILE_PX / s.scale;
    const x0 = v.cx - v.w / 2, y0 = v.cy - h / 2;
    const out: { key: string; href: string; x: number; y: number; w: number; h: number }[] = [];
    for (let row = Math.max(0, Math.floor(y0 / span)); row <= Math.min(s.rows - 1, Math.floor((y0 + h) / span)); row++) {
      for (let col = Math.max(0, Math.floor(x0 / span)); col <= Math.min(s.cols - 1, Math.floor((x0 + v.w) / span)); col++) {
        const w = Math.min(span, geom.totalW - col * span), hh = Math.min(span, geom.totalH - row * span);
        out.push({ key: `${s.scale}-${row}-${col}`, href: `/ankama/worldmap/${worldId}/${s.scale}/${row * s.cols + col + 1}.webp`, x: col * span, y: row * span, w, h: hh });
      }
    }
    return out;
  }, [tiles, view, upp, v.cx, v.cy, v.w, h, worldId, geom.totalW, geom.totalH]);
  const art = tileLayer.length > 0;
  const hoverZone = hover ? cellZone.get(`${hover[0]},${hover[1]}`) : undefined;
  const dim = highlight.size > 0;

  return (
    <div ref={wrap} tabIndex={0} onKeyDown={onKey} aria-label="Carte du monde : flèches pour se déplacer, + et - pour zoomer, 0 pour tout voir"
      className="relative h-full w-full touch-none select-none overflow-hidden bg-[#1c3a46] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" data-testid="world-map">
      <svg role="img" aria-label="Carte du monde" width={size.w} height={size.h} viewBox={`${v.cx - v.w / 2} ${v.cy - h / 2} ${v.w} ${h}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={() => setHover(null)}
        className="absolute inset-0 block cursor-grab active:cursor-grabbing">
        {tileLayer.map((t) => <image key={t.key} href={t.href} x={t.x} y={t.y} width={t.w} height={t.h} preserveAspectRatio="none" />)}
        <g transform={`translate(${ox} ${oy}) scale(${mw} ${mh})`}>
          {byZone.map((z) => (
            <path key={z.id} d={z.fill} data-zone={z.id} fill={art ? '#000' : zoneFill(z.id)}
              fillOpacity={art ? (dim && !highlight.has(z.id) ? 0.45 : 0) : dim && !highlight.has(z.id) ? 0.4 : 1} />
          ))}
          {byZone.filter((z) => highlight.has(z.id)).map((z) => <path key={`h${z.id}`} d={z.fill} fill="#f0b23a" fillOpacity={art ? 0.3 : 0.55} pointerEvents="none" />)}
          <path d={byZone.map((z) => z.border).join('')} stroke={art ? '#fff8e6' : '#0b0907'} strokeOpacity={art ? 0.3 : 0.55} strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          {byZone.filter((z) => outline.has(z.id)).map((z) => <path key={`o${z.id}`} d={z.border} stroke="#e0503f" strokeWidth={2.5} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
          {selectedZone != null && byZone.filter((z) => z.id === selectedZone).map((z) => <path key="sz" d={z.border} stroke="#fdf5cb" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
          {pxPerMap >= 10 && hover && <rect x={hover[0]} y={hover[1]} width={1} height={1} fill="#fff" fillOpacity={0.12} stroke="#fff" strokeWidth={1} vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          {selected && <rect x={selected.x} y={selected.y} width={1} height={1} fill="#fdf5cb" fillOpacity={0.25} stroke="#fdf5cb" strokeWidth={2.5} vectorEffect="non-scaling-stroke" pointerEvents="none" data-testid="selected-map" />}
        </g>
        {route.length > 1 && <polyline points={route.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} fill="none" stroke="#fdf5cb" strokeWidth={2.5 * upp} strokeDasharray={`${6 * upp} ${4 * upp}`} pointerEvents="none" />}
        {route.map((p, i) => (
          <g key={`r${i}`} pointerEvents="none">
            <circle cx={X(p.x)} cy={Y(p.y)} r={r * 1.1} fill="#fdf5cb" stroke="#15110d" strokeWidth={1.5 * upp} />
            <text x={X(p.x)} y={Y(p.y)} dy="0.35em" textAnchor="middle" fontSize={11 * upp} fontWeight={700} fill="#15110d">{i + 1}</text>
          </g>
        ))}
        {labels.filter((l) => pxPerMap >= l.minZoom).map((l) => (
          <text key={l.key} x={X(l.x)} y={Y(l.y)} textAnchor="middle" fontSize={(l.big ? 12 : 11) * upp} fontWeight={l.big ? 700 : 500}
            fill={l.big ? '#fdf5cb' : '#f4ecdc'} stroke="#0b0907" strokeWidth={3 * upp} paintOrder="stroke" pointerEvents="none"
            style={l.big ? { textTransform: 'uppercase', letterSpacing: '0.05em' } : undefined}>{l.text}</text>
        ))}
        {markers.map((m) => (
          <g key={m.key} transform={`translate(${X(m.x)} ${Y(m.y)})`} aria-label={m.label} data-marker={m.key}>
            <title>{m.label}</title>
            {m.image ? (
              <>
                <circle r={r * 1.15} fill="#15110d" fillOpacity={0.8} stroke={m.selected ? '#fdf5cb' : m.color} strokeWidth={1.5 * upp} />
                <image href={m.image} x={-r} y={-r} width={r * 2} height={r * 2} />
              </>
            ) : (
              <>
                <circle r={r} fill={m.color} stroke={m.selected ? '#fdf5cb' : '#0b0907'} strokeWidth={(m.selected ? 2.5 : 1.2) * upp} />
                <svg x={-r * 0.62} y={-r * 0.62} width={r * 1.24} height={r * 1.24} viewBox="0 0 24 24" overflow="visible">{m.glyph}</svg>
              </>
            )}
            {m.count != null && m.count > 1 && (
              <g transform={`translate(${r * 0.85} ${-r * 0.85})`}>
                <circle r={r * 0.65} fill="#fdf5cb" stroke="#15110d" strokeWidth={upp} />
                <text dy="0.35em" textAnchor="middle" fontSize={9 * upp} fontWeight={700} fill="#15110d">{m.count > 99 ? '99+' : m.count}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[60%] truncate rounded-md border border-line bg-bg/90 px-2 py-1 text-xs text-muted" data-testid="hover-coords">
        {hover ? <><span className="font-mono text-text">[{hover[0]}, {hover[1]}]</span>{hoverZone != null && <> · {zoneName(hoverZone)}</>}</> : 'Survolez la carte'}
      </div>
      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-md border border-line bg-surface">
        <button aria-label="Zoomer" title="Zoomer (+)" className="p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={() => zoomAt(0.7)}><Plus size={16} /></button>
        <button aria-label="Dézoomer" title="Dézoomer (-)" className="border-t border-line p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={() => zoomAt(1.4)}><Minus size={16} /></button>
        <button aria-label="Voir toute la carte" title="Toute la carte (0)" className="border-t border-line p-2 text-muted hover:bg-surface-2 hover:text-text" onClick={fit}><Maximize2 size={16} /></button>
      </div>
      {art && <p className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/80 [text-shadow:0_1px_0_#000]">Carte © Ankama</p>}
    </div>
  );
}
export default memo(MapCanvas);
