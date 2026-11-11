import { useState } from "react";
import { useApp, go } from "../App";
import { PLAYS, PLAY_BY_ID } from "./content";
import { CHAPTERS, CHAPTER_TITLE, type Chapter } from "./types";
import { playMastery, playConcept } from "./engine";
import { masteryClass } from "../ui/bits";
import { PlayCard } from "./Card";

export function Playbook({ id }: { id?: string }) {
  const { progress } = useApp();
  const [ch, setCh] = useState<Chapter | "all">("all");
  const play = id ? PLAY_BY_ID.get(id) : undefined;

  if (play) {
    const idx = PLAYS.findIndex((p) => p.id === play.id);
    const prev = PLAYS[idx - 1];
    const nxt = PLAYS[idx + 1];
    return (
      <div className="screen">
        <a href="#" className="small" onClick={(e) => { e.preventDefault(); go("#/x2/play"); }}>← Playbook</a>
        <PlayCard play={play} full />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="primary grow" onClick={() => go(`#/x2/drill?only=${play.id}`)}>Drill this</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="soft grow" disabled={!prev} onClick={() => prev && go(`#/x2/play/${prev.id}`)}>← Previous</button>
          <button className="soft grow" disabled={!nxt} onClick={() => nxt && go(`#/x2/play/${nxt.id}`)}>Next →</button>
        </div>
      </div>
    );
  }

  const list = PLAYS.filter((p) => ch === "all" || p.chapter === ch);
  return (
    <div className="screen">
      <div className="eyebrow">Playbook</div>
      <h1>When you see it, do this</h1>
      <div className="row wrap" style={{ marginBottom: 8 }}>
        {(["all", ...CHAPTERS] as const).map((c) => (
          <button key={c} className={`chip ${ch === c ? "sel" : ""}`} style={{ margin: 0 }} onClick={() => setCh(c)}>{c === "all" ? "All" : `Ch ${c}`}</button>
        ))}
      </div>
      {CHAPTERS.filter((c) => ch === "all" || ch === c).map((c) => (
        <div key={c}>
          <h3>Chapter {c} · {CHAPTER_TITLE[c]}</h3>
          <div className="stack" style={{ gap: 8 }}>
            {list.filter((p) => p.chapter === c).map((p) => {
              const seen = (progress.cards[playConcept(p.id)]?.reps ?? 0) > 0;
              return (
                <button key={p.id} className="card flat playrow" onClick={() => go(`#/x2/play/${p.id}`)}>
                  <div className="row top">
                    <i className={`dot ${seen ? masteryClass(playMastery(progress, p.id)) : ""}`} style={{ marginTop: 7 }} />
                    <div className="grow"><div style={{ fontWeight: 700 }}>{p.name}</div><div className="small muted" style={{ whiteSpace: "normal" }}>{p.gist}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
