import { go } from "../App";
import { Ex2Home } from "./Home";
import { Drill } from "./Drill";
import { Playbook } from "./Playbook";
import { TermsScreen } from "./TermsScreen";
import { Ex2Progress } from "./Progress";
import { Icons } from "../ui/bits";

export function Ex2({ path, params, routeKey }: { path: string; params: URLSearchParams; routeKey: string }) {
  const sub = path.replace(/^\/x2/, "") || "/";
  const inDrill = sub.startsWith("/drill");
  let screen: JSX.Element;
  if (inDrill) screen = <Drill key={routeKey} params={params} />;
  else if (sub.startsWith("/play")) screen = <Playbook id={sub.split("/")[2]} />;
  else if (sub.startsWith("/terms")) screen = <TermsScreen />;
  else if (sub.startsWith("/stats")) screen = <Ex2Progress />;
  else screen = <Ex2Home />;
  const tab = (href: string, label: string, icon: JSX.Element, on: boolean) => (
    <a key={href} href={href} onClick={(e) => { e.preventDefault(); go(href); }} className={on ? "on" : ""}>{icon}{label}</a>
  );
  return (
    <>
      {screen}
      {!inDrill && (
        <nav className="tabbar">
          {tab("#/x2", "Study", Icons.home, sub === "/" || sub === "")}
          {tab("#/x2/play", "Playbook", Icons.browse, sub.startsWith("/play"))}
          {tab("#/x2/terms", "Terms", Icons.formulas, sub.startsWith("/terms"))}
          {tab("#/x2/stats", "Progress", Icons.stats, sub.startsWith("/stats"))}
        </nav>
      )}
    </>
  );
}
