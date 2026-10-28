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
import { Toaster, Icons } from "./ui/bits";

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

  if (!ready) return <div className="screen center muted" style={{ minHeight: "100dvh" }}>Loading your progress…</div>;

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
            {([["#/", "Home", Icons.home, path === "/"], ["#/browse", "Browse", Icons.browse, !!path?.startsWith("/browse")], ["#/formulas", "Equations", Icons.formulas, !!path?.startsWith("/formulas")], ["#/stats", "Progress", Icons.stats, !!path?.startsWith("/stats")]] as const).map(([href, label, icon, on]) => (
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
