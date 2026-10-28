export function masteryClass(m: number | null): string {
  if (m === null) return "";
  if (m < 0.25) return "m1";
  if (m < 0.45) return "m2";
  if (m < 0.65) return "m3";
  if (m < 0.85) return "m4";
  return "m5";
}
export function Mastery({ value }: { value: number | null }) {
  return <span className={`pill ${value === null ? "" : value >= 0.65 ? "ok" : value >= 0.4 ? "warn" : "bad"}`}>{value === null ? "new" : `${Math.round(value * 100)}%`}</span>;
}
export function Heat({ values }: { values: (number | null)[] }) {
  return (
    <div className="heat">
      {values.map((v, i) => <i key={i} className={masteryClass(v)} />)}
    </div>
  );
}
