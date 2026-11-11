import { useState } from "react";
import { useApp, go } from "../App";
import { TERMS } from "./terms";
import { CHAPTERS, CHAPTER_TITLE, type Chapter } from "./types";
import { termConcept } from "./engine";
import { mastery, retrievability } from "../engine/store";
import { masteryClass } from "../ui/bits";

export function TermsScreen() {
  const { progress } = useApp();
  const [ch, setCh] = useState<Chapter | "all">("all");
  const [q, setQ] = useState("");
  return (
    <div className="screen">
      <div className="eyebrow">Terms</div>
      <h1>One line each</h1>
      <button className="primary block" onClick={() => go(`#/x2/drill?scope=terms&ch=${ch}`)}>Drill {ch === "all" ? "all terms" : `chapter ${ch} terms`} · 10</button>
      <div className="row wrap" style={{ margin: "12px 0 6px" }}>
        {(["all", ...CHAPTERS] as const).map((c) => (
          <button key={c} className={`chip ${ch === c ? "sel" : ""}`} style={{ margin: 0 }} onClick={() => setCh(c)}>{c === "all" ? "All" : `Ch ${c}`}</button>
        ))}
      </div>
      <div className="search"><span className="muted">⌕</span><input id="terms-search" type="text" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {CHAPTERS.filter((c) => ch === "all" || ch === c).map((c) => {
        const list = TERMS.filter((t) => t.chapter === c && (!q || `${t.term} ${t.line}`.toLowerCase().includes(q.toLowerCase())));
        if (!list.length) return null;
        return (
          <div key={c}>
            <h3>Chapter {c} · {CHAPTER_TITLE[c]}</h3>
            <div className="card flat list" style={{ paddingTop: 2, paddingBottom: 2 }}>
              {list.map((t) => {
                const seen = retrievability(progress, termConcept(t.id)) !== null;
                return (
                  <div key={t.id} className="termrow">
                    <i className={`dot ${seen ? masteryClass(mastery(progress, termConcept(t.id))) : ""}`} style={{ marginTop: 7 }} />
                    <div><div style={{ fontWeight: 700 }}>{t.term}</div><div className="small muted">{t.line}</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
