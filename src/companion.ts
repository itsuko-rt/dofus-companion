// Guides for the companion window, generated from the game data: the quest chain of a Dofus (the same chains as the
// Dofus guide pages), each quest with its own steps and objectives as the game files word them. Nothing hand-written.
import { DatabaseSync } from 'node:sqlite';
import { dofusChain, dofusSlugs, guideContext } from './guides-data.ts';
import { latestDb } from './load.ts';
import { regionSlugMap } from './regions.ts';
import type { CompanionGuide, GuideListEntry, GuideStep } from './companion-shared.ts';

export * from './companion-shared.ts';

export function listGuides(): GuideListEntry[] {
  const c = guideContext();
  if (!c) return [];
  const slugs = dofusSlugs(c.dofus);
  return c.dofus.map((d) => ({ slug: slugs.get(d.itemId)!, name: d.name, level: d.level, steps: Math.max(0, ...dofusChain(c, d).map((x) => x.steps.length)) }))
    .filter((g) => g.steps > 0).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'fr'));
}

const cache = new Map<string, CompanionGuide | null>();
export function loadGuide(slug: string): CompanionGuide | null {
  if (cache.has(slug)) return cache.get(slug)!;
  const c = guideContext();
  const path = latestDb();
  if (!c || !path) return null;
  const slugs = dofusSlugs(c.dofus);
  const d = c.dofus.find((x) => slugs.get(x.itemId) === slug);
  if (!d) { cache.set(slug, null); return null; }
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const regionSlug = regionSlugMap(c.data.categories);
    const questSteps = db.prepare('SELECT name, objectives FROM quest_step WHERE quest_id = ? ORDER BY ordinal');
    const achObjectives = db.prepare('SELECT name FROM achievement_objective WHERE achievement_id = ? ORDER BY ordinal');
    const parse = (s: string | null) => { try { return (JSON.parse(s ?? '[]') as string[]).filter(Boolean); } catch { return []; } };
    const step = (s: { id: string; name: string; level: number | null; category: string | null }): GuideStep => {
      const [kind, raw] = s.id.split(':');
      const id = Number(raw);
      const node = c.graph.nodes.get(s.id);
      if (kind === 'quest') {
        return {
          id: s.id, kind: 'quest', name: s.name, level: s.level, where: s.category,
          href: `/progression/quetes/${regionSlug.get(node?.category ?? -1) ?? node?.category}#${s.id}`,
          guide: c.guides.get(id) ?? null,
          parts: (questSteps.all(id) as { name: string | null; objectives: string | null }[]).map((p) => ({ name: p.name, objectives: parse(p.objectives) })),
        };
      }
      return {
        id: s.id, kind: 'achievement', name: s.name, level: s.level, where: 'Succès', href: `/progression/succes?a=${id}`, guide: null,
        parts: [{ name: null, objectives: (achObjectives.all(id) as { name: string | null }[]).map((o) => o.name).filter((x): x is string => !!x) }],
      };
    };
    const g: CompanionGuide = {
      slug, name: d.name, level: d.level, version: c.version,
      routes: dofusChain(c, d).filter((x) => x.steps.length).map((x) => ({ source: c.graph.nodes.get(x.source)?.label ?? x.source, steps: x.steps.map(step) })),
    };
    cache.set(slug, g);
    return g;
  } finally { db.close(); }
}
