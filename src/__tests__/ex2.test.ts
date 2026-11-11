import { describe, it, expect } from "vitest";
import { PLAYS, PLAY_BY_ID } from "../ex2/content";
import { TERMS } from "../ex2/terms";
import { makeName, makeNeed, makeRoute, makeTerm, makeFact, makeFigure, buildSession, nextKind, routeFor, playConcept } from "../ex2/engine";
import { FACTS } from "../ex2/facts";
import { FIGURES } from "../ex2/figures";
import { TOPICS } from "../ex2/coverage";
import { emptyProgress, review, Rating } from "../engine/store";
import { chapters } from "../content";

describe("exam 2 content", () => {
  it("ids are unique and chapters are 5 to 8", () => {
    expect(new Set(PLAYS.map((p) => p.id)).size).toBe(PLAYS.length);
    expect(new Set(TERMS.map((t) => t.id)).size).toBe(TERMS.length);
    for (const p of PLAYS) expect([5, 6, 7, 8]).toContain(p.chapter);
    for (const c of [5, 6, 7, 8]) expect(PLAYS.filter((p) => p.chapter === c).length).toBeGreaterThanOrEqual(5);
  });
  it("every pattern has what it needs to teach", () => {
    for (const p of PLAYS) {
      expect(p.sees.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.needs.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.steps.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.trap.length, p.id).toBeGreaterThan(10);
      expect(p.gist.length, p.id).toBeLessThan(130);
      for (const s of p.steps) expect(s.length, `${p.id}: ${s}`).toBeLessThanOrEqual(95);
    }
  });
  it("tap-what-you-need scenarios have both needed and skipped items", () => {
    for (const p of PLAYS) for (const g of p.gather ?? []) {
      expect(g.items.some((i) => i[1]), p.id).toBe(true);
      expect(g.items.some((i) => !i[1]), p.id).toBe(true);
      expect(g.items.length, p.id).toBeLessThanOrEqual(8);
    }
  });
  it("routes have at least three steps and something given", () => {
    for (const p of PLAYS) for (const r of p.routes ?? []) {
      expect(r.steps.length, p.id).toBeGreaterThanOrEqual(3);
      expect(r.steps.length, p.id).toBeLessThanOrEqual(5);
      expect(r.given.length, p.id).toBeGreaterThanOrEqual(1);
    }
  });
  it("no raw abbreviations in anything the learner reads", () => {
    const banned = /\b(COGS|COGM|MOH|DLH|WIP|FG|RM|CM|CVP|VC|FC|DOL|MOS)\b/;
    const bad: string[] = [];
    const chk = (w: string, t?: string) => { if (t && banned.test(t)) bad.push(`${w}: ${t.slice(0, 60)}`); };
    for (const p of PLAYS) {
      [p.name, p.gist, p.trap, p.example, ...p.sees, ...p.needs, ...p.steps, ...(p.skip ?? [])].forEach((t) => chk(p.id, t));
      for (const g of p.gather ?? []) { chk(p.id, g.q); g.items.forEach((i) => { chk(p.id, i[0]); chk(p.id, i[2]); }); }
      for (const r of p.routes ?? []) { chk(p.id, r.goal); r.given.forEach((t) => chk(p.id, t)); r.steps.forEach((t) => chk(p.id, t)); }
    }
    TERMS.forEach((t) => { chk(t.id, t.term); chk(t.id, t.line); });
    expect(bad).toEqual([]);
  });
  it("exam 2 ids never collide with exam 1 concept ids", () => {
    const old = new Set(chapters.flatMap((c) => c.concepts.map((x) => x.id)));
    for (const p of PLAYS) expect(old.has(playConcept(p.id))).toBe(false);
  });
});

describe("exam 2 questions", () => {
  it("name it: three distinct options, the answer is the right pattern, wrong ones are different patterns", () => {
    for (const p of PLAYS) for (let v = 0; v < p.sees.length; v++) {
      const q = makeName(p, v);
      if (q.kind !== "name") throw new Error();
      expect(q.options.length).toBe(3);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(3);
      expect(q.options[q.answer]!.id).toBe(p.id);
      expect(q.prompt).toBe(p.sees[v]);
    }
  });
  it("need it: has needed and unneeded chips, no duplicates", () => {
    for (const p of PLAYS) for (let v = 0; v < 3; v++) {
      const q = makeNeed(p, v);
      if (q.kind !== "need") throw new Error();
      expect(q.chips.some((c) => c.need), p.id).toBe(true);
      expect(q.chips.some((c) => !c.need), p.id).toBe(true);
      expect(new Set(q.chips.map((c) => c.text)).size, p.id).toBe(q.chips.length);
      expect(q.chips.length).toBeLessThanOrEqual(8);
    }
  });
  it("route it: every step appears once at its index and the decoy is not a real step", () => {
    for (const p of PLAYS) for (let v = 0; v < 2; v++) {
      const q = makeRoute(p, v);
      if (q.kind !== "route") throw new Error();
      const route = routeFor(p, v);
      for (let i = 0; i < route.steps.length; i++) expect(q.options.filter((o) => o.idx === i).length, `${p.id} step ${i}`).toBe(1);
      for (const o of q.options.filter((x) => x.idx === -1)) expect(route.steps.map((s) => s.toLowerCase())).not.toContain(o.text.toLowerCase());
    }
  });
  it("term questions have distinct options that include the answer", () => {
    for (const t of TERMS) for (const v of [0, 1]) {
      const q = makeTerm(t, v);
      if (q.kind !== "term") throw new Error();
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options[q.answer]).toBe(v === 1 ? t.line : t.term);
    }
  });
});

describe("exam 2 sessions", () => {
  it("a chapter drill only contains that chapter", () => {
    for (const c of [5, 6, 7, 8] as const) {
      const items = buildSession(emptyProgress(), { chapters: [c], kind: "plays" }, 10);
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) if ("play" in it) expect(it.play.chapter).toBe(c);
    }
  });
  it("a term drill only contains terms from the chosen chapter", () => {
    const items = buildSession(emptyProgress(), { chapters: [8], kind: "terms" }, 10);
    expect(items.length).toBe(10);
    for (const it of items) { expect(it.kind).toBe("term"); if (it.kind === "term") expect(it.term.chapter).toBe(8); }
  });
  it("new patterns are shown before they are tested, and a session holds ten questions", () => {
    const items = buildSession(emptyProgress(), { chapters: [5, 6, 7, 8], kind: "plays" }, 10);
    expect(items.filter((i) => i.kind !== "learn").length).toBe(10);
    items.forEach((it, i) => { if (it.kind !== "learn") expect(items[i - 1]?.kind === "learn" ? (items[i - 1] as { play: { id: string } }).play.id : it.kind === "term" ? "" : (it as { play: { id: string } }).play.id).toBe((it as { play: { id: string } }).play.id); });
    for (const it of items) if (it.kind === "learn") { const nxt = items[items.indexOf(it) + 1]; expect(nxt?.kind).toBe("name"); expect((nxt as { play: { id: string } }).play.id).toBe(it.play.id); }
  });
  it("drilling one pattern returns only that pattern", () => {
    const items = buildSession(emptyProgress(), { chapters: [5, 6, 7, 8], kind: "plays", only: ["p7-breakeven"] }, 3);
    for (const it of items) expect((it as { play: { id: string } }).play.id).toBe("p7-breakeven");
    expect(items.filter((i) => i.kind !== "learn").length).toBe(3);
  });
  it("the ladder climbs name, then need, then route", () => {
    const p = emptyProgress();
    expect(nextKind(p, "p7-breakeven", () => 0.99)).toBe("name");
    review(p, playConcept("p7-breakeven"), "name", Rating.Good, 0);
    expect(nextKind(p, "p7-breakeven", () => 0.99)).toBe("need");
    review(p, playConcept("p7-breakeven"), "need", Rating.Good, 0);
    expect(nextKind(p, "p7-breakeven", () => 0.99)).toBe("route");
  });
  it("every pattern is reachable by id", () => {
    for (const p of PLAYS) expect(PLAY_BY_ID.get(p.id)).toBe(p);
  });
});

describe("single pattern drill order", () => {
  it("shows the card, then name, need and route in order", () => {
    const items = buildSession(emptyProgress(), { chapters: [5, 6, 7, 8], kind: "plays", only: ["p8-keepdrop"] }, 3);
    expect(items.map((i) => i.kind)).toEqual(["learn", "name", "need", "route"]);
  });
});

describe("exam 2 coverage", () => {
  const topicIds = new Set(TOPICS.map((t) => t.id));
  it("every pattern and every term belongs to a topic", () => {
    const plays = new Set(TOPICS.flatMap((t) => t.plays));
    const terms = new Set(TOPICS.flatMap((t) => t.terms));
    expect(PLAYS.filter((p) => !plays.has(p.id)).map((p) => p.id)).toEqual([]);
    expect(TERMS.filter((t) => !terms.has(t.id)).map((t) => t.id)).toEqual([]);
    for (const t of TOPICS) {
      t.plays.forEach((id) => expect(PLAY_BY_ID.has(id), `${t.id} → ${id}`).toBe(true));
      t.terms.forEach((id) => expect(TERMS.some((x) => x.id === id), `${t.id} → ${id}`).toBe(true));
    }
  });
  it("every topic is trained by at least two facts and by a pattern or term", () => {
    for (const t of TOPICS) {
      const topic = t.id.split(":")[1];
      const n = FACTS.filter((f) => f.chapter === t.chapter && f.topic === topic).length;
      expect(n, `${t.id} facts`).toBeGreaterThanOrEqual(2);
      expect(t.plays.length + t.terms.length, `${t.id} patterns/terms`).toBeGreaterThanOrEqual(1);
    }
  });
  it("every fact and number drill points at a real topic", () => {
    for (const f of FACTS) expect(topicIds.has(`${f.chapter}:${f.topic}`), f.id).toBe(true);
    for (const f of FIGURES) expect(topicIds.has(`${f.chapter}:${f.topic}`), f.id).toBe(true);
  });
  it("every chapter has number drills for its main calculations", () => {
    for (const c of [5, 6, 7, 8]) expect(FIGURES.filter((f) => f.chapter === c).length).toBeGreaterThanOrEqual(4);
  });
});

describe("exam 2 quick facts", () => {
  it("ids are unique, options are distinct and short", () => {
    expect(new Set(FACTS.map((f) => f.id)).size).toBe(FACTS.length);
    expect(FACTS.length).toBeGreaterThanOrEqual(150);
    for (const f of FACTS) {
      expect(new Set([f.a, ...f.wrong]).size, f.id).toBe(3);
      expect(f.q.length, f.id).toBeLessThanOrEqual(90);
      for (const t of [f.a, ...f.wrong]) expect(t.length, `${f.id}: ${t}`).toBeLessThanOrEqual(70);
    }
  });
  it("the right answer lands where the question says", () => {
    for (const f of FACTS) for (let i = 0; i < 5; i++) {
      const q = makeFact(f);
      if (q.kind !== "fact") throw new Error();
      expect(q.options[q.answer]).toBe(f.a);
    }
  });
  it("no raw abbreviations", () => {
    const banned = /\b(COGS|COGM|MOH|DLH|WIP|FG|RM|CM|CVP|VC|FC|DOL|MOS)\b/;
    for (const f of FACTS) for (const t of [f.q, f.a, ...f.wrong, f.why ?? ""]) expect(banned.test(t), `${f.id}: ${t}`).toBe(false);
  });
});

describe("exam 2 number drills", () => {
  it("every template gives four distinct, clean answers, many times over", () => {
    for (const tpl of FIGURES) for (let i = 0; i < 300; i++) {
      const q = makeFigure(tpl);
      if (q.kind !== "figure") throw new Error();
      expect(q.options.length, tpl.id).toBe(4);
      expect(new Set(q.options.map((o) => o.text)).size, tpl.id).toBe(4);
      expect(q.options[q.answer]!.why, tpl.id).toBeUndefined();
      for (const o of q.options) expect(/NaN|Infinity|undefined|-0\b/.test(o.text), `${tpl.id}: ${o.text}`).toBe(false);
      expect(/NaN|Infinity|undefined/.test(q.q), tpl.id).toBe(false);
      q.options.forEach((o, k) => { if (k !== q.answer) expect(o.why?.length ?? 0, `${tpl.id} wrong-answer reason`).toBeGreaterThan(5); });
    }
  });
  it("the keyed answer matches an independent recalculation from the question text", () => {
    const nums = (q: string) => [...q.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, "")));
    const val = (s: string) => Number(s.replace(/[^\d.\-−]/g, "").replace("−", "-"));
    const sign = (s: string) => (s.startsWith("−") ? -1 : 1) * Math.abs(val(s));
    const rules: Record<string, (n: number[]) => number> = {
      eup: ([out, end, p]) => out! + (end! * p!) / 100,
      cpeu: ([beg, add, e]) => (beg! + add!) / e!,
      endcost: ([end, p, c]) => ((end! * p!) / 100) * c!,
      units: ([beg, st, out]) => beg! + st! - out!,
      "hl-rate": ([, cL, , cH, ...r]) => { void r; return NaN; },
      mixed: ([F, b, X]) => F! + b! * X!,
      "fixed-unit": ([R, , u2]) => R! / u2!,
      "cm-income": ([S, V, F]) => S! - V! - F!,
      "be-units": ([F, p, v]) => F! / (p! - v!),
      "be-dollars": ([F, m]) => F! / (m! / 100),
      "target-units": ([F, P, cm]) => (F! + P!) / cm!,
      dol: ([cm, oi]) => cm! / oi!,
      "op-change": ([dS, m]) => (dS! * m!) / 100,
      adv: ([A, dS, m]) => (dS! * m!) / 100 - A!,
      makebuy: ([a, b, c]) => a! + b! + c!,
      special: ([n, p, v, , K]) => n! * (p! - v!) - K!,
      constraint: ([m, h]) => m! / h!,
      "target-cost": ([p, m]) => p! * (1 - m! / 100),
      "cost-plus": ([c, m]) => c! * (1 + m! / 100),
      further: ([s0, s1, k]) => s1! - s0! - k!,
      drop: ([c, a]) => a! - c!,
    };
    for (const [id, rule] of Object.entries(rules)) {
      if (id === "hl-rate") continue;
      const tpl = FIGURES.find((x) => x.id === id)!;
      for (let i = 0; i < 100; i++) {
        const f = tpl.make(Math.random);
        const want = rule(nums(f.q));
        const got = ["adv", "special", "further", "drop"].includes(id) ? sign(f.ans) : val(f.ans);
        expect(got, `${id}: ${f.q}`).toBeCloseTo(want, 1);
      }
    }
    // high-low: rate = (high cost - low cost) / (high units - low units); fixed = high cost - rate x high units
    const hr = FIGURES.find((x) => x.id === "hl-rate")!;
    for (let i = 0; i < 100; i++) {
      const f = hr.make(Math.random);
      const [L, cL, H, cH] = nums(f.q);
      expect(val(f.ans)).toBeCloseTo((cH! - cL!) / (H! - L!), 5);
    }
    const hf = FIGURES.find((x) => x.id === "hl-fixed")!;
    for (let i = 0; i < 100; i++) {
      const f = hf.make(Math.random);
      const [rate, H, cH] = nums(f.q);
      expect(val(f.ans)).toBeCloseTo(cH! - rate! * H!, 5);
    }
    const mo = FIGURES.find((x) => x.id === "mos")!;
    for (let i = 0; i < 100; i++) {
      const f = mo.make(Math.random);
      const [S, BE] = nums(f.q);
      expect(val(f.ans)).toBeCloseTo(((S! - BE!) / S!) * 100, 1);
    }
    const cr = FIGURES.find((x) => x.id === "cm-ratio")!;
    for (let i = 0; i < 100; i++) {
      const f = cr.make(Math.random);
      const [S, V] = nums(f.q);
      expect(val(f.ans)).toBeCloseTo(((S! - V!) / S!) * 100, 1);
    }
  });
});

describe("exam 2 session builders", () => {
  it("facts and number sessions stay in chapter and are the right kind", () => {
    for (const c of [5, 6, 7, 8] as const) {
      const f = buildSession(emptyProgress(), { chapters: [c], kind: "facts" }, 10);
      expect(f.length).toBe(10);
      for (const it of f) { expect(it.kind).toBe("fact"); if (it.kind === "fact") expect(it.fact.chapter).toBe(c); }
      const n = buildSession(emptyProgress(), { chapters: [c], kind: "figures" }, 4);
      for (const it of n) { expect(it.kind).toBe("figure"); if (it.kind === "figure") expect(it.tpl.chapter).toBe(c); }
    }
  });
  it("the quick drill mixes patterns, facts and numbers from one chapter", () => {
    const items = buildSession(emptyProgress(), { chapters: [7], kind: "mix" }, 10);
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds.has("fact")).toBe(true);
    expect(kinds.has("figure")).toBe(true);
    expect([...kinds].some((k) => k === "name" || k === "learn")).toBe(true);
    for (const it of items) {
      const ch = it.kind === "fact" ? it.fact.chapter : it.kind === "figure" ? it.tpl.chapter : it.kind === "term" ? it.term.chapter : it.play.chapter;
      expect(ch).toBe(7);
    }
    const li = items.findIndex((i) => i.kind === "learn");
    if (li >= 0) expect((items[li + 1] as { play?: { id: string } }).play?.id).toBe((items[li] as { play: { id: string } }).play.id);
  });
  it("answered facts leave the front of the line", () => {
    const p = emptyProgress();
    const first = buildSession(p, { chapters: [5], kind: "facts" }, 5);
    for (const it of first) if (it.kind === "fact") review(p, `ex2.f.${it.fact.id}`, "fact", Rating.Good, 0);
    const second = buildSession(p, { chapters: [5], kind: "facts" }, 5);
    const ids = new Set(first.map((i) => i.id));
    expect(second.filter((i) => ids.has(i.id)).length).toBe(0);
  });
});
