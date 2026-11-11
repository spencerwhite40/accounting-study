import type { Play } from "./types";
import { CHAPTER_TITLE } from "./types";

/** The structure of a problem on one card: what you need, what to do, what to skip, the trap. */
export function PlayCard({ play, full = false }: { play: Play; full?: boolean }) {
  return (
    <div className="struct">
      <div className="struct-head">
        <div className="struct-name">{play.name}</div>
        <div className="tiny muted">Chapter {play.chapter} · {CHAPTER_TITLE[play.chapter]}</div>
      </div>
      {full && (
        <Section label="You'll see">
          <ul className="struct-list quote">{play.sees.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}
      <Section label="You need">
        <ul className="struct-list">{play.needs.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </Section>
      <Section label="Do">
        <ol className="struct-steps">{play.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </Section>
      {play.skip && play.skip.length > 0 && (
        <Section label="Skip">
          <ul className="struct-list skip">{play.skip.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </Section>
      )}
      <div className="struct-trap"><b>Trap.</b> {play.trap}</div>
      {play.example && <div className="struct-ex"><b>Example.</b> {play.example}</div>}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="struct-sec">
      <div className="struct-label">{label}</div>
      {children}
    </div>
  );
}
