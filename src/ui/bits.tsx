import { useEffect, useState } from "react";

export function masteryClass(m: number | null): string {
  if (m === null) return "";
  if (m < 0.25) return "m1";
  if (m < 0.45) return "m2";
  if (m < 0.65) return "m3";
  if (m < 0.85) return "m4";
  return "m5";
}
export function masteryWord(m: number | null): string {
  if (m === null) return "new";
  if (m < 0.25) return "shaky";
  if (m < 0.45) return "forming";
  if (m < 0.65) return "getting there";
  if (m < 0.85) return "solid";
  return "mastered";
}
export function Mastery({ value }: { value: number | null }) {
  return <span className={`pill ${value === null ? "" : value >= 0.65 ? "ok" : value >= 0.4 ? "warn" : "bad"}`}>{value === null ? "new" : `${Math.round(value * 100)}%`}</span>;
}
export function Heat({ values }: { values: (number | null)[] }) {
  return <div className="heat">{values.map((v, i) => <i key={i} className={masteryClass(v)} />)}</div>;
}
export function Bar({ value, cls = "" }: { value: number; cls?: string }) {
  return <div className={`bar ${cls}`}><b style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}
export function Ring({ value, label, size = 108, color = "var(--gold)", track = "rgba(127,127,127,.18)" }: { value: number; label: string; size?: number; color?: string; track?: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 108 108">
        <circle cx="54" cy="54" r={r} fill="none" stroke={track} strokeWidth="9" />
        <circle cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={`${c * (1 - v)}`} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div className="lbl"><b>{Math.round(v * 100)}%</b><span>{label}</span></div>
    </div>
  );
}
export function Spark({ values, highlightLast = true }: { values: number[]; highlightLast?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div className="spark">
      {values.map((v, i) => (
        <i key={i} className={highlightLast && i === values.length - 1 ? "today" : ""}><b style={{ height: `${(v / max) * 100}%` }} /></i>
      ))}
    </div>
  );
}

export function haptic(kind: "ok" | "bad" | "tap"): void {
  try {
    if (!("vibrate" in navigator)) return;
    if (kind === "ok") navigator.vibrate(12);
    else if (kind === "bad") navigator.vibrate([24, 40, 24]);
    else navigator.vibrate(6);
  } catch { /* ignore */ }
}

export function toast(msg: string): void {
  dispatchEvent(new CustomEvent("app:toast", { detail: msg }));
}
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t = 0;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2200);
    };
    addEventListener("app:toast", on);
    return () => removeEventListener("app:toast", on);
  }, []);
  return msg ? <div className="toast">{msg}</div> : null;
}

export const Icons = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></svg>,
  browse: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16M4 12h16M4 19h10" /></svg>,
  formulas: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h14l-7 8 7 8H5" /></svg>,
  exam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14H6z" /><path d="M9 12l2 2 4-4" /></svg>,
  stats: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>,
};
