import { describe, it, expect } from "vitest";
import { PLAYS, PLAY_BY_ID } from "../ex2/content";
import { TERMS } from "../ex2/terms";
import { makeName, makeNeed, makeRoute, makeTerm, buildSession, nextKind, routeFor, playConcept } from "../ex2/engine";
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
      for (const it of items) if (it.kind !== "term") expect(it.play.chapter).toBe(c);
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
