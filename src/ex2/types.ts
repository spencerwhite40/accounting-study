/** 4 = activity-based costing (Chapter 4), 9 = lean and quality, the two study-guide topics outside Chapters 5 to 8. */
export type Chapter = 4 | 5 | 6 | 7 | 8 | 9;

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
  4: "Activity-based costing",
  9: "Lean and quality",
  5: "Process costing",
  6: "Cost behavior",
  7: "Cost-volume-profit",
  8: "Short-term decisions",
};
export const CHAPTERS: Chapter[] = [4, 9, 5, 6, 7, 8];
/** Label shown above a topic: "Chapter 5", or "Study guide" for the lean and quality topics. */
export const chapterHead = (c: Chapter): string => (c === 9 ? "Study guide" : `Chapter ${c}`);
