import { useState } from "react";
import type { ItemProps } from "../Session";
import type { ExamItem } from "../../engine/exam";
import { Rating } from "../../engine/store";
import { numberClose, fmt } from "../../engine/grade";
import { haptic } from "../bits";
import { pushNumber } from "../Calculator";

type Side = "dr" | "cr" | null;

/** Journal entry builder: choose the side for each account, then the amount. */
export function Journal({ item, hints, onDone }: ItemProps) {
  if (item.kind !== "journal") return null;
  const j = item as Extract<ExamItem, { kind: "journal" }>;
  const [sides, setSides] = useState<Record<string, Side>>({});
  const [amts, setAmts] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const involved = new Set([...j.debits, ...j.credits].map((l) => l.account));
  // show the accounts in the entry plus a few decoys, stable order
  const decoys = j.accounts.filter((a) => !involved.has(a)).slice(0, 4);
  const shown = [...j.accounts.filter((a) => involved.has(a)), ...decoys].sort();

  const expected = (acct: string): { side: Side; amount: number } => {
    const d = j.debits.find((l) => l.account === acct);
    if (d) return { side: "dr", amount: d.amount };
    const c = j.credits.find((l) => l.account === acct);
    if (c) return { side: "cr", amount: c.amount };
    return { side: null, amount: 0 };
  };
  const rowOk = (acct: string) => {
    const e = expected(acct);
    const s = sides[acct] ?? null;
    if (e.side === null) return s === null;
    return s === e.side && numberClose(amts[acct] ?? "", e.amount);
  };
  const submit = () => {
    if (checked) return;
    setChecked(true);
    const all = shown.every(rowOk);
    const sidesRight = shown.every((a) => (sides[a] ?? null) === expected(a).side);
    haptic(all ? "ok" : "bad");
    onDone({ rating: all ? (hints ? Rating.Hard : Rating.Good) : sidesRight ? Rating.Hard : Rating.Again });
  };
  const toggle = (acct: string, side: Side) => {
    if (checked) return;
    haptic("tap");
    setSides({ ...sides, [acct]: sides[acct] === side ? null : side });
  };
  const anyChosen = shown.some((a) => sides[a]);
  const drTotal = shown.filter((a) => sides[a] === "dr").reduce((s, a) => s + (Number((amts[a] ?? "").replace(/[$,\s]/g, "")) || 0), 0);
  const crTotal = shown.filter((a) => sides[a] === "cr").reduce((s, a) => s + (Number((amts[a] ?? "").replace(/[$,\s]/g, "")) || 0), 0);

  return (
    <>
      <div className="card">
        <div className="eyebrow">Journal entry</div>
        <p style={{ fontWeight: 600, marginTop: 6 }}>{j.text.split(/(\$[\d,]+)/).map((part, i) => /^\$[\d,]+$/.test(part) ? <button key={i} className="term" style={{ fontWeight: 700 }} onClick={() => pushNumber(Number(part.replace(/[$,]/g, "")))}>{part}</button> : <span key={i}>{part}</span>)}</p>
        <p className="small muted">Dr or Cr each account used, then the amount.</p>
      </div>
      <div className="stack">
        {shown.map((acct) => {
          const s = sides[acct] ?? null;
          const e = expected(acct);
          const ok = checked ? rowOk(acct) : null;
          return (
            <div key={acct} className={`step ${ok === null ? "" : ok ? "ok" : "bad"}`} style={{ flexWrap: "wrap" }}>
              <span className="grow" style={{ fontWeight: 600, paddingLeft: s === "cr" ? 18 : 0 }}>{acct}</span>
              <span className="row" style={{ gap: 6 }}>
                <button className={`soft ${s === "dr" ? "primary" : ""}`} style={{ minHeight: 36, padding: "4px 12px" }} onClick={() => toggle(acct, "dr")}>Dr</button>
                <button className={`soft ${s === "cr" ? "primary" : ""}`} style={{ minHeight: 36, padding: "4px 12px" }} onClick={() => toggle(acct, "cr")}>Cr</button>
              </span>
              {s && !checked && (
                <input className="numeric" type="text" inputMode="decimal" placeholder="Amount" value={amts[acct] ?? ""} onChange={(ev) => setAmts({ ...amts, [acct]: ev.target.value })} style={{ minHeight: 40, flexBasis: "100%" }} />
              )}
              {checked && (s || e.side) && (
                <div className="small" style={{ flexBasis: "100%" }}>
                  {e.side ? <><b>{e.side === "dr" ? "Dr" : "Cr"} {fmt(e.amount, "$")}</b></> : <>Not in this entry</>}
                  {s && !ok && <span className="muted"> · yours: {s === "dr" ? "Dr" : "Cr"} {amts[acct] || "—"}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!checked && (
        <>
          <div className="row small muted" style={{ justifyContent: "space-between", padding: "6px 4px" }}>
            <span>Debits {fmt(drTotal, "$")}</span><span className={drTotal && drTotal === crTotal ? "pill ok" : "pill"}>{drTotal === crTotal && drTotal ? "balanced" : "unbalanced"}</span><span>Credits {fmt(crTotal, "$")}</span>
          </div>
          <button className="primary block" disabled={!anyChosen} onClick={submit}>Check entry</button>
        </>
      )}
      {checked && (
        <>
          <div className={`feedback ${shown.every(rowOk) ? "ok" : "bad"}`}>{shown.every(rowOk) ? "Right" : "Not quite"}</div>
          <div className="explain">
            <div className="sol">{[...j.debits.map((l) => `${l.account.padEnd(28)} ${fmt(l.amount, "$").padStart(12)}`), ...j.credits.map((l) => `    ${l.account.padEnd(24)} ${"".padStart(12)} ${fmt(l.amount, "$").padStart(12)}`)].join("\n")}</div>
            <p className="small" style={{ marginTop: 8 }}>{j.explain}</p>
          </div>
        </>
      )}
    </>
  );
}
