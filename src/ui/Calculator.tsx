import { useEffect, useState } from "react";
import { haptic } from "./bits";

// ---------- tiny store so givens anywhere can push numbers into the calculator ----------
type Listener = () => void;
const state = { open: false, expr: "", history: [] as number[] };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());
export function openCalculator(): void { state.open = true; emit(); scrollGivensIntoView(); }
function scrollGivensIntoView(): void {
  try {
    setTimeout(() => document.querySelector(".givens")?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
  } catch { /* ignore */ }
}
/** Lets the session add bottom room while the sheet is open, so givens can scroll above it. */
export function useCalculatorOpen(): boolean {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return state.open;
}
export function closeCalculator(): void { state.open = false; emit(); }
/** Append a number to the expression (opening the calculator if needed). Called when a given is tapped. */
export function pushNumber(n: number): void {
  const s = formatNum(n);
  const e = state.expr;
  const endsWithNumber = /[\d.)]$/.test(e);
  state.expr = e + (endsWithNumber ? " × " : "") + s;
  const wasOpen = state.open;
  state.open = true;
  haptic("tap");
  emit();
  if (!wasOpen) scrollGivensIntoView();
}

// remember the numeric input the learner last touched so "Insert" knows where to go
let lastInput: HTMLInputElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement;
    if (t instanceof HTMLInputElement && t.classList.contains("numeric")) lastInput = t;
  });
}
function insertIntoAnswer(v: number): boolean {
  const el = lastInput && document.contains(lastInput) ? lastInput : (document.querySelector("input.numeric") as HTMLInputElement | null);
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, String(Math.round(v * 100) / 100));
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.focus();
  return true;
}

// ---------- safe expression parser: + − × ÷ ( ) % and decimals ----------
export function evaluate(src: string): number | null {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/,/g, "").replace(/\$/g, "");
  let i = 0;
  const peek = () => s[i] ?? "";
  const skip = () => { while (peek() === " ") i++; };
  const num = (): number | null => {
    skip();
    const m = /^\d*\.?\d+/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    let v = Number(m[0]);
    skip();
    if (peek() === "%") { i++; v /= 100; }
    return v;
  };
  const factor = (): number | null => {
    skip();
    if (peek() === "(") { i++; const v = expr(); skip(); if (peek() !== ")") return null; i++; return v; }
    if (peek() === "-") { i++; const v = factor(); return v === null ? null : -v; }
    return num();
  };
  const term = (): number | null => {
    let v = factor();
    if (v === null) return null;
    for (;;) {
      skip();
      const op = peek();
      if (op !== "*" && op !== "/") return v;
      i++;
      const r = factor();
      if (r === null) return null;
      v = op === "*" ? v * r : v / r;
    }
  };
  const expr = (): number | null => {
    let v = term();
    if (v === null) return null;
    for (;;) {
      skip();
      const op = peek();
      if (op !== "+" && op !== "-") return v;
      i++;
      const r = term();
      if (r === null) return null;
      v = op === "+" ? v + r : v - r;
    }
  };
  const v = expr();
  skip();
  if (v === null || i !== s.length || !Number.isFinite(v)) return null;
  return v;
}

export function formatNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? r.toLocaleString("en-US") : r.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ---------- the sheet ----------
export function CalculatorSheet() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  if (!state.open) return null;
  const result = state.expr.trim() ? evaluate(state.expr) : null;
  const key = (k: string) => {
    haptic("tap");
    if (k === "C") state.expr = "";
    else if (k === "⌫") state.expr = state.expr.replace(/\s*[×÷+−]\s*$|.$/, "");
    else if (k === "=") { if (result !== null) { state.history = [result, ...state.history.filter((h) => h !== result)].slice(0, 6); state.expr = formatNum(result); } }
    else if (["×", "÷", "+", "−"].includes(k)) state.expr = state.expr.replace(/\s*[×÷+−]\s*$/, "") + ` ${k} `;
    else state.expr += k;
    emit();
  };
  const insert = () => {
    if (result === null) return;
    state.history = [result, ...state.history.filter((h) => h !== result)].slice(0, 6);
    if (insertIntoAnswer(result)) { haptic("ok"); closeCalculator(); } else emit();
  };
  const keys = ["C", "(", ")", "⌫", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "%", "+"];
  return (
    <>
      <div className="calc-sheet" role="dialog" aria-label="Calculator">
        <div className="calc-top">
          <span className="eyebrow">Calculator · tap a given to drop it in</span>
          <button className="ghost icon" style={{ minHeight: 36, minWidth: 36 }} onClick={closeCalculator} aria-label="Close">✕</button>
        </div>
        <div className="calc-expr">{state.expr || <span className="muted">0</span>}</div>
        <div className={`calc-result ${result === null && state.expr ? "muted" : ""}`} onClick={() => { if (result !== null) key("="); }}>
          {result !== null ? `= ${formatNum(result)}` : state.expr ? "…" : ""}
        </div>
        {state.history.length > 0 && (
          <div className="row wrap" style={{ gap: 4, margin: "4px 0 6px" }}>
            {state.history.map((h, i) => <button key={i} className="chip" style={{ margin: 0, minHeight: 32, padding: "4px 10px", fontSize: 13 }} onClick={() => pushNumber(h)}>{formatNum(h)}</button>)}
          </div>
        )}
        <div className="calc-keys">
          {keys.map((k) => <button key={k} className={`calc-key ${/[÷×−+]/.test(k) ? "op" : ""} ${k === "C" || k === "⌫" ? "fn" : ""}`} onClick={() => key(k)}>{k}</button>)}
          <button className="calc-key eq" onClick={() => key("=")}>=</button>
          <button className="calc-key insert" disabled={result === null} onClick={insert}>Use as answer ↵</button>
        </div>
      </div>
    </>
  );
}

/** Floating button shown on numeric items. */
export function CalculatorFab() {
  return (
    <button className="calc-fab" onClick={openCalculator} aria-label="Open calculator">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15v2M8 18h2M12 18h2" /></svg>
    </button>
  );
}

/** A given the learner can tap to push its value into the calculator. */
export function Given({ label, value, display }: { label: string; value: number; display: string }) {
  return (
    <li className="given" onClick={() => pushNumber(value)} title="Tap to use in the calculator">
      <span>{label}</span><b>{display}<span className="given-plus">+</span></b>
    </li>
  );
}
