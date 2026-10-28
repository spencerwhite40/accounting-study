import { useMemo, useState } from "react";
import type { ItemProps } from "../Session";
import { Rating } from "../../engine/store";
import { shuffle, mulberry32 } from "../../engine/items";
import { haptic } from "../bits";

export function Order({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "order") return null;
  const set = item.set;
  const start = useMemo(() => {
    let s = shuffle(set.steps.map((_, i) => i), mulberry32(Date.now()));
    if (s.every((v, i) => v === i)) s = s.reverse();
    return s;
  }, [set.id]);
  const [seq, setSeq] = useState(start);
  const [checked, setChecked] = useState(false);
  const move = (pos: number, dir: -1 | 1) => {
    if (checked) return;
    const to = pos + dir;
    if (to < 0 || to >= seq.length) return;
    const s = seq.slice();
    const t = s[pos] as number;
    s[pos] = s[to] as number;
    s[to] = t;
    setSeq(s);
  };
  const submit = () => {
    setChecked(true);
    const right = seq.filter((v, i) => v === i).length;
    const frac = right / seq.length;
    haptic(frac === 1 ? "ok" : "bad");
    onDone({ rating: frac === 1 ? (hints ? Rating.Hard : Rating.Good) : frac >= 0.6 ? Rating.Hard : Rating.Again });
  };
  return (
    <>
      <div className="card">
        <b>{set.title}</b>
        <p className="small muted">{set.prompt} Use the arrows.</p>
      </div>
      {seq.map((v, pos) => (
        <div key={v} className={`step ${checked ? (v === pos ? "ok" : "bad") : ""}`}>
          <span className="n">{pos + 1}</span>
          <span className="grow">{set.steps[v]}{checked && v !== pos ? <span className="muted small"> (should be #{v + 1})</span> : null}</span>
          {!checked && (
            <span className="mv">
              <button onClick={() => move(pos, -1)} disabled={pos === 0}>▲</button>
              <button onClick={() => move(pos, 1)} disabled={pos === seq.length - 1}>▼</button>
            </span>
          )}
        </div>
      ))}
      {!checked && <button className="primary block" style={{ marginTop: 10 }} onClick={submit}>Check</button>}
      {checked && <div className={`feedback ${seq.every((v, k) => v === k) ? "ok" : "bad"}`}>{seq.every((v, k) => v === k) ? "Right order" : `${seq.filter((v, k) => v !== k).length} out of place`}</div>}
      {checked && set.explain && <div className="explain">{set.explain}</div>}
    </>
  );
}
