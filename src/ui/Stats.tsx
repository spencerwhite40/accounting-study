import { useRef, useState } from "react";
import { catalog, useApp, go } from "../App";
import { exportJson, importJson, mastery, emptyProgress, accuracy, retrievability, dueForecast, retentionNow, reviewsPerDay, streak } from "../engine/store";
import { MODE_LABEL, type Mode } from "../engine/items";
import { Ring, Spark, Bar, masteryClass, toast } from "./bits";

export function Stats() {
  const { progress, replace, openConcept } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const all = catalog.conceptsIn();
  const overall = all.reduce((a, c) => a + mastery(progress, c.id), 0) / Math.max(1, all.length);
  const seen = all.filter((c) => (progress.cards[c.id]?.reps ?? 0) > 0);
  const st = streak(progress);
  const ret = retentionNow(progress);
  const days = reviewsPerDay(progress, 14);
  const today = days[days.length - 1];
  const forecast = dueForecast(progress, 7);
  const dueNow = seen.filter((c) => (progress.cards[c.id]?.due.getTime() ?? Infinity) <= Date.now()).length;
  const buckets = { mastered: 0, solid: 0, shaky: 0, unseen: all.length - seen.length };
  for (const c of seen) {
    const m = mastery(progress, c.id);
    if (m >= 0.85) buckets.mastered++; else if (m >= 0.55) buckets.solid++; else buckets.shaky++;
  }
  const byMode = new Map<Mode, { r: number; w: number }>();
  for (const l of progress.log) {
    const s = byMode.get(l.mode) ?? { r: 0, w: 0 };
    if (l.rating === 1) s.w++; else s.r++;
    byMode.set(l.mode, s);
  }
  const weakest = seen.map((c) => ({ c, m: mastery(progress, c.id) })).sort((a, b) => a.m - b.m).slice(0, 8);
  const confusions = Object.entries(progress.confusions).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const eqRows = catalog.chapters.flatMap((ch) => [...new Set(ch.calcs.map((n) => n.concept))].map((id) => ({ ch: ch.number, c: catalog.concept(id) })));

  const doExport = async () => {
    try {
      await navigator.clipboard.writeText(exportJson(progress));
      toast("Progress copied. Paste it into Import on another device.");
    } catch {
      setShowExport(true);
    }
  };
  const doImportText = (t: string) => {
    try {
      replace(importJson(t));
      toast("Progress imported.");
    } catch (e) {
      toast(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <div className="eyebrow">Progress</div>
      <h1>Where you stand</h1>

      <div className="card">
        <div className="row top">
          <Ring value={overall} label="mastered" />
          <div className="grow">
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Mastered</span><b>{buckets.mastered}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Solid</span><b>{buckets.solid}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Shaky</span><b style={{ color: buckets.shaky ? "var(--bad)" : "inherit" }}>{buckets.shaky}</b></div>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="muted small">Not seen yet</span><b>{buckets.unseen}</b></div>
          </div>
        </div>
        <div className="grid3" style={{ marginTop: 12 }}>
          <div className="card flat" style={{ margin: 0, padding: 10, textAlign: "center" }}><div className="num" style={{ fontSize: 22 }}>{st}</div><div className="tiny muted">day streak</div></div>
          <div className="card flat" style={{ margin: 0, padding: 10, textAlign: "center" }}><div className="num" style={{ fontSize: 22 }}>{today?.count ?? 0}</div><div className="tiny muted">reviews today</div></div>
          <div className="card flat" style={{ margin: 0, padding: 10, textAlign: "center" }}><div className="num" style={{ fontSize: 22 }}>{ret === null ? "–" : `${Math.round(ret * 100)}%`}</div><div className="tiny muted">retention now</div></div>
        </div>
      </div>

      <h3>Last 14 days</h3>
      <div className="card flat">
        <Spark values={days.map((d) => d.count)} />
        <div className="row tiny muted" style={{ justifyContent: "space-between", marginTop: 4 }}><span>{days[0]?.day.slice(5)}</span><span>today</span></div>
      </div>

      <h3>Coming up</h3>
      <div className="card flat">
        <div className="row" style={{ justifyContent: "space-between" }}><span>Due now</span><b className="num">{dueNow}</b></div>
        {forecast.map((n, i) => (
          <div key={i} className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
            <span className="muted small">{i === 0 ? "Tomorrow" : `In ${i + 1} days`}</span>
            <span className="row grow" style={{ marginLeft: 12 }}><span className="grow"><Bar value={n / Math.max(1, ...forecast, dueNow)} cls="thin" /></span><b className="small" style={{ minWidth: 24, textAlign: "right" }}>{n}</b></span>
          </div>
        ))}
      </div>

      <h3>Equations by rung</h3>
      <div className="card flat" style={{ padding: "8px 10px", overflowX: "auto" }}>
        <table className="matrix">
          <thead><tr><th>Equation</th><th className="c">Know</th><th className="c">Spot</th><th className="c">Numbers</th></tr></thead>
          <tbody>
            {eqRows.map(({ c, ch }) => (
              <tr key={c.id} onClick={() => openConcept(c.id)}>
                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{c.term}</div><div className="tiny muted">Ch {ch}</div></td>
                {(["formula", "chain", "calc"] as const).map((m) => {
                  const a = accuracy(progress, c.id, m);
                  const has = catalog.modesFor(c.id).includes(m);
                  return <td key={m}><span className={`cell ${a === null ? "" : masteryClass(a)}`} style={!has ? { opacity: .25 } : undefined}>{!has ? "–" : a === null ? "·" : Math.round(a * 100)}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Accuracy by mode</h3>
      <div className="card flat">
        {[...byMode.entries()].sort((a, b) => (b[1].r + b[1].w) - (a[1].r + a[1].w)).map(([m, s]) => (
          <div key={m} className="row" style={{ padding: "5px 0" }}>
            <span style={{ minWidth: 150 }}>{MODE_LABEL[m]}</span>
            <span className="grow"><Bar value={s.r / Math.max(1, s.r + s.w)} cls="thin" /></span>
            <span className="tiny muted" style={{ minWidth: 70, textAlign: "right" }}>{Math.round((100 * s.r) / Math.max(1, s.r + s.w))}% · {s.r + s.w}</span>
          </div>
        ))}
        {byMode.size === 0 && <span className="muted">Nothing yet.</span>}
      </div>

      <h3>Needs work</h3>
      <div className="card flat list" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {weakest.map(({ c, m }) => (
          <a key={c.id} className="item" href="#" onClick={(e) => { e.preventDefault(); openConcept(c.id); }}>
            <span className="row"><i className={`dot ${masteryClass(m)}`} />{c.term}</span><span className="pill bad">{Math.round(m * 100)}%</span>
          </a>
        ))}
        {weakest.length === 0 && <span className="muted">Nothing yet.</span>}
        {weakest.length > 0 && <button className="soft block" style={{ marginTop: 8 }} onClick={() => go(`#/study?mode=mixed&weak=1`)}>Drill the weakest</button>}
      </div>

      {confusions.length > 0 && (
        <>
          <h3>Mixed up most</h3>
          <div className="card flat">
            {confusions.map(([k, n]) => {
              const [a, b] = k.split("|");
              return <div key={k} className="row" style={{ padding: "4px 0" }}><span className="grow small">{catalog.concepts.get(a ?? "")?.term} ↔ {catalog.concepts.get(b ?? "")?.term}</span><span className="pill">{n}×</span></div>;
            })}
          </div>
        </>
      )}

      <h3>Your data</h3>
      <div className="stack">
        <button className="soft" onClick={doExport}>Copy progress to clipboard</button>
        {showExport && <textarea rows={4} readOnly value={exportJson(progress)} onFocus={(e) => e.currentTarget.select()} />}
        <textarea id="import-text" rows={2} placeholder="Paste exported progress here to import" onChange={(e) => { const t = e.target.value.trim(); if (t.startsWith("{")) { doImportText(t); e.target.value = ""; } }} />
        <button className="soft" onClick={() => file.current?.click()}>Import from a file</button>
        <input ref={file} type="file" accept="application/json" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImportText(await f.text()); }} />
        {!confirmReset && <button className="ghost" onClick={() => setConfirmReset(true)}>Reset progress</button>}
        {confirmReset && (
          <div className="row">
            <button className="grow" style={{ borderColor: "var(--bad)", color: "var(--bad)" }} onClick={() => { replace(emptyProgress()); setConfirmReset(false); toast("Progress erased."); }}>Yes, erase everything</button>
            <button className="grow" onClick={() => setConfirmReset(false)}>Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}
