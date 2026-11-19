import { latestDb, loadItems } from '../../../src/load.ts';
import { computeBuild, isMetaEffect, type FashionistaBuild } from '../../../src/stats.ts';
import { SUPPORTED_BREEDS } from '../../../components/breeds';

// Community builds from Dofus Fashionista's public read-only API (dofusfashionista.gg/api/v1),
// resolved against our own item data. Responses are cached for an hour so every visitor
// shares one set of requests to Fashionista.
export const dynamic = 'force-dynamic';
const API = 'https://dofusfashionista.gg/api/v1';

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { 'User-Agent': 'AtlasDesDouze/0.1 (fan site)' }, next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}

interface TierBuild {
  id: string; name: string; level: number; url: string; creator: string | null;
  like_count: number; favorite_count: number; view_count: number; score?: number; solved_patch: string | null;
}

export async function GET(req: Request) {
  const breedId = Number(new URL(req.url).searchParams.get('breed'));
  const breed = SUPPORTED_BREEDS.find((b) => b.id === breedId);
  if (!breed) return Response.json({ error: 'classe non prise en charge' }, { status: 400 });
  const db = latestDb();
  if (!db) return Response.json({ error: 'base de jeu absente, lancez `npm run import`' }, { status: 503 });
  const patch = db.match(/game-(\d+\.\d+)/)?.[1] ?? null; // "3.7" from game-3.7.14.18.sqlite

  let tier: { sections: { top: TierBuild[] }[] };
  try {
    tier = await get(`${API}/tier-list/?game_version=dofus3&char_class=${encodeURIComponent(breed.fashionista)}&top=20`);
  } catch (e) {
    return Response.json({ error: `Fashionista ne répond pas (${(e as Error).message})` }, { status: 502 });
  }
  const list = tier.sections[0]?.top ?? [];
  const details = await Promise.all(list.map((b) =>
    get<FashionistaBuild>(`${API}/shared-builds/${encodeURIComponent(b.id)}/fashionista-build/`).catch(() => null)));
  const ids = details.flatMap((d) => (d?.items ?? []).map((x) => (typeof x === 'number' ? x : x.id)));
  const { items, sets, keywords, names } = loadItems(db, ids, 1000);

  const builds = list.map((b, i) => {
    const d = details[i];
    const stats = d ? computeBuild({ ...d, level: d.level ?? b.level }, items, sets, keywords) : null;
    return {
      id: b.id, name: b.name, level: b.level, url: b.url, creator: b.creator,
      likes: b.like_count, favorites: b.favorite_count, views: b.view_count, score: b.score ?? null,
      patch: b.solved_patch, upToDate: b.solved_patch === patch,
      elements: stats?.elements ?? [],
      totals: stats?.totals ?? null,
      items: stats?.items.map((it) => ({
        id: it.id, name: it.name, type: it.typeName, level: it.level,
        set: it.setId ? sets.get(it.setId)?.name ?? null : null,
        effects: it.effects.filter((e) => !isMetaEffect(e)).map((e) => e.text),
      })) ?? [],
      sets: stats?.sets.map((s) => ({ name: s.set.name, pieces: s.pieces, total: s.set.itemIds.length, bonus: s.bonus.filter((e) => !isMetaEffect(e)).map((e) => e.text) })) ?? [],
      missing: stats?.missing ?? [],
      characteristics: d?.characteristics ?? null,
    };
  });
  return Response.json({ patch, breed: breed.name, source: 'https://dofusfashionista.gg', fetchedAt: new Date().toISOString(), statNames: names, builds });
}
