// Points of interest of the map, one layer each, built from the game data (see docs/WORLD_MAP_IMPLEMENTATION.md).
import { Anchor, Castle, Hammer, Info, Pickaxe, Shield, Skull, Store, Users, type LucideIcon } from 'lucide-react';
import { isMineOrCave, type WorldData } from '../../src/world-shared.ts';

export type LayerId = 'zaap' | 'transport' | 'dungeon' | 'workshop' | 'market' | 'temple' | 'npc' | 'mine' | 'misc';
export const LAYERS: { id: LayerId; label: string; color: string; icon: LucideIcon; source: string }[] = [
  { id: 'zaap', label: 'Zaaps', color: '#1e7a70', icon: Castle, source: 'waypoints' },
  { id: 'transport', label: 'Transports', color: '#2f6f8f', icon: Anchor, source: 'repères officiels « Transports »' },
  { id: 'dungeon', label: 'Donjons', color: '#8c2f2a', icon: Skull, source: 'entrées de donjon (niveau) et repères « Donjons »' },
  { id: 'workshop', label: 'Ateliers', color: '#7a5a1c', icon: Hammer, source: 'repères officiels « Ateliers »' },
  { id: 'market', label: 'Hôtels de vente', color: '#4a6a1d', icon: Store, source: 'repères officiels « Hôtels de vente »' },
  { id: 'temple', label: 'Temples de classe', color: '#4b3d7a', icon: Shield, source: 'repères officiels « Lieux de classes »' },
  { id: 'npc', label: 'PNJ donneurs de quêtes', color: '#3d4f6a', icon: Users, source: 'position de départ des quêtes' },
  { id: 'mine', label: 'Mines et grottes', color: '#6b5332', icon: Pickaxe, source: 'repères dont le nom contient mine, grotte, caverne, souterrain ou galerie' },
  { id: 'misc', label: 'Autres repères', color: '#5c5346', icon: Info, source: 'autres repères officiels (banques, tavernes, attitudes…)' },
];
export const LAYER = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<LayerId, (typeof LAYERS)[number]>;

export interface Poi { key: string; layer: LayerId; x: number; y: number; name: string; detail?: string; quests?: { id: number; name: string; category: number }[] }

const HINT_LAYER: Record<number, LayerId> = { 9: 'transport', 6: 'dungeon', 3: 'workshop', 2: 'market', 1: 'temple' };

export function buildPois(d: WorldData, zoneName: (id: number) => string): Poi[] {
  const out: Poi[] = [];
  for (const z of d.zaaps) out.push({ key: `zaap:${z.x},${z.y}`, layer: 'zaap', x: z.x, y: z.y, name: `Zaap · ${zoneName(z.zone)}` });
  const dungeons = d.dungeons ?? [];
  const dungeonAt = new Set(dungeons.map((g) => `${g.x},${g.y}`));
  for (const g of dungeons) out.push({ key: `dungeon:${g.id}`, layer: 'dungeon', x: g.x, y: g.y, name: g.name, detail: g.level ? `Niveau conseillé ${g.level}` : undefined });
  for (const m of d.markers) {
    if (m.categoryId === 6 && dungeonAt.has(`${m.x},${m.y}`)) continue; // same entrance as a dungeon record
    const layer: LayerId = isMineOrCave(m) ? 'mine' : HINT_LAYER[m.categoryId] ?? 'misc';
    out.push({ key: `hint:${m.id}`, layer, x: m.x, y: m.y, name: m.name, detail: m.category });
  }
  const npcs = new Map<string, Poi>();
  for (const n of d.npcs ?? []) {
    if (n.x == null) continue;
    const k = `npc:${n.npcId}:${n.x},${n.y}`;
    const p = npcs.get(k) ?? { key: k, layer: 'npc' as const, x: n.x, y: n.y, name: n.name, quests: [] };
    p.quests!.push(n.quest);
    npcs.set(k, p);
  }
  for (const p of npcs.values()) out.push({ ...p, detail: `${p.quests!.length} quête(s)` });
  return out;
}
