// Official world-map artwork (© Ankama), as shipped by the game and packaged in the dofus-sqlite release
// (images-worldmap.zip: <world>/<scale>/<tile>.webp, 1024 px tiles, row by row).
// Copied into public/ankama/worldmap/ — git-ignored like the other official images, never committed.
// The map works without it (zones drawn from coordinates only).
//   node scripts/fetch-worldmap.ts      (also run by npm run assets)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { latestDb } from '../src/load.ts';

export const TILE = 1024;
const OUT = 'public/ankama/worldmap';

/** Entries of a ZIP file (stored or deflated), read from its central directory. */
export function* zipEntries(buf: Buffer): Generator<{ name: string; data: () => Buffer }> {
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    yield { name, data: () => { const raw = buf.subarray(start, start + size); return method === 8 ? inflateRawSync(raw) : Buffer.from(raw); } };
  }
}

export interface TileIndex { [world: string]: { scales: { scale: number; cols: number; rows: number }[] } }

if (import.meta.main) {
  const db = latestDb();
  if (!db) throw new Error('no game database: run npm run import first');
  const version = db.match(/game-([\d.]+)\.sqlite/)![1];
  const rawDir = readdirSync('data/raw').map((d) => `data/raw/${d}`).find((d) => d.endsWith(`_${version}`))!;
  const zipPath = `${rawDir}/images-worldmap.zip`;
  if (!existsSync(zipPath)) {
    const tag = rawDir.split('/').pop();
    console.log('download images-worldmap.zip (≈ 77 MB)');
    const r = await fetch(`https://github.com/ledouxm/dofus-sqlite/releases/download/${tag}/images-worldmap.zip`, { headers: { 'User-Agent': 'atlas-des-douze-assets' } });
    if (!r.ok) throw new Error(`images-worldmap.zip: HTTP ${r.status}`);
    writeFileSync(zipPath, Buffer.from(await r.arrayBuffer()));
  }
  const g = new DatabaseSync(db, { readOnly: true });
  const worlds = new Map((g.prepare('SELECT id, total_w, total_h FROM world_map').all() as { id: number; total_w: number; total_h: number }[]).map((w) => [String(w.id), w]));
  g.close();
  const index: TileIndex = {};
  let n = 0;
  for (const e of zipEntries(readFileSync(zipPath))) {
    const m = /^(\d+)\/([\d.]+)\/(\d+)\.webp$/.exec(e.name);
    if (!m || !worlds.has(m[1])) continue;
    const [, world, scale] = m;
    const target = `${OUT}/${world}/${scale}/${m[3]}.webp`;
    mkdirSync(target.slice(0, target.lastIndexOf('/')), { recursive: true });
    if (!existsSync(target)) writeFileSync(target, e.data());
    const w = worlds.get(world)!;
    const s = Number(scale);
    const entry = (index[world] ??= { scales: [] });
    if (!entry.scales.some((x) => x.scale === s)) entry.scales.push({ scale: s, cols: Math.ceil((w.total_w * s) / TILE), rows: Math.ceil((w.total_h * s) / TILE) });
    n++;
  }
  for (const v of Object.values(index)) v.scales.sort((a, b) => a.scale - b.scale);
  writeFileSync(`${OUT}/index.json`, JSON.stringify({ notice: 'Carte du monde © Ankama, extraite des fichiers du jeu. Usage de fan, non redistribué.', worlds: index }, null, 2));
  console.log(`${n} world-map tiles ready in ${OUT} (${Object.keys(index).length} worlds)`);
}
