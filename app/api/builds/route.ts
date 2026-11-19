import { latestDb, loadClass, loadItems } from '../../../src/load.ts';
import { computeBuild, isMetaEffect, type FashionistaBuild } from '../../../src/stats.ts';
import { spellElements, type Element } from '../../../src/spells.ts';
import { SUPPORTED_BREEDS } from '../../../components/breeds';

// Community builds from Dofus Fashionista's public read-only API (dofusfashionista.gg/api/v1),
// resolved against our own item data. Every upstream response is cached for an hour, so all
// visitors share one set of requests to Fashionista.
export const dynamic = 'force-dynamic';
const API = 'https://dofusfashionista.gg/api/v1';
const RECENT_PAGES = 3;     // 3 × 100 most recently updated shared builds (all classes)
const MAX_DETAILS = 40;     // builds resolved per class

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { 'User-Agent': 'AtlasDesDouze/0.1 (fan site)' }, next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

interface ApiBuild {
  id: string; name: string; char_class: string | null; level: number; url: string; creator: string | null;
  like_count: number; favorite_count: number; view_count: number; score?: number;
  solved_patch: string | null; modified_at: string | null; stuff_changed_at?: string | null;
}

// In-game equipment slots, by item super type (ItemSuperTypeData).
const SLOT: Record<number, string> = {
  2: 'Arme', 7: 'Bouclier', 10: 'Chapeau', 11: 'Cape', 1: 'Amulette', 3: 'Anneau', 4: 'Ceinture', 5: 'Bottes', 12: 'Familier / monture', 13: 'Dofus et trophées',
};
const SLOT_ORDER = [2, 7, 10, 11, 1, 3, 4, 5, 12, 13];

export async function GET(req: Request) {
  const breedId = Number(new URL(req.url).searchParams.get('breed'));
  const breed = SUPPORTED_BREEDS.find((b) => b.id === breedId);
  if (!breed) return Response.json({ error: 'classe non prise en charge' }, { status: 400 });
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente, lancez `npm run import`' }, { status: 503 });
  const patch = db.match(/game-(\d+\.\d+)/)?.[1] ?? null; // "3.7" from game-3.7.14.18.sqlite

  let top: ApiBuild[];
  try {
    const tier = await get<{ sections: { top: ApiBuild[] }[] }>(`${API}/tier-list/?game_version=dofus3&char_class=${encodeURIComponent(breed.fashionista)}&top=20`);
    top = tier.sections[0]?.top ?? [];
  } catch (e) {
    return Response.json({ error: `Fashionista ne répond pas (${(e as Error).message})` }, { status: 502 });
  }
  // recent shared builds widen the pool (the tier list has few low-level builds); a failure here is not fatal
  const recentPages = await Promise.all(Array.from({ length: RECENT_PAGES }, (_, i) =>
    get<{ results: ApiBuild[] }>(`${API}/shared-builds/?game_version=dofus3&page=${i + 1}&page_size=100`).then((r) => r.results, () => [] as ApiBuild[])));
  const seen = new Set(top.map((b) => b.id));
  const recent = recentPages.flat().filter((b) => b.char_class === breed.fashionista && !seen.has(b.id) && (seen.add(b.id), true));
  const pool = [...top.map((b) => ({ b, origin: 'top' as const })), ...recent.map((b) => ({ b, origin: 'recent' as const }))].slice(0, MAX_DETAILS);

  const details = await Promise.all(pool.map(({ b }) =>
    get<FashionistaBuild>(`${API}/shared-builds/${encodeURIComponent(b.id)}/fashionista-build/`).catch(() => null)));
  const ids = details.flatMap((d) => (d?.items ?? []).map((x) => (typeof x === 'number' ? x : x.id)));
  const { items, sets, keywords } = loadItems(db, ids, 2000);

  // spells of the class per element, for "sorts à jouer avec ce build"
  const cls = loadClass(db, breed.id);
  const spellsByElement: Partial<Record<Element, string[]>> = {};
  for (const s of cls?.spells ?? []) for (const el of spellElements(s)) (spellsByElement[el] ??= []).push(s.name);

  const builds = pool.map(({ b, origin }, i) => {
    const d = details[i];
    const stats = d ? computeBuild({ ...d, level: d.level ?? b.level }, items, sets, keywords) : null;
    const slots = SLOT_ORDER.map((st) => ({
      slot: SLOT[st],
      items: (stats?.items ?? []).filter((it) => it.superTypeId === st).map((it) => ({
        id: it.id, name: it.name, type: it.typeName, level: it.level,
        set: it.setId ? sets.get(it.setId)?.name ?? null : null,
        effects: it.effects.filter((e) => !isMetaEffect(e)).map((e) => e.text),
      })),
    })).filter((s) => s.items.length);
    return {
      id: b.id, name: b.name, level: b.level, url: b.url, creator: b.creator, origin,
      likes: b.like_count, favorites: b.favorite_count, views: b.view_count,
      updated: b.stuff_changed_at ?? b.modified_at ?? null,
      patch: b.solved_patch, upToDate: b.solved_patch === patch,
      elements: stats?.elements ?? [],
      totals: stats?.totals ?? null,
      slots,
      sets: stats?.sets.map((s) => ({ name: s.set.name, pieces: s.pieces, total: s.set.itemIds.length, bonus: s.bonus.filter((e) => !isMetaEffect(e)).map((e) => e.text) })) ?? [],
      missing: stats?.missing ?? [],
    };
  });
  return Response.json({
    patch, breed: { id: breed.id, name: breed.name }, gameVersion: 'Dofus 3', source: 'https://dofusfashionista.gg',
    fetchedAt: new Date().toISOString(), spellsByElement, builds,
  });
}
