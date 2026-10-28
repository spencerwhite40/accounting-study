import { describe, it, expect } from "vitest";
import { chapters } from "../content";
import { Catalog, makeItem, mulberry32, parseCloze } from "../engine/items";
import { generate } from "../engine/calc";
import { matches, numberClose } from "../engine/grade";
import { buildSession } from "../engine/session";
import { emptyProgress, review, Rating } from "../engine/store";

const cat = new Catalog(chapters);

describe("content integrity", () => {
  it("every referenced concept id exists", () => {
    const missing: string[] = [];
    for (const ch of chapters) {
      for (const c of ch.concepts) for (const r of c.related ?? []) if (!cat.concepts.has(r)) missing.push(`${c.id} related ${r}`);
      for (const s of [...ch.sorts, ...ch.orders]) for (const r of s.concepts) if (!cat.concepts.has(r)) missing.push(`${s.id} concept ${r}`);
      for (const z of ch.clozes) if (!cat.concepts.has(z.concept)) missing.push(`${z.id} concept ${z.concept}`);
      for (const n of ch.calcs) {
        if (!cat.concepts.has(n.concept)) missing.push(`${n.id} concept ${n.concept}`);
        for (const [k, i] of Object.entries(n.inputs)) if (i.from && !cat.graph.nodes.has(i.from)) missing.push(`${n.id}.${k} from ${i.from}`);
      }
    }
    expect(missing).toEqual([]);
  });
  it("ids are unique", () => {
    const ids = chapters.flatMap((c) => [...c.concepts.map((x) => x.id), ...c.sorts.map((x) => "s:" + x.id), ...c.orders.map((x) => "o:" + x.id), ...c.clozes.map((x) => "z:" + x.id), ...c.calcs.map((x) => x.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("sort buckets are valid and every cloze has a blank", () => {
    for (const ch of chapters) {
      for (const s of ch.sorts) for (const c of s.cards) expect(c.bucket).toBeLessThan(s.buckets.length);
      for (const z of ch.clozes) expect(parseCloze(z.text).some((p) => typeof p !== "string")).toBe(true);
    }
  });
  it("every concept yields a flashcard and an mcq with 4 distinct choices", () => {
    for (const c of cat.concepts.values()) {
      const fc = makeItem(cat, c.id, "flashcard", 0);
      expect(fc?.kind).toBe("flashcard");
      const m = makeItem(cat, c.id, "mcq", 1);
      expect(m?.kind).toBe("mcq");
      if (m?.kind === "mcq") {
        expect(new Set(m.choices.map((x) => x.text)).size).toBe(4);
        expect(m.choices[m.answer]?.concept).toBe(c.id);
      }
    }
  });
});

describe("calculation graph", () => {
  it("generates finite, consistent problems for every node, plain and chained", () => {
    for (const n of cat.graph.nodes.values()) {
      for (let seed = 1; seed <= 25; seed++) {
        for (const chainProb of [0, 1]) {
          const inst = generate(cat.graph, n.id, mulberry32(seed * 7919 + chainProb), { chainProb, maxDepth: 3 });
          expect(Number.isFinite(inst.answer), `${n.id} seed ${seed}`).toBe(true);
          expect(inst.chain[inst.chain.length - 1]?.node).toBe(n.id);
          // chained inputs must equal the result of an earlier step
          for (const step of inst.chain) for (const inp of step.inputs) if (inp.derived) expect(inst.chain.some((s) => s.result === inp.value)).toBe(true);
          // givens never include a derived input of the target
          const last = inst.chain[inst.chain.length - 1]!;
          for (const inp of last.inputs) if (inp.derived) expect(inst.givens.some((g) => g.label === inp.label && g.value === inp.value)).toBe(false);
          if (chainProb === 1 && Object.values(n.inputs).some((i) => i.from)) expect(inst.hidden.length).toBeGreaterThan(0);
          if (inst.direction) expect(inst.direction.answer).toBeLessThan(inst.direction.options.length);
          // no contradictory duplicate givens (same label, different value)
          const byLabel = new Map<string, number>();
          for (const g of inst.givens) {
            if (byLabel.has(g.label)) expect(byLabel.get(g.label), `${n.id} seed ${seed} duplicate given ${g.label}`).toBe(g.value);
            byLabel.set(g.label, g.value);
          }
          // inventory-style results never go negative
          if (/cogs|cogm|dm-used|gross-profit|total-mfg/.test(n.id)) expect(inst.answer, `${n.id} seed ${seed}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
  it("reproduces the lecture's job 2B47 numbers", () => {
    const pohr = cat.graph.node("ch3.pohr").compute({ estMOH: 100000, estBase: 12500 });
    expect(pohr).toBe(8);
    expect(cat.graph.node("ch3.job-cost").compute({ dm: 1404, dl: 180, rate: 8, hours: 27 })).toBe(1800);
    expect(cat.graph.node("ch3.over-under").compute({ applied: 97600, actual: 101000 })).toBe(3400);
    expect(cat.graph.node("ch3.over-under").direction!.pick({ applied: 97600, actual: 101000 }, 3400)).toBe(1);
    expect(cat.graph.node("ch2.total-cost").compute({ fc: 1_000_000, vcu: 250, units: 22000 })).toBe(6_500_000);
    expect(cat.graph.node("ch4.activity-rate").compute({ poolCost: 255000, usageA: 3000, usageB: 2000 })).toBe(51);
  });
});

describe("grading", () => {
  it("fuzzy text", () => {
    expect(matches("work in proccess", ["work in process", "WIP"])).toBe(true);
    expect(matches("wip", ["work in process", "WIP"])).toBe(true);
    expect(matches("1972", ["1972"])).toBe(true);
    expect(matches("1973", ["1972"])).toBe(false);
    expect(matches("", ["x"])).toBe(false);
    expect(matches("internal failure", ["external failure"])).toBe(false);
    expect(matches("price", ["prime"])).toBe(false);
    expect(matches("overaplied", ["overapplied"])).toBe(true);
  });
  it("numbers with formatting", () => {
    expect(numberClose("$6,500,000", 6500000)).toBe(true);
    expect(numberClose("8", 8)).toBe(true);
    expect(numberClose("8.5", 8)).toBe(false);
    expect(numberClose("", 0)).toBe(false);
    expect(numberClose("$", 0)).toBe(false);
  });
});

describe("session builder", () => {
  it("ordinary reviews do not eat the daily new-concept budget", () => {
    const p = emptyProgress();
    const ids = [...cat.concepts.keys()];
    // 30 concepts first seen two days ago, reviewed again just now
    for (const id of ids.slice(0, 30)) {
      review(p, id, "flashcard", Rating.Good, 0, new Date(Date.now() - 2 * 86400e3));
      review(p, id, "flashcard", Rating.Good, 0, new Date());
    }
    const items = buildSession(cat, p, { mode: "flashcard", size: 10 });
    const fresh = items.filter((it) => it.kind === "flashcard" && (p.cards[it.concept]?.reps ?? 0) === 0);
    expect(fresh.length).toBeGreaterThan(0);
  });
  it("cram sessions never repeat a concept", () => {
    const p = emptyProgress();
    const items = buildSession(cat, p, { mode: "mcq", chapter: 3, size: 40, cram: true });
    const ids = items.map((it) => (it.kind === "mcq" ? it.concept : ""));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("equation drills", () => {
  it("every calculation concept yields name→formula, formula→name and fill-the-term items", () => {
    for (const n of cat.graph.nodes.values()) {
      const a = makeItem(cat, n.concept, "formula", 0);
      const b = makeItem(cat, n.concept, "formula", 1);
      const c = makeItem(cat, n.concept, "formula", 2);
      expect(a?.kind).toBe("mcq");
      expect(b?.kind).toBe("mcq");
      if (a?.kind === "mcq") expect(a.choices[a.answer]?.concept).toBe(n.concept);
      if (c?.kind === "cloze") expect(c.parts.some((p) => typeof p !== "string")).toBe(true);
    }
  });
  it("spot-the-steps items list every chain node among the options and never ask for a one-step chain", () => {
    for (const n of cat.graph.nodes.values()) {
      if (!Object.values(n.inputs).some((i) => i.from)) continue;
      for (const v of [0, 1, 2, 3]) {
        const it = makeItem(cat, n.concept, "chain", v);
        expect(it?.kind, `${n.id} v${v}`).toBe("chain");
        if (it?.kind !== "chain") continue;
        expect(it.inst.chain.length).toBeGreaterThanOrEqual(2);
        for (const s of it.inst.chain) expect(it.options.some((o) => o.node === s.node)).toBe(true);
        if (it.sub === "missing") expect(it.inst.hidden.length).toBeGreaterThan(0);
      }
    }
  });
});

import { SCENARIOS } from "../engine/exam";
import { STUDY_GUIDE, EXAM_WEIGHT } from "../content/exam1";

describe("exam scenarios", () => {
  it("every scenario item references a real concept, journal entries balance, numbers are finite and non-negative balances", () => {
    for (const sc of SCENARIOS) {
      for (let seed = 1; seed <= 30; seed++) {
        const items = sc.make(mulberry32(seed * 31));
        expect(items.length).toBeGreaterThan(8);
        for (const it of items) {
          expect(cat.concepts.has(it.concept), `${sc.id} ${it.id} concept ${it.concept}`).toBe(true);
          if (it.kind === "journal") {
            const d = it.debits.reduce((a, l) => a + l.amount, 0);
            const c = it.credits.reduce((a, l) => a + l.amount, 0);
            expect(d, `${it.id} seed ${seed} balances`).toBe(c);
            for (const l of [...it.debits, ...it.credits]) { expect(l.amount).toBeGreaterThan(0); expect(it.accounts).toContain(l.account); }
          } else {
            expect(Number.isFinite(it.inst.answer), `${it.id} seed ${seed}`).toBe(true);
            if (/end|rate|applied|actual|dm|tmc|cogs/.test(it.id)) expect(it.inst.answer, `${it.id} seed ${seed}`).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
  it("job scenario is internally consistent: WIP and FG roll forward, COGS adjusts by the variance", () => {
    const items = SCENARIOS[0]!.make(mulberry32(7));
    const get = (id: string) => { const it = items.find((x) => x.id === id); return it && it.kind === "calc" ? it.inst : undefined; };
    const applied = get("ex:job:applied")!, actual = get("ex:job:actual")!, ou = get("ex:job:overunder")!;
    expect(Math.abs(actual.answer - applied.answer)).toBeCloseTo(ou.answer, 2);
    const tmc = get("ex:job:tmc")!, dm = get("ex:job:dm")!;
    const dl = tmc.givens.find((g) => g.label === "Direct labor")!.value;
    expect(tmc.answer).toBeCloseTo(dm.answer + dl + applied.answer, 2);
    const adj = get("ex:job:adjcogs")!;
    const cogs = adj.givens.find((g) => g.label.startsWith("Unadjusted"))!.value;
    expect(adj.answer).toBeCloseTo(cogs + (actual.answer - applied.answer), 2);
  });
  it("study guide references real concepts and exam weights favour job costing and ABC", () => {
    for (const s of STUDY_GUIDE) for (const it of s.items) for (const id of it.concepts) expect(cat.concepts.has(id), id).toBe(true);
    expect(EXAM_WEIGHT["ac241.ch3.predetermined-overhead-rate"]).toBeGreaterThan(EXAM_WEIGHT["ac241.ch1.sustainability"] ?? 1);
  });
  it("mixed sessions include exam scenario questions", () => {
    const p = emptyProgress();
    const items = buildSession(cat, p, { mode: "mixed", size: 14, cram: true });
    expect(items.some((it) => it.kind === "journal" || (it.kind === "calc" && it.id.startsWith("ex:")))).toBe(true);
  });
});
