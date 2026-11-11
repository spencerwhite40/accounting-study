import { useApp, go } from "../App";
import { PLAYS } from "./content";
import { TERMS } from "./terms";
import { CHAPTERS, CHAPTER_TITLE } from "./types";
import { playConcept, playMastery, readiness, termConcept } from "./engine";
import { accuracy, mastery, streak } from "../engine/store";
import { Ring, Bar, masteryClass } from "../ui/bits";

export function Ex2Progress() {
  const { progress } = useApp();
  const r = readiness(progress);
  const st = streak(progress);
  const termsSeen = TERMS.filter((t) => (progress.cards[termConcept(t.id)]?.reps ?? 0) > 0).length;
  const termM = TERMS.reduce((a, t) => a + mastery(progress, termConcept(t.id)), 0) / TERMS.length;
  const rows = PLAYS.map((p) => ({ p, m: playMastery(progress, p.id), seen: (progress.cards[playConcept(p.id)]?.reps ?? 0) > 0 })).sort((a, b) => (a.seen === b.seen ? a.m - b.m : a.seen ? -1 : 1));
  const weak = rows.filter((x) => x.seen && x.m < 0.7).slice(0, 5);
  const rung = (id: string, k: "name" | "need" | "route") => accuracy(progress, playConcept(id), k);
  return (
    <div className="screen">
      <div className="eyebrow">Progress</div>
      <h1>Exam 2: where you stand</h1>
      <div className="card">
        <div className="row top">
          <Ring value={r.mastered} label="learned" />
          <div className="grow">
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Problem types seen</span><b>{r.seen}/{r.total}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Terms seen</span><b>{termsSeen}/{TERMS.length}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Day streak</span><b>{st}</b></div>
          </div>
        </div>
      </div>

      <h3>By chapter</h3>
      <div className="card flat">
        {CHAPTERS.map((c) => {
          const pool = PLAYS.filter((p) => p.chapter === c);
          const m = pool.reduce((a, p) => a + playMastery(progress, p.id), 0) / pool.length;
          return (
            <div key={c} className="row" style={{ padding: "6px 0" }}>
              <span style={{ minWidth: 150 }}>Ch {c} · {CHAPTER_TITLE[c]}</span>
              <span className="grow"><Bar value={m} cls="thin" /></span>
              <span className="tiny muted" style={{ minWidth: 38, textAlign: "right" }}>{Math.round(m * 100)}%</span>
            </div>
          );
        })}
        <div className="row" style={{ padding: "6px 0" }}>
          <span style={{ minWidth: 150 }}>Terms</span>
          <span className="grow"><Bar value={termM} cls="thin" /></span>
          <span className="tiny muted" style={{ minWidth: 38, textAlign: "right" }}>{Math.round(termM * 100)}%</span>
        </div>
      </div>

      {weak.length > 0 && (
        <>
          <h3>Needs work</h3>
          <button className="primary block" onClick={() => go(`#/x2/drill?only=${weak.map((w) => w.p.id).join(",")}`)}>Drill the weakest {weak.length}</button>
        </>
      )}

      <h3>Every problem type</h3>
      <div className="card flat" style={{ padding: "6px 10px", overflowX: "auto" }}>
        <table className="matrix">
          <thead><tr><th>Type</th><th className="c">Name</th><th className="c">Need</th><th className="c">Route</th></tr></thead>
          <tbody>
            {rows.map(({ p, seen }) => (
              <tr key={p.id} onClick={() => go(`#/x2/play/${p.id}`)}>
                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div><div className="tiny muted">Ch {p.chapter}</div></td>
                {(["name", "need", "route"] as const).map((k) => {
                  const a = rung(p.id, k);
                  return <td key={k}><span className={`cell ${a === null ? "" : masteryClass(a)}`}>{!seen ? "·" : a === null ? "·" : Math.round(a * 100)}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
