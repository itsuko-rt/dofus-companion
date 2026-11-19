// Screenshot recognition, matching step: OCR text lines → quest / achievement names of the game data.
// Pure and engine-agnostic: any OCR (Tesseract, Windows OCR…) can feed it lines with a confidence.

export interface OcrLine { text: string; confidence: number } // confidence 0–100, as OCR engines report it
export interface CatalogEntry { id: string; name: string }
export interface Match {
  id: string; name: string;
  /** what was read on screen */
  read: string;
  /** 0–1: name similarity × OCR confidence */
  confidence: number;
  /** another entry with the same name exists (quest and achievement often share one) */
  ambiguous: boolean;
}

// apostrophes become spaces too: OCR reads them as a space, a quote or nothing
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** Levenshtein distance, early exit when it exceeds `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

export const similarity = (a: string, b: string) => {
  const len = Math.max(a.length, b.length);
  if (!len) return 0;
  const max = Math.floor(len * 0.35);
  const d = distance(a, b, max);
  return d > max ? 0 : 1 - d / len;
};

export interface Catalog { entries: { id: string; name: string; key: string }[]; byKey: Map<string, CatalogEntry[]> }
export function buildCatalog(entries: CatalogEntry[]): Catalog {
  const list = entries.map((e) => ({ ...e, key: normalize(e.name) })).filter((e) => e.key.length >= 3);
  const byKey = new Map<string, CatalogEntry[]>();
  for (const e of list) byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);
  return { entries: list, byKey };
}

/** Level / count columns often share the name's line: "Tomber sur un bec niv. 14", "Kardorim 3/4". */
const stripColumns = (key: string) => key.replace(/\b(niv|niveau|lvl|lv)\s*\d+\b/g, ' ').replace(/(\s\d+)+$/g, '').replace(/^(\d+\s)+/g, '').replace(/\s+/g, ' ').trim();

/**
 * A catalog name found exactly inside a longer line (other columns, icon read as letters…), longest first.
 * It must cover most of the line, so a short name inside an unrelated sentence is not taken.
 */
function exactSpan(key: string, catalog: Catalog): CatalogEntry[] | undefined {
  const t = key.split(' ');
  for (let len = t.length - 1; len >= Math.max(2, Math.ceil(t.length * 0.6)); len--) for (let i = 0; i + len <= t.length; i++) {
    const hit = catalog.byKey.get(t.slice(i, i + len).join(' '));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Best catalog name per OCR line (and per pair of consecutive lines, for names wrapped on two lines).
 * Below `min` similarity nothing is proposed: a wrong match is worse than a missed one.
 */
export function matchLines(lines: OcrLine[], catalog: Catalog, min = 0.8): Match[] {
  const texts = lines.map((l) => ({ key: stripColumns(normalize(l.text)), raw: l.text.trim(), conf: Math.max(0, Math.min(100, l.confidence)) / 100 }));
  const probes = [
    ...texts,
    ...texts.slice(1).map((t, i) => ({ key: `${texts[i].key} ${t.key}`, raw: `${texts[i].raw} ${t.raw}`, conf: Math.min(texts[i].conf, t.conf) })),
  ].filter((p) => p.key.length >= 3);

  const best = new Map<string, Match>();
  for (const p of probes) {
    let hits = catalog.byKey.get(p.key) ?? exactSpan(p.key, catalog);
    let sim = 1;
    if (!hits) {
      sim = 0;
      for (const e of catalog.entries) {
        if (Math.abs(e.key.length - p.key.length) > p.key.length * 0.35) continue;
        const s = similarity(p.key, e.key);
        if (s > sim) { sim = s; hits = catalog.byKey.get(e.key); }
      }
    }
    if (!hits || sim < min) continue;
    for (const h of hits) {
      const m: Match = { id: h.id, name: h.name, read: p.raw, confidence: Math.round(sim * p.conf * 100) / 100, ambiguous: hits.length > 1 };
      const prev = best.get(h.id);
      if (!prev || m.confidence > prev.confidence) best.set(h.id, m); // the same name on several screenshots counts once
    }
  }
  return [...best.values()].sort((a, b) => b.confidence - a.confidence);
}
