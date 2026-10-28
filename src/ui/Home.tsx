import { catalog, useApp, go } from "../App";
import { dueCount } from "../engine/session";
import { mastery, retrievability } from "../engine/store";
import { MODE_LABEL, type Mode } from "../engine/items";
import { Heat } from "./bits";
import { COURSE } from "../content";

export function Home() {
  const { progress } = useApp();
  const total = dueCount(catalog, progress);
  const modes: Mode[] = ["flashcard", "sort", "mcq", "cloze", "calc", "order"];
  return (
    <div className="screen">
      <h1>{COURSE.name}</h1>
      <div className="card">
        <div className="row">
          <div className="grow"><b>{total.due}</b> due · <b>{total.fresh}</b> new · <b>{total.seen}</b> learned</div>
        </div>
        <button className="primary block" style={{ marginTop: 10 }} onClick={() => go("#/study?mode=mixed")}>Study now</button>
      </div>

      <h3>By mode</h3>
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
