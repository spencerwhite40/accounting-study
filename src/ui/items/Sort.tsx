import { useMemo, useState } from "react";
import type { ItemProps } from "../Session";
import { Rating } from "../../engine/store";
import { shuffle, mulberry32 } from "../../engine/items";
import { haptic } from "../bits";

/** One card at a time; buckets are big buttons under it. Placed cards collect under each bucket. */
export function Sort({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "sort") return null;
  const set = item.set;
  const order = useMemo(() => shuffle(set.cards.map((_, i) => i), mulberry32(Date.now())), [set.id]);
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const remaining = order.filter((i) => placed[i] === undefined);
  const current = remaining[0];

  const place = (bucket: number) => {
    if (current === undefined || checked) return;
    setPlaced({ ...placed, [current]: bucket });
    haptic("tap");
  };
  const unplace = (i: number) => {
    if (checked) return;
    const p = { ...placed };
    delete p[i];
    setPlaced(p);
  };
  const submit = () => {
    setChecked(true);
    const right = set.cards.filter((c, i) => placed[i] === c.bucket).length;
    const frac = right / set.cards.length;
    haptic(frac === 1 ? "ok" : "bad");
    onDone({ rating: frac === 1 ? (hints ? Rating.Hard : Rating.Good) : frac >= 0.75 ? Rating.Hard : Rating.Again });
  };
  const wrong = set.cards.filter((c, i) => placed[i] !== c.bucket);

  return (
    <>
      <div className="card">
        <b>{set.title}</b>
        <p className="small muted">{set.prompt}</p>
      </div>
      {current !== undefined && !checked && (
        <>
          <div className="card flash" style={{ minHeight: "22dvh", fontSize: 19 }}>{set.cards[current]?.text}</div>
          <p className="small muted center" style={{ margin: "0 0 6px" }}>{remaining.length} left</p>
          <div className={set.buckets.length > 3 ? "grid2" : "stack"}>
            {set.buckets.map((b, bi) => <button key={bi} className="primary" style={{ minHeight: 56 }} onClick={() => place(bi)}>{b}</button>)}
          </div>
        </>
      )}
      {current === undefined && !checked && <button className="primary block" onClick={submit}>Check</button>}
      <div className="stack" style={{ marginTop: 12 }}>
        {set.buckets.map((b, bi) => {
          const here = Object.entries(placed).filter(([, v]) => v === bi).map(([k]) => Number(k));
          if (here.length === 0 && !checked) return null;
          return (
            <div key={bi} className="bucket">
              <h4>{b}</h4>
              {here.map((i) => {
                const card = set.cards[i];
                const ok = card?.bucket === bi;
                return (
                  <button key={i} className={`chip ${checked ? (ok ? "ok" : "bad") : ""}`} style={{ minHeight: 36 }} onClick={() => unplace(i)}>
                    {card?.text}{checked && !ok ? ` → ${set.buckets[card?.bucket ?? 0]}` : ""}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      {checked && (
        <div className={`feedback ${wrong.length === 0 ? "ok" : wrong.length <= 2 ? "hard" : "bad"}`}>{wrong.length === 0 ? "All right" : `${wrong.length} misplaced`}</div>
      )}
      {checked && (
        <div className="explain">
          {wrong.length === 0 ? "Clean sweep." : "Misplaced cards show where they belong."}
          {set.cards.filter((c) => c.why).map((c, i) => <p key={i} className="small"><b>{c.text}:</b> {c.why}</p>)}
        </div>
      )}
    </>
  );
}
