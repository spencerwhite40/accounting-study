import { useEffect, useMemo, useState } from "react";
import { catalog, useApp, go } from "../App";
import { buildSession } from "../engine/session";
import { makeItem, type Item, type Mode, MODE_LABEL, itemConcepts, makeCalc, itemMode, mulberry32 } from "../engine/items";
import { review, confuse, Rating, type Grade, mastery, humanInterval } from "../engine/store";
import { fmt as fmtNum } from "../engine/grade";
import { generate } from "../engine/calc";
import { Flashcard } from "./items/Flashcard";
import { Mcq } from "./items/Mcq";
import { Cloze } from "./items/Cloze";
import { Sort } from "./items/Sort";
import { Order } from "./items/Order";
import { Calc } from "./items/Calc";
import { Chain } from "./items/Chain";
import { Journal } from "./items/Journal";
import { SCENARIOS } from "../engine/exam";
import { useState as useReactState } from "react";
import { haptic, masteryClass, Ring } from "./bits";
import { CalculatorSheet, CalculatorFab, closeCalculator, useCalculatorOpen } from "./Calculator";

export interface Result {
  rating: Grade;
  confusedWith?: string;
  stepReviews?: { concept: string; ok: boolean }[];
}
export interface ItemProps {
  item: Item;
  hints: number;
  onDone: (r: Result) => void;
}
interface Outcome { item: Item; rating: Grade; mode: Mode }

export function Session({ params }: { params: URLSearchParams }) {
  const { progress, update } = useApp();
  const rawMode = params.get("mode") ?? "mixed";
  const mode = (rawMode === "exam" ? "mixed" : rawMode) as Mode | "mixed";
  const isExam = rawMode === "exam";
  const ch = params.get("ch") ? Number(params.get("ch")) : undefined;
  const concept = params.get("concept");
  const node = params.get("node");
  const weak = params.get("weak") === "1";
  const scenarioId = params.get("scenario");
  const conceptList = params.get("concepts")?.split(",").filter(Boolean);

  const initial = useMemo<Item[]>(() => {
    if (concept) {
      const modes = mode === "mixed" ? catalog.modesFor(concept) : [mode];
      const items: Item[] = [];
      for (const m of modes) {
        if (m === "calc" && node) {
          const inst = generate(catalog.graph, node, mulberry32(Date.now()), { chainProb: 0.7, maxDepth: 3 });
          items.push({ kind: "calc", id: `calc:${node}:x`, concept, title: inst.title, inst });
        } else {
          const it = makeItem(catalog, concept, m, Math.floor(Math.random() * 4));
          if (it) items.push(it);
        }
      }
      return items;
    }
    if (isExam && scenarioId) {
      const sc = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
      return sc ? (sc.make(mulberry32(Date.now())) as Item[]) : [];
    }
    if (conceptList && conceptList.length) {
      const items: Item[] = [];
      for (const id of conceptList) {
        if (!catalog.concepts.has(id)) continue;
        const reps = progress.cards[id]?.reps ?? 0;
        const m = reps === 0 ? "flashcard" : (["mcq", "cloze", "formula", "chain", "calc"] as Mode[]).filter((x) => catalog.modesFor(id).includes(x))[Math.floor(Math.random() * 3) % 3] ?? "mcq";
        const it = makeItem(catalog, id, m, Math.floor(Math.random() * 4)) ?? makeItem(catalog, id, "mcq", 0);
        if (it) items.push(it);
      }
      return items;
    }
    if (weak) {
      const weakest = catalog.conceptsIn().filter((c) => (progress.cards[c.id]?.reps ?? 0) > 0).map((c) => ({ c, m: mastery(progress, c.id) })).sort((a, b) => a.m - b.m).slice(0, 10);
      return weakest.map(({ c }) => makeItem(catalog, c.id, "mcq", Math.floor(Math.random() * 4)) as Item).filter(Boolean);
    }
    return buildSession(catalog, progress, { mode, chapter: ch, cram: params.get("cram") === "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [items, setItems] = useState(initial);
  const [i, setI] = useState(0);
  const [hints, setHints] = useState(0);
  const [hidden, setHidden] = useState<number[]>([]);
  const [done, setDone] = useState<Result | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [itemKey, setItemKey] = useState(0);
  const [startedAt] = useState(Date.now());
  const calcOpen = useCalculatorOpen();

  const item = items[i];

  // Enter advances once an item is graded
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "Enter" && done) next(); };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  });

  if (!item) return <Summary outcomes={outcomes} empty={items.length === 0} minutes={(Date.now() - startedAt) / 60000} onAgain={() => { setItems(buildSession(catalog, progress, { mode, chapter: ch, cram: true })); setI(0); setOutcomes([]); setDone(null); setHints(0); }} />;

  const hintList = hintsFor(item);
  const onDone = (r: Result) => {
    setDone(r);
    setOutcomes((o) => [...o, { item, rating: r.rating, mode: itemMode(item) }]);
    update((p) => {
      for (const c of itemConcepts(item)) review(p, c, itemMode(item), r.rating, hints);
      if (r.confusedWith && item.kind !== "sort" && item.kind !== "order" && item.kind !== "chain") confuse(p, item.concept, r.confusedWith);
      const own = new Set(itemConcepts(item));
      for (const s of r.stepReviews ?? []) if (!own.has(s.concept)) review(p, s.concept, "calc", s.ok ? Rating.Good : Rating.Again, 0);
    });
  };
  function next() {
    closeCalculator();
    setDone(null);
    setHints(0);
    setHidden([]);
    setI((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const another = () => {
    const cid = itemConcepts(item)[0] as string;
    const replacement = item.kind === "calc" ? makeCalc(catalog, cid, Math.floor(Math.random() * 100), item.inst.hidden.length > 0) : makeItem(catalog, cid, itemMode(item), Math.floor(Math.random() * 100));
    if (replacement) {
      const copy = items.slice();
      copy[i] = replacement;
      setItems(copy);
      setHints(0);
      setHidden([]);
      setDone(null);
      setItemKey((k) => k + 1);
      haptic("tap");
    }
  };

  const props: ItemProps = { item, hints, onDone };
  const conceptId = itemConcepts(item)[0] as string;
  const c = catalog.concept(conceptId);
  const context = item.kind === "calc" || item.kind === "journal" ? item.context : undefined;
  return (
    <div className="screen session" style={calcOpen ? { paddingBottom: "min(62dvh, 420px)" } : undefined}>
      <div className="topbar">
        <button className="ghost icon" onClick={() => go("#/")} aria-label="Close">✕</button>
        <div className="seg grow">
          {items.map((_, k) => {
            const o = outcomes[k];
            return <i key={k} className={o ? (o.rating === Rating.Again ? "bad" : o.rating === Rating.Hard ? "hard" : "ok") : k === i ? "cur" : ""} />;
          })}
        </div>
        <span className="muted small num">{i + 1}/{items.length}</span>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="pill accent">{MODE_LABEL[itemMode(item)]}</span>
        <span className="muted tiny grow" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ch {c.chapter} · {c.topic}</span>
        {!done && <button className="ghost small" style={{ minHeight: 36 }} onClick={another}>Another</button>}
        {!done && hints < hintList.length && <button className="soft small" style={{ minHeight: 36 }} onClick={() => { setHints(hints + 1); haptic("tap"); }}>Hint {hints + 1}/{hintList.length}</button>}
      </div>
      {hintList.slice(0, hints).map((h, k) => hidden.includes(k) ? null : (
        <div key={k} className="hint"><span className="grow">{h}</span><button className="x" aria-label="Dismiss hint" onClick={() => setHidden([...hidden, k])}>✕</button></div>
      ))}
      {context && <ContextCard ctx={context} />}

      <div key={`${item.id}:${itemKey}`} className="item-enter">
        {item.kind === "flashcard" && <Flashcard {...props} />}
        {item.kind === "mcq" && <Mcq {...props} />}
        {item.kind === "cloze" && <Cloze {...props} />}
        {item.kind === "sort" && <Sort {...props} />}
        {item.kind === "order" && <Order {...props} />}
        {item.kind === "calc" && <Calc {...props} />}
        {item.kind === "chain" && <Chain {...props} />}
        {item.kind === "journal" && <Journal {...props} />}
      </div>

      {(item.kind === "calc" || item.kind === "journal") && !done && <CalculatorFab />}
      <CalculatorSheet />
      {done && (
        <div className="sticky-bottom row">
          <button className="primary grow" style={{ minHeight: 54, fontSize: 17 }} onClick={next}>{i + 1 >= items.length ? "Finish" : "Next"} →</button>
        </div>
      )}
    </div>
  );
}

function Summary({ outcomes, empty, minutes, onAgain }: { outcomes: Outcome[]; empty: boolean; minutes: number; onAgain: () => void }) {
  const { progress, openConcept } = useApp();
  const right = outcomes.filter((o) => o.rating !== Rating.Again).length;
  const acc = outcomes.length ? right / outcomes.length : 0;
  const byConcept = new Map<string, { again: number; total: number }>();
  for (const o of outcomes) for (const id of itemConcepts(o.item)) {
    const s = byConcept.get(id) ?? { again: 0, total: 0 };
    s.total++;
    if (o.rating === Rating.Again) s.again++;
    byConcept.set(id, s);
  }
  const revisit = [...byConcept.entries()].filter(([, s]) => s.again > 0).map(([id]) => id);
  const nextDue = Object.values(progress.cards).filter((c) => c.reps > 0 && c.due.getTime() > Date.now()).map((c) => c.due.getTime()).sort((a, b) => a - b)[0];
  return (
    <div className="screen session center" style={{ paddingBottom: 24 }}>
      <div style={{ width: "100%" }}>
        <div className="card hero" style={{ textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>{empty ? "Nothing here yet" : "Done"}</div>
          {!empty && (
            <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
              <Ring value={acc} label="right" color="var(--gold)" track="rgba(255,255,255,.18)" />
              <div style={{ textAlign: "left" }}>
                <div className="display" style={{ fontSize: 26 }}>{right}/{outcomes.length}</div>
                <div className="small" style={{ opacity: .85 }}>{Math.max(1, Math.round(minutes))} min · {byConcept.size} concepts</div>
                {nextDue && <div className="small" style={{ opacity: .85 }}>next review in {humanInterval(nextDue - Date.now())}</div>}
              </div>
            </div>
          )}
          <div className="stack" style={{ marginTop: 14 }}>
            <button className="primary" onClick={onAgain}>Another round</button>
            <button className="soft" onClick={() => go("#/")}>Home</button>
          </div>
        </div>
        {revisit.length > 0 && (
          <>
            <h3>Missed</h3>
            <div className="card flat list" style={{ paddingTop: 2, paddingBottom: 2 }}>
              {revisit.map((id) => {
                const m = mastery(progress, id);
                return <a key={id} className="item" href="#" onClick={(e) => { e.preventDefault(); openConcept(id); }}><span className="row"><i className={`dot ${masteryClass(m)}`} />{catalog.concept(id).term}</span><span className="muted small">{Math.round(m * 100)}%</span></a>;
              })}
            </div>
            <button className="soft block" onClick={() => go(`#/study?mode=mixed&concept=${encodeURIComponent(revisit[0] as string)}`)}>Practice first miss</button>
          </>
        )}
      </div>
    </div>
  );
}

function hintsFor(item: Item): string[] {
  const ids = itemConcepts(item);
  const c = catalog.concept(ids[0] as string);
  switch (item.kind) {
    case "flashcard":
    case "mcq":
      if (item.kind === "mcq" && item.mode === "formula") {
        const n = catalog.graph.forConcept(c.id)[0];
        return [`Ch ${c.chapter} · ${c.topic}`, n ? n.when : c.plain, n ? `Starts "${n.formula.split(" ").slice(0, 2).join(" ")}…"` : c.plain];
      }
      return [`Ch ${c.chapter} · ${c.topic}`, c.plain, `Starts "${c.term.slice(0, 2)}…"`];
    case "chain": {
      const n = catalog.graph.node(item.inst.target);
      const first = item.inst.chain[0];
      return [
        `Asked-for equation: ${n.formula.split(/\.\s|\.$/)[0]}`,
        `Check its inputs against the givens. ${item.inst.hidden.length ? `Missing: ${item.inst.hidden.join(", ")}.` : ""}`,
        first ? `First: ${first.name.toLowerCase()}.` : "",
      ].filter(Boolean);
    }
    case "cloze": {
      const answers = item.parts.filter((p): p is { answers: string[] } => typeof p !== "string").map((p) => p.answers[0] ?? "");
      if (item.mode === "formula") {
        const n = catalog.graph.forConcept(c.id)[0];
        return [n ? n.when : c.plain, n?.watch ?? c.plain, `Starts: ${answers.map((a) => a.slice(0, 1).toUpperCase() + "…").join(", ")}`];
      }
      return [`Ch ${c.chapter} · ${c.topic}`, c.plain, `Starts: ${answers.map((a) => a.slice(0, 1).toUpperCase() + "…").join(", ")}`];
    }
    case "journal":
      return [
        "Factory cost → Raw Materials, WIP or MOH. Selling/admin → an expense.",
        `${item.debits.length} debit${item.debits.length > 1 ? "s" : ""}, ${item.credits.length} credit${item.credits.length > 1 ? "s" : ""}. Must balance.`,
        `Debit ${item.debits[0]?.account}.`,
      ];
    case "sort":
      return [`Place the obvious ones first.`, item.set.cards[0] ? `"${item.set.cards[0].text}" → ${item.set.buckets[item.set.cards[0].bucket]}.` : ""].filter(Boolean);
    case "order":
      return [item.set.explain ?? `Find first and last; the middle follows.`, `First: ${item.set.steps[0]}`];
    case "calc": {
      const n = catalog.graph.nodes.get(item.inst.target);
      const last = item.inst.chain[item.inst.chain.length - 1];
      const hs = [`Formula: ${n?.formula ?? last?.formula ?? ""}`];
      if (item.inst.hidden.length) hs.push(`Not given: ${item.inst.hidden.join(", ")}. Compute it first.`);
      else if (n) hs.push(n.watch ?? n.when);
      else if (last) hs.push(last.inputs[0]?.label ?? c.plain);
      const prev = item.inst.chain.length > 1 ? item.inst.chain[item.inst.chain.length - 2] : undefined;
      if (prev) hs.push(`${prev.name} = ${fmtNum(prev.result, prev.unit)}.`);
      return hs;
    }
  }
}

function ContextCard({ ctx }: { ctx: { title: string; intro: string; lines: string[] } }) {
  const [open, setOpen] = useReactState(false);
  return (
    <div className="card flat" style={{ padding: 12 }}>
      <button className="ghost block" style={{ padding: 0, minHeight: 0, whiteSpace: "normal" }} onClick={() => setOpen(!open)}>
        <div className="row"><span className="eyebrow grow">Scenario · {ctx.title}</span><span className="muted small">{open ? "hide" : "show"}</span></div>
      </button>
      {open && (
        <div className="small" style={{ marginTop: 8 }}>
          <p>{ctx.intro}</p>
          {ctx.lines.map((l, i) => <p key={i} style={{ margin: "4px 0" }}>{l}</p>)}
        </div>
      )}
    </div>
  );
}
