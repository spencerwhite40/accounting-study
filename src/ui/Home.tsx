import { catalog, useApp, go } from "../App";
import { dueCount } from "../engine/session";
import { mastery, retrievability } from "../engine/store";
import { MODE_LABEL, type Mode } from "../engine/items";
import { Heat } from "./bits";
import { COURSE } from "../content";

export function Home() {
  const { progress } = useApp();
  const total = dueCount(catalog, progress);
  const modes: Mode[] = ["flashcard", "sort", "mcq", "cloze", "order"];
  const eq = [...catalog.graph.nodes.values()];
  const eqConcepts = [...new Set(eq.map((n) => n.concept))];
  const eqVals = eqConcepts.map((id) => (retrievability(progress, id) === null ? null : mastery(progress, id)));
  return (
    <div className="screen">
      <h1>{COURSE.name}</h1>
      <div className="card">
        <div className="row">
          <div className="grow"><b>{total.due}</b> due · <b>{total.fresh}</b> new · <b>{total.seen}</b> learned</div>
        </div>
        <button className="primary block" style={{ marginTop: 10 }} onClick={() => go("#/study?mode=mixed")}>Study now</button>
      </div>

      <h3>Equations</h3>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>The ladder: know every equation, then spot which ones a problem needs (including the ones it doesn't ask for), then compute.</p>
        <div style={{ margin: "8px 0" }}><Heat values={eqVals} /></div>
        <div className="stack">
          <button onClick={() => go("#/study?mode=formula")}><b>1. Know the equation</b><span className="muted small"> · name ↔ formula, fill the missing term</span></button>
          <button onClick={() => go("#/study?mode=chain")}><b>2. Spot the steps</b><span className="muted small"> · which equations a problem needs, in order, without computing</span></button>
          <button onClick={() => go("#/study?mode=calc")}><b>3. Numbers</b><span className="muted small"> · work the chain through to the answer</span></button>
          <button className="ghost" onClick={() => go("#/formulas")}>Read the formula map</button>
        </div>
      </div>

      <h3>Terms</h3>
      <div className="grid2">
        {modes.map((m) => (
          <button key={m} onClick={() => go(`#/study?mode=${m}`)}>{MODE_LABEL[m]}</button>
        ))}
      </div>

      <h3>By chapter</h3>
      {catalog.chapters.map((ch) => {
        const cs = ch.concepts;
        const vals = cs.map((c) => (retrievability(progress, c.id) === null ? null : mastery(progress, c.id)));
        const d = dueCount(catalog, progress, ch.number);
        return (
          <div key={ch.number} className="card">
            <div className="row">
              <div className="grow"><b>Ch {ch.number}</b> {ch.title}</div>
              <span className="pill">{d.due} due</span>
            </div>
            <div style={{ margin: "8px 0" }}><Heat values={vals} /></div>
            <div className="row">
              <button className="grow" onClick={() => go(`#/study?mode=mixed&ch=${ch.number}`)}>Study</button>
              <button className="grow" onClick={() => go(`#/study?mode=mixed&ch=${ch.number}&cram=1`)}>Cram all</button>
              <button className="ghost" onClick={() => go(`#/browse/${ch.number}`)}>Browse</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
