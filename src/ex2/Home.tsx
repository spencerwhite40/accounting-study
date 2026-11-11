import { useApp, go } from "../App";
import { PLAYS } from "./content";
import { CHAPTERS, CHAPTER_TITLE } from "./types";
import { isDue } from "../engine/store";
import { playConcept, playMastery, readiness } from "./engine";
import { Ring, Bar, masteryClass } from "../ui/bits";
import { ExamSwitch } from "./ExamSwitch";
import { TOPICS, topicStat } from "./coverage";

export function Ex2Home() {
  const { progress } = useApp();
  const r = readiness(progress);
  const stats = TOPICS.map((t) => topicStat(progress, t));
  const overall = stats.reduce((a, x) => a + x.mastery, 0) / stats.length;
  const due = PLAYS.filter((p) => isDue(progress, playConcept(p.id))).length;
  const seen = PLAYS.filter((p) => (progress.cards[playConcept(p.id)]?.reps ?? 0) > 0);
  const weakest = seen.map((p) => ({ p, m: playMastery(progress, p.id) })).sort((a, b) => a.m - b.m).filter((x) => x.m < 0.7).slice(0, 3);
  return (
    <div className="screen">
      <ExamSwitch />
      <div className="eyebrow">Exam 2 · chapters 5 to 8</div>
      <h1>Know the problem. Know the route.</h1>

      <div className="card hero">
        <div className="row top">
          <Ring value={overall} label="learned" color="var(--gold)" track="rgba(255,255,255,.18)" />
          <div className="grow">
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{r.seen === 0 ? "Start here." : due > 0 ? `${due} to review` : "Nothing due."}</div>
            <div className="muted small" style={{ marginTop: 6 }}>{r.seen} of {r.total} problem types seen</div>
          </div>
        </div>
        <button className="primary block" style={{ marginTop: 14, minHeight: 54, fontSize: 17 }} onClick={() => go("#/x2/drill?ch=all")}>Quick drill · 10</button>
      </div>

      <h3>By chapter</h3>
      <div className="stack">
        {CHAPTERS.map((c) => {
          const pool = PLAYS.filter((p) => p.chapter === c);
          const cs = stats.filter((x) => x.topic.chapter === c);
          const m = cs.reduce((a, x) => a + x.mastery, 0) / cs.length;
          const d = pool.filter((p) => isDue(progress, playConcept(p.id))).length;
          return (
            <button key={c} className="card flat chapter-row" onClick={() => go(`#/x2/drill?ch=${c}`)}>
              <div className="row">
                <div className="grow"><b>Chapter {c}</b> · {CHAPTER_TITLE[c]}<div className="tiny muted">{pool.length} problem types · facts · numbers{d ? ` · ${d} due` : ""}</div></div>
                <span className="num" style={{ fontSize: 20 }}>{Math.round(m * 100)}%</span>
              </div>
              <div style={{ marginTop: 8 }}><Bar value={m} /></div>
            </button>
          );
        })}
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="soft" onClick={() => go("#/x2/play")}>Playbook</button>
        <button className="soft" onClick={() => go("#/x2/terms")}>Terms</button>
        <button className="soft" onClick={() => go("#/x2/drill?scope=facts&ch=all")}>Quick facts</button>
        <button className="soft" onClick={() => go("#/x2/drill?scope=figures&ch=all")}>Pick the number</button>
      </div>

      {weakest.length > 0 && (
        <>
          <h3>Needs work</h3>
          <div className="card flat list" style={{ paddingTop: 2, paddingBottom: 2 }}>
            {weakest.map(({ p, m }) => (
              <a key={p.id} className="item" href="#" onClick={(e) => { e.preventDefault(); go(`#/x2/play/${p.id}`); }}>
                <span className="row"><i className={`dot ${masteryClass(m)}`} />{p.name}</span>
                <span className="muted small">{Math.round(m * 100)}%</span>
              </a>
            ))}
          </div>
          <button className="soft block" onClick={() => go(`#/x2/drill?only=${weakest.map((w) => w.p.id).join(",")}`)}>Drill these</button>
        </>
      )}
    </div>
  );
}
