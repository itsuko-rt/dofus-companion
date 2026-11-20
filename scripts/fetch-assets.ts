// Downloads the official artwork the interface shows into public/ankama/ (git-ignored: never committed,
// never redistributed with the code). Run once after `npm run import`: node scripts/fetch-assets.ts
// Illustrations © Ankama. The app works without them (gradients replace missing images).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { latestDb } from '../src/load.ts';
import { SUPPORTED_BREEDS } from '../components/breeds.ts';

const OUT = 'public/ankama';
const BREEDS = 'https://static.ankama.com/dofus/ng/modules/mmorpg/encyclopedia/unity/breeds/assets';
const UA = { 'User-Agent': 'atlas-des-douze-assets' };

const files: { path: string; url: string }[] = [];
for (const b of SUPPORTED_BREEDS) {
  files.push({ path: `breeds/bg${b.id}.jpg`, url: `${BREEDS}/breeds/bg${b.id}.jpg` });       // class scene
  files.push({ path: `breeds/avatar${b.id}.jpg`, url: `${BREEDS}/avatar/${b.id}.jpg` });     // class portrait
}
const db = latestDb();
if (db) {
  const d = new DatabaseSync(db, { readOnly: true });
  // Dofus eggs, and the resources each gathering profession harvests (profession guides)
  const hasJobs = !!d.prepare("SELECT 1 FROM sqlite_master WHERE name = 'gather_skill'").get();
  const iconSql = `SELECT i.icon_id FROM dofus x JOIN item i ON i.id = x.item_id${hasJobs ? ' UNION SELECT i.icon_id FROM gather_skill g JOIN item i ON i.id = g.item_id' : ''}`;
  for (const r of d.prepare(iconSql).all() as { icon_id: number }[]) {
    files.push({ path: `items/${r.icon_id}.png`, url: `https://api.dofusdu.de/dofus3/v1/img/item/${r.icon_id}-128.png` });
  }
  d.close();
} else console.warn('no game database: Dofus icons skipped (run `npm run import` first)');

const manifest: { path: string; source: string; fetchedAt: string }[] = [];
let ok = 0, failed = 0;
for (const f of files) {
  const target = `${OUT}/${f.path}`;
  mkdirSync(target.slice(0, target.lastIndexOf('/')), { recursive: true });
  if (!existsSync(target)) {
    const r = await fetch(f.url, { headers: UA });
    if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) { console.warn(`✖ ${f.url} → ${r.status}`); failed++; continue; }
    writeFileSync(target, Buffer.from(await r.arrayBuffer()));
    await new Promise((res) => setTimeout(res, 120)); // gentle on the source servers
  }
  manifest.push({ path: f.path, source: f.url, fetchedAt: new Date().toISOString() });
  ok++;
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ notice: 'Illustrations et icônes © Ankama. Usage de fan, non redistribué.', files: manifest }, null, 2));
console.log(`${ok} assets ready in ${OUT}, ${failed} failed`);
