import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { chapters } from "./content";
import { Catalog } from "./engine/items";
import { loadProgress, saveProgress, emptyProgress, type Progress } from "./engine/store";
import { Home } from "./ui/Home";
import { Session } from "./ui/Session";
import { Browse } from "./ui/Browse";
import { Stats } from "./ui/Stats";
import { Formulas } from "./ui/Formulas";
import { Exam } from "./ui/Exam";
import { ConceptSheet } from "./ui/ConceptSheet";
import { Toaster, Icons } from "./ui/bits";
import { Ex2 } from "./ex2/Ex2";

export const catalog = new Catalog(chapters);

interface Ctx {
  progress: Progress;
  update: (fn: (p: Progress) => void) => void;
  replace: (p: Progress) => void;
  openConcept: (id: string | null) => void;
  exam: 1 | 2;
  setExam: (e: 1 | 2) => void;
}
const AppCtx = createContext<Ctx | null>(null);
export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("no ctx");
  return c;
}

// In-memory router. The hash is mirrored when the host allows it, but navigation
// never depends on it (hosted viewers may rewrite or drop hashes).
let current = (() => { try { return location.hash.startsWith("#/") ? location.hash : "#/"; } catch { return "#/"; } })();
const listeners = new Set<(h: string) => void>();
export function go(path: string): void {
  current = path.startsWith("#") ? path : `#${path}`;
  try { if (location.hash !== current) history.replaceState(null, "", current); } catch { /* ignore */ }
  listeners.forEach((l) => l(current));
}
export function useRoute(): string {
  const [h, setH] = useState(current);
  useEffect(() => {
    listeners.add(setH);
    const on = () => { try { if (location.hash.startsWith("#/") && location.hash !== current) go(location.hash); } catch { /* ignore */ } };
    addEventListener("hashchange", on);
    return () => { listeners.delete(setH); removeEventListener("hashchange", on); };
  }, []);
  return h;
}

export function App() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [exam, setExamState] = useState<1 | 2>(() => { try { return localStorage.getItem("acct-exam") === "1" ? 1 : 2; } catch { return 2; } });
  const setExam = useCallback((e: 1 | 2) => { setExamState(e); try { localStorage.setItem("acct-exam", String(e)); } catch { /* ignore */ } go(e === 2 ? "#/x2" : "#/"); }, []);
  const ref = useRef(progress);
  ref.current = progress;
  const route = useRoute();

  useEffect(() => {
    loadProgress().then((p) => {
      setProgress(p);
      setReady(true);
    });
  }, []);

  const update = useCallback((fn: (p: Progress) => void) => {
    const next = { ...ref.current, cards: { ...ref.current.cards }, stats: Object.fromEntries(Object.entries(ref.current.stats).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([m, st]) => [m, st ? { ...st } : st]))])), confusions: { ...ref.current.confusions }, calcLevel: { ...ref.current.calcLevel }, calcStreak: { ...ref.current.calcStreak }, log: ref.current.log.slice() };
    fn(next);
    ref.current = next;
    setProgress(next);
    void saveProgress(next);
  }, []);
  const replace = useCallback((p: Progress) => {
    ref.current = p;
    setProgress(p);
    void saveProgress(p);
  }, []);

  const ctx = useMemo<Ctx>(() => ({ progress, update, replace, openConcept: setSheet, exam, setExam }), [progress, update, replace, exam, setExam]);

  if (!ready) return <div className="screen center muted" style={{ minHeight: "100dvh" }}>Loading your progress…</div>;

  const [rawPath, query] = route.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query ?? "");
  // Exam 2 lives under /x2; Exam 1 keeps its original screens untouched.
  const path = exam === 2 ? (rawPath?.startsWith("/x2") ? rawPath : "/x2") : rawPath?.startsWith("/x2") ? "/" : rawPath;
  if (exam === 2) {
    return (
      <AppCtx.Provider value={ctx}>
        <div className="app">
          <Ex2 path={path ?? "/x2"} params={params} routeKey={route} />
          <Toaster />
        </div>
      </AppCtx.Provider>
    );
  }
  let screen: JSX.Element;
  if (path?.startsWith("/study")) screen = <Session key={route} params={params} />;
  else if (path?.startsWith("/browse")) screen = <Browse path={path} />;
  else if (path?.startsWith("/formulas")) screen = <Formulas path={path} />;
  else if (path?.startsWith("/exam")) screen = <Exam />;
  else if (path?.startsWith("/stats")) screen = <Stats />;
  else screen = <Home />;

  const inSession = path?.startsWith("/study");
  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {screen}
        {!inSession && (
          <nav className="tabbar">
            {([["#/", "Home", Icons.home, path === "/"], ["#/browse", "Browse", Icons.browse, !!path?.startsWith("/browse")], ["#/formulas", "Equations", Icons.formulas, !!path?.startsWith("/formulas")], ["#/exam", "Exam", Icons.exam, !!path?.startsWith("/exam")], ["#/stats", "Progress", Icons.stats, !!path?.startsWith("/stats")]] as const).map(([href, label, icon, on]) => (
              <a key={href} href={href} onClick={(e) => { e.preventDefault(); go(href); }} className={on ? "on" : ""}>{icon}{label}</a>
            ))}
          </nav>
        )}
        {sheet && <ConceptSheet id={sheet} onClose={() => setSheet(null)} />}
        <Toaster />
      </div>
    </AppCtx.Provider>
  );
}
