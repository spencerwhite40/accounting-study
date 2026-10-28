import { get, set } from "idb-keyval";
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";
import type { Mode } from "./items";

export { Rating };
export type { Grade };

export interface ReviewLog {
  ts: number;
  concept: string;
  mode: Mode;
  rating: Grade;
  hints: number;
}
export interface ModeStat { right: number; wrong: number; last: number }
export interface Progress {
  version: 1;
  cards: Record<string, Card>;
  stats: Record<string, Partial<Record<Mode, ModeStat>>>;
  /** "a|b" (sorted ids) → times confused */
  confusions: Record<string, number>;
  log: ReviewLog[];
  settings: { dailyNew: number; sessionSize: number };
}

const KEY = "acct-study:progress";
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export function emptyProgress(): Progress {
  return { version: 1, cards: {}, stats: {}, confusions: {}, log: [], settings: { dailyNew: 12, sessionSize: 14 } };
}

function reviveCard(c: Card): Card {
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = (await get(KEY)) as Progress | undefined;
    if (!raw) return emptyProgress();
    const p = { ...emptyProgress(), ...raw };
    for (const [k, v] of Object.entries(p.cards)) p.cards[k] = reviveCard(v);
    return p;
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await set(KEY, p);
  } catch (e) {
    console.warn("saveProgress failed", e);
  }
}

export function cardFor(p: Progress, concept: string, now = new Date()): Card {
  return p.cards[concept] ?? createEmptyCard(now);
}

/** Retrievability 0..1, or null when never reviewed. */
export function retrievability(p: Progress, concept: string, now = new Date()): number | null {
  const c = p.cards[concept];
  if (!c || c.reps === 0) return null;
  return scheduler.get_retrievability(c, now, false);
}

export function isDue(p: Progress, concept: string, now = new Date()): boolean {
  const c = p.cards[concept];
  return !!c && c.reps > 0 && c.due.getTime() <= now.getTime();
}

export function accuracy(p: Progress, concept: string, mode: Mode): number | null {
  const s = p.stats[concept]?.[mode];
  if (!s || s.right + s.wrong === 0) return null;
  return s.right / (s.right + s.wrong);
}

/** Apply one review to a concept. Mutates and returns the progress (caller saves). */
export function review(p: Progress, concept: string, mode: Mode, rating: Grade, hints: number, now = new Date()): Progress {
  const card = cardFor(p, concept, now);
  const { card: next } = scheduler.next(card, now, rating);
  p.cards[concept] = next;
  const st = (p.stats[concept] ??= {});
  const ms = (st[mode] ??= { right: 0, wrong: 0, last: 0 });
  if (rating === Rating.Again) ms.wrong += 1;
  else ms.right += 1;
  ms.last = now.getTime();
  p.log.push({ ts: now.getTime(), concept, mode, rating, hints });
  if (p.log.length > 5000) p.log = p.log.slice(-5000);
  return p;
}

export function confuse(p: Progress, a: string, b: string): void {
  if (a === b) return;
  const key = [a, b].sort().join("|");
  p.confusions[key] = (p.confusions[key] ?? 0) + 1;
}

/** Mastery 0..1 blending FSRS retrievability with recent accuracy across modes. */
export function mastery(p: Progress, concept: string, now = new Date()): number {
  const r = retrievability(p, concept, now);
  if (r === null) return 0;
  const st = p.stats[concept] ?? {};
  const accs = Object.values(st)
    .filter((s): s is ModeStat => !!s && s.right + s.wrong > 0)
    .map((s) => s.right / (s.right + s.wrong));
  const acc = accs.length ? accs.reduce((a, b) => a + b, 0) / accs.length : r;
  // reps dampen: a single lucky Good should not read as mastered
  const reps = Math.min(1, (p.cards[concept]?.reps ?? 0) / 4);
  return Math.max(0, Math.min(1, (0.6 * r + 0.4 * acc) * (0.5 + 0.5 * reps)));
}

export function exportJson(p: Progress): string {
  return JSON.stringify(p);
}
export function importJson(text: string): Progress {
  const raw = JSON.parse(text) as Progress;
  if (!raw || raw.version !== 1 || typeof raw.cards !== "object") throw new Error("Not a study export");
  const p = { ...emptyProgress(), ...raw };
  for (const [k, v] of Object.entries(p.cards)) p.cards[k] = reviveCard(v);
  return p;
}

// ---------- where-you-stand helpers ----------
export function previewIntervals(p: Progress, concept: string, now = new Date()): Record<"again" | "hard" | "good" | "easy", string> {
  const card = cardFor(p, concept, now);
  const rec = scheduler.repeat(card, now);
  const f = (d: Date) => humanInterval(d.getTime() - now.getTime());
  return { again: f(rec[Rating.Again].card.due), hard: f(rec[Rating.Hard].card.due), good: f(rec[Rating.Good].card.due), easy: f(rec[Rating.Easy].card.due) };
}

export function humanInterval(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.round(mo / 12)}y`;
}

/** Cards due in the next `days` days (excluding already-due), bucketed per day. */
export function dueForecast(p: Progress, days = 7, now = new Date()): number[] {
  const out = new Array<number>(days).fill(0);
  for (const c of Object.values(p.cards)) {
    if (c.reps === 0) continue;
    const diff = c.due.getTime() - now.getTime();
    if (diff <= 0) continue;
    const day = Math.floor(diff / 86400e3);
    if (day < days) out[day] = (out[day] ?? 0) + 1;
  }
  return out;
}

/** Average retrievability across reviewed concepts (how much you'd remember right now). */
export function retentionNow(p: Progress, now = new Date()): number | null {
  const vals = Object.keys(p.cards).map((id) => retrievability(p, id, now)).filter((r): r is number => r !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function reviewsPerDay(p: Progress, days = 14, now = new Date()): { day: string; count: number; right: number }[] {
  const out: { day: string; count: number; right: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400e3);
    out.push({ day: localDay(d.getTime()), count: 0, right: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.day, i]));
  for (const l of p.log) {
    const i = idx.get(localDay(l.ts));
    if (i === undefined) continue;
    const o = out[i] as (typeof out)[number];
    o.count++;
    if (l.rating !== Rating.Again) o.right++;
  }
  return out;
}

export function localDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function streak(p: Progress, now = new Date()): number {
  const days = new Set(p.log.map((l) => localDay(l.ts)));
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const d = localDay(now.getTime() - i * 86400e3);
    if (days.has(d)) n++;
    else if (i > 0) break;
  }
  return n;
}
