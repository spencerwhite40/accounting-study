import type { CalcNode, CalcInstance, CalcStep, Unit } from "../content/types";
import { fmt } from "./grade";

export class CalcGraph {
  nodes = new Map<string, CalcNode>();
  constructor(nodes: CalcNode[]) {
    for (const n of nodes) this.nodes.set(n.id, n);
  }
  node(id: string): CalcNode {
    const n = this.nodes.get(id);
    if (!n) throw new Error(`unknown calc node ${id}`);
    return n;
  }
  /** Nodes that can feed this node, and nodes it feeds. */
  deps(id: string): { needs: CalcNode[]; feeds: CalcNode[] } {
    const n = this.node(id);
    const needs = Object.values(n.inputs).map((i) => i.from).filter((f): f is string => !!f).map((f) => this.node(f));
    const feeds = [...this.nodes.values()].filter((m) => Object.values(m.inputs).some((i) => i.from === id));
    return { needs: uniq(needs), feeds };
  }
  forConcept(concept: string): CalcNode[] {
    return [...this.nodes.values()].filter((n) => n.concept === concept);
  }
}

function uniq<T>(a: T[]): T[] {
  return [...new Set(a)];
}

export interface GenOptions {
  /** 0 = never chain (all inputs given), 1 = always chain where possible. */
  chainProb: number;
  maxDepth: number;
}

/**
 * Generate a problem for `targetId`. Inputs with `from` are, with probability
 * chainProb, replaced by a sub-problem whose givens are listed instead, so the
 * solver must notice that an intermediate figure is needed.
 */
export function generate(graph: CalcGraph, targetId: string, rng: () => number, opts: GenOptions): CalcInstance {
  const givens: CalcInstance["givens"] = [];
  const chain: CalcStep[] = [];

  // Values already produced anywhere in this problem, keyed by input key + label.
  // A node whose input has the same key and label reuses the value instead of
  // generating a contradictory one (e.g. "Units produced" in total cost and
  // average cost, or DM/DL per unit under plantwide and ABC).
  const pool = new Map<string, number>();
  const poolKey = (key: string, label: string) => `${key}|${label}`;

  const solve = (id: string, depth: number): number => {
    const node = graph.node(id);
    const fixed: Record<string, number> = {};
    const derivedKeys = new Set<string>();
    const sharedKeys = new Set<string>();
    const takeShared = () => {
      for (const [key, spec] of Object.entries(node.inputs)) {
        const pk = poolKey(key, spec.label);
        if (!(key in fixed) && pool.has(pk)) {
          fixed[key] = pool.get(pk) as number;
          sharedKeys.add(key);
        }
      }
    };
    takeShared();
    // children first: whatever they generate becomes shareable by this node
    for (const [key, spec] of Object.entries(node.inputs)) {
      if (spec.from && !(key in fixed) && depth < opts.maxDepth && rng() < opts.chainProb) {
        fixed[key] = solve(spec.from, depth + 1);
        derivedKeys.add(key);
        takeShared();
      }
    }
    const values = node.gen(rng, { ...fixed });
    for (const k of Object.keys(fixed)) values[k] = fixed[k] as number;
    for (const [key, spec] of Object.entries(node.inputs)) {
      if (derivedKeys.has(key)) continue;
      pool.set(poolKey(key, spec.label), values[key] as number);
      if (!sharedKeys.has(key)) givens.push({ label: spec.label, value: values[key] as number, unit: spec.unit });
    }
    const result = round2(node.compute(values));
    chain.push({
      node: id,
      name: node.name,
      formula: node.formula,
      inputs: Object.entries(node.inputs).map(([key, spec]) => ({ label: spec.label, value: values[key] as number, unit: spec.unit, derived: derivedKeys.has(key) })),
      result,
      unit: node.unit,
      concept: node.concept,
    });
    return result;
  };

  const answer = solve(targetId, 0);
  const target = graph.node(targetId);
  const last = chain[chain.length - 1] as CalcStep;
  const hidden = last.inputs.filter((i) => i.derived).map((i) => i.label);
  // shuffle givens lightly so the chain structure is not obvious from ordering
  const shuffled = givens.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = shuffled[i] as (typeof shuffled)[number];
    shuffled[i] = shuffled[j] as (typeof shuffled)[number];
    shuffled[j] = t;
  }
  const inst: CalcInstance = {
    target: targetId,
    title: target.name,
    givens: shuffled,
    question: `What is the ${target.name.toLowerCase()}?`,
    answer,
    unit: target.unit,
    chain,
    hidden,
  };
  if (target.scenario) inst.scenario = target.scenario;
  if (target.direction) {
    const lastInputs: Record<string, number> = {};
    Object.keys(target.inputs).forEach((k, i) => {
      lastInputs[k] = last.inputs[i]?.value ?? 0;
    });
    inst.direction = { prompt: target.direction.prompt, options: target.direction.options, answer: target.direction.pick(lastInputs, answer) };
  }
  return inst;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Human-readable worked solution lines for a step. */
export function stepLines(step: CalcStep): string[] {
  const parts = step.inputs.map((i) => `${i.label} = ${fmt(i.value, i.unit)}${i.derived ? " (from the previous step)" : ""}`);
  return [...parts, `${step.name} = ${fmt(step.result, step.unit)}`];
}

export type { Unit };
