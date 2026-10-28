import { useRef } from "react";
import { catalog, useApp, go } from "../App";
import { mastery, retrievability, humanInterval } from "../engine/store";
import { Mastery, masteryWord } from "./bits";

export function ConceptSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { progress, openConcept } = useApp();
  const c = catalog.concepts.get(id);
  if (!c) return null;
  const nodes = catalog.graph.forConcept(id);
  const m = mastery(progress, id);
  const r = retrievability(progress, id);
  const y0 = useRef<number | null>(null);
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" onTouchStart={(e) => { y0.current = e.touches[0]?.clientY ?? null; }} onTouchEnd={(e) => { const y = e.changedTouches[0]?.clientY ?? 0; if (y0.current !== null && y - y0.current > 70 && (e.currentTarget as HTMLElement).scrollTop <= 0) onClose(); y0.current = null; }}>
        <button className="ghost icon x" aria-label="Close" onClick={onClose}>✕</button>
        <div className="row">
          <h2 className="grow" style={{ margin: 0 }}>{c.term}</h2>
          <Mastery value={r === null ? null : m} />
        </div>
        <p className="muted small">Chapter {c.chapter} · {c.topic}{r !== null ? ` · ${masteryWord(m)}` : ""}{(() => { const d = progress.cards[id]?.due; return d && d.getTime() > Date.now() ? ` · next review in ${humanInterval(d.getTime() - Date.now())}` : d ? " · due now" : ""; })()}</p>
        <p>{c.definition}</p>
        <p>{c.plain}</p>
        {c.formula && <p className="sol">{c.formula}</p>}
        {c.example && <p><b>Example:</b> {c.example}</p>}
        {nodes.length > 0 && (
          <>
            <h3>Equations</h3>
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
            <h3>Confused with</h3>
            <div className="row wrap">
              {c.related.map((rid) => catalog.concepts.get(rid)).filter(Boolean).map((rc) => (
                <button key={rc!.id} className="chip" onClick={() => openConcept(rc!.id)}>{rc!.term}</button>
              ))}
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: 14 }}>
          <button className="grow" onClick={() => { onClose(); go(`#/study?mode=mixed&concept=${encodeURIComponent(id)}`); }}>Practice</button>
          <button className="primary grow" onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

