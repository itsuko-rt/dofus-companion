// Almanax from the game's calendar (almanaxcalendarsdata): each entry has date patterns "dd/mm/yyyy" where any part can be
// "*", a bonus, and an offering (an item and a quantity). A day's own offering is the entry whose pattern names that exact
// day and month (a pattern with the exact year wins); entries covering wider periods are shown as the period's bonuses.
import type { IngredientSource } from './professions-shared.ts';

export interface AlmanaxEntry { id: number; dates: string[]; name: string | null; description: string | null; item: string; qty: number; source: IngredientSource }
export interface Day { day: number; month: number; year: number }

const fits = (pattern: string, d: Day) => {
  const [dd, mm, yy] = pattern.split('/');
  return (dd === '*' || Number(dd) === d.day) && (mm === '*' || Number(mm) === d.month) && (yy === '*' || Number(yy) === d.year);
};
/** 3 = exact day, month and year; 2 = exact day and month; 0 = a wider period. */
const precision = (pattern: string, d: Day) => {
  if (!fits(pattern, d)) return -1;
  const [dd, mm, yy] = pattern.split('/');
  return dd !== '*' && mm !== '*' ? (yy !== '*' ? 3 : 2) : 0;
};

export function almanaxFor(entries: AlmanaxEntry[], d: Day): { offering: AlmanaxEntry | null; period: AlmanaxEntry[] } {
  const scored = entries.map((e) => ({ e, p: Math.max(...e.dates.map((x) => precision(x, d))) })).filter((x) => x.p >= 0);
  // equal precision: the entry with fewer dates is the day's own; season entries list each of their days explicitly
  // (e.g. 01/03/* … 19/03/*) and must not win over the day's offering (81 days of 2026 before this rule)
  const best = scored.filter((x) => x.p >= 2).sort((a, b) => b.p - a.p || a.e.dates.length - b.e.dates.length)[0]?.e ?? null;
  return { offering: best, period: scored.filter((x) => x.e !== best && (x.p === 0 || x.e.dates.length > 1)).map((x) => x.e) };
}

/** Today in the game's time zone (Europe/Paris): the Almanax day changes at midnight Paris time. */
export function parisDay(at = new Date()): Day {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', day: 'numeric', month: 'numeric', year: 'numeric' })
    .formatToParts(at).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
  return { day: parts.day, month: parts.month, year: parts.year };
}

export function addDays(d: Day, n: number): Day {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { day: t.getUTCDate(), month: t.getUTCMonth() + 1, year: t.getUTCFullYear() };
}
