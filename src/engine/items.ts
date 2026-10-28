import type { Chapter, Concept, SortSet, OrderSet, CalcInstance } from "../content/types";
import { CalcGraph, generate } from "./calc";

export type Mode = "flashcard" | "mcq" | "cloze" | "sort" | "order" | "formula" | "chain" | "calc" | "journal";
export const MODES: Mode[] = ["flashcard", "mcq", "cloze", "sort", "order", "formula", "chain", "calc", "journal"];
export const MODE_LABEL: Record<Mode, string> = {
  flashcard: "Flashcards",
  mcq: "Multiple choice",
  cloze: "Fill the blank",
  sort: "Sort & organize",
  order: "Put in order",
  formula: "Know the equation",
  chain: "Spot the steps",
  calc: "Numbers",
  journal: "Journal entry",
};

export type ClozePart = string | { answers: string[] };

export type Item =
  | { kind: "flashcard"; id: string; concept: string; front: string; back: string; variant: string }
  | { kind: "mcq"; id: string; concept: string; stem: string; choices: { text: string; concept: string }[]; answer: number; explain: string; mode?: Mode }
  | { kind: "cloze"; id: string; concept: string; parts: ClozePart[]; explain: string; mode?: Mode }
  | { kind: "chain"; id: string; concept: string; sub: "steps" | "missing"; inst: CalcInstance; options: { node: string; name: string }[] }
  | { kind: "sort"; id: string; concepts: string[]; set: SortSet }
  | { kind: "order"; id: string; concepts: string[]; set: OrderSet }
  | { kind: "calc"; id: string; concept: string; title: string; inst: CalcInstance; context?: { title: string; intro: string; lines: string[] } }
  | { kind: "journal"; id: string; concept: string; context: { title: string; intro: string; lines: string[] }; text: string; debits: { account: string; amount: number }[]; credits: { account: string; amount: number }[]; accounts: string[]; explain: string };

/** The mode an item is tracked under (formula drills reuse mcq/cloze renderers). */
export function itemMode(item: Item): Mode {
  if ((item.kind === "mcq" || item.kind === "cloze") && item.mode) return item.mode;
  return item.kind;
}

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
    const nodes = this.graph.forConcept(conceptId);
    if (nodes.length) modes.push("formula", "calc");
    if (nodes.some((n) => Object.values(n.inputs).some((i) => i.from))) modes.push("chain");
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

// ---------- equation drills ----------
/** Split a formula into operand strings (first sentence only). */
export function formulaOperands(formula: string): string[] {
  const first = formula.split(/\.\s|\.$/)[0] ?? formula;
  return first
    .split(/\s[+−×÷=]\s/)
    .map((t) => t.replace(/^[(\s]+|[)\s]+$/g, "").trim())
    .filter((t) => t.length > 2);
}

export function makeFormula(cat: Catalog, conceptId: string, variant: number, rng: () => number): Item | undefined {
  const nodes = cat.graph.forConcept(conceptId);
  if (nodes.length === 0) return undefined;
  const node = nodes[Math.floor(variant / 3) % nodes.length] as (typeof nodes)[number];
  const others = shuffle([...cat.graph.nodes.values()].filter((n) => n.id !== node.id), rng);
  const sameCh = others.filter((n) => n.chapter === node.chapter);
  const pool = [...sameCh, ...others.filter((n) => n.chapter !== node.chapter)];
  const sub = variant % 3;
  if (sub === 2) {
    const ops = formulaOperands(node.formula);
    if (ops.length >= 2) {
      const blank = Math.floor(rng() * ops.length);
      const first = node.formula.split(/\.\s|\.$/)[0] ?? node.formula;
      const target = ops[blank] as string;
      const idx = first.indexOf(target);
      const short = target.replace(/\s*\(.*$/, "").trim();
      const parts: ClozePart[] = idx >= 0
        ? [`${node.name} = ${first.slice(0, idx)}`, { answers: [target, short] }, first.slice(idx + target.length)]
        : [`${node.name} = `, { answers: [target, short] }];
      return { kind: "cloze", mode: "formula", id: `fz:${node.id}:${variant}`, concept: conceptId, parts, explain: `${node.formula}\n\nWhen you need it: ${node.when}` };
    }
  }
  const distractors = pool.slice(0, 3);
  if (sub === 1) {
    const choices = shuffle([node, ...distractors].map((n) => ({ text: n.name, concept: n.concept, node: n.id })), rng);
    return { kind: "mcq", mode: "formula", id: `fm:${node.id}:${variant}`, concept: conceptId, stem: `Which figure does this equation give you?\n${node.formula.split(/\.\s|\.$/)[0]}`, choices, answer: choices.findIndex((c) => c.node === node.id), explain: `${node.name}. ${node.when}` };
  }
  const choices = shuffle([node, ...distractors].map((n) => ({ text: n.formula.split(/\.\s|\.$/)[0] ?? n.formula, concept: n.concept, node: n.id })), rng);
  return { kind: "mcq", mode: "formula", id: `fm:${node.id}:${variant}`, concept: conceptId, stem: `What is the equation for ${node.name.toLowerCase()}?`, choices, answer: choices.findIndex((c) => c.node === node.id), explain: `${node.when}${node.watch ? ` Watch out: ${node.watch}` : ""}` };
}

export function makeChain(cat: Catalog, conceptId: string, variant: number, rng: () => number): Item | undefined {
  const nodes = cat.graph.forConcept(conceptId).filter((n) => Object.values(n.inputs).some((i) => i.from));
  if (nodes.length === 0) return undefined;
  const node = nodes[Math.floor(variant / 2) % nodes.length] as (typeof nodes)[number];
  const sub = variant % 2 === 0 ? "steps" : "missing";
  let inst = generate(cat.graph, node.id, rng, { chainProb: 1, maxDepth: sub === "missing" ? 1 : 3 });
  for (let tries = 0; tries < 6 && inst.chain.length < 2; tries++) inst = generate(cat.graph, node.id, rng, { chainProb: 1, maxDepth: 3 });
  if (inst.chain.length < 2) return undefined;
  const used = new Set(inst.chain.map((s) => s.node));
  const decoys = shuffle([...cat.graph.nodes.values()].filter((n) => !used.has(n.id) && n.chapter === node.chapter), rng).slice(0, Math.max(2, 5 - inst.chain.length));
  const options = shuffle([...inst.chain.map((s) => ({ node: s.node, name: s.name })), ...decoys.map((n) => ({ node: n.id, name: n.name }))], rng);
  return { kind: "chain", id: `chain:${node.id}:${variant}:${sub}`, concept: conceptId, sub, inst, options };
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
    case "formula":
      return makeFormula(cat, conceptId, variant, rng);
    case "chain":
      return makeChain(cat, conceptId, variant, rng);
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
