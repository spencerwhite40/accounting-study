import { useState } from "react";
import type { ItemProps } from "../Session";
import { matches } from "../../engine/grade";
import { Rating } from "../../engine/store";
import { haptic } from "../bits";

export function Cloze({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "cloze") return null;
  const blanks = item.parts.map((p, i) => (typeof p === "string" ? null : i)).filter((x): x is number => x !== null);
  const [vals, setVals] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const results = blanks.map((i) => {
    const p = item.parts[i];
    return !p || typeof p === "string" ? false : matches(vals[i] ?? "", p.answers);
  });
  const submit = () => {
    if (checked) return;
    setChecked(true);
    const allRight = results.every(Boolean);
    haptic(allRight ? "ok" : "bad");
    const someRight = results.some(Boolean);
    onDone({ rating: allRight ? (hints ? Rating.Hard : Rating.Good) : someRight && results.length > 1 ? Rating.Hard : Rating.Again });
  };
  let b = 0;
  return (
    <>
      <div className="card" style={{ fontSize: 18, lineHeight: 1.9 }}>
        {item.parts.map((p, i) => {
          if (typeof p === "string") return <span key={i}>{p}</span>;
          const k = b++;
          const ok = results[k];
          return checked ? (
            <span key={i} className={`blank ${ok ? "ok" : "bad"}`}>{ok ? vals[i] : <><s>{vals[i] || "…"}</s> {p.answers[0]}</>}</span>
          ) : (
            <input
              key={i}
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              style={{ display: "inline-block", width: Math.max(110, (p.answers[0]?.length ?? 8) * 11), minHeight: 36, padding: "4px 8px", margin: "0 4px" }}
              value={vals[i] ?? ""}
              placeholder={`blank ${k + 1}`}
              onChange={(e) => setVals({ ...vals, [i]: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          );
        })}
      </div>
      {!checked && <button className="primary block" onClick={submit}>Check</button>}
      {checked && <div className={`feedback ${results.every(Boolean) ? "ok" : results.some(Boolean) ? "hard" : "bad"}`}>{results.every(Boolean) ? "All blanks right" : results.some(Boolean) ? "Partly right" : "Not quite"}</div>}
      {checked && <div className="explain" style={{ whiteSpace: "pre-wrap" }}>{item.explain}</div>}
    </>
  );
}
