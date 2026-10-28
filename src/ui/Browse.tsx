import { useState } from "react";
import { catalog, useApp, go } from "../App";
import { mastery, retrievability, accuracy } from "../engine/store";
import { MODE_LABEL } from "../engine/items";
import { masteryClass, Mastery, Bar } from "./bits";

export function Browse({ path }: { path: string }) {
  const { progress, openConcept } = useApp();
  const seg = path.split("/").filter(Boolean);
  const chNum = seg[1] ? Number(seg[1]) : undefined;
  const [q, setQ] = useState("");
  const [weakOnly, setWeakOnly] = useState(false);

  const ch = chNum !== undefined ? catalog.chapter(chNum) : undefined;
  const concepts = (ch ? ch.concepts : catalog.conceptsIn())
    .map((c) => ({ c, m: retrievability(progress, c.id) === null ? null : mastery(progress, c.id) }))
    .filter(({ c }) => !q || `${c.term} ${c.plain} ${c.definition}`.toLowerCase().includes(q.toLowerCase()))
    .filter(({ m }) => !weakOnly || (m !== null && m < 0.65))
    .sort((a, b) => (a.m ?? -1) - (b.m ?? -1));

  return (
    <div className="screen">
      {ch ? <a href="#" className="small" onClick={(e) => { e.preventDefault(); go("#/browse"); }}>← All chapters</a> : <div className="eyebrow">Browse</div>}
      <h1>{ch ? `Ch ${ch.number} · ${ch.title}` : "Terms"}</h1>
      {!ch && (
        <div className="stack" style={{ marginBottom: 14 }}>
          {catalog.chapters.map((c) => {
            const m = c.concepts.reduce((a, x) => a + mastery(progress, x.id), 0) / Math.max(1, c.concepts.length);
            return (
              <button key={c.number} className="card flat" style={{ margin: 0 }} onClick={() => go(`#/browse/${c.number}`)}>
                <div className="row"><b className="grow">Ch {c.number} · {c.title}</b><span className="num">{Math.round(m * 100)}%</span></div>
                <div style={{ marginTop: 8 }}><Bar value={m} /></div>
              </button>
            );
          })}
        </div>
      )}
      <div className="search">
        <span className="muted">⌕</span>
        <input id="browse-search" type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="ghost icon" style={{ minHeight: 36 }} onClick={() => setQ("")}>✕</button>}
      </div>
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="muted small grow">{concepts.length} · weakest first</span>
        <button className={`chip ${weakOnly ? "sel" : ""}`} style={{ margin: 0 }} onClick={() => setWeakOnly(!weakOnly)}>Weak only</button>
        {ch && <button className="chip" style={{ margin: 0 }} onClick={() => go(`#/study?mode=mixed&ch=${ch.number}`)}>Study</button>}
      </div>
      <div className="list">
        {concepts.map(({ c, m }) => (
          <a key={c.id} className="item" href="#" onClick={(e) => { e.preventDefault(); openConcept(c.id); }}>
            <span className="row grow"><i className={`dot ${masteryClass(m)}`} /><span className="grow"><div style={{ fontWeight: 600 }}>{c.term}</div><div className="tiny muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.plain}</div></span></span>
            <span className="row small muted" style={{ flex: "none" }}>
              {(["formula", "chain", "calc"] as const).map((mo) => {
                const a = accuracy(progress, c.id, mo);
                return a === null ? null : <span key={mo} title={MODE_LABEL[mo]} className={`pill ${a >= 0.7 ? "ok" : a >= 0.4 ? "warn" : "bad"}`}>{mo === "formula" ? "K" : mo === "chain" ? "S" : "N"}</span>;
              })}
              <Mastery value={m} />
            </span>
          </a>
        ))}
        {concepts.length === 0 && <p className="muted">Nothing matches.</p>}
      </div>
    </div>
  );
}
