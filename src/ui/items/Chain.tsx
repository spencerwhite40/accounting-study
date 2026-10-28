import { useState } from "react";
import type { ItemProps } from "../Session";
import { fmt } from "../../engine/grade";
import { Rating } from "../../engine/store";
import { catalog } from "../../App";
import { haptic } from "../bits";

/**
 * Spot the steps. "steps": pick the calculations needed, in order, without
 * computing anything. "missing": which input of the asked-for equation is not
 * given and has to be computed first.
 */
export function Chain({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "chain") return null;
  const inst = item.inst;
  const target = catalog.graph.node(inst.target);
  const [seq, setSeq] = useState<string[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [verdict, setVerdict] = useState<"ok" | "hard" | "bad" | null>(null);
  const correct = inst.chain.map((s) => s.node);

  const submit = () => {
    if (checked) return;
    setChecked(true);
    if (item.sub === "steps") {
      const exact = seq.length === correct.length && seq.every((n, i) => n === correct[i]);
      const sameSet = seq.length === correct.length && correct.every((n) => seq.includes(n));
      setVerdict(exact ? "ok" : sameSet ? "hard" : "bad");
      haptic(exact ? "ok" : "bad");
      onDone({ rating: exact ? (hints ? Rating.Hard : Rating.Good) : sameSet ? Rating.Hard : Rating.Again });
    } else {
      const ok = pick !== null && missingIdx.includes(pick);
      setVerdict(ok ? "ok" : "bad");
      haptic(ok ? "ok" : "bad");
      onDone({ rating: ok ? (hints ? Rating.Hard : Rating.Good) : Rating.Again });
    }
  };

  const lastStep = inst.chain[inst.chain.length - 1];
  const inputs = lastStep?.inputs ?? [];
  const missingIdx = inputs.map((inp, i) => (inp.derived ? i : -1)).filter((i) => i >= 0);

  return (
    <>
      <div className="card">
        <b>{item.sub === "steps" ? "Which equations, in what order?" : "What's missing?"}</b>
        {inst.scenario && <p className="small muted">{inst.scenario}</p>}
        <ul className="givens">
          {inst.givens.map((g, i) => <li key={i}><span>{g.label}</span><b>{fmt(g.value, g.unit)}</b></li>)}
        </ul>
        <p><b>{inst.question}</b></p>
        <p className="small muted">Don't compute anything. {item.sub === "steps" ? "Tap the equations you'd need, in the order you'd solve them." : "The equation for this figure needs the inputs below. Which one is not given and has to be worked out first?"}</p>
      </div>

      {item.sub === "steps" && (
        <>
          <div className="card" style={{ minHeight: 60 }}>
            {seq.length === 0 && <span className="muted small">Your steps appear here.</span>}
            {seq.map((n, i) => {
              const okPos = checked ? correct[i] === n : null;
              return (
                <div key={i} className={`step ${checked ? (okPos ? "ok" : "bad") : ""}`} onClick={() => !checked && setSeq(seq.filter((_, k) => k !== i))}>
                  <span className="n">{i + 1}</span>
                  <span className="grow">{catalog.graph.node(n).name}</span>
                  {!checked && <span className="muted small">✕</span>}
                </div>
              );
            })}
          </div>
          {!checked && (
            <div className="row wrap">
              {item.options.filter((o) => !seq.includes(o.node)).map((o) => (
                <button key={o.node} className="chip" onClick={() => { setSeq([...seq, o.node]); haptic("tap"); }}>{o.name}</button>
              ))}
            </div>
          )}
          {!checked && <button className="primary block" style={{ marginTop: 10 }} disabled={seq.length === 0} onClick={submit}>Check</button>}
        </>
      )}

      {item.sub === "missing" && (
        <>
          {inputs.map((inp, i) => (
            <button key={i} className={`choice ${checked ? (missingIdx.includes(i) ? "right" : pick === i ? "wrong" : "") : pick === i ? "chosen" : ""}`} onClick={() => !checked && setPick(i)}>
              {inp.label}
            </button>
          ))}
          {!checked && <button className="primary block" style={{ marginTop: 10 }} disabled={pick === null} onClick={submit}>Check</button>}
        </>
      )}

      {checked && verdict && <div className={`feedback ${verdict}`}>{verdict === "ok" ? "Exactly right" : verdict === "hard" ? "Right equations, wrong order" : "Not quite"}</div>}
      {checked && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>The chain</h3>
          {inst.chain.map((s, i) => {
            const feeds = i < inst.chain.length - 1 ? inst.chain.slice(i + 1).find((t) => t.inputs.some((x) => x.derived && x.value === s.result)) : undefined;
            const why = feeds ? feeds.inputs.find((x) => x.derived && x.value === s.result)?.label : undefined;
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div><b>{i + 1}. {s.name}</b></div>
                <div className="sol">{s.formula.split(/\.\s|\.$/)[0]}</div>
                {why && <p className="small">Needed because <b>{why}</b> is not given; this equation produces it.</p>}
                {!why && <p className="small">This is what the question asked for.</p>}
              </div>
            );
          })}
          {target.watch && <p className="small"><b>Watch out:</b> {target.watch}</p>}
        </div>
      )}
    </>
  );
}
