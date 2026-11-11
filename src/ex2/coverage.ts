import type { Chapter } from "./types";

/** Every lecture topic and what trains it. Facts and number drills attach by `topic` within the chapter. */
export interface Topic { id: string; chapter: Chapter; name: string; plays: string[]; terms: string[] }

const t = (chapter: Chapter, id: string, name: string, plays: string[], terms: string[] = []): Topic => ({ id: `${chapter}:${id}`, chapter, name, plays, terms });

export const TOPICS: Topic[] = [
  t(5, "system", "Job order vs process costing", ["p5-system"]),
  t(5, "flow", "How cost flows between departments", ["p5-system", "p5-entry"]),
  t(5, "homogeneous", "Identical units and bypassing", ["p5-system"]),
  t(5, "eup", "Equivalent units", ["p5-eup"], ["equivalent-units"]),
  t(5, "method", "Cost per equivalent unit", ["p5-cpeu"], ["weighted-average"]),
  t(5, "steps", "Assigning cost and reconciling units", ["p5-assign", "p5-units"]),
  t(5, "entry", "Transfer entry", ["p5-entry"]),
  t(5, "report", "Production cost report", [], ["production-cost-report", "transferred-in"]),

  t(6, "variable", "Variable costs and cost drivers", ["p6-behavior"], ["variable", "cost-behavior"]),
  t(6, "fixed", "Fixed, committed and discretionary", ["p6-kinds"], ["fixed", "committed", "discretionary"]),
  t(6, "mixed", "Mixed costs and Y = a + bX", ["p6-mixed"], ["mixed", "cost-equation"]),
  t(6, "range", "Relevant range and curved costs", ["p6-range"], ["relevant-range", "curvilinear"]),
  t(6, "step", "Step costs", ["p6-kinds"], ["step"]),
  t(6, "graphs", "Cost graphs", ["p6-behavior", "p6-kinds"]),
  t(6, "methods", "Ways to split a mixed cost", ["p6-methods"], ["account-analysis"]),
  t(6, "scatter", "Scatter plot", ["p6-scatter"], ["scatter", "outliers"]),
  t(6, "highlow", "High-low method", ["p6-highlow"], ["high-low"]),
  t(6, "regression", "Regression", ["p6-regression"], ["regression"]),
  t(6, "statement", "Contribution margin statement", ["p6-cmstatement", "p6-whatif", "p6-costing"], ["cm", "cm-statement", "absorption", "variable-costing"]),

  t(7, "assumptions", "Cost-volume-profit assumptions", ["p7-assume"], ["cvp"]),
  t(7, "margin", "Contribution margin and ratio", ["p7-margin"], ["cm-unit", "cm-ratio"]),
  t(7, "breakeven", "Breakeven", ["p7-breakeven"], ["breakeven"]),
  t(7, "target", "Target profit", ["p7-target"]),
  t(7, "graph", "Cost-volume-profit graph", ["p7-graph"]),
  t(7, "mos", "Margin of safety", ["p7-mos"], ["mos"]),
  t(7, "leverage", "Operating leverage", ["p7-dol", "p7-structure"], ["op-leverage", "dol"]),
  t(7, "whatif", "What-if changes and bulk orders", ["p7-change", "p7-bulk"], ["sensitivity"]),
  t(7, "mix", "Sales mix", ["p7-mix"], ["sales-mix"]),

  t(8, "relevant", "Relevant and sunk costs", ["p8-relevant"], ["relevant-info", "sunk"]),
  t(8, "differential", "Differential, avoidable, opportunity", ["p8-differential"], ["differential", "avoidable", "opportunity"]),
  t(8, "drop", "Keep or drop", ["p8-keepdrop"]),
  t(8, "segment", "Segment margin", ["p8-keepdrop"], ["segment-margin"]),
  t(8, "makebuy", "Make or buy", ["p8-makebuy"], ["outsourcing"]),
  t(8, "special", "Special orders", ["p8-special"], ["special-order"]),
  t(8, "pricing", "Cost-plus and target costing", ["p8-costplus", "p8-target"], ["cost-plus", "target-costing"]),
  t(8, "joint", "Joint products and process further", ["p8-joint", "p8-process"], ["joint-products", "split-off", "joint-costs"]),
  t(8, "constraint", "Scarce resource (constraint)", ["p8-constraint"], ["constraint"]),
];

import { FACTS } from "./facts";
import { FIGURES } from "./figures";
import { factConcept, figureConcept, playConcept, termConcept } from "./engine";
import { mastery, type Progress } from "../engine/store";

export interface TopicStat { topic: Topic; mastery: number; seen: number; total: number }

/** How well one topic is known across every kind of item that trains it. Unseen items count as zero. */
export function topicStat(p: Progress, topic: Topic, now = new Date()): TopicStat {
  const key = topic.id.split(":")[1];
  const ids = [
    ...topic.plays.map(playConcept),
    ...topic.terms.map(termConcept),
    ...FACTS.filter((f) => f.chapter === topic.chapter && f.topic === key).map((f) => factConcept(f.id)),
    ...FIGURES.filter((f) => f.chapter === topic.chapter && f.topic === key).map((f) => figureConcept(f.id)),
  ];
  const seen = ids.filter((c) => (p.cards[c]?.reps ?? 0) > 0).length;
  const m = ids.reduce((a, c) => a + mastery(p, c, now), 0) / Math.max(1, ids.length);
  return { topic, mastery: m, seen, total: ids.length };
}
