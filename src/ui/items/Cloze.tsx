import { useState } from "react";
import type { ItemProps } from "../Session";
import { matches } from "../../engine/grade";
import { Rating } from "../../engine/store";
import { itemMode } from "../../engine/items";
import { useApp } from "../../App";
import { haptic } from "../bits";

/** One blank. Tap the right choice; typing unlocks after the learner has been getting these right. */
export function Cloze({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "cloze") return null;
  const { progress } = useApp();
  const st = progress.stats[item.concept]?.[itemMode(item)];
  const earned = !!st && st.right + st.wrong >= 3 && st.right / (st.right + st.wrong) >= 0.8;
  const [typed, setTyped] = useState(earned);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const blank = item.parts.find((p): p is { answers: string[] } => typeof p !== "string");
  const answers = blank?.answers ?? [];
  const given = typed ? text : picked ?? "";
  const right = typed ? matches(text, answers) : picked !== null && answers.some((a) => a === picked);

  const finish = (ok: boolean) => {
    setChecked(true);
    haptic(ok ? "ok" : "bad");
    onDone({ rating: ok ? (hints ? Rating.Hard : Rating.Good) : Rating.Again });
  };
  const tap = (c: string) => {
    if (checked) return;
    setPicked(c);
    finish(answers.some((a) => a === c));
  };

  return (
    <>
      <div className="card" style={{ fontSize: 18, lineHeight: 1.9 }}>
        {item.parts.map((p, i) => {
          if (typeof p === "string") return <span key={i}>{p}</span>;
          if (checked) return <span key={i} className={`blank ${right ? "ok" : "bad"}`}>{right ? given : <><s>{given || "…"}</s> {answers[0]}</>}</span>;
          if (!typed) return <span key={i} className="blank">{picked ?? "      "}</span>;
          return (
            <input key={i} className="cloze-input" type="text" autoCapitalize="none" autoCorrect="off" value={text} placeholder="type it" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) finish(matches(text, answers)); }} />
          );
        })}
      </div>
      {!checked && !typed && (
        <>
          {item.choices.map((c) => <button key={c} className="choice" onClick={() => tap(c)}>{c}</button>)}
          <button className="ghost small block" style={{ textAlign: "center" }} onClick={() => setTyped(true)}>Type it instead</button>
        </>
      )}
      {!checked && typed && (
        <>
          <button className="primary block" disabled={!text.trim()} onClick={() => finish(matches(text, answers))}>Check</button>
          <button className="ghost small block" style={{ textAlign: "center" }} onClick={() => setTyped(false)}>Show choices</button>
        </>
      )}
      {checked && <div className={`feedback ${right ? "ok" : "bad"}`}>{right ? "Right" : "Not quite"}</div>}
      {checked && <div className="explain" style={{ whiteSpace: "pre-wrap" }}>{item.explain}</div>}
    </>
  );
}
