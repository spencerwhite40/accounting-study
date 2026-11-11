import type { Chapter } from "./types";

/** Pick the number: a tiny problem with round figures, four tap answers, each wrong answer is a classic mistake. */
export interface Figure { q: string; ans: string; wrong: [text: string, why: string][]; how: string }
export interface FigTpl { id: string; chapter: Chapter; topic: string; name: string; make: (rng: () => number) => Figure }

type Rng = () => number;
const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)] as T;
const $ = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US")}`;
const sg = (n: number) => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US")}`;
const num = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US");
const pc = (n: number) => `${Math.round(n * 1000) / 10}%`;

export const FIGURES: FigTpl[] = [
  {
    id: "eup", chapter: 5, topic: "eup", name: "Equivalent units",
    make(r) {
      const out = pick(r, [8000, 12000, 20000, 30000]);
      const end = pick(r, [2000, 4000, 5000, 10000]);
      const p = pick(r, [20, 40, 50, 60]);
      const eq = (end * p) / 100;
      return {
        q: `${num(out)} units transferred out. ${num(end)} still in process, ${p}% complete. Equivalent units?`,
        ans: num(out + eq),
        wrong: [[num(out + end), "You counted unfinished units as whole."], [num(out), "You ignored the unfinished units."], [num(eq), "That is only the ending part."]],
        how: "Transferred out + (ending units × percent complete).",
      };
    },
  },
  {
    id: "cpeu", chapter: 5, topic: "method", name: "Cost per equivalent unit",
    make(r) {
      const e = pick(r, [10000, 20000, 25000, 40000]);
      const c = pick(r, [2, 3, 4, 5]);
      const total = e * c;
      const beg = pick(r, [0.1, 0.2, 0.25]) * total;
      const add = total - beg;
      return {
        q: `Beginning cost ${$(beg)}. Cost added ${$(add)}. Equivalent units ${num(e)}. Cost per equivalent unit?`,
        ans: $(c),
        wrong: [[$(add / e), "You left out the beginning cost."], [$(beg / e), "That uses the beginning cost only."], [$(total / (e / 2)), "You halved the units."]],
        how: "(Beginning cost + cost added) ÷ equivalent units.",
      };
    },
  },
  {
    id: "endcost", chapter: 5, topic: "steps", name: "Ending inventory cost",
    make(r) {
      const end = pick(r, [4000, 5000, 10000, 20000]);
      const p = pick(r, [20, 30, 40, 50]);
      const c = pick(r, [2, 3, 4]);
      const eq = (end * p) / 100;
      return {
        q: `Ending units ${num(end)}, ${p}% complete. Cost per equivalent unit ${$(c)}. Ending inventory cost?`,
        ans: $(eq * c),
        wrong: [[$(end * c), "You treated unfinished units as whole."], [$(((end * (100 - p)) / 100) * c), "You used the unfinished share."], [num(eq), "Units, not dollars."]],
        how: "Ending units × percent complete × cost per equivalent unit.",
      };
    },
  },
  {
    id: "units", chapter: 5, topic: "steps", name: "Units left in process",
    make(r) {
      const beg = pick(r, [5000, 10000, 15000]);
      const st = pick(r, [60000, 90000, 180000]);
      const out = beg + st - pick(r, [5000, 10000, 20000]);
      const end = beg + st - out;
      return {
        q: `Beginning ${num(beg)} units. Started ${num(st)}. Transferred out ${num(out)}. Units left in process?`,
        ans: num(end),
        wrong: [[num(st - out), "You left out the beginning units."], [num(beg + st + out), "You added instead of subtracting."], [num(out - beg), "That mixes the wrong amounts."]],
        how: "Beginning + started − transferred out.",
      };
    },
  },
  {
    id: "hl-rate", chapter: 6, topic: "highlow", name: "High-low variable rate",
    make(r) {
      const rate = pick(r, [3, 4, 5, 6, 8]);
      const F = pick(r, [20000, 30000, 40000]);
      const L = pick(r, [2000, 3000, 4000]);
      const H = L + pick(r, [4000, 6000, 8000]);
      const cL = F + rate * L, cH = F + rate * H;
      return {
        q: `Lowest month: ${num(L)} units, ${$(cL)}. Highest: ${num(H)} units, ${$(cH)}. Variable cost per unit?`,
        ans: $(rate),
        wrong: [[$(cH / H), "That is average cost, not the change."], [$((cH - cL) / (H + L)), "You added the units."], [$((H - L) / (cH - cL)), "You flipped it. Cost goes on top."]],
        how: "(High cost − low cost) ÷ (high units − low units).",
      };
    },
  },
  {
    id: "hl-fixed", chapter: 6, topic: "highlow", name: "High-low fixed cost",
    make(r) {
      const rate = pick(r, [3, 4, 5, 6, 8]);
      const F = pick(r, [20000, 30000, 40000]);
      const L = pick(r, [2000, 3000]);
      const H = L + pick(r, [4000, 6000, 8000]);
      const cL = F + rate * L, cH = F + rate * H;
      return {
        q: `Variable cost is ${$(rate)} per unit. High month: ${num(H)} units, ${$(cH)}. Low month: ${num(L)} units, ${$(cL)}. Fixed cost?`,
        ans: $(F),
        wrong: [[$(rate * H), "That is the variable part only."], [$(cH - rate * L), "You mixed the high cost with low units."], [$(cL), "That is the low month's total cost."]],
        how: "Total cost − (rate × units) at the same point.",
      };
    },
  },
  {
    id: "mixed", chapter: 6, topic: "mixed", name: "Mixed cost total",
    make(r) {
      const F = pick(r, [2500, 5000, 20000]);
      const b = pick(r, [2, 3, 5]);
      const X = pick(r, [1000, 2000, 4000]);
      return {
        q: `Fixed ${$(F)} plus ${$(b)} per unit. Cost at ${num(X)} units?`,
        ans: $(F + b * X),
        wrong: [[$(b * X), "You left out the fixed part."], [$((F + b) * X), "Fixed cost does not multiply."], [$(F * b + X), "That mixes the pieces."]],
        how: "Fixed + (rate × activity). Y = a + bX.",
      };
    },
  },
  {
    id: "fixed-unit", chapter: 6, topic: "fixed", name: "Fixed cost per unit",
    make(r) {
      const R = pick(r, [20000, 40000, 60000]);
      const u1 = pick(r, [1000, 2000]);
      const u2 = u1 * 2;
      return {
        q: `Rent ${$(R)} a month. Output rises from ${num(u1)} to ${num(u2)} units. New rent per unit?`,
        ans: $(R / u2),
        wrong: [[$(R / u1), "That is the old rate."], [$(R), "That is the total."], [$((R / u1) * 2), "Per-unit fixed cost falls, not rises."]],
        how: "Total fixed cost ÷ new units.",
      };
    },
  },
  {
    id: "cm-income", chapter: 6, topic: "statement", name: "Operating income",
    make(r) {
      const S = pick(r, [100000, 200000, 250000]);
      const V = S * pick(r, [0.5, 0.6, 0.4]);
      const F = pick(r, [0.2, 0.3]) * S;
      return {
        q: `Sales ${$(S)}. Variable costs ${$(V)}. Fixed costs ${$(F)}. Operating income?`,
        ans: $(S - V - F),
        wrong: [[$(S - V), "That is contribution margin. Fixed is still to subtract."], [$(S - F), "You skipped variable costs."], [$(S - V + F), "Fixed costs are subtracted, not added."]],
        how: "Sales − variable − fixed.",
      };
    },
  },
  {
    id: "cm-ratio", chapter: 7, topic: "margin", name: "Contribution margin ratio",
    make(r) {
      const S = pick(r, [200000, 250000, 400000, 500000]);
      const m = pick(r, [0.3, 0.4, 0.5, 0.25]);
      const V = S * (1 - m);
      return {
        q: `Sales ${$(S)}. Variable costs ${$(V)}. Contribution margin ratio?`,
        ans: pc(m),
        wrong: [[pc(1 - m), "That is the variable share."], [pc((S * m) / V), "You divided by variable cost."], [pc(m / 2), "No halving here."]],
        how: "(Sales − variable) ÷ sales.",
      };
    },
  },
  {
    id: "be-units", chapter: 7, topic: "breakeven", name: "Breakeven units",
    make(r) {
      const F = pick(r, [60000, 80000, 120000]);
      const cm = pick(r, [10, 20, 40]);
      const v = pick(r, [30, 60]);
      const p = v + cm;
      return {
        q: `Fixed costs ${$(F)}. Price ${$(p)}. Variable cost ${$(v)} per unit. Breakeven units?`,
        ans: num(F / cm),
        wrong: [[num(F / p), "You divided by price, not margin."], [num(F / v), "You divided by variable cost."], [num((F / cm) * p), "That is dollars, not units."]],
        how: "Fixed ÷ (price − variable cost per unit).",
      };
    },
  },
  {
    id: "be-dollars", chapter: 7, topic: "breakeven", name: "Breakeven dollars",
    make(r) {
      const F = pick(r, [60000, 80000, 120000]);
      const m = pick(r, [0.4, 0.5, 0.25, 0.2]);
      return {
        q: `Fixed costs ${$(F)}. Contribution margin ratio ${pc(m)}. Breakeven sales dollars?`,
        ans: $(F / m),
        wrong: [[$(F * m), "You multiplied. Divide by the ratio."], [$(F / (1 - m)), "You used the variable share."], [$(F), "That is fixed cost, before the ratio."]],
        how: "Fixed ÷ contribution margin ratio.",
      };
    },
  },
  {
    id: "target-units", chapter: 7, topic: "target", name: "Units for target profit",
    make(r) {
      const F = pick(r, [60000, 80000, 100000]);
      const P = pick(r, [20000, 40000, 70000]);
      const cm = pick(r, [10, 20, 40]);
      return {
        q: `Fixed ${$(F)}. Target profit ${$(P)}. Unit margin ${$(cm)}. Units needed?`,
        ans: num((F + P) / cm),
        wrong: [[num(F / cm), "That is breakeven. Add the profit."], [num(F / cm + P), "Profit goes before dividing."], [num((F - P) / cm), "Profit is added, not subtracted."]],
        how: "(Fixed + target profit) ÷ unit contribution margin.",
      };
    },
  },
  {
    id: "mos", chapter: 7, topic: "mos", name: "Margin of safety percent",
    make(r) {
      const S = pick(r, [500000, 400000, 200000]);
      const k = pick(r, [0.4, 0.5, 0.2, 0.25]);
      const BE = S * (1 - k);
      return {
        q: `Sales ${$(S)}. Breakeven sales ${$(BE)}. Margin of safety percent?`,
        ans: pc(k),
        wrong: [[pc(k / (1 - k)), "You divided by breakeven. Divide by sales."], [pc(1 - k), "That is breakeven as a share of sales."], [$(S * k), "Dollars, not a percent."]],
        how: "(Sales − breakeven) ÷ sales.",
      };
    },
  },
  {
    id: "dol", chapter: 7, topic: "leverage", name: "Degree of operating leverage",
    make(r) {
      const k = pick(r, [2, 3, 4, 5]);
      const OI = pick(r, [20000, 25000, 30000]);
      const CM = OI * k;
      return {
        q: `Contribution margin ${$(CM)}. Operating income ${$(OI)}. Degree of operating leverage?`,
        ans: `${k}`,
        wrong: [[`${Math.round((1 / k) * 100) / 100}`, "You flipped it. Margin goes on top."], [`${k + 1}`, "No extra one."], [`${k - 1}`, "That is fixed cost ÷ income."]],
        how: "Contribution margin ÷ operating income.",
      };
    },
  },
  {
    id: "op-change", chapter: 7, topic: "whatif", name: "Income change from sales",
    make(r) {
      const dS = pick(r, [50000, 100000, 150000]);
      const m = pick(r, [0.4, 0.5, 0.3, 0.25]);
      return {
        q: `Sales rise ${$(dS)}. Ratio ${pc(m)}. Fixed costs do not change. Income rises by?`,
        ans: $(dS * m),
        wrong: [[$(dS), "Variable costs rise too."], [$(dS * (1 - m)), "That is the variable share."], [$(dS / m), "Multiply by the ratio, do not divide."]],
        how: "Sales change × contribution margin ratio.",
      };
    },
  },
  {
    id: "adv", chapter: 7, topic: "whatif", name: "Advertising decision",
    make(r) {
      const A = pick(r, [8000, 10000, 20000]);
      const dS = pick(r, [40000, 50000, 80000]);
      const m = pick(r, [0.4, 0.5]);
      return {
        q: `Spend ${$(A)} more on ads. Sales rise ${$(dS)}. Ratio ${pc(m)}. Change in operating income?`,
        ans: sg(dS * m - A),
        wrong: [[sg(dS * m), "You forgot the added ad cost."], [sg(dS - A), "Use margin, not sales."], [sg(A - dS * m), "Sign flipped."]],
        how: "Sales change × ratio − added fixed cost.",
      };
    },
  },
  {
    id: "makebuy", chapter: 8, topic: "makebuy", name: "Relevant cost to make",
    make(r) {
      const a = pick(r, [10, 12, 15]);
      const b = pick(r, [3, 4, 5]);
      const c = pick(r, [1, 2, 3]);
      const d = pick(r, [3, 4, 5]);
      const e = pick(r, [2, 3]);
      return {
        q: `Per unit to make: materials ${$(a)}, labor ${$(b)}, variable overhead ${$(c)}, allocated overhead ${$(d)} (continues if bought), depreciation ${$(e)}. Relevant cost to make?`,
        ans: $(a + b + c),
        wrong: [[$(a + b + c + d), "Allocated overhead continues either way."], [$(a + b + c + d + e), "Depreciation is sunk, too."], [$(a + b), "Variable overhead is avoidable."]],
        how: "Only costs that go away if you buy.",
      };
    },
  },
  {
    id: "special", chapter: 8, topic: "special", name: "Special order income",
    make(r) {
      const n = pick(r, [100, 200, 500]);
      const p = pick(r, [60, 80, 100]);
      const v = p - pick(r, [10, 15, 20]);
      const f = pick(r, [10, 20]);
      const K = pick(r, [1000, 2000, 5000]);
      return {
        q: `${num(n)} units at ${$(p)}. Variable cost ${$(v)}. Fixed overhead ${$(f)} per unit (no change). One-time design ${$(K)}. Income from the order?`,
        ans: sg(n * (p - v) - K),
        wrong: [[sg(n * (p - v)), "You skipped the one-time design cost."], [sg(n * (p - v - f) - K), "Fixed overhead does not change."], [sg(n * p - K), "You skipped variable cost."]],
        how: "Units × (price − variable cost) − one-time cost.",
      };
    },
  },
  {
    id: "drop", chapter: 8, topic: "drop", name: "Drop a segment",
    make(r) {
      const c = pick(r, [20000, 30000, 40000]);
      const a = c + pick(r, [-5000, 5000, 10000, -10000]);
      const u = pick(r, [8000, 13000]);
      const d = a - c;
      return {
        q: `Segment contribution margin ${$(c)}. Avoidable fixed costs ${$(a)}. Unavoidable allocated costs ${$(u)}. Change in company income if dropped?`,
        ans: sg(d),
        wrong: [[sg(-d), "Sign flipped."], [sg(a - c - u), "Unavoidable costs stay either way."], [sg(-c), "You forgot the costs saved."]],
        how: "Avoidable fixed costs saved − contribution margin lost.",
      };
    },
  },
  {
    id: "further", chapter: 8, topic: "joint", name: "Process further",
    make(r) {
      const s0 = pick(r, [40, 100, 140]);
      const s1 = s0 + pick(r, [10, 50, 130]);
      const k = pick(r, [20, 50]);
      const j = pick(r, [24, 176]);
      return {
        q: `Sells for ${$(s0)} at split-off, ${$(s1)} after more work costing ${$(k)}. Joint cost ${$(j)}. Gain from processing further?`,
        ans: sg(s1 - s0 - k),
        wrong: [[sg(s1 - k), "Subtract the split-off value, too."], [sg(s1 - s0), "You skipped the processing cost."], [sg(s1 - s0 - k - j), "Joint cost is sunk."]],
        how: "Extra revenue − extra processing cost.",
      };
    },
  },
  {
    id: "constraint", chapter: 8, topic: "constraint", name: "Margin per scarce hour",
    make(r) {
      const h = pick(r, [2, 4, 5]);
      const mph = pick(r, [10, 12, 15]);
      const m = mph * h;
      return {
        q: `A product earns ${$(m)} margin per unit and uses ${h} machine hours. Margin per machine hour?`,
        ans: $(mph),
        wrong: [[$(m * h), "You multiplied. Divide."], [$(m), "That is per unit, not per hour."], [$(h / m), "You flipped it."]],
        how: "Unit margin ÷ constraint hours per unit.",
      };
    },
  },
  {
    id: "target-cost", chapter: 8, topic: "pricing", name: "Target cost",
    make(r) {
      const p = pick(r, [100, 120, 200, 250]);
      const m = pick(r, [0.2, 0.25]);
      return {
        q: `Customers will pay ${$(p)}. Desired profit is ${pc(m)} of price. Target cost?`,
        ans: $(p * (1 - m)),
        wrong: [[$(p * (1 + m)), "Profit comes off the price."], [$(p * m), "That is the profit itself."], [$(p / (1 + m)), "Profit is on price, not cost."]],
        how: "Target price − desired profit.",
      };
    },
  },
  {
    id: "cost-plus", chapter: 8, topic: "pricing", name: "Cost-plus price",
    make(r) {
      const c = pick(r, [40, 60, 80, 200]);
      const m = pick(r, [0.2, 0.25, 0.5]);
      return {
        q: `Cost is ${$(c)}. Markup ${pc(m)} on cost. Cost-plus price?`,
        ans: $(c * (1 + m)),
        wrong: [[$(c * m), "That is only the markup."], [$(c * (1 - m)), "Markup is added."], [$(c / (1 - m)), "Markup is on cost, not price."]],
        how: "Cost × (1 + markup).",
      };
    },
  },
  {
    id: "regression", chapter: 6, topic: "regression", name: "Cost from regression output",
    make(r) {
      const a = pick(r, [30000, 38900, 40000]);
      const b = pick(r, [4, 4.5, 5, 6]);
      const X = pick(r, [8000, 9000, 10000]);
      return {
        q: `Regression output: intercept ${$(a)}, X variable ${$(b)}. Predicted cost at ${num(X)} units?`,
        ans: $(a + b * X),
        wrong: [[$(b * X), "You left out the intercept, the fixed cost."], [$((a + b) * X), "The intercept is added once, not multiplied."], [$(a * b + X), "That mixes the pieces."]],
        how: "Intercept + (X coefficient × units).",
      };
    },
  },
  {
    id: "mix-be", chapter: 7, topic: "mix", name: "Multi-product breakeven",
    make(r) {
      const rA = pick(r, [0.4, 0.5, 0.6]);
      const rB = pick(r, [0.1, 0.2, 0.3]);
      const SA = 100000, SB = 300000;
      const overall = (rA * SA + rB * SB) / (SA + SB);
      const BE = pick(r, [200000, 400000]);
      const F = Math.round(overall * BE);
      return {
        q: `Product A: sales ${$(SA)}, contribution margin ${$(rA * SA)}. Product B: sales ${$(SB)}, contribution margin ${$(rB * SB)}. Fixed costs ${$(F)}. Breakeven sales?`,
        ans: $(F / overall),
        wrong: [[$(F / ((rA + rB) / 2)), "Do not average the two ratios. Weight by sales."], [$(F / rA), "That uses product A alone."], [$(F / rB), "That uses product B alone."]],
        how: "Fixed ÷ overall ratio, where overall ratio = total margin ÷ total sales.",
      };
    },
  },
  {
    id: "abc-rate", chapter: 4, topic: "steps", name: "Activity rate",
    make(r) {
      const rate = pick(r, [100, 150, 200, 250]);
      const n = pick(r, [300, 400, 500]);
      const H = pick(r, [10000, 20000, 30000]);
      const P = rate * n;
      return {
        q: `Setup cost pool ${$(P)}. ${num(n)} setups in total. ${num(H)} direct labor hours in total. Rate per setup?`,
        ans: $(rate),
        wrong: [[$(P / H), "That uses labor hours. Setups have their own driver."], [$(P / (n + H)), "You added two different drivers."], [$(P / (n * 2)), "You halved the usage."]],
        how: "Cost pool ÷ total usage of its own driver.",
      };
    },
  },
  {
    id: "abc-job", chapter: 4, topic: "steps", name: "Job overhead",
    make(r) {
      const r1 = pick(r, [100, 200, 250]);
      const r2 = pick(r, [30, 40, 50]);
      const u1 = pick(r, [4, 6, 12]);
      const u2 = pick(r, [10, 20, 30]);
      return {
        q: `Setup rate ${$(r1)} per setup. Inspection rate ${$(r2)} per inspection. The job needs ${u1} setups and ${u2} inspections. Overhead for the job?`,
        ans: $(r1 * u1 + r2 * u2),
        wrong: [[$(r1 * u1), "You left out inspections."], [$(r2 * u2), "You left out setups."], [$((r1 + r2) * (u1 + u2)), "Each rate goes with its own usage."]],
        how: "Add (rate × usage) for each activity.",
      };
    },
  },
  {
    id: "coq-pct", chapter: 9, topic: "coq", name: "Quality cost percent of sales",
    make(r) {
      const a = pick(r, [20000, 30000]);
      const b = pick(r, [30000, 40000]);
      const c = pick(r, [50000, 60000]);
      const d = pick(r, [80000, 100000]);
      const S = 1000000;
      return {
        q: `Prevention ${$(a)}, appraisal ${$(b)}, internal failure ${$(c)}, external failure ${$(d)}. Sales ${$(S)}. Quality cost as a percent of sales?`,
        ans: pc((a + b + c + d) / S),
        wrong: [[pc((c + d) / S), "That is failure costs only."], [pc((a + b) / S), "That is prevention and appraisal only."], [pc((a + b + c) / S), "You left out external failure."]],
        how: "All four categories added ÷ sales.",
      };
    },
  },
];

export const FIGURE_BY_ID = new Map(FIGURES.map((x) => [x.id, x]));
