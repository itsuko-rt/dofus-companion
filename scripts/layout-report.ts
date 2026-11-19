// Layout check on the real data: widest quest chain and region size per category (node scripts/layout-report.ts).
import { latestDb, loadGraph, loadGraphData } from '../src/load.ts';
import { regionLayout } from '../src/regions.ts';
import { packLayout } from '../src/layout.ts';

const db = latestDb();
if (!db) throw new Error('run `npm run import` first');
const g = loadGraph(db);
const rows = loadGraphData(db).categories.map((c) => {
  const r = regionLayout(g, c.id);
  const ids = [...r.linked, ...r.singles.map((n) => n.id)];
  const t = performance.now();
  const l = packLayout(ids, r.edges, (id) => (id.startsWith('gate:') ? { w: 30, h: 30 } : { w: 204, h: 54 }), (id) => g.nodes.get(id)?.level ?? 0);
  const ms = performance.now() - t;
  const widest = Math.max(0, ...l.chains.map((ch) => ch.w));
  return { name: c.name, quests: ids.filter((i) => !i.startsWith('gate:')).length, chains: l.chains.length, widest: Math.round(widest), width: Math.round(l.width), height: Math.round(l.height), ms: Math.round(ms) };
}).filter((r) => r.quests).sort((a, b) => b.widest - a.widest);
console.table(rows.slice(0, 12));
