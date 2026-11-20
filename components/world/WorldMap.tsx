'use client';
// Interactive world map: official artwork + zones from the game coordinates, resource filters by profession,
// point-of-interest layers, map details with /travel, search palette (Ctrl+K, /), route planner.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eraser, Layers, Maximize2, Route, Save, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { cluster, orderStops, type WorldData, type WorldZone } from '../../src/world-shared.ts';
import { useCharacter } from '../useCharacter';
import MapCanvas, { type MapHandle, type MapMarker } from './MapCanvas';
import MapDetails from './MapDetails';
import { ActiveFilter, LayerFilters, ResourceFilters } from './MapFilters';
import MapSearch, { type SearchHit } from './MapSearch';
import { buildPois, LAYER, type LayerId } from './layers';

const AREA_TONES = ['#3f5a2c', '#4d5f33', '#5b6236', '#56502f', '#4a5a3d', '#3d5240', '#5a4e35', '#4f5a46', '#45573a', '#5d5a3c', '#3e4f35', '#52553a'];
const tone = (s: string | null) => AREA_TONES[[...(s ?? '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AREA_TONES.length];
const RES_COLOR = '#f0b23a';
const WORLD_SCHEMA = 2;
type Tab = 'resources' | 'layers' | 'route';

export default function WorldMap() {
  const ch = useCharacter();
  const params = useSearchParams();
  const map = useRef<MapHandle>(null);
  const [mapId, setMapId] = useState(() => Number(params.get('carte')) || 1);
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('resources');
  const [panelOpen, setPanelOpen] = useState(true);
  const [layers, setLayers] = useState<Set<LayerId>>(new Set(['zaap', 'dungeon']));
  const [selectedRes, setSelectedRes] = useState<Set<number>>(new Set());
  const [openJobs, setOpenJobs] = useState<Set<number>>(new Set());
  const [levels, setLevels] = useState<Record<number, number>>({});
  const [monsterId, setMonsterId] = useState<number | null>(null);
  const [areaFocus, setAreaFocus] = useState<string | null>(null);
  const [cell, setCell] = useState<{ x: number; y: number } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pxPerMap, setPxPerMap] = useState(4);
  const [toast, setToast] = useState<string | null>(null);
  const [stops, setStops] = useState<number[]>([]);
  const [useZaaps, setUseZaaps] = useState(true);
  const [routeName, setRouteName] = useState('');

  useEffect(() => {
    setData(null); setError(null);
    // ?s= schema version: a cached response of an older shape is never reused after an update
    fetch(`/api/world/${mapId}?s=${WORLD_SCHEMA}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch((e) => setError((e as Error).message));
  }, [mapId]);

  // on a phone the map comes first: filters start folded (the filter button opens them)
  useEffect(() => { if (window.matchMedia('(max-width: 767px)').matches) setPanelOpen(false); }, []);
  const zoneById = useMemo(() => new Map((data?.zones ?? []).map((z) => [z.id, z])), [data]);
  const cellZone = useMemo(() => new Map((data?.cells ?? []).map(([x, y, z]) => [`${x},${y}`, z])), [data]);
  const resById = useMemo(() => new Map((data?.resources ?? []).map((r) => [r.id, r])), [data]);
  const zoneName = useCallback((id: number) => zoneById.get(id)?.name ?? '?', [zoneById]);
  const pois = useMemo(() => (data ? buildPois(data, zoneName) : []), [data, zoneName]);
  const zone = cell ? zoneById.get(cellZone.get(`${cell.x},${cell.y}`) ?? -1) ?? null : null;

  // profession levels start from the active character
  useEffect(() => { if (ch.ready) setLevels((l) => ({ ...Object.fromEntries(Object.entries(ch.character.jobs).map(([k, v]) => [Number(k), v])), ...l })); }, [ch.ready, ch.character.jobs]);

  const focusCell = useCallback((x: number, y: number, across = 14) => { setCell({ x, y }); map.current?.focus(x, y, across); }, []);
  const focusZone = useCallback((z: WorldZone, across = 18) => focusCell(Math.round(z.cx), Math.round(z.cy), across), [focusCell]);
  const selectJob = useCallback((jobId: number, level?: number) => {
    if (!data) return;
    const lv = level ?? levels[jobId] ?? ch.character.jobs[jobId] ?? 200;
    setLevels((l) => ({ ...l, [jobId]: lv }));
    setSelectedRes((s) => new Set([...s, ...data.resources.filter((r) => r.jobId === jobId && r.levelMin <= lv).map((r) => r.id)]));
    setOpenJobs((o) => new Set([...o, jobId]));
    setTab('resources'); setPanelOpen(true);
  }, [data, levels, ch.character.jobs]);

  // deep links: ?x=&y= ?zone= ?ressource=1,2 ?metier=&niveau= ?monstre= ?itineraire= ?carte=
  const linked = useRef(false);
  useEffect(() => {
    if (!data || linked.current || !ch.ready) return;
    linked.current = true;
    const job = Number(params.get('metier')), lvl = Number(params.get('niveau'));
    const res = (params.get('ressource') ?? '').split(',').map(Number).filter((id) => resById.has(id));
    if (job && data.jobs.some((j) => j.id === job)) {
      if (res.length) { setLevels((l) => ({ ...l, [job]: lvl >= 1 && lvl <= 200 ? lvl : 200 })); setOpenJobs(new Set([job])); }
      else selectJob(job, lvl >= 1 && lvl <= 200 ? lvl : undefined);
    }
    if (res.length) { setSelectedRes(new Set(res)); setOpenJobs((o) => new Set([...o, ...res.map((id) => resById.get(id)!.jobId)])); }
    const mon = Number(params.get('monstre'));
    if (mon && data.monsters.some((m) => m.id === mon)) setMonsterId(mon);
    const x = params.get('x'), y = params.get('y'), z = Number(params.get('zone'));
    if (x != null && y != null && !Number.isNaN(Number(x)) && !Number.isNaN(Number(y))) setTimeout(() => focusCell(Number(x), Number(y)), 0);
    else if (z && zoneById.has(z)) setTimeout(() => focusZone(zoneById.get(z)!), 0);
    const route = params.get('itineraire');
    const saved = route ? ch.character.routes.find((r) => r.id === route) : null;
    if (saved) { setStops(saved.stops.filter((s) => zoneById.has(s))); setRouteName(saved.name); setTab('route'); }
  }, [data, ch.ready, ch.character.routes, params, resById, zoneById, selectJob, focusCell, focusZone]);

  // keep the selected map in the URL (shareable), without a navigation
  useEffect(() => {
    if (!data) return;
    const u = new URL(window.location.href);
    if (cell) { u.searchParams.set('x', String(cell.x)); u.searchParams.set('y', String(cell.y)); u.searchParams.delete('zone'); }
    else { u.searchParams.delete('x'); u.searchParams.delete('y'); }
    window.history.replaceState(window.history.state, '', u);
  }, [cell, data]);

  const copy = useCallback((text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => setToast(`${what} copiée : ${text}`), () => setToast(`Copie impossible : ${text}`));
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  // keyboard: Ctrl+K or / opens the search, Escape closes it / clears the selection, C copies the /travel command
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen(true); return; }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); setSearchOpen(true); }
      else if (e.key === 'Escape') { if (searchOpen) setSearchOpen(false); else setCell(null); }
      else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && cell) copy(`/travel ${cell.x},${cell.y}`, 'Commande');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, cell, copy]);

  const highlight = useMemo(() => new Set((data?.zones ?? []).filter((z) => (selectedRes.size && z.resources.some((r) => selectedRes.has(r))) || (areaFocus && z.area === areaFocus)).map((z) => z.id)), [data, selectedRes, areaFocus]);
  const outline = useMemo(() => new Set((data?.zones ?? []).filter((z) => monsterId != null && z.monsters.includes(monsterId)).map((z) => z.id)), [data, monsterId]);

  // markers: points of interest of the active layers + selected resources at zone centres, clustered when zoomed out
  const bucket = pxPerMap < 3 ? 8 : pxPerMap < 6 ? 4 : pxPerMap < 12 ? 2 : 1;
  const markers: MapMarker[] = useMemo(() => {
    if (!data) return [];
    type Pt = { key: string; x: number; y: number; p?: (typeof pois)[number]; z?: WorldZone; r?: number };
    const points: Pt[] = [
      ...pois.filter((p) => layers.has(p.layer)).map((p) => ({ key: p.layer, x: p.x + 0.5, y: p.y + 0.5, p })),
      ...data.zones.flatMap((z) => z.resources.filter((r) => selectedRes.has(r)).map((r, i) => ({ key: `res:${r}`, x: z.cx + 0.5 + i * 0.9, y: z.cy + 0.5, z, r }))),
    ];
    return cluster(points, bucket).map((g): MapMarker => {
      const first = g.items[0];
      const n = g.items.length;
      // unique per group: several dungeons can share one map
      const key = `${g.key}@${first.p?.key ?? `${first.r}:${first.z?.id}`}+${n}`;
      const zoomIn = () => map.current?.focus(Math.floor(g.x), Math.floor(g.y), bucket * 5);
      if (first.r != null) {
        const r = resById.get(first.r)!;
        return { key, x: g.x, y: g.y, color: RES_COLOR, glyph: null, count: n, image: r.iconId != null ? `/ankama/items/${r.iconId}.png` : undefined,
          label: n > 1 ? `${r.name} : ${n} zones` : `${r.name} (niv. ${r.levelMin}) · ${first.z!.name}`,
          onClick: () => (n > 1 ? zoomIn() : focusZone(first.z!)) };
      }
      const p = first.p!;
      const L = LAYER[p.layer], Icon = L.icon;
      return { key, x: g.x, y: g.y, color: L.color, glyph: <Icon color="#fff" strokeWidth={2.4} />, count: n,
        selected: n === 1 && cell?.x === p.x && cell?.y === p.y,
        label: n > 1 ? `${L.label} : ${n}` : `${p.name} (${L.label}) [${p.x}, ${p.y}]`,
        onClick: () => (n > 1 ? zoomIn() : focusCell(p.x, p.y, 12)) };
    });
  }, [data, pois, layers, selectedRes, bucket, resById, cell, focusCell, focusZone]);

  const labels = useMemo(() => {
    if (!data) return [];
    const areas = new Map<string, { sx: number; sy: number; n: number }>();
    for (const z of data.zones) { const a = areas.get(z.area ?? '') ?? { sx: 0, sy: 0, n: 0 }; a.sx += z.cx; a.sy += z.cy; a.n++; areas.set(z.area ?? '', a); }
    return [
      ...[...areas].filter(([n]) => n).map(([name, a]) => ({ key: `a${name}`, x: a.sx / a.n + 0.5, y: a.sy / a.n + 0.5, text: name, minZoom: 0, big: true })),
      ...data.zones.map((z) => ({ key: `l${z.id}`, x: z.cx + 0.5, y: z.cy + 1.6, text: z.name, minZoom: 26 })),
    ];
  }, [data]);

  const planned = useMemo(() => {
    const pts = stops.flatMap((id) => { const z = zoneById.get(id); return z ? [{ id, x: z.cx + 0.5, y: z.cy + 0.5 }] : []; });
    return orderStops(pts, null, useZaaps ? (data?.zaaps ?? []).map((z) => ({ x: z.x + 0.5, y: z.y + 0.5 })) : []);
  }, [stops, zoneById, useZaaps, data]);

  const onPick = (h: SearchHit) => {
    if (!data) return;
    if (h.kind === 'cell') focusCell(h.x, h.y);
    else if (h.kind === 'zone') focusZone(zoneById.get(h.id)!);
    else if (h.kind === 'area') {
      setAreaFocus(h.name);
      const zs = data.zones.filter((z) => z.area === h.name);
      map.current?.focus(Math.round(zs.reduce((s, z) => s + z.cx, 0) / zs.length), Math.round(zs.reduce((s, z) => s + z.cy, 0) / zs.length), 40);
    } else if (h.kind === 'resource') { setSelectedRes((s) => new Set([...s, h.id])); setOpenJobs((o) => new Set([...o, resById.get(h.id)!.jobId])); setTab('resources'); }
    else if (h.kind === 'job') selectJob(h.id);
    else if (h.kind === 'monster') setMonsterId(h.id);
    else { setLayers((l) => new Set([...l, h.poi.layer])); focusCell(h.poi.x, h.poi.y, 12); }
  };
  const clearFilters = () => { setSelectedRes(new Set()); setMonsterId(null); setAreaFocus(null); setCell(null); };
  const toggleLayer = (l: LayerId) => setLayers((s) => { const n = new Set(s); if (n.has(l)) n.delete(l); else n.add(l); return n; });
  const toggleRes = (id: number) => setSelectedRes((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  if (error) return <p className="p-8 text-sm text-muted">Carte indisponible : {error}</p>;
  const here = cell ? pois.filter((p) => p.x === cell.x && p.y === cell.y) : [];
  const inZone = zone ? pois.filter((p) => cellZone.get(`${p.x},${p.y}`) === zone.id) : [];
  const tabBtn = (id: Tab, label: string, Icon: typeof Layers, count = 0) => (
    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-1.5 py-2.5 text-[13px] ${tab === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>
      <Icon size={14} aria-hidden /> {label}{count > 0 && <span className="rounded-sm bg-accent/20 px-1 text-[11px] text-accent">{count}</span>}
    </button>
  );

  return (
    <div className="relative flex h-full flex-col md:flex-row">
      {panelOpen && (
        <aside aria-label="Filtres de la carte" className="order-2 max-h-[45vh] shrink-0 overflow-y-auto border-t border-line bg-surface md:order-1 md:max-h-none md:w-[330px] md:border-r md:border-t-0">
          <div className="sticky top-0 z-10 flex border-b border-line bg-surface" role="tablist">
            {tabBtn('resources', 'Ressources', SlidersHorizontal, selectedRes.size)}
            {tabBtn('layers', 'Repères', Layers)}
            {tabBtn('route', 'Itinéraire', Route, stops.length)}
          </div>
          <div className="p-3">
            {!data ? <p className="text-sm text-muted">Chargement…</p>
              : tab === 'resources' ? <ResourceFilters data={data} selected={selectedRes} setSelected={setSelectedRes} levels={levels}
                  setLevel={(j, lv) => setLevels((l) => ({ ...l, [j]: lv }))} open={openJobs} setOpen={setOpenJobs} />
              : tab === 'layers' ? (
                <>
                  <LayerFilters pois={pois} layers={layers} toggle={toggleLayer} />
                  {data.maps.length > 1 && (
                    <label className="mt-4 block text-xs text-faint">Monde
                      <select className="mt-1 block w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm text-text" value={mapId}
                        onChange={(e) => { setMapId(Number(e.target.value)); setCell(null); setStops([]); setSelectedRes(new Set()); }}>
                        {data.maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </label>
                  )}
                </>
              ) : (
                <RoutePanel planned={planned} zoneById={zoneById} stops={stops} setStops={setStops} useZaaps={useZaaps} setUseZaaps={setUseZaaps}
                  routeName={routeName} setRouteName={setRouteName} canSave={ch.hasCharacter} saved={ch.character.routes}
                  onAddHighlighted={() => setStops((s) => [...new Set([...s, ...highlight])].slice(0, 40))} highlighted={highlight.size}
                  onSave={() => { ch.saveRoute({ name: routeName.trim() || `Itinéraire ${new Date().toLocaleDateString('fr-FR')}`, stops: planned.order.map((p) => p.id), resourceId: [...selectedRes][0] }); setRouteName(''); }}
                  onLoad={(r) => { setStops(r.stops.filter((s) => zoneById.has(s))); setRouteName(r.name); }} onDelete={ch.removeRoute}
                  onFocus={(id) => { const z = zoneById.get(id); if (z) focusZone(z); }} />
              )}
          </div>
          {data && (
            <p className="border-t border-line p-3 text-[11px] leading-relaxed text-faint">
              Données du jeu {data.version} (<a className="underline" href={data.source ?? 'https://github.com/ledouxm/dofus-sqlite'}>dofus-sqlite</a>{data.retrievedAt && <>, importées le {new Date(data.retrievedAt).toLocaleDateString('fr-FR')}</>}).
              {data.tiles ? ' Illustration de la carte © Ankama, issue des fichiers du jeu.' : ' Illustration officielle non installée (npm run assets) : zones dessinées depuis les coordonnées.'}
            </p>
          )}
        </aside>
      )}

      <div className="relative order-1 min-h-0 min-w-0 flex-1 md:order-2">
        {data ? (
          <MapCanvas handle={map} worldId={mapId} geom={data.map} tiles={data.tiles} cells={data.cells} zoneFill={(id) => tone(zoneById.get(id)?.area ?? null)}
            highlight={highlight} outline={outline} labels={labels} markers={markers} route={planned.order} selected={cell} selectedZone={zone?.id ?? null}
            zoneName={zoneName} onCell={(x, y) => setCell({ x, y })} onZoom={setPxPerMap} />
        ) : <p className="p-8 text-sm text-muted">Chargement de la carte…</p>}

        <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <button onClick={() => setSearchOpen(true)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-sm text-muted shadow-lg hover:text-text sm:max-w-sm">
            <Search size={15} aria-hidden /> <span className="truncate">Rechercher : coordonnées, zone, ressource…</span>
            <kbd className="ml-auto hidden rounded-sm border border-line px-1.5 text-[10px] text-faint sm:inline">Ctrl K</kbd>
          </button>
          <button onClick={() => map.current?.fit()} className="rounded-md border border-line bg-surface p-2 text-muted shadow-lg hover:text-text" aria-label="Réinitialiser la vue" title="Réinitialiser la vue (0)"><Maximize2 size={15} /></button>
          <button onClick={clearFilters} className="rounded-md border border-line bg-surface p-2 text-muted shadow-lg hover:text-text" aria-label="Effacer les filtres" title="Effacer les filtres"><Eraser size={15} /></button>
          <button onClick={() => setPanelOpen((o) => !o)} className="rounded-md border border-line bg-surface p-2 text-muted shadow-lg hover:text-text" aria-label={panelOpen ? 'Masquer les filtres' : 'Afficher les filtres'} aria-pressed={panelOpen}><SlidersHorizontal size={15} /></button>
        </div>
        {(monsterId != null || areaFocus) && data && (
          <div className="absolute left-3 top-14 z-10 flex flex-wrap gap-1">
            {monsterId != null && <ActiveFilter label={`Monstre : ${data.monsters.find((m) => m.id === monsterId)?.name} (${outline.size} zones)`} onClear={() => setMonsterId(null)} />}
            {areaFocus && <ActiveFilter label={`Région : ${areaFocus}`} onClear={() => setAreaFocus(null)} />}
          </div>
        )}

        {cell && data && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55%] overflow-y-auto border-t border-line bg-surface shadow-xl md:inset-x-auto md:bottom-auto md:right-3 md:top-16 md:max-h-[calc(100%-5rem)] md:w-[360px] md:rounded-md md:border">
            <MapDetails cell={cell} zone={zone} data={data} here={here} inZone={inZone} levels={levels} selectedRes={selectedRes}
              inRoute={!!zone && stops.includes(zone.id)} onClose={() => setCell(null)} onCopy={copy}
              onAddRoute={() => { if (zone) setStops((s) => (s.includes(zone.id) ? s : [...s, zone.id])); }}
              onResource={toggleRes} onMonster={setMonsterId} onFocusZone={(z) => focusZone(z)} />
          </div>
        )}
        {searchOpen && data && <MapSearch data={data} pois={pois} onPick={onPick} onClose={() => setSearchOpen(false)} />}
        {toast && <p role="status" className="absolute left-1/2 top-16 z-30 -translate-x-1/2 rounded-md border border-line bg-surface px-3 py-1.5 text-sm shadow-lg">{toast}</p>}
      </div>
    </div>
  );
}

function RoutePanel({ planned, zoneById, stops, setStops, useZaaps, setUseZaaps, routeName, setRouteName, onSave, saved, canSave, onLoad, onDelete, onFocus, onAddHighlighted, highlighted }: {
  planned: ReturnType<typeof orderStops<{ id: number; x: number; y: number }>>; zoneById: Map<number, WorldZone>; stops: number[];
  setStops: (s: number[]) => void; useZaaps: boolean; setUseZaaps: (v: boolean) => void; routeName: string; setRouteName: (s: string) => void;
  onSave: () => void; saved: { id: string; name: string; stops: number[] }[]; canSave: boolean;
  onLoad: (r: { id: string; name: string; stops: number[] }) => void; onDelete: (id: string) => void; onFocus: (id: number) => void;
  onAddHighlighted: () => void; highlighted: number;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      {highlighted > 0 && <button className="self-start text-xs text-accent underline" onClick={onAddHighlighted}>Ajouter les {highlighted} zones en surbrillance à l’itinéraire</button>}
      {stops.length === 0 ? (
        <p className="text-muted">Ajoutez des zones depuis les détails d’une carte, ou toutes les zones des ressources sélectionnées.</p>
      ) : (
        <>
          <label className="flex items-center gap-2"><input type="checkbox" checked={useZaaps} onChange={(e) => setUseZaaps(e.target.checked)} className="accent-[var(--color-brand)]" /> Passer par les zaaps quand c’est plus court</label>
          <ol className="flex flex-col gap-1" aria-label="Ordre de visite">
            {planned.order.map((p, i) => {
              const z = zoneById.get(p.id)!;
              const leg = planned.legs.find((l) => l.to === p);
              return (
                <li key={p.id} className="flex items-start gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fdf5cb] text-xs font-bold text-[#15110d]">{i + 1}</span>
                  <button className="min-w-0 flex-1 text-left" onClick={() => onFocus(p.id)}>
                    <span className="block truncate text-text">{z.name}</span>
                    <span className="text-xs text-muted">{leg ? `≈ ${Math.round(leg.steps)} carte(s)${leg.zaap ? ` depuis le zaap [${Math.floor(leg.zaap.x)}, ${Math.floor(leg.zaap.y)}]` : ''}` : 'départ'}</span>
                  </button>
                  <button aria-label={`Retirer ${z.name}`} className="text-faint hover:text-text" onClick={() => setStops(stops.filter((s) => s !== p.id))}><X size={14} /></button>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-muted">Total estimé : ≈ {Math.round(planned.total)} cartes entre les centres des zones (une carte par pas, sans tenir compte de l’eau, des murs ni des passages, absents des données).</p>
          <div className="flex gap-2">
            <input aria-label="Nom de l’itinéraire" className="w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm" placeholder="Nom de l’itinéraire" value={routeName} onChange={(e) => setRouteName(e.target.value)} maxLength={60} />
            <button onClick={onSave} disabled={!canSave} title={canSave ? 'Enregistrer sur ce personnage' : 'Créez un personnage pour enregistrer'}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-cta px-3 py-1.5 text-sm text-white hover:bg-cta-hi disabled:opacity-50"><Save size={14} aria-hidden /> Enregistrer</button>
          </div>
          <button className="self-start text-xs text-muted underline" onClick={() => setStops([])}>Vider l’itinéraire</button>
        </>
      )}
      {saved.length > 0 && (
        <section>
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">Itinéraires de ce personnage</h2>
          <ul className="flex flex-col gap-1">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <button className="min-w-0 flex-1 truncate text-left text-accent hover:underline" onClick={() => onLoad(r)}>{r.name}</button>
                <span className="text-xs text-faint">{r.stops.length} zones</span>
                <button aria-label={`Supprimer ${r.name}`} className="text-faint hover:text-red-200" onClick={() => onDelete(r.id)}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
