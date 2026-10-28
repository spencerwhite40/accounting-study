import { useState } from "react";
import type { ItemProps } from "../Session";
import { numberClose, fmt } from "../../engine/grade";
import { stepLines } from "../../engine/calc";
import { Rating } from "../../engine/store";
import { catalog } from "../../App";
import { haptic } from "../bits";

/**
 * Numbers mode. Ask for the target figure only. After an answer, always show the
 * worked chain. If the problem needed a hidden intermediate and the answer was wrong,
 * offer "break it down": each step asked in turn, graded to its own concept.
 */
export function Calc({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "calc") return null;
  const inst = item.inst;
  const node = catalog.graph.nodes.get(inst.target);
  const [val, setVal] = useState("");
  const [dir, setDir] = useState<number | null>(null);
  const [checked, setChecked] = useState<null | { num: boolean; dir: boolean }>(null);
  const [breakdown, setBreakdown] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepVal, setStepVal] = useState("");
  const [stepResults, setStepResults] = useState<{ concept: string; ok: boolean }[]>([]);
  const [stepShown, setStepShown] = useState<boolean | null>(null);

  const submit = () => {
    if (checked) return;
    const num = numberClose(val, inst.answer);
    const dOk = inst.direction ? dir === inst.direction.answer : true;
    setChecked({ num, dir: dOk });
    haptic(num && dOk ? "ok" : "bad");
    const right = num && dOk;
    if (right || inst.chain.length === 1 || num) {
      // right number but wrong direction counts as a partial miss, not a chain failure
      onDone({ rating: right ? (hints ? Rating.Hard : Rating.Good) : num ? Rating.Hard : Rating.Again });
    }
    // wrong on a chained problem: hold the review until the breakdown (or skip) decides it
  };
  const skipBreakdown = () => onDone({ rating: Rating.Again });
  const startBreakdown = () => { setBreakdown(true); setStepIdx(0); };
  const checkStep = () => {
    const s = inst.chain[stepIdx];
    if (!s || stepShown !== null) return;
    const ok = numberClose(stepVal, s.result);
    haptic(ok ? "ok" : "bad");
    setStepShown(ok);
    setStepResults((r) => [...r, { concept: s.concept, ok }]);
  };
  const nextStep = () => {
    const results = stepResults;
    if (stepIdx + 1 >= inst.chain.length) {
      const final = results[results.length - 1];
      onDone({ rating: final?.ok ? Rating.Hard : Rating.Again, stepReviews: results.slice(0, -1) });
      return;
    }
    setStepIdx(stepIdx + 1);
    setStepVal("");
    setStepShown(null);
  };

  const wrongChained = checked && !checked.num && inst.chain.length > 1;
  const pendingDecision = wrongChained && !breakdown && stepResults.length === 0;

  return (
    <>
      <div className="card">
        <b>{inst.title}</b>
        {inst.scenario && <p className="small muted">{inst.scenario}</p>}
        <ul className="givens">
          {inst.givens.map((g, i) => <li key={i}><span>{g.label}</span><b>{fmt(g.value, g.unit)}</b></li>)}
        </ul>
        <p><b>{inst.question}</b> <span className="muted small">({unitHint(inst.unit)})</span></p>
        {!checked && (
          <>
            <input type="text" inputMode="decimal" value={val} placeholder="Your answer" onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
            {inst.direction && (
              <div style={{ marginTop: 8 }}>
                <p className="small muted">{inst.direction.prompt}</p>
                {inst.direction.options.map((o, k) => <button key={k} className={`choice ${dir === k ? "chosen" : ""}`} onClick={() => setDir(k)}>{o}</button>)}
              </div>
            )}
            <button className="primary block" style={{ marginTop: 10 }} onClick={submit} disabled={!/\d/.test(val) || (!!inst.direction && dir === null)}>Check</button>
          </>
        )}
        {checked && (
          <div className={`feedback ${checked.num && checked.dir ? "ok" : checked.num ? "hard" : "bad"}`}>{checked.num && checked.dir ? "Correct" : checked.num ? "Right amount, wrong direction" : "Not quite"}</div>
        )}
        {checked && (
          <div className="explain">
            <p><b>Answer:</b> {fmt(inst.answer, inst.unit)}{inst.direction ? ` · ${inst.direction.options[inst.direction.answer]}` : ""}{inst.direction && !checked.dir ? " (you picked the other direction)" : ""}</p>
            {!checked.num && val && <p className="small muted">You entered {val}.</p>}
          </div>
        )}
      </div>

      {checked && !breakdown && (
        <div className="card">
          <h3>Worked solution</h3>
          {inst.chain.map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div><b>{i + 1}. {s.name}</b>{i < inst.chain.length - 1 ? <span className="muted small"> (needed first, not given)</span> : null}</div>
              <div className="sol">{s.formula}{"\n"}{stepLines(s).join("\n")}</div>
            </div>
          ))}
          {node && <p className="small"><b>When you need this:</b> {node.when}</p>}
          {node?.watch && <p className="small"><b>Watch out:</b> {node.watch}</p>}
        </div>
      )}

      {pendingDecision && (
        <div className="row">
          <button className="primary grow" onClick={startBreakdown}>Break it down step by step</button>
          <button className="ghost" onClick={skipBreakdown}>Skip</button>
        </div>
      )}

      {breakdown && (() => {
        const s = inst.chain[stepIdx];
        if (!s) return null;
        return (
          <div className="card">
            <p className="muted small">Step {stepIdx + 1} of {inst.chain.length}</p>
            <b>{s.name}</b>
            <div className="sol">{s.formula}</div>
            <ul className="givens">
              {s.inputs.map((inp, k) => <li key={k}><span>{inp.label}{inp.derived ? " (from an earlier step)" : ""}</span><b>{fmt(inp.value, inp.unit)}</b></li>)}
            </ul>
            {stepShown === null ? (
              <>
                <input type="text" inputMode="decimal" value={stepVal} placeholder={`${s.name} (${unitHint(s.unit)})`} onChange={(e) => setStepVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") checkStep(); }} />
                <button className="primary block" style={{ marginTop: 10 }} onClick={checkStep} disabled={!/\d/.test(stepVal)}>Check step</button>
              </>
            ) : (
              <>
                <div className="explain"><b>{stepShown ? "Right" : "Not quite"}:</b> {fmt(s.result, s.unit)}</div>
                <button className="primary block" style={{ marginTop: 10 }} onClick={nextStep}>{stepIdx + 1 >= inst.chain.length ? "Finish" : "Next step"}</button>
              </>
            )}
          </div>
        );
      })()}
    </>
  );
}

function unitHint(u: string): string {
  switch (u) {
    case "$": return "dollars";
    case "$/unit": return "dollars per unit";
    case "$/hr": return "dollars per hour";
    case "units": return "units";
    case "%": return "percent";
    case "hrs": return "hours";
    default: return "number";
  }
}
