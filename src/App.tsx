import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { chapters } from "./content";
import { Catalog } from "./engine/items";
import { loadProgress, saveProgress, emptyProgress, type Progress } from "./engine/store";
import { Home } from "./ui/Home";
import { Session } from "./ui/Session";
import { Browse } from "./ui/Browse";
import { Stats } from "./ui/Stats";
import { Formulas } from "./ui/Formulas";
import { ConceptSheet } from "./ui/ConceptSheet";

export const catalog = new Catalog(chapters);

interface Ctx {
  progress: Progress;
  update: (fn: (p: Progress) => void) => void;
  replace: (p: Progress) => void;
  openConcept: (id: string | null) => void;
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
    const next = { ...ref.current, cards: { ...ref.current.cards }, stats: Object.fromEntries(Object.entries(ref.current.stats).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([m, st]) => [m, st ? { ...st } : st]))])), confusions: { ...ref.current.confusions }, log: ref.current.log.slice() };
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

  const ctx = useMemo<Ctx>(() => ({ progress, update, replace, openConcept: setSheet }), [progress, update, replace]);

  if (!ready) return <div className="screen center muted">Loading…</div>;

  const [path, query] = route.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query ?? "");
  let screen: JSX.Element;
  if (path?.startsWith("/study")) screen = <Session key={route} params={params} />;
  else if (path?.startsWith("/browse")) screen = <Browse path={path} />;
  else if (path?.startsWith("/formulas")) screen = <Formulas path={path} />;
  else if (path?.startsWith("/stats")) screen = <Stats />;
  else screen = <Home />;

  const inSession = path?.startsWith("/study");
  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {screen}
        {!inSession && (
          <nav className="tabbar">
            <a href="#/" onClick={(e) => { e.preventDefault(); go("#/"); }} className={path === "/" ? "on" : ""}>Home</a>
            <a href="#/browse" onClick={(e) => { e.preventDefault(); go("#/browse"); }} className={path?.startsWith("/browse") ? "on" : ""}>Browse</a>
            <a href="#/formulas" onClick={(e) => { e.preventDefault(); go("#/formulas"); }} className={path?.startsWith("/formulas") ? "on" : ""}>Formulas</a>
            <a href="#/stats" onClick={(e) => { e.preventDefault(); go("#/stats"); }} className={path?.startsWith("/stats") ? "on" : ""}>Stats</a>
          </nav>
        )}
        {sheet && <ConceptSheet id={sheet} onClose={() => setSheet(null)} />}
      </div>
    </AppCtx.Provider>
  );
}
