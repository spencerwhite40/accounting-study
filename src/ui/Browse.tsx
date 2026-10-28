import { catalog, useApp, go } from "../App";
import { mastery, retrievability, accuracy } from "../engine/store";
import { MODE_LABEL } from "../engine/items";
import { masteryClass, Mastery } from "./bits";

export function Browse({ path }: { path: string }) {
  const { progress, openConcept } = useApp();
  const seg = path.split("/").filter(Boolean);
  const chNum = seg[1] ? Number(seg[1]) : undefined;
  if (chNum === undefined) {
    return (
      <div className="screen">
        <h1>Browse</h1>
        <div className="list">
          {catalog.chapters.map((ch) => (
            <a key={ch.number} className="item" href="#" onClick={(e) => { e.preventDefault(); go(`#/browse/${ch.number}`); }}>
              <span><b>Ch {ch.number}</b> {ch.title}</span>
              <span className="muted small">{ch.concepts.length} terms</span>
            </a>
          ))}
        </div>
      </div>
    );
  }
  const ch = catalog.chapter(chNum);
  if (!ch) return <div className="screen">No such chapter.</div>;
  const weakest = ch.concepts
    .map((c) => ({ c, m: retrievability(progress, c.id) === null ? null : mastery(progress, c.id) }))
    .sort((a, b) => (a.m ?? -1) - (b.m ?? -1));
  return (
    <div className="screen">
      <a href="#" className="small" onClick={(e) => { e.preventDefault(); go("#/browse"); }}>← Chapters</a>
      <h1>Ch {ch.number}: {ch.title}</h1>
      <div className="row">
        <button className="primary grow" onClick={() => go(`#/study?mode=mixed&ch=${ch.number}`)}>Study chapter</button>
        <button className="grow" onClick={() => go(`#/formulas/${ch.number}`)}>Formulas</button>
      </div>
      <h3>Terms (weakest first)</h3>
      <div className="list">
        {weakest.map(({ c, m }) => (
          <a key={c.id} className="item" href="#" onClick={(e) => { e.preventDefault(); openConcept(c.id); }}>
            <span className="row"><i className={`dot ${masteryClass(m)}`} /> {c.term}</span>
            <span className="row small muted">
              {(["flashcard", "mcq", "cloze", "calc"] as const).map((mo) => {
                const a = accuracy(progress, c.id, mo);
                return a === null ? null : <span key={mo} title={MODE_LABEL[mo]} className={`pill ${a >= 0.7 ? "ok" : a >= 0.4 ? "warn" : "bad"}`}>{MODE_LABEL[mo][0]}</span>;
              })}
              <Mastery value={m} />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
