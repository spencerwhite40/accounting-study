import { useMemo, useState } from "react";
import { catalog, useApp, go } from "../App";
import { buildSession } from "../engine/session";
import { makeItem, type Item, type Mode, MODE_LABEL, itemConcepts, makeCalc, itemMode } from "../engine/items";
import { review, confuse, Rating, type Grade } from "../engine/store";
import { Flashcard } from "./items/Flashcard";
import { Mcq } from "./items/Mcq";
import { Cloze } from "./items/Cloze";
import { Sort } from "./items/Sort";
import { Order } from "./items/Order";
import { Calc } from "./items/Calc";
import { Chain } from "./items/Chain";
import { generate } from "../engine/calc";
import { mulberry32 } from "../engine/items";

export interface Result {
  rating: Grade;
  confusedWith?: string;
  /** per-step outcomes from calc break-it-down mode */
  stepReviews?: { concept: string; ok: boolean }[];
}
export interface ItemProps {
  item: Item;
  hints: number;
  onDone: (r: Result) => void;
}

export function Session({ params }: { params: URLSearchParams }) {
  const { progress, update } = useApp();
  const mode = (params.get("mode") ?? "mixed") as Mode | "mixed";
  const ch = params.get("ch") ? Number(params.get("ch")) : undefined;
  const concept = params.get("concept");
  const node = params.get("node");

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
    return buildSession(catalog, progress, { mode, chapter: ch, cram: params.get("cram") === "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [items, setItems] = useState(initial);
  const [i, setI] = useState(0);
  const [hints, setHints] = useState(0);
  const [done, setDone] = useState<Result | null>(null);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [itemKey, setItemKey] = useState(0);

  const item = items[i];
  if (!item) {
    return (
      <div className="screen session center">
        <div className="card" style={{ textAlign: "center", width: "100%" }}>
          <h2>{items.length === 0 ? "Nothing to study here yet" : "Session complete"}</h2>
          {items.length > 0 && <p>{tally.right} right · {tally.wrong} to revisit</p>}
          <div className="stack" style={{ marginTop: 12 }}>
            <button className="primary" onClick={() => go("#/")}>Home</button>
            <button onClick={() => { setItems(buildSession(catalog, progress, { mode, chapter: ch, cram: true })); setI(0); setTally({ right: 0, wrong: 0 }); }}>Another round</button>
          </div>
        </div>
      </div>
    );
  }

  const hintList = hintsFor(item);
  const onDone = (r: Result) => {
    setDone(r);
    setTally((t) => (r.rating === Rating.Again ? { ...t, wrong: t.wrong + 1 } : { ...t, right: t.right + 1 }));
    update((p) => {
      for (const c of itemConcepts(item)) review(p, c, itemMode(item), r.rating, hints);
      if (r.confusedWith && item.kind !== "sort" && item.kind !== "order") confuse(p, item.concept, r.confusedWith);
      const own = new Set(itemConcepts(item));
      for (const s of r.stepReviews ?? []) if (!own.has(s.concept)) review(p, s.concept, "calc", s.ok ? Rating.Good : Rating.Again, 0);
    });
  };
  const next = () => {
    setDone(null);
    setHints(0);
    setI(i + 1);
  };
  const another = () => {
    // same concept, different wording or numbers; does not count as a review
    const cid = itemConcepts(item)[0] as string;
    const replacement = item.kind === "calc" ? makeCalc(catalog, cid, Math.floor(Math.random() * 100), item.inst.hidden.length > 0) : makeItem(catalog, cid, itemMode(item), Math.floor(Math.random() * 100));
    if (replacement) {
      const copy = items.slice();
      copy[i] = replacement;
      setItems(copy);
      setHints(0);
      setDone(null);
      setItemKey((k) => k + 1);
    }
  };

  const props: ItemProps = { item, hints, onDone };
  return (
    <div className="screen session">
      <div className="topbar">
        <button className="ghost" style={{ minHeight: 36, padding: "4px 10px" }} onClick={() => go("#/")}>✕</button>
        <div className="bar"><b style={{ width: `${(i / items.length) * 100}%` }} /></div>
        <span className="muted small">{i + 1}/{items.length}</span>
      </div>
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="pill">{MODE_LABEL[itemMode(item)]}</span>
        <span className="muted small">Ch {catalog.concept(itemConcepts(item)[0] as string).chapter}</span>
        <span className="grow" />
        {!done && <button className="ghost small" style={{ minHeight: 36 }} onClick={another}>Another</button>}
        {!done && hints < hintList.length && <button className="ghost small" style={{ minHeight: 36 }} onClick={() => setHints(hints + 1)}>Hint ({hintList.length - hints})</button>}
      </div>
      {hintList.slice(0, hints).map((h, k) => <div key={k} className="hint">{h}</div>)}

      <div key={`${item.id}:${itemKey}`}>
        {item.kind === "flashcard" && <Flashcard {...props} />}
        {item.kind === "mcq" && <Mcq {...props} />}
        {item.kind === "cloze" && <Cloze {...props} />}
        {item.kind === "sort" && <Sort {...props} />}
        {item.kind === "order" && <Order {...props} />}
        {item.kind === "calc" && <Calc {...props} />}
        {item.kind === "chain" && <Chain {...props} />}
      </div>

      {done && (
        <div className="sticky-bottom row">
          <button className="primary grow" onClick={next}>Next</button>
        </div>
      )}
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
        return [`Chapter ${c.chapter}, ${c.topic}.`, n ? `When you need it: ${n.when}` : c.plain, n ? `It starts "${n.formula.split(" ").slice(0, 2).join(" ")}…"` : c.plain];
      }
      return [`Chapter ${c.chapter}, ${c.topic}.`, c.plain, `Starts with "${c.term.slice(0, 2)}…"`];
    case "chain": {
      const n = catalog.graph.node(item.inst.target);
      const first = item.inst.chain[0];
      return [
        `Start from the equation for what's asked: ${n.formula.split(/\.\s|\.$/)[0]}.`,
        `Check each input of that equation against the givens. ${item.inst.hidden.length ? `${item.inst.hidden.join(" and ")} ${item.inst.hidden.length > 1 ? "are" : "is"} not in the list.` : ""}`,
        first ? `The first thing to compute is ${first.name.toLowerCase()}.` : "",
      ].filter(Boolean);
    }
    case "cloze": {
      if (item.mode === "formula") {
        const n = catalog.graph.forConcept(c.id)[0];
        const answers = item.parts.filter((p): p is { answers: string[] } => typeof p !== "string").map((p) => p.answers[0] ?? "");
        return [n ? `When you need it: ${n.when}` : c.plain, n?.watch ?? c.plain, `First letters: ${answers.map((a) => a.slice(0, 1).toUpperCase() + "…").join(", ")}`];
      }
      const answers = item.parts.filter((p): p is { answers: string[] } => typeof p !== "string").map((p) => p.answers[0] ?? "");
      return [`Chapter ${c.chapter}, ${c.topic}.`, c.plain, `First letters: ${answers.map((a) => a.slice(0, 1).toUpperCase() + "…").join(", ")}`];
    }
    case "sort":
      return [`Think about what each bucket is for, then place the obvious ones first.`, item.set.cards[0] ? `"${item.set.cards[0].text}" goes in ${item.set.buckets[item.set.cards[0].bucket]}.` : ""].filter(Boolean);
    case "order":
      return [item.set.explain ?? `Find the first step, then the last; the middle falls into place.`, `First step: ${item.set.steps[0]}`];
    case "calc": {
      const n = catalog.graph.node(item.inst.target);
      const hs = [`Formula: ${n.formula}`];
      if (item.inst.hidden.length) hs.push(`Not every input is given. You need ${item.inst.hidden.join(" and ")} first; compute it from the figures that are given.`);
      else hs.push(n.watch ?? n.when);
      const prev = item.inst.chain.length > 1 ? item.inst.chain[item.inst.chain.length - 2] : undefined;
      if (prev) hs.push(`${prev.name} works out to ${fmtNum(prev.result, prev.unit)}.`);
      return hs;
    }
  }
}
import { fmt as fmtNum } from "../engine/grade";
