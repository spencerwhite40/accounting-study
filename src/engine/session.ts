import { Catalog, MODES, type Item, type Mode, makeItem, mulberry32, shuffle, hash, itemMode } from "./items";
import { type Progress, isDue, mastery, accuracy } from "./store";
import type { SortSet, OrderSet } from "../content/types";
import { EXAM_WEIGHT } from "../content/exam1";
import { SCENARIOS } from "./exam";

export interface SessionSpec {
  mode: Mode | "mixed";
  chapter?: number;
  size?: number;
  /** Study everything regardless of due state (cram). */
  cram?: boolean;
}

function variantFor(p: Progress, concept: string, mode: Mode): number {
  // rotate variants as reps accrue so wording changes between visits
  const st = p.stats[concept]?.[mode];
  return (st ? st.right + st.wrong : 0) + Math.floor(Math.random() * 2);
}

export { itemMode };

function chooseMode(cat: Catalog, p: Progress, concept: string, rng: () => number): Mode {
  const modes = cat.modesFor(concept).filter((m) => m !== "sort" && m !== "order");
  // equations ladder: know it, spot it, then compute it
  const fa = accuracy(p, concept, "formula");
  if (modes.includes("formula") && (fa === null || fa < 0.7)) return "formula";
  const ca = accuracy(p, concept, "chain");
  if (modes.includes("chain") && (ca === null || ca < 0.7)) return "chain";
  const r = p.cards[concept]?.reps ?? 0;
  if (r === 0) return "flashcard";
  // never-tried modes first, then weakest accuracy, with a little randomness
  const scored = modes.map((m) => {
    const a = accuracy(p, concept, m);
    return { m, score: (a === null ? -1 : a) + rng() * 0.25 };
  });
  scored.sort((x, y) => x.score - y.score);
  return (scored[0]?.m ?? "flashcard") as Mode;
}

/** Build a session: due concepts first, then weakest, then new; plus matching sort/order sets. */
export function buildSession(cat: Catalog, p: Progress, spec: SessionSpec): Item[] {
  const now = new Date();
  const size = spec.size ?? p.settings.sessionSize;
  const rng = mulberry32(hash(`${Date.now()}`));
  const all = cat.conceptsIn(spec.chapter);
  const fixedMode = spec.mode === "mixed" ? null : spec.mode;

  const usable = fixedMode
    ? all.filter((c) => cat.modesFor(c.id).includes(fixedMode))
    : all;

  const due = usable.filter((c) => isDue(p, c.id, now));
  const seen = usable.filter((c) => (p.cards[c.id]?.reps ?? 0) > 0 && !isDue(p, c.id, now));
  // exam weighting: weakest first, ties broken by how heavily the exam leans on the concept
  const w = (id: string) => EXAM_WEIGHT[id] ?? 1;
  seen.sort((a, b) => (mastery(p, a.id, now) - w(a.id) * 0.08) - (mastery(p, b.id, now) - w(b.id) * 0.08));
  // new concepts: exam-heavy topics (job costing, ABC, cost flows) come first
  const fresh = shuffle(usable.filter((c) => (p.cards[c.id]?.reps ?? 0) === 0), rng).sort((a, b) => w(b.id) - w(a.id));

  // concepts whose FIRST ever review happened in the last 24h
  const firstSeen = new Map<string, number>();
  for (const l of p.log) if (!firstSeen.has(l.concept) || l.ts < (firstSeen.get(l.concept) as number)) firstSeen.set(l.concept, l.ts);
  const newToday = [...firstSeen.values()].filter((ts) => now.getTime() - ts < 86400e3).length;
  const newBudget = Math.max(0, p.settings.dailyNew - newToday);

  let picked = shuffle(due, rng).sort((a, b) => w(b.id) - w(a.id)).slice(0, size);
  if (picked.length < size) picked = picked.concat(fresh.slice(0, spec.cram ? size : Math.min(newBudget, size - picked.length)));
  if (picked.length < size) picked = picked.concat(seen.slice(0, size - picked.length));
  if (picked.length < size && spec.cram) picked = picked.concat(fresh);
  picked = [...new Map(picked.map((c) => [c.id, c])).values()].slice(0, size);

  // sort/order modes are set-based: schedule the sets whose concepts are weakest
  if (fixedMode === "sort" || fixedMode === "order") {
    const ch = cat.chapters.filter((c) => spec.chapter === undefined || c.number === spec.chapter);
    const sets: (SortSet | OrderSet)[] = fixedMode === "sort" ? ch.flatMap((c) => c.sorts) : ch.flatMap((c) => c.orders);
    const scored = sets
      .map((s) => ({ s, m: s.concepts.reduce((a, cid) => a + mastery(p, cid, now), 0) / Math.max(1, s.concepts.length) }))
      .sort((a, b) => a.m - b.m);
    return scored.slice(0, Math.max(3, Math.min(size, 6))).map(({ s }): Item =>
      fixedMode === "sort"
        ? { kind: "sort", id: `sort:${s.id}`, concepts: s.concepts, set: s as SortSet }
        : { kind: "order", id: `order:${s.id}`, concepts: s.concepts, set: s as OrderSet },
    );
  }

  const items: Item[] = [];
  const usedSets = new Set<string>();
  for (const c of picked) {
    const mode = fixedMode ?? chooseMode(cat, p, c.id, rng);
    const item = makeItem(cat, c.id, mode, variantFor(p, c.id, mode)) ?? makeItem(cat, c.id, "flashcard", variantFor(p, c.id, "flashcard"));
    if (item) items.push(item);
  }
  if (!fixedMode) {
    // exam focus: a few questions lifted from a generated exam scenario, every session
    const sc = SCENARIOS[Math.floor(rng() * SCENARIOS.length)];
    if (sc && (spec.chapter === undefined || spec.chapter >= 2)) {
      const pool = sc.make(rng).filter((it) => spec.chapter === undefined || it.kind === "journal" || it.concept.includes(`.ch${spec.chapter}.`) || it.concept.includes(".ch2."));
      const picks = shuffle(pool, rng).slice(0, Math.min(3, Math.max(1, Math.floor(size / 5))));
      for (const it of picks) items.splice(Math.floor(rng() * (items.length + 1)), 0, it as Item);
    }
    // sprinkle one sort or order set that touches the weakest picked concepts
    const ch = cat.chapters.filter((c) => spec.chapter === undefined || c.number === spec.chapter);
    const pickedIds = new Set(picked.map((c) => c.id));
    const candidates = ch.flatMap((c) => [...c.sorts.map((s) => ({ kind: "sort" as const, s })), ...c.orders.map((s) => ({ kind: "order" as const, s }))])
      .filter(({ s }) => s.concepts.some((id) => pickedIds.has(id)) && !usedSets.has(s.id));
    const chosen = shuffle(candidates, rng).slice(0, 1);
    for (const { kind, s } of chosen) {
      usedSets.add(s.id);
      const it = kind === "sort" ? ({ kind: "sort", id: `sort:${s.id}`, concepts: s.concepts, set: s } as Item) : ({ kind: "order", id: `order:${s.id}`, concepts: s.concepts, set: s } as Item);
      items.splice(Math.floor(items.length / 2), 0, it);
    }
  }
  return items;
}

export function dueCount(cat: Catalog, p: Progress, chapter?: number): { due: number; fresh: number; seen: number } {
  const now = new Date();
  let due = 0, fresh = 0, seen = 0;
  for (const c of cat.conceptsIn(chapter)) {
    if ((p.cards[c.id]?.reps ?? 0) === 0) fresh++;
    else if (isDue(p, c.id, now)) due++;
    else seen++;
  }
  return { due, fresh, seen };
}

export { MODES };
