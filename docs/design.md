# Accounting Study Tool — design recommendation

Status: v1 built (standalone Vite PWA, hosted on GitHub Pages). Source material: AC241 chapters 1 to 4 key-term
sheets, slide decks and lecture transcripts.

## 0. What v1 does

- Six modes: flashcards, sort & organize, multiple choice, fill the blank,
  put in order, and **Numbers**. One mastery score per concept (FSRS) fed by
  every mode; confusion pairs recorded from wrong multiple-choice picks.
- **Numbers is the centerpiece.** Every calculation in the course is a node
  in a graph (`src/content/ac241/ch*.ts`, `calcs`) with its formula, when
  you need it, the trap to avoid, and which other calculations can feed it.
  The generator hides inputs behind prior calculations without saying so:
  you're asked for over/under-applied overhead and only get estimated
  overhead, estimated hours, actual hours and actual overhead. Hints name
  the missing piece; the worked solution shows the full chain; a wrong
  answer offers "break it down" which asks each intermediate step and grades
  it to its own concept, so the tracker learns which link failed.
- Formula map screen: every calculation with needs/feeds, per chapter.
- Progress on-device (IndexedDB) with JSON export/import. Installable PWA.

## 1. What it is

A mobile-first, Quizlet-style study app purpose-built for accounting.
Four practice modes to start (flashcards, sort & organize, multiple
choice, fill-the-blank), one shared knowledge model underneath so every
mode feeds the same per-concept mastery score, and a content pipeline
that turns course documents into structured study items so adding a
chapter is a drop-the-PDF-in operation, not a hand-authoring one.

"Many levels" is handled by tagging, not by separate apps: every item
carries `course`, `chapter`, `topic`, and `bloom` (recall / understand /
apply / analyze). Intro managerial accounting today, CMA or intermediate
later, same engine.

## 2. Where it lives and the stack

- **Own repo** (this one). It shares nothing with the fuel app's data, auth, or deploy
  rules, and should not inherit the prod-guard overhead of this repo.
- **Vite + React + TypeScript PWA**, Tailwind, same toolchain as the
  Haulers client so the muscle memory carries over. Installable to the
  phone home screen, works offline.
- **No backend for v1.** Content ships as static JSON. Progress lives in
  IndexedDB (via `idb-keyval` or Dexie) with a one-tap JSON export /
  import so it can move between phone and laptop. A tiny sync endpoint
  (Supabase or a Render Node service) is a v2 add once the single-device
  version has proven the study loop.
- **Content pipeline is a script, not a UI:** `scripts/ingest.mjs` takes
  a PDF / transcript / slide deck, extracts text, and calls an LLM with a
  strict JSON schema to produce items. Output is committed to
  `content/<course>/<chapter>.json` and reviewed by hand in a diff before
  it ships. This is where "variations of examples" come from: the
  prompt asks for 2 to 3 rephrasings and distractor sets per concept.

## 3. Content model

Everything derives from **concepts**, not from cards. A concept is the
unit of mastery; items are the ways of asking about it.

```ts
type Concept = {
  id: string;            // "ac241.ch3.predetermined-oh-rate"
  course: string; chapter: number; topic: string;
  term: string;          // "Predetermined Manufacturing Overhead Rate"
  definition: string;    // canonical, from the key-terms sheet
  plain: string;         // one-sentence plain-English restatement
  formula?: string;      // "Est. total MOH / Est. total cost driver"
  example?: string;      // worked example, from lecture or generated
  related: string[];     // concept ids (overallocated ↔ underallocated)
  tags: string[];        // "org-structure", "quality-costs", "sox"
  bloom: "recall" | "understand" | "apply" | "analyze";
};

type Item =
  | { kind: "flashcard"; concept: string; front: string; back: string; variant: number }
  | { kind: "mcq"; concept: string; stem: string; choices: string[]; answer: number;
      explain: string[]; variant: number }            // explain[i] says why choice i is right/wrong
  | { kind: "cloze"; concept: string; text: string; blanks: { answer: string; accept: string[] }[] }
  | { kind: "sort"; concept: string; prompt: string; buckets: string[];
      cards: { text: string; bucket: number }[] }
  | { kind: "order"; concept: string; prompt: string; steps: string[] };  // ethical dilemma ladder, lean rules
```

The chapter 1 material already maps cleanly onto these:

- **Sort:** financial vs managerial accounting (twelve contrasting
  bullets across slides 3–5); who reports to whom (board, audit
  committee, CEO, COO, CFO, treasurer, controller, internal audit);
  the four IMA ethical standards; chapter 4's four cost-of-quality
  categories and the unit / batch / product / facility activity levels.
- **Order:** the IMA dilemma-resolution ladder; lean production's ten
  rules; the planning → directing → controlling cycle.
- **Cloze:** formula-shaped definitions (predetermined overhead rate,
  over/underallocated overhead), SOX provisions, dates and bodies.
- **MCQ:** every key term, with distractors drawn from *related*
  concepts in the same chapter so they are plausible, not random.
- **Flashcard:** term ↔ definition both directions, plus
  definition ↔ plain-English and term ↔ example variants.

## 4. Knowledge tracking

- **Scheduler: FSRS** (the open spaced-repetition algorithm; `ts-fsrs`
  on npm). Each concept has one FSRS card state. Every answer in any
  mode is a review of that concept, graded Again / Hard / Good / Easy.
  MCQ and cloze grade themselves; flashcards use the four-button self
  grade; sort and order grade by proportion correct.
- **Mastery per concept** = FSRS retrievability blended with recent
  accuracy by mode, so a term you can recognise in MCQ but not produce
  in cloze shows as partially mastered with the gap named.
- **Rollups:** topic → chapter → course, shown as a simple heat strip on
  the home screen. Tap a chapter to see weakest concepts first.
- **Session builder:** "Study now" picks due concepts first, then
  weakest, then new, and chooses the mode per concept by what is
  weakest for it. The user can also pin a mode or a chapter.
- **Confusion tracking:** when an MCQ wrong answer is another concept,
  record the pair. Repeated pairs get a generated "compare and
  contrast" flashcard (overallocated vs underallocated, treasurer vs
  controller, value-added vs non-value-added).

## 5. Helpers, hints, tooltips

- **Hint ladder** on every item, three rungs, each costing a half grade:
  1. the chapter / topic and a one-word cue, 2. the plain-English
  restatement or the formula shape, 3. first letter(s) of the answer
  or one bucket pre-placed.
- **Term tooltips:** any key term appearing inside another item's text
  is tappable and opens its concept card in a bottom sheet. Phone
  friendly: tap, not hover.
- **"Why" after every answer:** the per-choice explanation for MCQ,
  the canonical definition for cloze, the rule for each misplaced card
  in sort. Always shown, never optional.
- **"Show me another":** swaps in a different variant of the same
  concept without affecting the schedule, for when the wording was the
  problem.
- **Worked examples** attached to formula concepts, with a v2
  "numbers mode" that regenerates the figures (overhead rate, applied
  overhead, over/under allocation) from a parameterised template.
  Chapters 3 and 4 are where this pays off.

## 6. Mobile-first UI

- One column, thumb zone controls, large tap targets, swipe gestures on
  flashcards (left = again, right = good, up = easy), drag-to-bucket on
  sort with the buckets fixed at the bottom of the screen.
- Four screens: **Home** (due count, heat strip, Study now), **Session**
  (one item at a time, progress bar, hint button, explanation sheet),
  **Browse** (chapter → concept list with mastery dots, concept card
  with all variants), **Stats** (streak, reviews per day, weakest 10).
- Dark mode by default, light mode respected via system preference.
- No accounts, no onboarding; opens straight into Home.

## 7. Build order

1. Scaffold the PWA, content schema, FSRS state, IndexedDB store,
   export / import.
2. Flashcards + Home + Browse, seeded by hand from the chapter 1 sheet
   to validate the loop on a phone.
3. Ingest script producing chapter 1, 3, 4 JSON from the uploaded docs;
   hand review the diff.
4. MCQ and cloze, with hint ladder, tooltips and explanations.
5. Sort and order modes.
6. Stats, confusion pairs, session builder tuning.
7. Numbers mode for formula concepts (v2); sync endpoint (v2).

## 8. Open items (defaults assumed unless told otherwise)

- Repo name and whether it is public. Default: private, own repo.
- Course scope beyond AC241. Default: schema supports many, content
  ships for AC241 only.
- Self-grading honesty on flashcards vs forcing typed answers. Default:
  self-grade for flashcards, typed for cloze.
