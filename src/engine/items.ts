import type { Chapter, Concept, SortSet, OrderSet, CalcInstance } from "../content/types";
import { CalcGraph, generate } from "./calc";
import { shortOf, sameMeaning } from "../content/short";

export type Mode = "flashcard" | "mcq" | "cloze" | "sort" | "order" | "formula" | "chain" | "calc" | "journal";
export const MODES: Mode[] = ["flashcard", "mcq", "cloze", "sort", "order", "formula", "chain", "calc", "journal"];
export const MODE_LABEL: Record<Mode, string> = {
  flashcard: "Flashcards",
  mcq: "Multiple choice",
  cloze: "Fill the blank",
  sort: "Sort & organize",
  order: "Put in order",
  formula: "Know it",
  chain: "Spot it",
  calc: "Solve it",
  journal: "Journal entry",
};

export type ClozePart = string | { answers: string[] };

export type Item =
  | { kind: "flashcard"; id: string; concept: string; front: string; back: string; variant: string }
  | { kind: "mcq"; id: string; concept: string; stem: string; choices: { text: string; concept: string; node?: string }[]; answer: number; explain: string; mode?: Mode }
  | { kind: "cloze"; id: string; concept: string; parts: ClozePart[]; choices: string[]; explain: string; mode?: Mode }
  | { kind: "chain"; id: string; concept: string; sub: "steps" | "missing"; inst: CalcInstance; options: { node: string; name: string }[] }
  | { kind: "sort"; id: string; concepts: string[]; set: SortSet }
  | { kind: "order"; id: string; concepts: string[]; set: OrderSet }
  | { kind: "calc"; id: string; concept: string; title: string; inst: CalcInstance; level: number }
  | { kind: "journal"; id: string; concept: string; text: string; debits: { account: string; amount: number }[]; credits: { account: string; amount: number }[]; accounts: string[]; explain: string };

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
  const line = shortOf(c);
  const variants: { variant: string; front: string; back: string }[] = [
    { variant: "term-to-line", front: c.term, back: line },
    { variant: "line-to-term", front: line, back: c.term },
  ];
  if (c.formula) variants.push({ variant: "formula", front: `${c.term}: what is the formula?`, back: c.formula });
  if (c.example) variants.push({ variant: "example", front: `Example: ${c.term}`, back: c.example });
  const v = variants[variant % variants.length] as (typeof variants)[number];
  return { kind: "flashcard", id: `fc:${c.id}:${variant}`, concept: c.id, ...v };
}

/** Three short choices: the answer and two wrong answers that are genuinely different things. */
export function makeMcq(cat: Catalog, c: Concept, variant: number, rng: () => number): Item {
  const line = shortOf(c);
  const ok = (x: Concept) => !sameMeaning(c, x) && shortOf(x) !== line;
  const related = (c.related ?? []).map((id) => cat.concepts.get(id)).filter((x): x is Concept => !!x && ok(x));
  const sameCh = shuffle(cat.conceptsIn(c.chapter).filter((x) => ok(x) && !related.includes(x)), rng);
  const seen = new Set<string>();
  const distractors = [...shuffle(related, rng), ...sameCh].filter((x) => { const k = x.term.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2);
  const reverse = variant % 2 === 1;
  const stem = reverse ? `What is ${c.term}?` : `${line}\n\nWhich term is this?`;
  const options = shuffle([c, ...distractors].map((x) => ({ text: reverse ? shortOf(x) : x.term, concept: x.id })), rng);
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

const isNumeric = (t: string) => /^[\d$.,%]+$/.test(t);
const normKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Words that are classic opposites or siblings: the best wrong answers for each other. */
const CONTRAST: string[][] = [
  ["estimated", "actual"], ["debit", "credit"], ["overapplied", "underapplied"], ["increases", "decreases"], ["before", "after"],
  ["work in process", "finished goods", "raw materials"], ["fixed", "variable"], ["direct labor", "direct materials", "manufacturing overhead"],
  ["reliability", "relevance"], ["traced", "allocated"], ["direct", "indirect"], ["process", "job"],
  ["prevention", "appraisal", "internal failure", "external failure"], ["unit", "batch", "product", "facility"],
  ["plantwide", "departmental", "activity"], ["cost of goods sold", "cost of goods manufactured", "gross profit"],
  ["gross profit", "operating income", "net income"], ["competence", "confidentiality", "integrity", "credibility"],
  ["planning", "directing", "controlling"], ["treasurer", "controller"], ["conformance", "nonconformance"], ["cost", "hours"],
];

/** Answer plus three wrong choices: opposites first, then same kind (number or words), never anything already visible in the sentence. */
function clozeChoices(cat: Catalog, answers: string[], chapter: number, conceptId: string, related: string[], visible: string, rng: () => number): string[] {
  const answer = answers[0] ?? "";
  const num = isNumeric(answer);
  const bad = new Set(answers.map(normKey));
  const seeText = ` ${visible.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  const shown = (t: string) => seeText.includes(` ${t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()} `);
  const picks: string[] = [];
  const add = (t: string) => { if (t && !bad.has(normKey(t)) && !picks.some((x) => normKey(x) === normKey(t)) && !shown(t)) picks.push(t); };
  for (const g of CONTRAST) if (answers.some((a) => g.includes(a.toLowerCase()))) for (const w of shuffle(g, rng)) add(w);
  if (num) {
    const y = Number(answer);
    if (y >= 1800 && y <= 2100) for (const d of [10, -10, 7]) add(String(y + d));
  }
  const pool: { text: string; ch: number; c: string }[] = [];
  const seen = new Set<string>();
  for (const ch of cat.chapters) for (const z of ch.clozes) for (const p of parseCloze(z.text)) {
    if (typeof p === "string") continue;
    const t = p.answers[0];
    if (!t || isNumeric(t) !== num || seen.has(normKey(t))) continue;
    seen.add(normKey(t));
    pool.push({ text: t, ch: ch.number, c: z.concept });
  }
  // wrong answers from the same or a related concept read as real alternatives; unrelated ones are easy to dismiss
  const dist = (x: { text: string; ch: number; c: string }) => Math.abs(x.text.length - answer.length) + (x.c === conceptId ? 0 : related.includes(x.c) ? 4 : x.ch === chapter ? 8 : 14);
  for (const x of shuffle(pool, rng).sort((a, b) => dist(a) - dist(b))) { if (picks.length >= 3) break; add(x.text); }
  if (num) {
    const n = Number(answer.replace(/[^\d.]/g, "")) || 10;
    for (const f of [2, 3, 0.5, 5]) { if (picks.length >= 3) break; add(String(Math.max(1, Math.round(n * f)))); }
  }
  return shuffle([answer, ...picks.slice(0, 3)], rng);
}

/** One blank per question: if a sentence has several, a different one is asked each time and the rest are filled in. */
export function makeCloze(cat: Catalog, conceptId: string, variant: number): Item | undefined {
  const c = cat.concept(conceptId);
  const ch = cat.chapter(c.chapter);
  const templates = (ch?.clozes ?? []).filter((z) => z.concept === conceptId);
  if (templates.length === 0) return undefined;
  const t = templates[variant % templates.length] as (typeof templates)[number];
  const parts = parseCloze(t.text);
  const blanks = parts.map((p, i) => (typeof p === "string" ? -1 : i)).filter((i) => i >= 0);
  const keep = blanks[Math.floor(variant / Math.max(1, templates.length)) % blanks.length] as number;
  const one: ClozePart[] = parts.map((p, i) => (typeof p === "string" || i === keep ? p : (p.answers[0] ?? "")));
  const answers = (parts[keep] as { answers: string[] }).answers;
  const rng = mulberry32(hash(`${t.id}:${keep}:${variant}`));
  const visible = one.filter((p): p is string => typeof p === "string").join(" ");
  return { kind: "cloze", id: `cz:${t.id}:${keep}`, concept: conceptId, parts: one, choices: clozeChoices(cat, answers, c.chapter, conceptId, c.related ?? [], visible, rng), explain: t.explain ?? c.plain };
}

export function makeSort(set: SortSet): Item {
  return { kind: "sort", id: `sort:${set.id}`, concepts: set.concepts, set };
}
export function makeOrder(set: OrderSet): Item {
  return { kind: "order", id: `order:${set.id}`, concepts: set.concepts, set };
}
/** Level 1: one equation, everything given. Level 2: one figure is missing. Level 3: a full chain. */
export function makeCalc(cat: Catalog, conceptId: string, variant: number, level = 1, nodeId?: string): Item | undefined {
  const nodes = nodeId && cat.graph.nodes.has(nodeId) ? [cat.graph.node(nodeId)] : cat.graph.forConcept(conceptId);
  if (nodes.length === 0) return undefined;
  const chainable = nodes.filter((n) => Object.values(n.inputs).some((i) => i.from));
  const useChain = level >= 2 && chainable.length > 0;
  const pool = useChain ? chainable : nodes;
  const node = pool[variant % pool.length] as (typeof pool)[number];
  const lvl = useChain ? level : 1;
  const rng = mulberry32(hash(`${node.id}:${variant}:${Date.now() % 100000}`));
  const opts = lvl === 1 ? { chainProb: 0, maxDepth: 0 } : lvl === 2 ? { chainProb: 1, maxDepth: 1, maxChained: 1 } : { chainProb: 0.9, maxDepth: 3 };
  const inst = generate(cat.graph, node.id, rng, opts);
  return { kind: "calc", id: `calc:${node.id}:${variant}`, concept: conceptId, title: node.name, inst, level: lvl };
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

const wordSet = (t: string) => new Set(t.toLowerCase().match(/[a-z]{3,}/g) ?? []);
function similarText(a: string, b: string): boolean {
  const A = wordSet(a), B = wordSet(b);
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both / (A.size + B.size - both || 1) > 0.5;
}
const firstSentence = (f: string) => f.split(/\.\s|\.$/)[0] ?? f;

export function makeFormula(cat: Catalog, conceptId: string, variant: number, rng: () => number): Item | undefined {
  const nodes = cat.graph.forConcept(conceptId);
  if (nodes.length === 0) return undefined;
  const node = nodes[Math.floor(variant / 3) % nodes.length] as (typeof nodes)[number];
  const eq = firstSentence(node.formula);
  // wrong answers must be clearly different equations, never a variant of the right one
  const others = shuffle([...cat.graph.nodes.values()].filter((n) => n.concept !== node.concept && n.id !== node.id && !similarText(firstSentence(n.formula), eq) && !similarText(n.name, node.name)), rng);
  const pool = [...others.filter((n) => n.chapter === node.chapter), ...others.filter((n) => n.chapter !== node.chapter)];
  const sub = variant % 3;
  if (sub === 2) {
    const ops = formulaOperands(eq);
    if (ops.length >= 2) {
      const target = ops[Math.floor(rng() * ops.length)] as string;
      const idx = eq.indexOf(target);
      const short = target.replace(/\s*\(.*$/, "").trim();
      const parts: ClozePart[] = idx >= 0
        ? [`${node.name} = ${eq.slice(0, idx)}`, { answers: [target, short] }, eq.slice(idx + target.length)]
        : [`${node.name} = `, { answers: [target, short] }];
      const have = new Set(ops.map(normKey));
      const wrong: string[] = [];
      for (const n of pool) {
        const os = formulaOperands(firstSentence(n.formula));
        if (os.length < 2) continue;
        for (const o of os) if (wrong.length < 3 && o.length <= 40 && !/[;,]/.test(o) && !have.has(normKey(o)) && !wrong.some((w) => normKey(w) === normKey(o))) wrong.push(o);
      }
      return { kind: "cloze", mode: "formula", id: `fz:${node.id}:${variant}`, concept: conceptId, parts, choices: shuffle([target, ...wrong], rng), explain: `${eq}\n\n${node.when}` };
    }
  }
  const distractors = pool.slice(0, 2);
  if (sub === 1) {
    const choices = shuffle([node, ...distractors].map((n) => ({ text: n.name, concept: n.concept, node: n.id })), rng);
    return { kind: "mcq", mode: "formula", id: `fm:${node.id}:${variant}`, concept: conceptId, stem: `${eq}\n\nWhich figure does this give you?`, choices, answer: choices.findIndex((c) => c.node === node.id), explain: `${node.name}. ${node.when}` };
  }
  const choices = shuffle([node, ...distractors].map((n) => ({ text: firstSentence(n.formula), concept: n.concept, node: n.id })), rng);
  return { kind: "mcq", mode: "formula", id: `fm:${node.id}:${variant}`, concept: conceptId, stem: `What is the equation for ${node.name.toLowerCase()}?`, choices, answer: choices.findIndex((c) => c.node === node.id), explain: `${node.when}${node.watch ? ` Watch: ${node.watch}` : ""}` };
}

export function makeChain(cat: Catalog, conceptId: string, variant: number, rng: () => number, level = 1): Item | undefined {
  const nodes = cat.graph.forConcept(conceptId).filter((n) => Object.values(n.inputs).some((i) => i.from));
  if (nodes.length === 0) return undefined;
  const node = nodes[Math.floor(variant / 2) % nodes.length] as (typeof nodes)[number];
  // level 1 only asks which one input is missing; later levels ask for the whole ordered chain
  const sub: "steps" | "missing" = level <= 1 ? "missing" : variant % 2 === 0 ? "steps" : "missing";
  const depth = sub === "missing" ? 1 : level >= 3 ? 3 : 2;
  let inst = generate(cat.graph, node.id, rng, { chainProb: 1, maxDepth: depth });
  for (let tries = 0; tries < 6 && inst.chain.length < 2; tries++) inst = generate(cat.graph, node.id, rng, { chainProb: 1, maxDepth: depth });
  if (inst.chain.length < 2) return undefined;
  const used = new Set(inst.chain.map((st) => st.node));
  const decoys = shuffle([...cat.graph.nodes.values()].filter((n) => !used.has(n.id) && n.chapter === node.chapter), rng).slice(0, Math.max(2, 5 - inst.chain.length));
  const options = shuffle([...inst.chain.map((st) => ({ node: st.node, name: st.name })), ...decoys.map((n) => ({ node: n.id, name: n.name }))], rng);
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
export function makeItem(cat: Catalog, conceptId: string, mode: Mode, variant: number, opts?: { level?: number }): Item | undefined {
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
      return makeCalc(cat, conceptId, variant, opts?.level ?? 1);
    case "formula":
      return makeFormula(cat, conceptId, variant, rng);
    case "chain":
      return makeChain(cat, conceptId, variant, rng, opts?.level ?? 1);
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
