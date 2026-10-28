import { useState } from "react";
import type { ItemProps } from "../Session";
import { TermText } from "../TermText";
import { Rating } from "../../engine/store";
import { catalog } from "../../App";

export function Mcq({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "mcq") return null;
  const [chosen, setChosen] = useState<number | null>(null);
  const exclude = item.choices.map((c) => c.concept);
  const pick = (k: number) => {
    if (chosen !== null) return;
    setChosen(k);
    const right = k === item.answer;
    onDone({ rating: right ? (hints ? Rating.Hard : Rating.Good) : Rating.Again, confusedWith: right ? undefined : item.choices[k]?.concept });
  };
  return (
    <>
      <div className="card" style={{ whiteSpace: "pre-wrap" }}><TermText text={item.stem} exclude={exclude} /></div>
      {item.choices.map((c, k) => (
        <button key={k} className={`choice ${chosen === null ? "" : k === item.answer ? "right" : k === chosen ? "wrong" : ""}`} onClick={() => pick(k)}>
          {c.text}
        </button>
      ))}
      {chosen !== null && (
        <div className="explain">
          <b>{chosen === item.answer ? "Right." : "Not quite."}</b> {catalog.concept(item.concept).term}: {item.explain}
          {chosen !== item.answer && (
            <p className="small">You picked <b>{catalog.concept(item.choices[chosen]?.concept ?? "").term}</b>: {catalog.concept(item.choices[chosen]?.concept ?? "").plain}</p>
          )}
        </div>
      )}
    </>
  );
}
