import { useMemo } from "react";
import { catalog, useApp } from "../App";

/** Renders text with tappable key terms. `exclude` hides links for concepts that would leak an answer. */
export function TermText({ text, exclude = [] }: { text: string; exclude?: string[] }) {
  const { openConcept } = useApp();
  const matcher = useMemo(() => buildMatcher(exclude), [exclude.join("|")]);
  const parts = useMemo(() => matcher(text), [matcher, text]);
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <button key={i} className="term" onClick={(e) => { e.stopPropagation(); openConcept(p.id); }}>
            {p.text}
          </button>
        ),
      )}
    </>
  );
}

type Part = string | { id: string; text: string };
let cache: { key: string; fn: (t: string) => Part[] } | null = null;

function buildMatcher(exclude: string[]): (t: string) => Part[] {
  const key = exclude.join("|");
  if (cache && cache.key === key) return cache.fn;
  const entries: { id: string; re: string }[] = [];
  for (const c of catalog.concepts.values()) {
    if (exclude.includes(c.id)) continue;
    const names = [c.term.replace(/\s*\(.*?\)\s*/g, " ").trim(), ...(c.aliases ?? [])].filter((n) => n.length >= 4);
    for (const n of names) entries.push({ id: c.id, re: escape(n) });
  }
  entries.sort((a, b) => b.re.length - a.re.length);
  const re = new RegExp(`\\b(${entries.map((e) => e.re).join("|")})\\b`, "gi");
  const lookup = (s: string): string | undefined => {
    const n = s.toLowerCase();
    for (const c of catalog.concepts.values()) {
      if (exclude.includes(c.id)) continue;
      const names = [c.term.replace(/\s*\(.*?\)\s*/g, " ").trim(), ...(c.aliases ?? [])].map((x) => x.toLowerCase());
      if (names.includes(n)) return c.id;
    }
    return undefined;
  };
  const fn = (t: string): Part[] => {
    const out: Part[] = [];
    let last = 0;
    let count = 0;
    for (const m of t.matchAll(re)) {
      const id = lookup(m[0]);
      if (!id || m.index === undefined) continue;
      if (m.index > last) out.push(t.slice(last, m.index));
      out.push({ id, text: m[0] });
      last = m.index + m[0].length;
      if (++count > 12) break;
    }
    if (last < t.length) out.push(t.slice(last));
    return out;
  };
  cache = { key, fn };
  return fn;
}
function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}
