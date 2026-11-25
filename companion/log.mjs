// The companion's event log (`events.jsonl`): one JSON line per event, plus `{ ack, status, at }` lines for the site's
// answers. Read back at start, so a restart neither forgets what was sent nor sends a completion twice.
// Plain JavaScript without Electron, so it is tested on its own (tests/companion-log.test.ts).

/** One completion per character, kind and object: a second reading of it is never logged. */
export const dedupKey = (e) => `${e.characterKey}|${e.type}|${e.objectId}`;

/**
 * Keeps the last `keepDays` days. Lines that do not parse (a write cut short by a crash or power loss) and answers to
 * events no longer kept are dropped. Returns the lines to write back, the events oldest first with the site's last
 * answer as `status`, and the de-duplication keys.
 */
export function readLog(text, now = Date.now(), keepDays = 30) {
  const cutoff = now - keepDays * 86_400_000;
  const lines = [], events = [], sent = new Set(), byId = new Map();
  for (const line of text.split('\n')) {
    let x;
    try { x = JSON.parse(line); } catch { continue; }
    if (!x || typeof x !== 'object' || !(Date.parse(x.at) >= cutoff)) continue;
    if (typeof x.ack === 'string') {
      const e = byId.get(x.ack);
      if (!e) continue;
      e.status = x.status;
      lines.push(line);
      continue;
    }
    if (typeof x.eventId !== 'string' || typeof x.type !== 'string' || byId.has(x.eventId)) continue;
    byId.set(x.eventId, x);
    events.push(x);
    lines.push(line);
    if (x.objectId) sent.add(dedupKey(x));
  }
  return { lines, events, sent };
}
