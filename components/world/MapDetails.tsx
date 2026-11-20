'use client';
// Details of the selected map: coordinates (copy, /travel), zone, points of interest, resources, monsters, quests.
import Link from 'next/link';
import { Copy, Lock, Navigation, Route, Skull, X } from 'lucide-react';
import { mapSteps, travelCommand, type WorldData, type WorldZone } from '../../src/world-shared.ts';
import { regionPath } from '../quests/NextSteps';
import { LAYER, type Poi } from './layers';

export default function MapDetails({ cell, zone, data, here, inZone, levels, selectedRes, inRoute, onClose, onCopy, onAddRoute, onResource, onMonster, onFocusZone }: {
  cell: { x: number; y: number }; zone: WorldZone | null; data: WorldData; here: Poi[]; inZone: Poi[];
  levels: Record<number, number>; selectedRes: Set<number>; inRoute: boolean;
  onClose: () => void; onCopy: (text: string, what: string) => void; onAddRoute: () => void;
  onResource: (id: number) => void; onMonster: (id: number) => void; onFocusZone: (z: WorldZone) => void;
}) {
  const res = new Map(data.resources.map((r) => [r.id, r]));
  const mon = new Map(data.monsters.map((m) => [m.id, m]));
  const jobName = new Map(data.jobs.map((j) => [j.id, j.name]));
  const coords = `${cell.x},${cell.y}`;
  const byJob = new Map<number, WorldData['resources']>();
  for (const id of zone?.resources ?? []) { const r = res.get(id); if (r) (byJob.get(r.jobId) ?? byJob.set(r.jobId, []).get(r.jobId)!).push(r); }
  const monsters = (zone?.monsters ?? []).map((id) => mon.get(id)).filter((m): m is NonNullable<typeof m> => !!m).sort((a, b) => (a.levelMin ?? 0) - (b.levelMin ?? 0));
  const dungeons = here.filter((p) => p.layer === 'dungeon');
  const quests = [...new Map(inZone.filter((p) => p.layer === 'npc').flatMap((p) => p.quests!.map((q) => [q.id, { q, npc: p.name }] as const))).values()];
  // nearby alternatives: other zones with a selected resource, closest first
  const alternatives = [...selectedRes].flatMap((rid) => {
    const r = res.get(rid);
    if (!r) return [];
    const zones = data.zones.filter((z) => z.id !== zone?.id && z.resources.includes(rid))
      .map((z) => ({ z, d: mapSteps({ x: z.cx, y: z.cy }, cell) })).sort((a, b) => a.d - b.d).slice(0, 3);
    return zones.length ? [{ r, zones }] : [];
  });
  const h3 = 'mb-1 text-[11px] font-medium uppercase tracking-wide text-faint';

  return (
    <section aria-label="Détails de la carte" className="flex flex-col gap-3 p-4 text-sm">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-lg text-text">[{cell.x}, {cell.y}]</p>
          <h2 className="font-display text-base text-text">{zone?.name ?? 'Hors zone répertoriée'}</h2>
          {zone && <p className="text-xs text-muted">{zone.area ?? 'Région inconnue'} · niveau de zone {zone.level}</p>}
        </div>
        <button aria-label="Fermer les détails" className="text-faint hover:text-text" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:border-faint" onClick={() => onCopy(coords, 'Coordonnées')}><Copy size={12} aria-hidden /> Copier {coords}</button>
        <button className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:border-faint" title="Raccourci : C" onClick={() => onCopy(travelCommand(cell.x, cell.y), 'Commande')}><Navigation size={12} aria-hidden /> Copier {travelCommand(cell.x, cell.y)}</button>
        {zone && <button disabled={inRoute} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs hover:border-faint disabled:opacity-50" onClick={onAddRoute}><Route size={12} aria-hidden /> {inRoute ? 'Zone dans l’itinéraire' : 'Ajouter la zone à l’itinéraire'}</button>}
      </div>

      {here.length > 0 && (
        <div>
          <h3 className={h3}>Sur cette carte</h3>
          <ul className="flex flex-col gap-1">{here.map((p) => {
            const L = LAYER[p.layer], Icon = L.icon;
            return (
              <li key={p.key} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: L.color }}><Icon size={12} color="#fff" aria-hidden /></span>
                <span><span className="text-text">{p.name}</span> <span className="text-xs text-muted">{L.label}{p.detail ? ` · ${p.detail}` : ''}</span>
                  {p.quests && <span className="block text-xs">{p.quests.slice(0, 4).map((q, i) => <span key={q.id}>{i ? ' · ' : ''}<Link className="text-accent hover:underline" href={`${regionPath(q.category)}#quest:${q.id}`}>{q.name}</Link></span>)}{p.quests.length > 4 ? ` · +${p.quests.length - 4}` : ''}</span>}
                </span>
              </li>
            );
          })}</ul>
        </div>
      )}
      {dungeons.length > 0 && <p className="rounded-md border border-[#8c2f2a]/60 bg-[#8c2f2a]/15 px-3 py-2 text-xs"><Skull size={12} className="mr-1 inline" aria-hidden />Entrée de donjon : {dungeons.map((d) => `${d.name}${d.detail ? ` (${d.detail.toLowerCase()})` : ''}`).join(', ')}.</p>}

      {zone && byJob.size > 0 && (
        <div>
          <h3 className={h3}>Récolte dans la zone</h3>
          {[...byJob].map(([job, list]) => (
            <div key={job} className="mb-1.5">
              <p className="text-xs text-muted">{jobName.get(job)}{levels[job] ? ` · filtre niv. ${levels[job]}` : ''}</p>
              <ul className="flex flex-wrap gap-1">{list.sort((a, b) => a.levelMin - b.levelMin).map((r) => {
                const locked = levels[job] != null && levels[job] < r.levelMin;
                return (
                  <li key={r.id}><button onClick={() => onResource(r.id)} aria-pressed={selectedRes.has(r.id)} title={locked ? `Niveau ${r.levelMin} requis` : 'Afficher sur la carte'}
                    className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs ${selectedRes.has(r.id) ? 'border-accent text-text' : 'border-line'} ${locked ? 'text-faint' : ''}`}>
                    {r.iconId != null && <img src={`/ankama/items/${r.iconId}.png`} alt="" width={16} height={16} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    {locked && <Lock size={10} aria-hidden />}{r.name} <span className="text-faint">{r.levelMin}</span>
                  </button></li>
                );
              })}</ul>
            </div>
          ))}
          <p className="text-[11px] text-faint">Présence dans la zone selon les données du jeu ; quantités et cases exactes non disponibles.</p>
        </div>
      )}
      {alternatives.length > 0 && (
        <div>
          <h3 className={h3}>Alternatives proches</h3>
          {alternatives.map(({ r, zones }) => (
            <p key={r.id} className="text-xs"><span className="text-text">{r.name}</span> : {zones.map(({ z, d }, i) => (
              <span key={z.id}>{i ? ', ' : ''}<button className="text-accent hover:underline" onClick={() => onFocusZone(z)}>{z.name}</button> <span className="text-faint">≈ {Math.round(d)} cartes</span></span>
            ))}</p>
          ))}
        </div>
      )}
      {monsters.length > 0 && (
        <div>
          <h3 className={h3}>Monstres de la zone ({monsters.length})</h3>
          <ul className="flex flex-wrap gap-1">{monsters.slice(0, 20).map((m) => (
            <li key={m.id}><button onClick={() => onMonster(m.id)} className="rounded-sm border border-line px-1.5 py-0.5 text-xs hover:border-[#e0503f]">{m.name} <span className="text-faint">{m.levelMin === m.levelMax ? m.levelMin : `${m.levelMin}–${m.levelMax}`}</span></button></li>
          ))}</ul>
          {monsters.length > 20 && <p className="mt-1 text-xs text-faint">et {monsters.length - 20} autres</p>}
        </div>
      )}
      {zone && inZone.filter((p) => p.layer !== 'npc' && !here.includes(p)).length > 0 && (
        <div>
          <h3 className={h3}>Repères de la zone</h3>
          <ul className="text-xs text-muted">{inZone.filter((p) => p.layer !== 'npc' && !here.includes(p)).slice(0, 12).map((p) => <li key={p.key}>{p.name} <span className="text-faint">· {LAYER[p.layer].label} [{p.x}, {p.y}]</span></li>)}</ul>
        </div>
      )}
      {quests.length > 0 && (
        <div>
          <h3 className={h3}>Quêtes qui commencent dans la zone ({quests.length})</h3>
          <ul className="text-xs">{quests.slice(0, 10).map(({ q, npc }) => (
            <li key={q.id}><Link className="text-accent hover:underline" href={`${regionPath(q.category)}#quest:${q.id}`}>{q.name}</Link> <span className="text-faint">· {npc}</span></li>
          ))}</ul>
        </div>
      )}
      <p className="text-xs"><Link className="text-muted underline" href="/guides">Guides de quêtes et de Dofus</Link></p>
    </section>
  );
}
