import { useMemo, useState } from "react";
import { useApp, go } from "../App";
import { review, Rating, type Grade, mastery, humanInterval } from "../engine/store";
import { haptic, Ring, masteryClass } from "../ui/bits";
import { buildSession, playConcept, termConcept, factConcept, figureConcept, KIND_LABEL, type Q } from "./engine";
import { CHAPTERS, CHAPTER_TITLE, type Chapter } from "./types";
import { PLAY_BY_ID } from "./content";
import { PlayCard } from "./Card";

interface Result { rating: Grade; tone: "ok" | "hard" | "bad"; msg: string }

function scopeFromParams(p: URLSearchParams) {
  const only = p.get("only")?.split(",").filter(Boolean);
  const ch = p.get("ch");
  const chapters: Chapter[] = !ch || ch === "all" ? CHAPTERS : [Number(ch) as Chapter];
  const sc = p.get("scope");
  const kind = sc === "terms" ? ("terms" as const) : sc === "facts" ? ("facts" as const) : sc === "figures" ? ("figures" as const) : sc === "plays" || only?.length ? ("plays" as const) : ("mix" as const);
  return { chapters, kind, ...(only && only.length ? { only } : {}) };
}

export function Drill({ params }: { params: URLSearchParams }) {
  const { progress, update } = useApp();
  const scope = useMemo(() => scopeFromParams(params), [params]);
  const size = scope.only ? (scope.only.length === 1 ? 3 : 8) : 10;
  const [items, setItems] = useState<Q[]>(() => buildSession(progress, scope, size));
  const [i, setI] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [log, setLog] = useState<{ q: Q; r: Result }[]>([]);
  const [started] = useState(Date.now());

  const q = items[i];
  const questions = items.filter((x) => x.kind !== "learn");
  const qIndex = q ? items.slice(0, i + 1).filter((x) => x.kind !== "learn").length : questions.length;

  const finish = (r: Result) => {
    if (!q || result) return;
    setResult(r);
    setLog((l) => [...l, { q, r }]);
    haptic(r.tone === "bad" ? "bad" : "ok");
    const concept = q.kind === "learn" ? null : q.kind === "term" ? termConcept(q.term.id) : q.kind === "fact" ? factConcept(q.fact.id) : q.kind === "figure" ? figureConcept(q.tpl.id) : playConcept(q.play.id);
    if (concept && q.kind !== "learn") update((p) => { review(p, concept, q.kind, r.rating, 0); });
  };
  const next = () => {
    setResult(null);
    setI((k) => k + 1);
    window.scrollTo({ top: 0 });
  };

  if (!q) return <Summary log={log} minutes={(Date.now() - started) / 60000} onAgain={() => { setItems(buildSession(progress, scope, size)); setI(0); setLog([]); setResult(null); }} />;

  const ch = q.kind === "term" ? q.term.chapter : q.kind === "fact" ? q.fact.chapter : q.kind === "figure" ? q.tpl.chapter : q.play.chapter;
  const isLearn = q.kind === "learn";
  const answered = isLearn || !!result;
  return (
    <div className="screen session">
      <div className="topbar">
        <button className="ghost icon" onClick={() => go("#/x2")} aria-label="Close">✕</button>
        <div className="seg grow">
          {questions.map((_, k) => {
            const lr = log.filter((l) => l.q.kind !== "learn")[k];
            return <i key={k} className={lr ? (lr.r.tone === "ok" ? "ok" : lr.r.tone === "hard" ? "hard" : "bad") : k === qIndex - 1 && !isLearn ? "cur" : ""} />;
          })}
        </div>
        <span className="muted small num">{Math.min(qIndex, questions.length)}/{questions.length}</span>
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="pill accent">{isLearn ? "New pattern" : KIND_LABEL[q.kind]}</span>
        <span className="muted tiny">Chapter {ch}</span>
      </div>

      <div key={q.id} className="item-enter">
        {q.kind === "learn" && (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>Read it once. The next question tests it.</p>
            <PlayCard play={q.play} full />
          </>
        )}
        {q.kind === "name" && <NameQ q={q} onDone={finish} locked={!!result} />}
        {q.kind === "need" && <NeedQ q={q} onDone={finish} />}
        {q.kind === "route" && <RouteQ q={q} onDone={finish} />}
        {q.kind === "term" && <TermQ q={q} onDone={finish} locked={!!result} />}
        {q.kind === "fact" && <FactQ q={q} onDone={finish} locked={!!result} />}
        {q.kind === "figure" && <FigureQ q={q} onDone={finish} locked={!!result} />}
      </div>

      {result && q.kind !== "learn" && (
        <>
          <div className={`feedback ${result.tone}`}>{result.msg}</div>
          {q.kind !== "term" && q.kind !== "fact" && q.kind !== "figure" && <PlayCard play={q.play} />}
        </>
      )}

      {answered && (
        <div className="sticky-bottom row">
          <button className="primary grow" style={{ minHeight: 54, fontSize: 17 }} onClick={next}>{isLearn ? "Got it" : i + 1 >= items.length ? "Finish" : "Next"} →</button>
        </div>
      )}
    </div>
  );
}

function NameQ({ q, onDone, locked }: { q: Extract<Q, { kind: "name" }>; onDone: (r: Result) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const tap = (k: number) => {
    if (locked) return;
    setPicked(k);
    const ok = k === q.answer;
    onDone({ rating: ok ? Rating.Good : Rating.Again, tone: ok ? "ok" : "bad", msg: ok ? "Right" : `This is: ${q.play.name}` });
  };
  return (
    <>
      <div className="card prompt">{q.prompt}</div>
      <p className="small muted" style={{ margin: "0 0 4px" }}>What kind of problem is this?</p>
      {q.options.map((o, k) => (
        <button key={o.id} className={`choice ${picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : ""}`} onClick={() => tap(k)}>{o.text}</button>
      ))}
    </>
  );
}

function TermQ({ q, onDone, locked }: { q: Extract<Q, { kind: "term" }>; onDone: (r: Result) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const tap = (k: number) => {
    if (locked) return;
    setPicked(k);
    const ok = k === q.answer;
    onDone({ rating: ok ? Rating.Good : Rating.Again, tone: ok ? "ok" : "bad", msg: ok ? "Right" : `${q.term.term}: ${q.term.line}` });
  };
  return (
    <>
      <div className="card prompt">{q.prompt}</div>
      {q.options.map((o, k) => (
        <button key={k} className={`choice ${picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : ""}`} onClick={() => tap(k)}>{o}</button>
      ))}
    </>
  );
}

function FactQ({ q, onDone, locked }: { q: Extract<Q, { kind: "fact" }>; onDone: (r: Result) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const tap = (k: number) => {
    if (locked) return;
    setPicked(k);
    const ok = k === q.answer;
    onDone({ rating: ok ? Rating.Good : Rating.Again, tone: ok ? "ok" : "bad", msg: ok ? "Right" : `Answer: ${q.fact.a}` });
  };
  return (
    <>
      <div className="card prompt">{q.fact.q}</div>
      {q.options.map((o, k) => (
        <button key={k} className={`choice ${picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : ""}`} onClick={() => tap(k)}>{o}</button>
      ))}
    </>
  );
}

function FigureQ({ q, onDone, locked }: { q: Extract<Q, { kind: "figure" }>; onDone: (r: Result) => void; locked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null);
  const tap = (k: number) => {
    if (locked) return;
    setPicked(k);
    const ok = k === q.answer;
    const why = q.options[k]?.why;
    onDone({ rating: ok ? Rating.Good : Rating.Again, tone: ok ? "ok" : "bad", msg: ok ? `Right. ${q.how}` : `${why ? `${why} ` : ""}${q.how}` });
  };
  return (
    <>
      <div className="card prompt">{q.q}</div>
      <p className="small muted" style={{ margin: "0 0 4px" }}>Tap the answer.</p>
      <div className="figure-grid">
        {q.options.map((o, k) => (
          <button key={k} className={`choice figure ${picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : ""}`} onClick={() => tap(k)}>{o.text}</button>
        ))}
      </div>
    </>
  );
}

function NeedQ({ q, onDone }: { q: Extract<Q, { kind: "need" }>; onDone: (r: Result) => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const toggle = (k: number) => {
    if (checked) return;
    haptic("tap");
    setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  };
  const check = () => {
    setChecked(true);
    const wrongPicks = sel.filter((k) => !q.chips[k]?.need).length;
    const missed = q.chips.filter((c, k) => c.need && !sel.includes(k)).length;
    const errors = wrongPicks + missed;
    onDone({ rating: errors === 0 ? Rating.Good : errors === 1 ? Rating.Hard : Rating.Again, tone: errors === 0 ? "ok" : errors === 1 ? "hard" : "bad", msg: errors === 0 ? "Exactly what you need" : `${errors} off: ${wrongPicks ? `${wrongPicks} not needed` : ""}${wrongPicks && missed ? ", " : ""}${missed ? `${missed} missed` : ""}` });
  };
  return (
    <>
      <div className="card prompt">{q.q}</div>
      <p className="small muted" style={{ margin: "0 0 4px" }}>Tap everything you need. Leave out the rest.</p>
      {q.chips.map((c, k) => {
        const on = sel.includes(k);
        const cls = !checked ? (on ? "chosen" : "") : c.need && on ? "right" : !c.need && on ? "wrong" : c.need ? "missed" : "";
        return (
          <button key={k} className={`choice pick ${cls}`} onClick={() => toggle(k)}>
            <span className="box">{on ? "✓" : ""}</span>
            <span className="grow">
              {c.text}
              {checked && (c.need && !on ? <span className="why">You needed this.</span> : !c.need && on ? <span className="why">{c.why ?? "Not needed."}</span> : !c.need && c.why ? <span className="why">{c.why}</span> : null)}
            </span>
          </button>
        );
      })}
      {!checked && <button className="primary block" style={{ marginTop: 8 }} disabled={sel.length === 0} onClick={check}>Check</button>}
    </>
  );
}

function RouteQ({ q, onDone }: { q: Extract<Q, { kind: "route" }>; onDone: (r: Result) => void }) {
  const [placed, setPlaced] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [atPos, setAtPos] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const next = placed.length;
  const tap = (k: number) => {
    const o = q.options[k] as { text: string; idx: number };
    if (placed.includes(k) || next >= q.steps.length) return;
    if (o.idx === next) {
      haptic("ok");
      const np = [...placed, k];
      setPlaced(np);
      setAtPos(0);
      if (np.length === q.steps.length) {
        onDone({ rating: errors === 0 ? Rating.Good : errors === 1 ? Rating.Hard : Rating.Again, tone: errors === 0 ? "ok" : errors === 1 ? "hard" : "bad", msg: errors === 0 ? "Route in order" : `Route found with ${errors} wrong ${errors === 1 ? "tap" : "taps"}` });
      }
    } else {
      haptic("bad");
      setErrors((e) => e + 1);
      setAtPos((a) => a + 1);
      setFlash(k);
      setTimeout(() => setFlash(null), 450);
    }
  };
  const doneAll = placed.length === q.steps.length;
  return (
    <>
      <div className="card prompt">
        <div className="eyebrow">Find</div>
        <div className="goal">{q.goal}</div>
        <div className="eyebrow" style={{ marginTop: 10 }}>Given</div>
        <div className="givens-row">{q.given.map((g, k) => <span key={k} className="given-chip">{g}</span>)}</div>
      </div>
      <p className="small muted" style={{ margin: "0 0 4px" }}>{doneAll ? "Your route:" : "Tap the steps in the order you would do them."}</p>
      <div className="route-slots">
        {q.steps.map((_, n) => {
          const k = placed[n];
          return (
            <div key={n} className={`route-slot ${k !== undefined ? "filled" : n === next ? "next" : ""}`}>
              <span className="n">{n + 1}</span>
              <span className="grow">{k !== undefined ? (q.options[k] as { text: string }).text : ""}</span>
            </div>
          );
        })}
      </div>
      {!doneAll && (
        <div className="stack" style={{ marginTop: 10 }}>
          {q.options.map((o, k) => placed.includes(k) ? null : (
            <button key={k} className={`choice ${flash === k ? "wrong shake" : ""} ${atPos >= 2 && o.idx === next ? "hintglow" : ""}`} onClick={() => tap(k)}>{o.text}</button>
          ))}
        </div>
      )}
    </>
  );
}

function Summary({ log, minutes, onAgain }: { log: { q: Q; r: Result }[]; minutes: number; onAgain: () => void }) {
  const { progress } = useApp();
  const qs = log.filter((l) => l.q.kind !== "learn");
  const good = qs.filter((l) => l.r.tone === "ok").length;
  const missed = qs.filter((l) => l.r.tone !== "ok");
  const missedIds = [...new Set(missed.map((l) => (l.q.kind === "term" || l.q.kind === "fact" || l.q.kind === "figure" ? null : (l.q as { play: { id: string } }).play.id)).filter((x): x is string => !!x))];
  return (
    <div className="screen session center" style={{ paddingBottom: 24 }}>
      <div style={{ width: "100%" }}>
        <div className="card hero" style={{ textAlign: "center" }}>
          <div className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>Done</div>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <Ring value={qs.length ? good / qs.length : 0} label="clean" color="var(--gold)" track="rgba(255,255,255,.18)" />
            <div style={{ textAlign: "left" }}>
              <div className="display" style={{ fontSize: 26 }}>{good}/{qs.length}</div>
              <div className="small" style={{ opacity: .85 }}>{Math.max(1, Math.round(minutes))} min</div>
            </div>
          </div>
          <div className="stack" style={{ marginTop: 14 }}>
            <button className="primary" onClick={onAgain}>Another round</button>
            <button className="soft" onClick={() => go("#/x2")}>Home</button>
          </div>
        </div>
        {missedIds.length > 0 && (
          <>
            <h3>Review these</h3>
            <div className="card flat list" style={{ paddingTop: 2, paddingBottom: 2 }}>
              {missedIds.map((id) => {
                const play = PLAY_BY_ID.get(id);
                if (!play) return null;
                const m = mastery(progress, playConcept(id));
                return (
                  <a key={id} className="item" href="#" onClick={(e) => { e.preventDefault(); go(`#/x2/play/${id}`); }}>
                    <span className="row"><i className={`dot ${masteryClass(m)}`} />{play.name}</span>
                    <span className="muted small">{CHAPTER_TITLE[play.chapter]}</span>
                  </a>
                );
              })}
            </div>
            <button className="soft block" onClick={() => go(`#/x2/drill?only=${missedIds.join(",")}`)}>Drill these now</button>
          </>
        )}
      </div>
    </div>
  );
}
export { humanInterval };
