import { catalog, useApp, go } from "../App";
import { STUDY_GUIDE, FORMULA_SHEET } from "../content/exam1";
import { SCENARIOS } from "../engine/exam";
import { mastery, retrievability } from "../engine/store";
import { Bar, masteryWord } from "./bits";

/** Exam 1 hub: scenario practice, the study-guide checklist with mastery, the formula sheet. */
export function Exam() {
  const { progress } = useApp();
  const guideMastery = (ids: string[]) => {
    const seen = ids.filter((id) => retrievability(progress, id) !== null);
    const m = ids.reduce((a, id) => a + mastery(progress, id), 0) / Math.max(1, ids.length);
    return { m, covered: seen.length / Math.max(1, ids.length) };
  };
  const allIds = [...new Set(STUDY_GUIDE.flatMap((s) => s.items.flatMap((i) => i.concepts)))];
  const overall = guideMastery(allIds);
  return (
    <div className="screen">
      <div className="eyebrow">Exam 1</div>
      <h1>Exam readiness</h1>
      <div className="card hero">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="display" style={{ fontSize: 34 }}>{Math.round(overall.m * 100)}%</div>
            <div className="small" style={{ opacity: .85 }}>study guide mastered · {Math.round(overall.covered * 100)}% touched</div>
          </div>
        </div>
        <p className="small" style={{ opacity: .9, marginTop: 10 }}>Multiple choice, mostly calculations. One scenario, many figures.</p>
      </div>

      <h3>Scenarios</h3>
      {SCENARIOS.map((s) => (
        <button key={s.id} className="card flat block" style={{ margin: "8px 0" }} onClick={() => go(`#/study?mode=exam&scenario=${s.id}`)}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{s.title}</div>
          <div className="small muted" style={{ whiteSpace: "normal" }}>{s.sub}</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>New numbers each run · ~20 questions</div>
        </button>
      ))}

      <h3>Study guide</h3>
      {STUDY_GUIDE.map((sec) => (
        <div key={sec.title} className="card flat">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{sec.title}</div>
          <div className="stack" style={{ gap: 8 }}>
            {sec.items.map((it) => {
              const g = guideMastery(it.concepts);
              const word = g.covered === 0 ? "not started" : masteryWord(g.m);
              return (
                <button key={it.id} className="ghost" style={{ padding: "4px 0", minHeight: 0, whiteSpace: "normal" }} onClick={() => go(`#/study?mode=mixed&concepts=${encodeURIComponent(it.concepts.join(","))}`)}>
                  <div className="row"><span className="grow small">{it.id}. {it.text}</span><span className={`pill ${g.covered === 0 ? "" : g.m >= 0.65 ? "ok" : g.m >= 0.4 ? "warn" : "bad"}`}>{word}</span></div>
                  <div style={{ marginTop: 4 }}><Bar value={g.m} cls="thin" /></div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <h3>Formula sheet (given in the exam)</h3>
      {FORMULA_SHEET.map((f) => (
        <div key={f.title} className="card flat">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
          <div className="sol">{f.lines.join("\n")}</div>
        </div>
      ))}
      <p className="tiny muted">Everything else you carry in. {catalog.graph.nodes.size} equations tracked.</p>
    </div>
  );
}
