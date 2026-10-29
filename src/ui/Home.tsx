import { catalog, useApp, go } from "../App";
import { dueCount } from "../engine/session";
import { mastery, retrievability, accuracy, streak, retentionNow, dueForecast } from "../engine/store";
import { MODE_LABEL, type Mode } from "../engine/items";
import { Ring, Bar, Heat, masteryWord } from "./bits";
import { COURSE } from "../content";

export function Home() {
  const { progress } = useApp();
  const all = catalog.conceptsIn();
  const total = dueCount(catalog, progress);
  const overall = all.reduce((a, c) => a + mastery(progress, c.id), 0) / Math.max(1, all.length);
  const seen = all.filter((c) => (progress.cards[c.id]?.reps ?? 0) > 0).length;
  const st = streak(progress);
  const ret = retentionNow(progress);
  const tomorrow = dueForecast(progress, 1)[0] ?? 0;
  const newLeft = Math.max(0, progress.settings.dailyNew - new Set(progress.log.filter((l) => Date.now() - l.ts < 86400e3).map((l) => l.concept)).size);
  const planSize = Math.min(progress.settings.sessionSize, total.due + Math.min(newLeft, total.fresh)) || Math.min(progress.settings.sessionSize, all.length);

  // equations ladder
  const eqConcepts = [...new Set([...catalog.graph.nodes.values()].map((n) => n.concept))];
  const rung = (m: Mode) => {
    const vals = eqConcepts.map((id) => accuracy(progress, id, m)).filter((v): v is number => v !== null);
    return { covered: vals.length / Math.max(1, eqConcepts.length), acc: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null };
  };
  const rungs = [
    { n: 1, mode: "formula" as Mode, title: "Know it", sub: "name ↔ formula" },
    { n: 2, mode: "chain" as Mode, title: "Spot it", sub: "which equations, in order" },
    { n: 3, mode: "calc" as Mode, title: "Solve it", sub: "numbers to the answer" },
  ].map((r) => ({ ...r, ...rung(r.mode) }));
  const current = rungs.find((r) => r.acc === null || r.acc < 0.7) ?? rungs[2];

  const headline = total.due > 0
    ? `${total.due} due`
    : seen === 0 ? "Start here." : newLeft > 0 ? `Nothing due · ${newLeft} new today` : "Caught up.";

  const modes: Mode[] = ["flashcard", "sort", "mcq", "cloze", "order"];
  return (
    <div className="screen">
      <div className="eyebrow">{COURSE.name}</div>
      <h1>{greeting()}</h1>

      <div className="card hero">
        <div className="row top">
          <Ring value={overall} label="mastered" color="var(--gold)" track="rgba(255,255,255,.18)" />
          <div className="grow">
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{headline}</div>
            <div className="muted small" style={{ marginTop: 6 }}>
              {seen}/{all.length} seen{ret === null ? "" : ` · ${Math.round(ret * 100)}% retained`}
            </div>
            <div className="muted small">{st > 0 ? `${st}-day streak` : ""}{tomorrow ? `${st > 0 ? " · " : ""}${tomorrow} due tomorrow` : ""}</div>
          </div>
        </div>
        <button className="primary block" style={{ marginTop: 14, minHeight: 54, fontSize: 17 }} onClick={() => go("#/study?mode=mixed")}>
          Study · {planSize} items
        </button>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="soft grow" onClick={() => go("#/study?mode=mixed&cram=1")}>Cram</button>
          <button className="soft grow" onClick={() => go(`#/study?mode=${current?.mode ?? "formula"}`)}>Rung {current?.n ?? 1}</button>
        </div>
      </div>

      <h3>Exam 1</h3>
      <button className="card flat block" style={{ margin: "8px 0", whiteSpace: "normal" }} onClick={() => go("#/exam")}>
        <div style={{ fontWeight: 700 }}>Exam practice</div>
        <div className="small muted">Short parts: journal entries, overhead, balances, statements. Plus your study guide.</div>
      </button>

      <h3>Equations ladder</h3>
      <div className="card">
        <div className="ladder">
          {rungs.map((r) => (
            <div key={r.n} style={{ display: "contents" }}>
              <div className={`rung ${r.n === current?.n ? "on" : ""}`}>{r.n}</div>
              <button className="ghost" style={{ padding: "6px 0", minHeight: 0 }} onClick={() => go(`#/study?mode=${r.mode}`)}>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div className="muted tiny">{r.sub}</div>
                <div style={{ marginTop: 6 }}><Bar value={r.acc === null ? 0 : r.acc * r.covered} /></div>
              </button>
              <div className="tiny muted" style={{ textAlign: "right", minWidth: 58 }}>
                {r.acc === null ? "not started" : <><b style={{ color: "var(--text)" }}>{Math.round(r.acc * 100)}%</b><br />{Math.round(r.covered * 100)}% covered</>}
              </div>
            </div>
          ))}
        </div>
        <button className="ghost block small" style={{ marginTop: 6, textAlign: "center" }} onClick={() => go("#/formulas")}>All equations →</button>
      </div>

      <h3>Chapters</h3>
      {catalog.chapters.map((ch) => {
        const cs = ch.concepts;
        const vals = cs.map((c) => (retrievability(progress, c.id) === null ? null : mastery(progress, c.id)));
        const m = cs.reduce((a, c) => a + mastery(progress, c.id), 0) / Math.max(1, cs.length);
        const d = dueCount(catalog, progress, ch.number);
        return (
          <div key={ch.number} className="card flat">
            <div className="row top">
              <div className="grow">
                <div className="eyebrow">Chapter {ch.number}</div>
                <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{ch.title}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 22 }}>{Math.round(m * 100)}%</div>
                <div className="tiny muted">{masteryWord(d.seen + d.due === 0 ? null : m)}</div>
              </div>
            </div>
            <div style={{ margin: "10px 0 8px" }}><Heat values={vals} /></div>
            <div className="row">
              <button className="primary grow" onClick={() => go(`#/study?mode=mixed&ch=${ch.number}`)}>{d.due ? `Review ${d.due}` : "Study"}</button>
              <button className="soft" onClick={() => go(`#/study?mode=mixed&ch=${ch.number}&cram=1`)}>Cram</button>
              <button className="soft" onClick={() => go(`#/browse/${ch.number}`)}>Terms</button>
            </div>
          </div>
        );
      })}

      <h3>One mode</h3>
      <div className="grid2">
        {modes.map((m) => <button key={m} className="soft" onClick={() => go(`#/study?mode=${m}`)}>{MODE_LABEL[m]}</button>)}
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 5 ? "Late night session" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
