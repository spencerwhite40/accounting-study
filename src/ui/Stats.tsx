import { useRef, useState } from "react";
import { catalog, useApp } from "../App";
import { exportJson, importJson, mastery, emptyProgress } from "../engine/store";
import { MODE_LABEL, type Mode } from "../engine/items";

export function Stats() {
  const { progress, replace, openConcept } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const now = Date.now();
  const days = new Map<string, number>();
  for (const l of progress.log) {
    const d = localDay(l.ts);
    days.set(d, (days.get(d) ?? 0) + 1);
  }
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = localDay(now - i * 86400e3);
    if (days.get(d)) streak++;
    else if (i > 0) break;
  }
  const today = days.get(localDay(now)) ?? 0;
  const weakest = [...catalog.concepts.values()]
    .filter((c) => (progress.cards[c.id]?.reps ?? 0) > 0)
    .map((c) => ({ c, m: mastery(progress, c.id) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 10);
  const confusions = Object.entries(progress.confusions).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const byMode = new Map<Mode, { r: number; w: number }>();
  for (const l of progress.log) {
    const s = byMode.get(l.mode) ?? { r: 0, w: 0 };
    if (l.rating === 1) s.w++; else s.r++;
    byMode.set(l.mode, s);
  }

  const doExport = async () => {
    const text = exportJson(progress);
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Progress copied to the clipboard. Paste it somewhere safe, or into Import on another device.");
    } catch {
      setShowExport(true);
      setNotice("Select the text below and copy it.");
    }
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      replace(importJson(await f.text()));
      setNotice("Progress imported.");
    } catch (e) {
      setNotice(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <h1>Stats</h1>
      <div className="grid2">
        <div className="card"><div className="muted small">Streak</div><b style={{ fontSize: 24 }}>{streak} day{streak === 1 ? "" : "s"}</b></div>
        <div className="card"><div className="muted small">Reviews today</div><b style={{ fontSize: 24 }}>{today}</b></div>
      </div>
      <h3>Accuracy by mode</h3>
      <div className="card">
        {[...byMode.entries()].map(([m, s]) => (
          <div key={m} className="row" style={{ padding: "4px 0" }}>
            <span className="grow">{MODE_LABEL[m]}</span>
            <span className="muted small">{s.r + s.w} reviews</span>
            <span className="pill">{Math.round((100 * s.r) / Math.max(1, s.r + s.w))}%</span>
          </div>
        ))}
        {byMode.size === 0 && <span className="muted">Nothing yet.</span>}
      </div>
      <h3>Weakest 10</h3>
      <div className="card list">
        {weakest.map(({ c, m }) => (
          <a key={c.id} className="item" href="#" onClick={(e) => { e.preventDefault(); openConcept(c.id); }}>
            <span>{c.term}</span><span className="pill bad">{Math.round(m * 100)}%</span>
          </a>
        ))}
        {weakest.length === 0 && <span className="muted">Nothing yet.</span>}
      </div>
      <h3>Most confused pairs</h3>
      <div className="card">
        {confusions.map(([k, n]) => {
          const [a, b] = k.split("|");
          return <div key={k} className="row" style={{ padding: "4px 0" }}><span className="grow">{catalog.concepts.get(a ?? "")?.term} ↔ {catalog.concepts.get(b ?? "")?.term}</span><span className="pill">{n}×</span></div>;
        })}
        {confusions.length === 0 && <span className="muted">None recorded.</span>}
      </div>
      <h3>Data</h3>
      <div className="stack">
        {notice && <div className="hint">{notice}</div>}
        <button onClick={doExport}>Copy progress (JSON)</button>
        {showExport && <textarea rows={4} readOnly value={exportJson(progress)} onFocus={(e) => e.currentTarget.select()} />}
        <textarea id="import-text" rows={2} placeholder="Or paste exported progress here" onChange={async (e) => { const t = e.target.value.trim(); if (t.startsWith("{")) { try { replace(importJson(t)); setNotice("Progress imported."); e.target.value = ""; } catch (err) { setNotice(`Import failed: ${(err as Error).message}`); } } }} />
        <button onClick={() => file.current?.click()}>Import from file</button>
        <input ref={file} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => doImport(e.target.files?.[0])} />
        {!confirmReset && <button className="ghost" onClick={() => setConfirmReset(true)}>Reset progress</button>}
        {confirmReset && (
          <div className="row">
            <button className="grow" style={{ borderColor: "var(--bad)" }} onClick={() => { replace(emptyProgress()); setConfirmReset(false); setNotice("Progress erased."); }}>Yes, erase everything</button>
            <button className="grow" onClick={() => setConfirmReset(false)}>Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}

function localDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
