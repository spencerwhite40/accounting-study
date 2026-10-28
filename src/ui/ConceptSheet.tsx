import { catalog, useApp, go } from "../App";
import { mastery, retrievability } from "../engine/store";
import { Mastery } from "./bits";

export function ConceptSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { progress, openConcept } = useApp();
  const c = catalog.concepts.get(id);
  if (!c) return null;
  const nodes = catalog.graph.forConcept(id);
  const m = mastery(progress, id);
  const r = retrievability(progress, id);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet">
        <div className="row">
          <h2 className="grow" style={{ margin: 0 }}>{c.term}</h2>
          <Mastery value={r === null ? null : m} />
        </div>
        <p className="muted small">Chapter {c.chapter} · {c.topic}</p>
        <p>{c.definition}</p>
        <p><b>Plainly:</b> {c.plain}</p>
        {c.formula && <p className="sol">{c.formula}</p>}
        {c.example && <p><b>Example:</b> {c.example}</p>}
        {nodes.length > 0 && (
          <>
            <h3>Calculations</h3>
            {nodes.map((n) => (
              <div key={n.id} className="card" style={{ margin: "6px 0" }}>
                <b>{n.name}</b>
                <div className="sol">{n.formula}</div>
                <p className="small"><b>When:</b> {n.when}</p>
                {n.watch && <p className="small"><b>Watch:</b> {n.watch}</p>}
              </div>
            ))}
          </>
        )}
        {c.related && c.related.length > 0 && (
          <>
            <h3>Often confused with</h3>
            <div className="row wrap">
              {c.related.map((rid) => catalog.concepts.get(rid)).filter(Boolean).map((rc) => (
                <button key={rc!.id} className="chip" onClick={() => openConcept(rc!.id)}>{rc!.term}</button>
              ))}
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="grow" onClick={() => { onClose(); go(`#/study?mode=mixed&concept=${encodeURIComponent(id)}`); }}>Practice this</button>
          <button className="primary grow" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

