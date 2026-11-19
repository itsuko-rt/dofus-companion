// Renders a spell effect with the game's own French templates (EffectData.descriptionId),
// e.g. "#1{{~1~2 à }}#2 dommages Air" with dice 15/17 → "15 à 17 dommages Air".
// Params: #1 = diceNum, #2 = diceSide, #3 = value (SpellLevelData effect fields).

export interface RawEffect {
  actionId: number;
  diceNum: number;
  diceSide: number;
  value: number;
  duration: number;
  zoneShape?: number;  // char code of the zone letter (80 = 'P', a single cell)
  zoneSize?: number;
}

export interface Lookups {
  template: (actionId: number) => string | undefined;
  spell: (id: number) => string | undefined;
  state: (id: number) => string | undefined;
  monster: (id: number) => string | undefined;
}

export interface RenderedEffect { text: string; duration?: string; zone?: string }

// Zone letters whose meaning is certain; any other shape is shown by its letter.
const ZONES: Record<string, string> = { C: 'cercle', X: 'croix', L: 'ligne', T: 'ligne perpendiculaire', O: 'anneau', G: 'carré' };

/** null = internal script effect with no player-facing text (template empty or just "#1"). */
export function renderEffect(e: RawEffect, L: Lookups): RenderedEffect | null {
  const t = L.template(e.actionId);
  if (t === undefined) return { text: `Effet non documenté (action ${e.actionId})` };
  if (/^\s*(#\d)?\s*$/.test(t)) return null;

  const p: Record<string, number> = { 1: e.diceNum, 2: e.diceSide, 3: e.value };
  // unresolved ids: "\0" stands for "#" so the param pass below does not substitute them again
  const name = (found: string | undefined, id: number, kind: string) =>
    found ?? (kind === '#' ? `\0${id}` : `${kind} ${id}`);

  let s = t
    .replace(/<sprite[^>]*>/g, '')
    // entity references, resolved to names
    .replace(/(sort )#(\d)/g, (_, w, d) => w + name(L.spell(p[d]), p[d], '#'))
    .replace(/^#1 :/, () => `${name(L.spell(p[1]), p[1], 'Sort')} :`)
    .replace(/([ée]tat )#3/gi, (_, w) => w + name(L.state(p[3]), p[3], '#'))
    .replace(/(Invoque : )#1/, (_, w) => w + name(L.monster(p[1]), p[1], 'monstre'))
    // "{{~1~2 à }}": shown only when both #1 and #2 are set (a range)
    .replace(/\{\{~1~2([^}]*)\}\}/g, (_, x) => (p[2] ? x : ''))
    .replace(/\{\{~ps\}\}/g, () => (p[1] > 1 ? 's' : ''))
    // shortcut: ~z (zero-plural) is dropped; only affects "Dommage(s)/Résistance(s)" wording.
    .replace(/\{\{~zs\}\}/g, '')
    .replace(/#([123])/g, (_, d) => (d === '2' && !p[2] ? '' : String(p[d])))
    .replaceAll('\0', '#')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;

  const out: RenderedEffect = { text: s };
  if (e.duration > 0) out.duration = `${e.duration} tour${e.duration > 1 ? 's' : ''}`;
  else if (e.duration === -1) out.duration = 'infini';
  if (e.zoneShape && e.zoneShape !== 80) {
    const letter = String.fromCharCode(e.zoneShape);
    out.zone = `${ZONES[letter] ?? `zone ${letter}`}${e.zoneSize ? ` de ${e.zoneSize}` : ''}`;
  }
  return out;
}
