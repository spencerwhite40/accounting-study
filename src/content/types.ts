export type Bloom = "recall" | "understand" | "apply" | "analyze";

/** One key term. The unit of mastery; every item is a way of asking about one. */
export interface Concept {
  id: string;
  chapter: number;
  topic: string;
  term: string;
  /** Canonical definition from the course key-terms sheet. */
  definition: string;
  /** One-sentence plain-English restatement. Used for hints and a flashcard variant. */
  plain: string;
  formula?: string;
  example?: string;
  /** Other concept ids this one is commonly confused with; preferred MCQ distractors. */
  related?: string[];
  /** Alternate spellings/abbreviations accepted in fill-the-blank. */
  aliases?: string[];
  tags?: string[];
  bloom?: Bloom;
}

export interface SortSet {
  id: string;
  chapter: number;
  title: string;
  prompt: string;
  buckets: string[];
  cards: { text: string; bucket: number; why?: string }[];
  concepts: string[];
}

export interface OrderSet {
  id: string;
  chapter: number;
  title: string;
  prompt: string;
  steps: string[];
  concepts: string[];
  explain?: string;
}

/** Fill-the-blank template. Blanks are written {{answer|alt|alt}}. */
export interface ClozeTemplate {
  id: string;
  chapter: number;
  concept: string;
  text: string;
  explain?: string;
}

export type Unit = "$" | "$/unit" | "$/hr" | "units" | "%" | "hrs" | "";

/**
 * One calculation in the course. Nodes form a graph: an input with `from` can be
 * produced by another node, so a generated problem can hide that input behind a
 * prior calculation without saying so. That is the point of the Numbers mode.
 */
export interface CalcNode {
  id: string;
  chapter: number;
  /** Concept id this calculation belongs to (for mastery tracking). */
  concept: string;
  name: string;
  unit: Unit;
  /** Formula in words, exactly how it should be remembered. */
  formula: string;
  /** When you need this number: which later answers depend on it. */
  when: string;
  /** Common trap. */
  watch?: string;
  inputs: Record<string, { label: string; unit: Unit; from?: string }>;
  /** Generate input values; `fixed` holds values already produced by chained child nodes. */
  gen: (rng: () => number, fixed: Record<string, number>) => Record<string, number>;
  compute: (v: Record<string, number>) => number;
  /** Optional second part: a direction/classification choice (over vs under, etc). */
  direction?: { prompt: string; options: string[]; pick: (v: Record<string, number>, result: number) => number };
  /** Optional scenario sentence shown above the givens. */
  scenario?: string;
}

export interface CalcStep {
  node: string;
  name: string;
  formula: string;
  inputs: { label: string; value: number; unit: Unit; derived: boolean }[];
  result: number;
  unit: Unit;
  concept: string;
}

export interface CalcInstance {
  target: string;
  title: string;
  scenario?: string;
  givens: { label: string; value: number; unit: Unit }[];
  question: string;
  answer: number;
  unit: Unit;
  direction?: { prompt: string; options: string[]; answer: number };
  /** Evaluation order, leaves first; the last step is the target. */
  chain: CalcStep[];
  /** Inputs of the target that were hidden behind a prior calculation. */
  hidden: string[];
}

export interface Chapter {
  course: string;
  number: number;
  title: string;
  concepts: Concept[];
  sorts: SortSet[];
  orders: OrderSet[];
  clozes: ClozeTemplate[];
  calcs: CalcNode[];
}
