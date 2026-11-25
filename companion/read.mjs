// Phase 4–5: reads a list the player shows in DOFUS (finished quests, obtained achievements) from a capture, with
// the site's own thresholding and matcher (src/threshold.ts, src/recognize.ts), so the companion and the browser
// scanner read alike. Game names come from the Atlas site's public game data (/api/graph), cached on disk.
import { nativeImage } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { binaryViews } from '../src/threshold.ts';
import { buildCatalog } from '../src/recognize.ts';
export { completions, LISTS } from '../src/companion-read.ts';

/** Game names for the matcher, from the site (cached, so it still works when the site is not running). */
export async function loadCatalogs(atlasUrl, dir) {
  const cache = join(dir, 'game-names.json');
  let data = null, source = 'site';
  try {
    const r = await fetch(new URL('/api/graph', atlasUrl), { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const g = await r.json();
    data = { version: g.version, nodes: g.nodes.filter((n) => n.kind === 'quest' || n.kind === 'achievement').map((n) => ({ id: n.id, kind: n.kind, name: n.label })) };
    writeFileSync(cache, JSON.stringify(data));
  } catch (e) {
    try { data = JSON.parse(readFileSync(cache, 'utf8')); source = 'cache'; }
    catch { return { error: `Noms du jeu indisponibles : le site Atlas (${atlasUrl}) ne répond pas (${e.message}).` }; }
  }
  const of = (kind) => buildCatalog(data.nodes.filter((n) => n.kind === kind));
  return {
    version: data.version, source,
    counts: { quest: data.nodes.filter((n) => n.kind === 'quest').length, achievement: data.nodes.filter((n) => n.kind === 'achievement').length },
    quest: of('quest'), achievement: of('achievement'),
  };
}

let worker = null;
async function ocr(dir) {
  return (worker ??= import('tesseract.js').then(({ createWorker }) => createWorker('fra', 1, { cachePath: dir })).catch((e) => { worker = null; throw e; }));
}
export async function closeOcr() { if (worker) (await worker).terminate(); worker = null; }

/** The framed part of the capture, upscaled like the browser scanner (≈ 2000 px of height, at most ×3). */
export function prepare(img, region) {
  const { width: W, height: H } = img.getSize();
  let part = img;
  if (region) {
    const x = Math.floor(region.x * W), y = Math.floor(region.y * H);
    part = img.crop({ x, y, width: Math.max(8, Math.min(W - x, Math.round(region.w * W))), height: Math.max(8, Math.min(H - y, Math.round(region.h * H))) });
  }
  const { width, height } = part.getSize();
  const scale = Math.min(3, Math.max(1, 2000 / height));
  return scale > 1 ? part.resize({ width: Math.round(width * scale), height: Math.round(height * scale), quality: 'best' }) : part;
}

/** OCR lines of a capture: every binary view is read, the matcher keeps the best reading of each name. */
export async function readLines(img, region, dir) {
  const part = prepare(img, region);
  const { width, height } = part.getSize();
  const w = await ocr(dir);
  const lines = [];
  for (const px of binaryViews(part.toBitmap(), true)) {
    const png = nativeImage.createFromBitmap(Buffer.from(px.buffer), { width, height }).toPNG();
    const { data } = await w.recognize(png, {}, { blocks: true, text: false });
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) {
      const text = l.text.trim();
      if (text) lines.push({ text, confidence: l.confidence });
    }
  }
  return lines;
}
