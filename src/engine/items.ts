import type { Chapter, Concept, SortSet, OrderSet, CalcInstance } from "../content/types";
import { CalcGraph, generate } from "./calc";

export type Mode = "flashcard" | "mcq" | "cloze" | "sort" | "order" | "calc";
export const MODES: Mode[] = ["flashcard", "mcq", "cloze", "sort", "order", "calc"];
export const MODE_LABEL: Record<Mode, string> = {
  flashcard: "Flashcards",
  mcq: "Multiple choice",
  cloze: "Fill the blank",
  sort: "Sort & organize",
  order: "Put in order",
  calc: "Numbers",
};

export type ClozePart = string | { answers: string[] };

export type Item =
  | { kind: "flashcard"; id: string; concept: string; front: string; back: string; variant: string }
  | { kind: "mcq"; id: string; concept: string; stem: string; choices: { text: string; concept: string }[]; answer: number; explain: string }
  | { kind: "cloze"; id: string; concept: string; parts: ClozePart[]; explain: string }
  | { kind: "sort"; id: string; concepts: string[]; set: SortSet }
  | { kind: "order"; id: string; concepts: string[]; set: OrderSet }
  | { kind: "calc"; id: string; concept: string; title: string; inst: CalcInstance };

/** Concept ids an item exercises (for scheduling and mastery). */
export function itemConcepts(item: Item): string[] {
  return item.kind === "sort" || item.kind === "order" ? item.concepts : [item.concept];
}

// ---------- deterministic rng ----------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i] as T;
    a[i] = a[j] as T;
    a[j] = t;
  }
  return a;
}
export function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

// ---------- catalog ----------
export class Catalog {
  chapters: Chapter[];
  concepts: Map<string, Concept> = new Map();
  graph: CalcGraph;
  constructor(chapters: Chapter[]) {
    this.chapters = chapters.slice().sort((a, b) => a.number - b.number);
    for (const ch of this.chapters) for (const c of ch.concepts) this.concepts.set(c.id, c);
    this.graph = new CalcGraph(this.chapters.flatMap((c) => c.calcs));
  }
  concept(id: string): Concept {
    const c = this.concepts.get(id);
    if (!c) throw new Error(`unknown concept ${id}`);
    return c;
  }
  chapter(n: number): Chapter | undefined {
    return this.chapters.find((c) => c.number === n);
  }
  conceptsIn(chapter?: number): Concept[] {
    return [...this.concepts.values()].filter((c) => chapter === undefined || c.chapter === chapter);
  }
  modesFor(conceptId: string): Mode[] {
    const c = this.concept(conceptId);
    const ch = this.chapter(c.chapter);
    const modes: Mode[] = ["flashcard", "mcq"];
    if (ch?.clozes.some((z) => z.concept === conceptId)) modes.push("cloze");
    if (ch?.sorts.some((s) => s.concepts.includes(conceptId))) modes.push("sort");
    if (ch?.orders.some((s) => s.concepts.includes(conceptId))) modes.push("order");
    if (ch?.calcs.some((s) => s.concept === conceptId)) modes.push("calc");
    return modes;
  }
}

// ---------- generators ----------
export function makeFlashcard(c: Concept, variant: number): Item {
  const variants: { variant: string; front: string; back: string }[] = [
    { variant: "term→definition", front: c.term, back: c.definition },
    { variant: "definition→term", front: c.definition, back: c.term },
    { variant: "term→plain", front: `In plain English: ${c.term}`, back: c.plain },
  ];
  if (c.formula) variants.push({ variant: "formula", front: `Formula: ${c.term}`, back: c.formula });
  if (c.example) variants.push({ variant: "example", front: `Give an example of: ${c.term}`, back: c.example });
  const v = variants[variant % variants.length] as (typeof variants)[number];
  return { kind: "flashcard", id: `fc:${c.id}:${variant}`, concept: c.id, ...v };
}

export function makeMcq(cat: Catalog, c: Concept, variant: number, rng: () => number): Item {
  // distractors: related first, then same chapter, then anywhere
  const related = (c.related ?? []).map((id) => cat.concepts.get(id)).filter((x): x is Concept => !!x);
  const sameCh = shuffle(cat.conceptsIn(c.chapter).filter((x) => x.id !== c.id && !related.includes(x)), rng);
  const pool = [...shuffle(related, rng), ...sameCh];
  const distractors = pool.slice(0, 3);
  const reverse = variant % 2 === 1;
  const stem = reverse ? `Which definition matches "${c.term}"?` : `Which term is described?\n${c.definition}`;
  const options = shuffle(
    [c, ...distractors].map((x) => ({ text: reverse ? x.definition : x.term, concept: x.id })),
    rng,
  );
  const answer = options.findIndex((o) => o.concept === c.id);
  return { kind: "mcq", id: `mcq:${c.id}:${variant}`, concept: c.id, stem, choices: options, answer, explain: c.plain };
}

export function parseCloze(text: string): ClozePart[] {
  const parts: ClozePart[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ answers: (m[1] ?? "").split("|").map((s) => s.trim()).filter(Boolean) });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function makeCloze(cat: Catalog, conceptId: string, variant: number): Item | undefined {
  const c = cat.concept(conceptId);
  const ch = cat.chapter(c.chapter);
  const templates = (ch?.clozes ?? []).filter((z) => z.concept === conceptId);
  if (templates.length === 0) return undefined;
  const t = templates[variant % templates.length] as (typeof templates)[number];
  return { kind: "cloze", id: `cz:${t.id}`, concept: conceptId, parts: parseCloze(t.text), explain: t.explain ?? c.plain };
}

export function makeSort(set: SortSet): Item {
  return { kind: "sort", id: `sort:${set.id}`, concepts: set.concepts, set };
}
export function makeOrder(set: OrderSet): Item {
  return { kind: "order", id: `order:${set.id}`, concepts: set.concepts, set };
}
export function makeCalc(cat: Catalog, conceptId: string, variant: number, chained?: boolean): Item | undefined {
  const nodes = cat.graph.forConcept(conceptId);
  if (nodes.length === 0) return undefined;
  const node = nodes[variant % nodes.length] as (typeof nodes)[number];
  const rng = mulberry32(hash(`${node.id}:${variant}:${Date.now() % 100000}`));
  // first two visits: everything given; afterwards hide inputs behind prior calculations
  const chain = chained ?? variant >= 2;
  const inst = generate(cat.graph, node.id, rng, { chainProb: chain ? 0.75 : 0, maxDepth: 3 });
  return { kind: "calc", id: `calc:${node.id}:${variant}`, concept: conceptId, title: node.name, inst };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Build one item for a concept in a mode. Returns undefined if the mode has no content for it. */
export function makeItem(cat: Catalog, conceptId: string, mode: Mode, variant: number): Item | undefined {
  const c = cat.concept(conceptId);
  const rng = mulberry32(hash(`${conceptId}:${mode}:${variant}`));
  switch (mode) {
    case "flashcard":
      return makeFlashcard(c, variant);
    case "mcq":
      return makeMcq(cat, c, variant, rng);
    case "cloze":
      return makeCloze(cat, conceptId, variant);
    case "calc":
      return makeCalc(cat, conceptId, variant);
    case "sort": {
      const sets = (cat.chapter(c.chapter)?.sorts ?? []).filter((s) => s.concepts.includes(conceptId));
      return sets.length ? makeSort(sets[variant % sets.length] as SortSet) : undefined;
    }
    case "order": {
      const sets = (cat.chapter(c.chapter)?.orders ?? []).filter((s) => s.concepts.includes(conceptId));
      return sets.length ? makeOrder(sets[variant % sets.length] as OrderSet) : undefined;
    }
  }
}
