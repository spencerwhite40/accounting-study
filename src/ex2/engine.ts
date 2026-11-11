import { PLAYS, PLAY_BY_ID } from "./content";
import { TERMS } from "./terms";
import type { Chapter, Play, Route, Term } from "./types";
import { isDue, mastery, accuracy, attempts, type Progress } from "../engine/store";

export type Kind = "name" | "need" | "route";
export const KINDS: Kind[] = ["name", "need", "route"];
export const KIND_LABEL: Record<Kind | "term", string> = { name: "Name it", need: "Need it", route: "Route it", term: "Term" };
export const playConcept = (id: string) => `ex2.${id}`;
export const termConcept = (id: string) => `ex2.t.${id}`;

export type Q =
  | { kind: "learn"; id: string; play: Play }
  | { kind: "name"; id: string; play: Play; prompt: string; options: { id: string; text: string }[]; answer: number }
  | { kind: "need"; id: string; play: Play; q: string; chips: { text: string; need: boolean; why?: string }[] }
  | { kind: "route"; id: string; play: Play; goal: string; given: string[]; steps: string[]; options: { text: string; idx: number }[] }
  | { kind: "term"; id: string; term: Term; prompt: string; options: string[]; answer: number };

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
function overlap(a: Play, b: Play): number {
  const A = words([a.name, ...a.needs].join(" "));
  const B = words([b.name, ...b.needs].join(" "));
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n;
}

/** Wrong answers are the patterns most easily confused with this one: same chapter and shared words first. */
function confusable(play: Play, pool: Play[], n: number, rng: () => number): Play[] {
  const others = pool.filter((p) => p.id !== play.id);
  const scored = shuffle(others, rng).sort((a, b) => (overlap(play, b) + (b.chapter === play.chapter ? 3 : 0)) - (overlap(play, a) + (a.chapter === play.chapter ? 3 : 0)));
  return scored.slice(0, Math.max(n + 2, n)).sort(() => rng() - 0.5).slice(0, n);
}

export function makeName(play: Play, variant: number, rng: () => number = Math.random): Q {
  const prompt = play.sees[variant % play.sees.length] as string;
  const wrong = confusable(play, PLAYS, 2, rng);
  const opts = shuffle([play, ...wrong], rng).map((p) => ({ id: p.id, text: p.name }));
  return { kind: "name", id: `name:${play.id}:${variant}`, play, prompt, options: opts, answer: opts.findIndex((o) => o.id === play.id) };
}

export function makeNeed(play: Play, variant: number, rng: () => number = Math.random): Q {
  const authored = play.gather?.[variant % (play.gather?.length || 1)];
  if (authored) {
    return { kind: "need", id: `need:${play.id}:${variant}`, play, q: authored.q, chips: shuffle(authored.items.map(([text, need, why]) => ({ text, need, ...(why ? { why } : {}) })), rng) };
  }
  // generated from the pattern itself: what you need, what to skip, plus needs that belong to other patterns
  const needs = play.needs.slice(0, 4).map((text) => ({ text, need: true }));
  const skips = (play.skip ?? []).slice(0, 2).map((text) => ({ text, need: false, why: "Not needed here." }));
  const have = new Set([...needs, ...skips].map((c) => c.text));
  const decoyPool = [...new Set(shuffle(PLAYS.filter((p) => p.id !== play.id && p.chapter === play.chapter).flatMap((p) => p.needs), rng))].filter((t) => !have.has(t) && !play.needs.includes(t));
  const decoys = decoyPool.slice(0, Math.max(2, 6 - needs.length - skips.length)).map((text) => ({ text, need: false, why: "That belongs to a different problem." }));
  return { kind: "need", id: `need:${play.id}:${variant}`, play, q: `${play.sees[variant % play.sees.length]}`, chips: shuffle([...needs, ...skips, ...decoys], rng) };
}

export function routeFor(play: Play, variant: number): Route {
  const r = play.routes?.[variant % (play.routes?.length || 1)];
  if (r) return r;
  return { goal: play.name, given: play.needs, steps: play.steps };
}

export function makeRoute(play: Play, variant: number, rng: () => number = Math.random): Q {
  const route = routeFor(play, variant);
  const mine = new Set(route.steps.map((s) => s.toLowerCase()));
  const decoyPool = [...new Set(shuffle(PLAYS.filter((p) => p.id !== play.id && p.chapter === play.chapter).flatMap((p) => p.steps), rng))].filter((s) => !mine.has(s.toLowerCase()) && !play.steps.includes(s));
  const options = shuffle([...route.steps.map((text, idx) => ({ text, idx })), ...decoyPool.slice(0, 1).map((text) => ({ text, idx: -1 }))], rng);
  return { kind: "route", id: `route:${play.id}:${variant}`, play, goal: route.goal, given: route.given, steps: route.steps, options };
}

export function makeTerm(term: Term, variant: number, rng: () => number = Math.random): Q {
  const same = shuffle(TERMS.filter((t) => t.id !== term.id && t.chapter === term.chapter && t.line !== term.line), rng).slice(0, 2);
  const reverse = variant % 2 === 1;
  const all = shuffle([term, ...same], rng);
  return reverse
    ? { kind: "term", id: `term:${term.id}:${variant}`, term, prompt: term.term, options: all.map((t) => t.line), answer: all.findIndex((t) => t.id === term.id) }
    : { kind: "term", id: `term:${term.id}:${variant}`, term, prompt: term.line, options: all.map((t) => t.term), answer: all.findIndex((t) => t.id === term.id) };
}

export function makeQuestion(play: Play, kind: Kind, variant: number): Q {
  return kind === "name" ? makeName(play, variant) : kind === "need" ? makeNeed(play, variant) : makeRoute(play, variant);
}

export interface Scope { chapters: Chapter[]; kind: "plays" | "terms"; only?: string[] }

/** Which drill to ask next for a pattern: climb name → need → route, stay on a rung until it is passed. */
export function nextKind(p: Progress, playId: string, rng: () => number = Math.random): Kind {
  const c = playConcept(playId);
  const passed: Kind[] = [];
  let next: Kind | undefined;
  for (const k of KINDS) {
    if (attempts(p, c, k) >= 1 && (accuracy(p, c, k) ?? 0) >= 0.7) passed.push(k);
    else { next = k; break; }
  }
  if (passed.length && next && rng() < 0.25) return passed[Math.floor(rng() * passed.length)] as Kind;
  return next ?? KINDS[Math.floor(rng() * KINDS.length)] as Kind;
}

export function buildSession(p: Progress, scope: Scope, size = 10): Q[] {
  const now = new Date();
  if (scope.kind === "terms") {
    const pool = TERMS.filter((t) => scope.chapters.includes(t.chapter));
    const c = (t: Term) => termConcept(t.id);
    const due = pool.filter((t) => isDue(p, c(t), now));
    const fresh = shuffle(pool.filter((t) => (p.cards[c(t)]?.reps ?? 0) === 0));
    const seen = pool.filter((t) => (p.cards[c(t)]?.reps ?? 0) > 0 && !isDue(p, c(t), now)).sort((a, b) => mastery(p, c(a), now) - mastery(p, c(b), now));
    const picked = [...shuffle(due), ...fresh, ...seen].slice(0, size);
    return picked.map((t, i) => makeTerm(t, i + (attempts(p, c(t), "term") % 2)));
  }

  const pool = PLAYS.filter((pl) => scope.chapters.includes(pl.chapter) && (!scope.only || scope.only.includes(pl.id)));
  const cn = (pl: Play) => playConcept(pl.id);
  const due = shuffle(pool.filter((pl) => isDue(p, cn(pl), now)));
  const fresh = shuffle(pool.filter((pl) => (p.cards[cn(pl)]?.reps ?? 0) === 0));
  const seen = pool.filter((pl) => (p.cards[cn(pl)]?.reps ?? 0) > 0 && !isDue(p, cn(pl), now)).sort((a, b) => mastery(p, cn(a), now) - mastery(p, cn(b), now));
  // weakest known first, then due, then new ones, so a short session works on what is shaky
  const order = scope.only ? pool : [...due, ...seen.filter((pl) => mastery(p, cn(pl), now) < 0.6), ...fresh, ...seen.filter((pl) => mastery(p, cn(pl), now) >= 0.6)];
  const items: Q[] = [];
  let questions = 0;
  let round = 0;
  const used = new Map<string, number>();
  while (questions < size && order.length && round < size) {
    for (const pl of order) {
      if (questions >= size) break;
      const unseen = (p.cards[cn(pl)]?.reps ?? 0) === 0 && !used.has(pl.id);
      const variant = (attempts(p, cn(pl), "name") + attempts(p, cn(pl), "need") + attempts(p, cn(pl), "route") + (used.get(pl.id) ?? 0));
      if (unseen) {
        items.push({ kind: "learn", id: `learn:${pl.id}`, play: pl });
        items.push(makeName(pl, variant));
      } else {
        const kind: Kind = scope.only && (used.get(pl.id) ?? 0) > 0 ? KINDS[(used.get(pl.id) ?? 0) % KINDS.length] as Kind : nextKind(p, pl.id);
        items.push(makeQuestion(pl, kind, variant));
      }
      used.set(pl.id, (used.get(pl.id) ?? 0) + 1);
      questions++;
    }
    round++;
  }
  // keep each learn card right before its question, otherwise shuffle the order of patterns
  const groups: Q[][] = [];
  for (const it of items) {
    if (it.kind === "learn") groups.push([it]);
    else if (groups.length && groups[groups.length - 1]!.length === 1 && groups[groups.length - 1]![0]!.kind === "learn" && (groups[groups.length - 1]![0] as { play: Play }).play.id === (it as { play: Play }).play.id) groups[groups.length - 1]!.push(it);
    else groups.push([it]);
  }
  return (scope.only ? groups : shuffle(groups)).flat();
}

export function playMastery(p: Progress, id: string): number {
  return mastery(p, playConcept(id));
}
export function readiness(p: Progress, chapters: Chapter[] = [5, 6, 7, 8]): { mastered: number; seen: number; total: number } {
  const pool = PLAYS.filter((pl) => chapters.includes(pl.chapter));
  const m = pool.reduce((a, pl) => a + mastery(p, playConcept(pl.id)), 0) / Math.max(1, pool.length);
  const seen = pool.filter((pl) => (p.cards[playConcept(pl.id)]?.reps ?? 0) > 0).length;
  return { mastered: m, seen, total: pool.length };
}
export { PLAY_BY_ID };
