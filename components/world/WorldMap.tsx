'use client';
// World map page: zones from the game's map coordinates, official markers, resource / monster / NPC layers,
// zone details and a gathering route planner saved on the active character.
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Anchor, BookOpen, Castle, Flag, Hammer, Home as HomeIcon, Info, Landmark, Layers, Lock, MapPin, Route, Save, ScrollText, Search,
  Shield, Skull, Store, Trash2, Users, X, Zap,
} from 'lucide-react';
import { mapSteps, orderStops, type WorldData, type WorldZone } from '../../src/world-shared.ts';
import { regionPath } from '../quests/NextSteps';
import { useCharacter } from '../useCharacter';
import MapCanvas, { type MapFocus, type MapMarker } from './MapCanvas';

// official marker categories (hintcategories), each one a layer
const CATEGORIES: Record<number, { label: string; color: string; icon: typeof MapPin }> = {
  9: { label: 'Transports', color: '#2f7e8f', icon: Anchor },
  6: { label: 'Donjons', color: '#8c2f2a', icon: Skull },
  3: { label: 'Ateliers', color: '#7a5a1c', icon: Hammer },
  2: { label: 'Hôtels de vente', color: '#4a6a1d', icon: Store },
  1: { label: 'Lieux de classes', color: '#4b3d7a', icon: Shield },
  4: { label: 'Divers', color: '#5c5346', icon: Info },
  5: { label: 'Territoires de conquête', color: '#6a3b52', icon: Flag },
  7: { label: 'Possessions', color: '#5c5346', icon: HomeIcon },
  8: { label: 'Points de repère', color: '#5c5346', icon: Landmark },
  10: { label: 'Anomalies', color: '#6a3b52', icon: Zap },
  11: { label: 'Quêtes', color: '#7a5a1c', icon: ScrollText },
  12: { label: 'Quêtes répétables', color: '#7a5a1c', icon: ScrollText },
};
const ZAAP = { label: 'Zaaps', color: '#1e7a70', icon: Castle };
// muted terrain tones, one per area (a deterministic pick, not a claim about the terrain)
const AREA_TONES = ['#3f5a2c', '#4d5f33', '#5b6236', '#56502f', '#4a5a3d', '#3d5240', '#5a4e35', '#4f5a46', '#45573a', '#5d5a3c', '#3e4f35', '#52553a'];
const tone = (s: string | null) => AREA_TONES[[...(s ?? '?')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AREA_TONES.length];

type Selection = { kind: 'zone'; id: number } | { kind: 'marker'; id: number } | null;

export default function WorldMap() {
  const ch = useCharacter();
  const [mapId, setMapId] = useState(1);
  const [data, setData] = useState<WorldData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<Set<string>>(new Set(['zaap', 'c6']));
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobLevel, setJobLevel] = useState(1);
  const [resourceId, setResourceId] = useState<number | null>(null);
  const [monsterId, setMonsterId] = useState<number | null>(null);
  const [npcLayer, setNpcLayer] = useState(false);
  const [sel, setSel] = useState<Selection>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [query, setQuery] = useState('');
  const [stops, setStops] = useState<number[]>([]);
  const [useZaaps, setUseZaaps] = useState(true);
  const [routeName, setRouteName] = useState('');
  const [panel, setPanel] = useState<'layers' | 'route'>('layers');
  const [panelOpen, setPanelOpen] = useState(true);

  // deep links: ?zone= ?ressource= ?metier=&niveau= ?monstre= ?itineraire= ?carte=
  const params = useSearchParams();
  useEffect(() => { const c = Number(params.get('carte')); if (c > 0) setMapId(c); }, [params]);
  useEffect(() => {
    setData(null); setError(null);
    fetch(`/api/world/${mapId}`).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setData(j); }).catch((e) => setError((e as Error).message));
  }, [mapId]);

  const zoneById = useMemo(() => new Map((data?.zones ?? []).map((z) => [z.id, z])), [data]);
  const resById = useMemo(() => new Map((data?.resources ?? []).map((r) => [r.id, r])), [data]);
  const monById = useMemo(() => new Map((data?.monsters ?? []).map((m) => [m.id, m])), [data]);
  const jobById = useMemo(() => new Map((data?.jobs ?? []).map((j) => [j.id, j])), [data]);
  const gatheringJobs = useMemo(() => (data?.jobs ?? []).filter((j) => j.kind === 'gathering'), [data]);
  const focusZone = useCallback((z: WorldZone, w = 24) => setFocus({ x: z.cx + 0.5, y: z.cy + 0.5, w, seq: Date.now() }), []);

  // apply the deep link once the data is there
  const [linked, setLinked] = useState(false);
  useEffect(() => {
    if (!data || linked || !ch.ready) return; // saved routes and job levels come from the character
    setLinked(true);
    const job = Number(params.get('metier')), lvl = Number(params.get('niveau')), res = Number(params.get('ressource'));
    const zone = Number(params.get('zone')), mon = Number(params.get('monstre')), route = params.get('itineraire');
    if (job && jobById.has(job)) { setJobId(job); setJobLevel(lvl >= 1 && lvl <= 200 ? lvl : ch.character.jobs[job] ?? 1); }
    if (res && resById.has(res)) { setResourceId(res); setJobId(resById.get(res)!.jobId); if (!job) setJobLevel(200); }
    if (mon && monById.has(mon)) setMonsterId(mon);
    if (zone && zoneById.has(zone)) { setSel({ kind: 'zone', id: zone }); focusZone(zoneById.get(zone)!); }
    const saved = route ? ch.character.routes.find((r) => r.id === route) : null;
    if (saved) { setStops(saved.stops.filter((s) => zoneById.has(s))); setRouteName(saved.name); setPanel('route'); }
  }, [data, linked, params, jobById, resById, monById, zoneById, ch.character, ch.ready, focusZone]);

  // a profession chosen without a level: the character's own level for it
  const pickJob = (id: number | null) => { setJobId(id); setResourceId(null); if (id) setJobLevel(ch.character.jobs[id] ?? 1); };

  const jobResources = useMemo(() => (data?.resources ?? []).filter((r) => r.jobId === jobId).sort((a, b) => a.levelMin - b.levelMin || a.name.localeCompare(b.name)), [data, jobId]);
  const highlight = useMemo(() => {
    const s = new Set<number>();
    if (!data) return s;
    for (const z of data.zones) {
      if (resourceId ? z.resources.includes(resourceId)
        : jobId ? z.resources.some((r) => resById.get(r)?.jobId === jobId && resById.get(r)!.levelMin <= jobLevel) : false) s.add(z.id);
    }
    return s;
  }, [data, resourceId, jobId, jobLevel, resById]);
  const outline = useMemo(() => new Set((data?.zones ?? []).filter((z) => monsterId != null && z.monsters.includes(monsterId)).map((z) => z.id)), [data, monsterId]);

  const npcsByZone = useMemo(() => {
    const m = new Map<number, WorldData['npcs']>();
    for (const n of data?.npcs ?? []) (m.get(n.zone) ?? m.set(n.zone, []).get(n.zone)!).push(n);
    return m;
  }, [data]);

  const markers: MapMarker[] = useMemo(() => {
    if (!data) return [];
    const out: MapMarker[] = [];
    for (const m of data.markers) {
      const c = CATEGORIES[m.categoryId];
      if (!c || !layers.has(`c${m.categoryId}`)) continue;
      const Icon = c.icon;
      out.push({ key: `m${m.id}`, x: m.x + 0.5, y: m.y + 0.5, color: c.color, glyph: <Icon color="#fff" strokeWidth={2.4} />, label: `${m.name} (${c.label}) [${m.x}, ${m.y}]`,
        selected: sel?.kind === 'marker' && sel.id === m.id, onClick: () => setSel({ kind: 'marker', id: m.id }) });
    }
    if (layers.has('zaap')) for (const z of data.zaaps) {
      const zone = zoneById.get(z.zone);
      out.push({ key: `z${z.x},${z.y}`, x: z.x + 0.5, y: z.y + 0.5, color: ZAAP.color, glyph: <Castle color="#fff" strokeWidth={2.4} />,
        label: `Zaap ${zone ? `· ${zone.name} ` : ''}[${z.x}, ${z.y}]`, onClick: () => zone && setSel({ kind: 'zone', id: zone.id }) });
    }
    if (npcLayer) for (const [zid, list] of npcsByZone) {
      const z = zoneById.get(zid);
      if (!z) continue;
      out.push({ key: `n${zid}`, x: z.cx + 0.5, y: z.cy + 0.5, color: '#3d4f6a', glyph: <Users color="#fff" strokeWidth={2.4} />,
        label: `${new Set(list.map((n) => n.name)).size} PNJ donneurs de quêtes · ${z.name}`, onClick: () => setSel({ kind: 'zone', id: zid }) });
    }
    return out;
  }, [data, layers, sel, zoneById, npcLayer, npcsByZone]);

  const labels = useMemo(() => {
    if (!data) return [];
    const areas = new Map<string, { sx: number; sy: number; n: number }>();
    for (const z of data.zones) {
      const a = areas.get(z.area ?? '') ?? { sx: 0, sy: 0, n: 0 };
      a.sx += z.cx; a.sy += z.cy; a.n++;
      areas.set(z.area ?? '', a);
    }
    return [
      ...[...areas].filter(([n]) => n).map(([name, a]) => ({ key: `a${name}`, x: a.sx / a.n + 0.5, y: a.sy / a.n + 0.5, text: name, minZoom: 0, big: true })),
      ...data.zones.map((z) => ({ key: `l${z.id}`, x: z.cx + 0.5, y: z.cy + 1.4, text: z.name, minZoom: 22 })),
    ];
  }, [data]);

  // route: zones in visit order (centres), optional zaap shortcuts
  const planned = useMemo(() => {
    const pts = stops.flatMap((id) => { const z = zoneById.get(id); return z ? [{ id, x: z.cx + 0.5, y: z.cy + 0.5 }] : []; });
    return orderStops(pts, null, useZaaps ? (data?.zaaps ?? []).map((z) => ({ x: z.x + 0.5, y: z.y + 0.5 })) : []);
  }, [stops, zoneById, useZaaps, data]);
  const addStop = (id: number) => setStops((s) => (s.includes(id) ? s : [...s, id].slice(0, 40)));
  const addAllHighlighted = () => setStops((s) => [...new Set([...s, ...highlight])].slice(0, 40));
  const saveRoute = () => {
    ch.saveRoute({ name: routeName.trim() || `Itinéraire ${new Date().toLocaleDateString('fr-FR')}`, stops: planned.order.map((p) => p.id), jobId: jobId ?? undefined, resourceId: resourceId ?? undefined });
    setRouteName('');
  };

  // search: zones, resources, monsters, markers, quest NPCs
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || q.length < 2) return [];
    const has = (s: string | null) => !!s && s.toLowerCase().includes(q);
    return [
      ...data.zones.filter((z) => has(z.name)).map((z) => ({ key: `z${z.id}`, label: z.name, hint: `Zone · ${z.area ?? ''} · niv. ${z.level}`, go: () => { setSel({ kind: 'zone', id: z.id }); focusZone(z); } })),
      ...data.resources.filter((r) => has(r.name)).map((r) => ({ key: `r${r.id}`, label: r.name, hint: `Ressource · ${jobById.get(r.jobId)?.name} niv. ${r.levelMin}`, go: () => { setJobId(r.jobId); setJobLevel(200); setResourceId(r.id); } })),
      ...data.monsters.filter((m) => has(m.name)).map((m) => ({ key: `mo${m.id}`, label: m.name, hint: `Monstre · niv. ${m.levelMin ?? '?'}–${m.levelMax ?? '?'}`, go: () => setMonsterId(m.id) })),
      ...data.markers.filter((m) => has(m.name)).map((m) => ({ key: `mk${m.id}`, label: m.name, hint: `${CATEGORIES[m.categoryId]?.label ?? m.category} · [${m.x}, ${m.y}]`, go: () => {
        setLayers((l) => new Set([...l, `c${m.categoryId}`])); setSel({ kind: 'marker', id: m.id }); setFocus({ x: m.x + 0.5, y: m.y + 0.5, w: 20, seq: Date.now() });
      } })),
      ...[...new Map(data.npcs.filter((n) => has(n.name)).map((n) => [`${n.name}|${n.zone}`, n])).values()].map((n) => ({ key: `n${n.name}${n.zone}`, label: n.name, hint: `PNJ · ${zoneById.get(n.zone)?.name}`, go: () => { setSel({ kind: 'zone', id: n.zone }); focusZone(zoneById.get(n.zone)!); } })),
    ].slice(0, 30);
  }, [query, data, jobById, zoneById, focusZone]);

  const toggle = (k: string) => setLayers((l) => { const n = new Set(l); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const zoneFill = useCallback((id: number) => tone(zoneById.get(id)?.area ?? null), [zoneById]);
  const onZone = useCallback((id: number) => setSel({ kind: 'zone', id }), []);

  if (error) return <p className="p-8 text-sm text-muted">Carte indisponible : {error}</p>;
  const selZone = sel?.kind === 'zone' ? zoneById.get(sel.id) ?? null : null;
  const selMarker = sel?.kind === 'marker' ? data?.markers.find((m) => m.id === sel.id) ?? null : null;
  const field = 'w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-text';
  const myLevel = (job: number) => ch.character.jobs[job];

  return (
    <div className="relative flex h-full flex-col md:flex-row">
      <div className="relative min-h-0 min-w-0 flex-1">
        {data ? (
          <MapCanvas cells={data.cells} zoneFill={zoneFill} highlight={highlight} outline={outline} dimOthers={highlight.size > 0}
            labels={labels} markers={markers} route={planned.order} selectedZone={selZone?.id ?? null} onZone={onZone} focus={focus} />
        ) : <p className="p-8 text-sm text-muted">Chargement de la carte…</p>}
        {/* search over the map */}
        <div className="absolute left-3 right-3 top-3 z-10 md:right-auto md:w-80">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-faint" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zone, ressource, monstre, donjon, PNJ…" aria-label="Rechercher sur la carte"
              className="w-full rounded-md border border-line bg-surface py-2 pl-8 pr-8 text-sm shadow-lg" />
            {query && <button aria-label="Effacer" className="absolute right-2 top-2 text-faint hover:text-text" onClick={() => setQuery('')}><X size={16} /></button>}
          </label>
          {results.length > 0 && (
            <ul className="mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-surface shadow-lg" role="listbox">
              {results.map((r) => (
                <li key={r.key}><button role="option" aria-selected={false} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { r.go(); setQuery(''); }}>
                  <span className="block text-text">{r.label}</span><span className="text-xs text-muted">{r.hint}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        <button className="absolute right-3 top-3 z-10 rounded-md border border-line bg-surface p-2 text-muted md:hidden" aria-label={panelOpen ? 'Masquer le panneau' : 'Afficher le panneau'} onClick={() => setPanelOpen((o) => !o)}><Layers size={16} /></button>
      </div>

      {/* control panel: layers / route, then the selection details */}
      {panelOpen && (
        <aside className="max-h-[48vh] shrink-0 overflow-y-auto border-t border-line bg-surface md:max-h-none md:w-[360px] md:border-l md:border-t-0" aria-label="Panneau de la carte">
          <div className="flex border-b border-line" role="tablist">
            {([['layers', 'Calques', Layers], ['route', `Itinéraire${stops.length ? ` (${stops.length})` : ''}`, Route]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" aria-selected={panel === id} onClick={() => setPanel(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2.5 text-sm ${panel === id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'}`}>
                <Icon size={15} aria-hidden /> {label}
              </button>
            ))}
          </div>

          {(selZone || selMarker) && (
            <section className="border-b border-line p-4" aria-label="Détails">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-base text-text">{selZone?.name ?? selMarker?.name}</h2>
                  <p className="text-xs text-muted">
                    {selZone ? <>{selZone.area} · niveau {selZone.level} · centre ≈ [{Math.round(selZone.cx)}, {Math.round(selZone.cy)}]</>
                      : <>{CATEGORIES[selMarker!.categoryId]?.label ?? selMarker!.category} · [{selMarker!.x}, {selMarker!.y}]{selMarker!.zone && zoneById.get(selMarker!.zone) ? ` · ${zoneById.get(selMarker!.zone)!.name}` : ''}</>}
                  </p>
                </div>
                <button aria-label="Fermer les détails" className="text-faint hover:text-text" onClick={() => setSel(null)}><X size={16} /></button>
              </div>
              {selMarker?.zone && zoneById.get(selMarker.zone) && (
                <button className="text-sm text-accent underline" onClick={() => setSel({ kind: 'zone', id: selMarker.zone! })}>Voir la zone</button>
              )}
              {selZone && <ZoneDetails zone={selZone} data={data!} resById={resById} monById={monById} jobById={jobById} npcs={npcsByZone.get(selZone.id) ?? []}
                myLevel={myLevel} inRoute={stops.includes(selZone.id)} onAdd={() => { addStop(selZone.id); setPanel('route'); }}
                onResource={(id) => { setResourceId(id); setJobId(resById.get(id)!.jobId); setJobLevel(Math.max(jobLevel, resById.get(id)!.levelMin)); }} onMonster={setMonsterId} />}
            </section>
          )}

          {panel === 'layers' ? (
            <div className="flex flex-col gap-4 p-4">
              <section>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Métier et ressources</h2>
                <div className="grid grid-cols-[1fr_88px] gap-2">
                  <select aria-label="Métier de récolte" className={field} value={jobId ?? ''} onChange={(e) => pickJob(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Aucun métier</option>
                    {gatheringJobs.map((j) => <option key={j.id} value={j.id}>{j.name}{myLevel(j.id) ? ` (niv. ${myLevel(j.id)})` : ''}</option>)}
                  </select>
                  <input aria-label="Niveau du métier" type="number" min={1} max={200} className={field} value={jobLevel} disabled={!jobId}
                    onChange={(e) => setJobLevel(Math.min(200, Math.max(1, Number(e.target.value) || 1)))} />
                </div>
                {jobId && (
                  <>
                    <select aria-label="Ressource" className={`${field} mt-2`} value={resourceId ?? ''} onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Toutes les ressources accessibles (niv. ≤ {jobLevel})</option>
                      {jobResources.map((r) => <option key={r.id} value={r.id}>{r.levelMin > jobLevel ? '🔒 ' : ''}{r.name} · niv. {r.levelMin}</option>)}
                    </select>
                    <p className="mt-2 text-xs text-muted">{highlight.size} zone(s) en surbrillance. Les données du jeu disent dans quelles zones une ressource pousse, pas l’emplacement exact de chaque spot.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {highlight.size > 0 && <button className="text-xs text-accent underline" onClick={() => { addAllHighlighted(); setPanel('route'); }}>Ajouter ces zones à l’itinéraire</button>}
                      {jobById.get(jobId) && <Link className="text-xs text-accent underline" href={`/metiers/${jobById.get(jobId)!.slug}`}>Guide du métier</Link>}
                      <button className="text-xs text-muted underline" onClick={() => pickJob(null)}>Effacer</button>
                    </div>
                  </>
                )}
              </section>
              {monsterId != null && (
                <p className="flex items-center justify-between gap-2 rounded-md border border-red-500/40 px-3 py-2 text-sm">
                  <span><Skull size={14} className="mr-1 inline text-[#e0503f]" aria-hidden /> {monById.get(monsterId)?.name} : {outline.size} zone(s)</span>
                  <button aria-label="Effacer le monstre" className="text-faint hover:text-text" onClick={() => setMonsterId(null)}><X size={14} /></button>
                </p>
              )}
              <section>
                <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Repères officiels</h2>
                <ul className="flex flex-col gap-1">
                  {[['zaap', ZAAP, data?.zaaps.length ?? 0] as const, ...Object.entries(CATEGORIES).map(([id, c]) => [`c${id}`, c, data?.markers.filter((m) => m.categoryId === Number(id)).length ?? 0] as const)]
                    .filter(([, , n]) => n > 0).map(([key, c, n]) => {
                      const Icon = c.icon;
                      return (
                        <li key={key}><label className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="checkbox" checked={layers.has(key)} onChange={() => toggle(key)} className="accent-[var(--color-brand)]" />
                          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.color }}><Icon size={12} color="#fff" aria-hidden /></span>
                          <span className="flex-1">{c.label}</span><span className="text-xs tabular-nums text-faint">{n}</span>
                        </label></li>
                      );
                    })}
                  <li><label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={npcLayer} onChange={() => setNpcLayer((v) => !v)} className="accent-[var(--color-brand)]" />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3d4f6a]"><Users size={12} color="#fff" aria-hidden /></span>
                    <span className="flex-1">PNJ donneurs de quêtes (par zone)</span>
                  </label></li>
                </ul>
              </section>
              {data && data.maps.length > 1 && (
                <section>
                  <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">Monde</h2>
                  <select aria-label="Monde affiché" className={field} value={mapId} onChange={(e) => { setMapId(Number(e.target.value)); setSel(null); setStops([]); }}>
                    {data.maps.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </section>
              )}
            </div>
          ) : (
            <RoutePanel planned={planned} zoneById={zoneById} stops={stops} setStops={setStops} useZaaps={useZaaps} setUseZaaps={setUseZaaps}
              routeName={routeName} setRouteName={setRouteName} onSave={saveRoute} saved={ch.character.routes} canSave={ch.hasCharacter}
              onLoad={(r) => { setStops(r.stops.filter((s) => zoneById.has(s))); setRouteName(r.name); }} onDelete={ch.removeRoute}
              onFocus={(id) => { const z = zoneById.get(id); if (z) { setSel({ kind: 'zone', id }); focusZone(z); } }} />
          )}
          {data && (
            <p className="border-t border-line p-4 text-[11px] leading-relaxed text-faint">
              Données officielles du jeu {data.version}, extraites par <a className="underline" href={data.source ?? 'https://github.com/ledouxm/dofus-sqlite'}>dofus-sqlite</a>
              {data.retrievedAt && <>, importées le {new Date(data.retrievedAt).toLocaleDateString('fr-FR')}</>}. Carte dessinée à partir des coordonnées des cartes ; couleurs par région, sans valeur de relief.
            </p>
          )}
        </aside>
      )}
    </div>
  );
}

function ZoneDetails({ zone, data, resById, monById, jobById, npcs, myLevel, inRoute, onAdd, onResource, onMonster }: {
  zone: WorldZone; data: WorldData; resById: Map<number, WorldData['resources'][number]>; monById: Map<number, WorldData['monsters'][number]>;
  jobById: Map<number, WorldData['jobs'][number]>; npcs: WorldData['npcs']; myLevel: (job: number) => number | undefined;
  inRoute: boolean; onAdd: () => void; onResource: (id: number) => void; onMonster: (id: number) => void;
}) {
  const byJob = new Map<number, WorldData['resources']>();
  for (const id of zone.resources) { const r = resById.get(id); if (r) (byJob.get(r.jobId) ?? byJob.set(r.jobId, []).get(r.jobId)!).push(r); }
  const markers = data.markers.filter((m) => m.zone === zone.id);
  const mons = zone.monsters.map((id) => monById.get(id)).filter(Boolean).sort((a, b) => (a!.levelMin ?? 0) - (b!.levelMin ?? 0));
  const quests = [...new Map(npcs.map((n) => [n.quest.id, n])).values()];
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <button onClick={onAdd} disabled={inRoute} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs hover:border-faint disabled:opacity-50"><Route size={13} aria-hidden /> {inRoute ? 'Dans l’itinéraire' : 'Ajouter à l’itinéraire'}</button>
        {(() => {
          if (zone.zaap) return <span className="inline-flex items-center gap-1 text-xs text-muted"><Castle size={13} aria-hidden /> Zaap de la zone : [{zone.zaap[0]}, {zone.zaap[1]}]</span>;
          const near = [...data.zaaps].sort((a, b) => mapSteps(a, { x: zone.cx, y: zone.cy }) - mapSteps(b, { x: zone.cx, y: zone.cy }))[0];
          return near ? <span className="inline-flex items-center gap-1 text-xs text-muted"><Castle size={13} aria-hidden /> Zaap le plus proche en ligne droite : [{near.x}, {near.y}] (≈ {Math.round(mapSteps(near, { x: zone.cx, y: zone.cy }))} cartes)</span> : null;
        })()}
      </div>
      {byJob.size > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Ressources récoltables</h3>
          {[...byJob].map(([job, list]) => (
            <div key={job} className="mb-1.5">
              <p className="text-xs text-muted">{jobById.get(job)?.name}{myLevel(job) ? ` · vous : niv. ${myLevel(job)}` : ''}</p>
              <ul className="flex flex-wrap gap-1">
                {list.sort((a, b) => a.levelMin - b.levelMin).map((r) => {
                  const locked = myLevel(job) != null && myLevel(job)! < r.levelMin;
                  return (
                    <li key={r.id}><button onClick={() => onResource(r.id)} title={locked ? `Niveau ${r.levelMin} requis` : `Voir toutes les zones de ${r.name}`}
                      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs ${locked ? 'border-line text-faint' : 'border-line text-text hover:border-accent'}`}>
                      {locked && <Lock size={11} aria-hidden />}{r.name} <span className="text-faint">{r.levelMin}</span>
                    </button></li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {mons.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Monstres ({mons.length})</h3>
          <ul className="flex flex-wrap gap-1">
            {mons.slice(0, 24).map((m) => <li key={m!.id}><button onClick={() => onMonster(m!.id)} className="rounded-sm border border-line px-1.5 py-0.5 text-xs hover:border-[#e0503f]">{m!.name} <span className="text-faint">{m!.levelMin === m!.levelMax ? m!.levelMin : `${m!.levelMin}–${m!.levelMax}`}</span></button></li>)}
          </ul>
          {mons.length > 24 && <p className="mt-1 text-xs text-faint">et {mons.length - 24} autres</p>}
        </div>
      )}
      {markers.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Repères</h3>
          <ul className="text-xs text-muted">{markers.map((m) => <li key={m.id}>{m.name} <span className="text-faint">· {CATEGORIES[m.categoryId]?.label ?? m.category} [{m.x}, {m.y}]</span></li>)}</ul>
        </div>
      )}
      {quests.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Quêtes qui commencent ici ({quests.length})</h3>
          <ul className="text-xs">{quests.slice(0, 12).map((n) => (
            <li key={n.quest.id}><Link className="text-accent hover:underline" href={`${regionPath(n.quest.category)}#quest:${n.quest.id}`}>{n.quest.name}</Link> <span className="text-faint">· {n.name}</span></li>
          ))}</ul>
          {quests.length > 12 && <p className="mt-1 text-xs text-faint">et {quests.length - 12} autres</p>}
        </div>
      )}
      <Link href="/guides" className="inline-flex items-center gap-1 text-xs text-muted underline"><BookOpen size={12} aria-hidden /> Guides</Link>
    </div>
  );
}

function RoutePanel({ planned, zoneById, stops, setStops, useZaaps, setUseZaaps, routeName, setRouteName, onSave, saved, canSave, onLoad, onDelete, onFocus }: {
  planned: ReturnType<typeof orderStops<{ id: number; x: number; y: number }>>; zoneById: Map<number, WorldZone>; stops: number[];
  setStops: (s: number[]) => void; useZaaps: boolean; setUseZaaps: (v: boolean) => void; routeName: string; setRouteName: (s: string) => void;
  onSave: () => void; saved: { id: string; name: string; stops: number[] }[]; canSave: boolean;
  onLoad: (r: { id: string; name: string; stops: number[] }) => void; onDelete: (id: string) => void; onFocus: (id: number) => void;
}) {
  const field = 'w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-text';
  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      {stops.length === 0 ? (
        <p className="text-muted">Ajoutez des zones depuis leurs détails, ou toutes les zones d’une ressource depuis l’onglet Calques.</p>
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
          <p className="text-xs text-muted">Total estimé : ≈ {Math.round(planned.total)} cartes entre les centres des zones. Estimation en ligne droite (une carte par pas, quatre directions) : l’eau, les murs et les passages ne sont pas dans les données.</p>
          <div className="flex gap-2">
            <input aria-label="Nom de l’itinéraire" className={field} placeholder="Nom de l’itinéraire" value={routeName} onChange={(e) => setRouteName(e.target.value)} maxLength={60} />
            <button onClick={onSave} disabled={!canSave} title={canSave ? 'Enregistrer sur ce personnage' : 'Créez un personnage pour enregistrer'}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-cta px-3 py-1.5 text-sm text-white hover:bg-cta-hi disabled:opacity-50"><Save size={14} aria-hidden /> Enregistrer</button>
          </div>
          <button className="self-start text-xs text-muted underline" onClick={() => setStops([])}>Vider l’itinéraire</button>
        </>
      )}
      {saved.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Itinéraires de ce personnage</h2>
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

