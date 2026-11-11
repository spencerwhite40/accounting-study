export type Chapter = 5 | 6 | 7 | 8;

/** Tap-what-you-need scenario. Each item is [text, needed, why it is skipped or needed]. */
export interface Gather { q: string; items: [text: string, need: boolean, why?: string][] }

/** A route: what is given, what is asked, and the ordered steps that get there (hidden steps included). */
export interface Route { goal: string; given: string[]; steps: string[] }

/** One problem pattern: how to recognize it, what you need, what to do, what to ignore, and the trap. */
export interface Play {
  id: string;
  chapter: Chapter;
  name: string;
  gist: string;
  sees: string[];
  needs: string[];
  steps: string[];
  skip?: string[];
  trap: string;
  example?: string;
  gather?: Gather[];
  routes?: Route[];
}

export interface Term { id: string; chapter: Chapter; term: string; line: string }

export const CHAPTER_TITLE: Record<Chapter, string> = {
  5: "Process costing",
  6: "Cost behavior",
  7: "Cost-volume-profit",
  8: "Short-term decisions",
};
export const CHAPTERS: Chapter[] = [5, 6, 7, 8];
