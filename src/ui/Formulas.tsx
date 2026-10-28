import { catalog, useApp, go } from "../App";
import { mastery, retrievability } from "../engine/store";
import { Mastery } from "./bits";

/** Formula map: every calculation, what it needs, what it feeds. */
export function Formulas({ path }: { path: string }) {
  const { progress, openConcept } = useApp();
  const seg = path.split("/").filter(Boolean);
  const chNum = seg[1] ? Number(seg[1]) : undefined;
  const nodes = [...catalog.graph.nodes.values()].filter((n) => chNum === undefined || n.chapter === chNum);
  return (
    <div className="screen">
      <h1>Formula map{chNum ? ` · Ch ${chNum}` : ""}</h1>
      <p className="muted small">Every equation, what it needs, and what it feeds. A "needs" that isn't given in a problem has to be computed first; that is the whole trick.</p>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="primary grow" onClick={() => go(`#/study?mode=formula${chNum ? `&ch=${chNum}` : ""}`)}>Drill all equations</button>
        <button className="grow" onClick={() => go(`#/study?mode=chain${chNum ? `&ch=${chNum}` : ""}`)}>Spot the steps</button>
      </div>
      <div className="row wrap" style={{ marginBottom: 8 }}>
        <a className="chip" href="#" onClick={(e) => { e.preventDefault(); go("#/formulas"); }}>All</a>
        {catalog.chapters.filter((c) => c.calcs.length).map((c) => <a key={c.number} className="chip" href="#" onClick={(e) => { e.preventDefault(); go(`#/formulas/${c.number}`); }}>Ch {c.number}</a>)}
      </div>
      {nodes.map((n) => {
        const { needs, feeds } = catalog.graph.deps(n.id);
        const m = retrievability(progress, n.concept) === null ? null : mastery(progress, n.concept);
        return (
          <div key={n.id} className="card">
            <div className="row">
              <b className="grow">{n.name}</b>
              <Mastery value={m} />
            </div>
            <div className="sol" style={{ margin: "6px 0" }}>{n.formula}</div>
            <p className="small"><b>When you need it:</b> {n.when}</p>
            {n.watch && <p className="small"><b>Watch out:</b> {n.watch}</p>}
            {needs.length > 0 && <p className="small"><b>May need first:</b> {needs.map((d) => d.name).join(" · ")}</p>}
            {feeds.length > 0 && <p className="small"><b>Feeds:</b> {feeds.map((d) => d.name).join(" · ")}</p>}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="grow" onClick={() => go(`#/study?mode=formula&concept=${encodeURIComponent(n.concept)}`)}>Drill</button>
              <button className="grow" onClick={() => go(`#/study?mode=calc&concept=${encodeURIComponent(n.concept)}&node=${encodeURIComponent(n.id)}`)}>Numbers</button>
              <button className="ghost" onClick={() => openConcept(n.concept)}>Term</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
