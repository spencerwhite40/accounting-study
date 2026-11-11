import type { Term } from "./types";
import { GUIDE_TERMS } from "./plays-guide";

/** Key terms from the course sheets (plus lecture terms), one plain line each. */
const BASE_TERMS: Term[] = [
  // Chapter 5
  { id: "equivalent-units", chapter: 5, term: "Equivalent units", line: "Partly finished units counted as whole finished units." },
  { id: "production-cost-report", chapter: 5, term: "Production cost report", line: "Department report of units, cost per equivalent unit and where the cost went." },
  { id: "transferred-in", chapter: 5, term: "Transferred-in costs", line: "Cost a product brings with it from earlier departments." },
  { id: "weighted-average", chapter: 5, term: "Weighted average method", line: "Averages beginning inventory cost with this period's cost per equivalent unit." },
  // Chapter 6
  { id: "absorption", chapter: 6, term: "Absorption costing", line: "All manufacturing costs, fixed and variable, go into product cost." },
  { id: "account-analysis", chapter: 6, term: "Account analysis", line: "Label each account fixed or variable using judgment." },
  { id: "committed", chapter: 6, term: "Committed fixed costs", line: "Hard-to-change fixed costs for buildings, equipment and structure." },
  { id: "cm", chapter: 6, term: "Contribution margin", line: "Sales minus variable costs." },
  { id: "cm-statement", chapter: 6, term: "Contribution margin income statement", line: "Income statement organized by cost behavior." },
  { id: "cost-behavior", chapter: 6, term: "Cost behavior", line: "How a cost responds when activity changes." },
  { id: "cost-equation", chapter: 6, term: "Cost equation", line: "A straight-line formula for a cost: fixed plus rate times activity." },
  { id: "curvilinear", chapter: 6, term: "Curvilinear costs", line: "Costs that change with volume at a changing rate, drawn as a curve." },
  { id: "discretionary", chapter: 6, term: "Discretionary costs", line: "Fixed costs management can change easily in the short run." },
  { id: "fixed", chapter: 6, term: "Fixed costs", line: "Costs that stay the same in total as volume changes." },
  { id: "high-low", chapter: 6, term: "High-low method", line: "Splits a mixed cost using the highest and lowest activity points." },
  { id: "mixed", chapter: 6, term: "Mixed cost", line: "A cost with both a fixed and a variable part." },
  { id: "regression", chapter: 6, term: "Regression analysis", line: "Statistical line of best fit using every data point." },
  { id: "relevant-range", chapter: 6, term: "Relevant range", line: "The activity band where cost behavior assumptions hold." },
  { id: "scatter", chapter: 6, term: "Scatter plot", line: "Plot of cost against activity used to estimate fixed and variable parts by eye." },
  { id: "step", chapter: 6, term: "Step costs", line: "Costs fixed over a small range, then jump to a new level." },
  { id: "outliers", chapter: 6, term: "Outliers", line: "Data points that do not fit the pattern of the rest." },
  { id: "variable", chapter: 6, term: "Variable costs", line: "Costs that change in total in proportion to volume." },
  { id: "variable-costing", chapter: 6, term: "Variable costing", line: "Only variable manufacturing costs go into product cost." },
  // Chapter 7
  { id: "breakeven", chapter: 7, term: "Breakeven point", line: "Sales level with no profit and no loss." },
  { id: "cm-unit", chapter: 7, term: "Contribution margin per unit", line: "Price minus the variable cost of one unit." },
  { id: "cm-ratio", chapter: 7, term: "Contribution margin ratio", line: "Contribution margin divided by sales." },
  { id: "cvp", chapter: 7, term: "Cost-volume-profit analysis", line: "How profit changes with price, volume, costs and mix." },
  { id: "mos", chapter: 7, term: "Margin of safety", line: "Sales above breakeven: how far sales can fall before a loss." },
  { id: "op-leverage", chapter: 7, term: "Operating leverage", line: "How strongly profit reacts to a change in sales." },
  { id: "dol", chapter: 7, term: "Degree of operating leverage", line: "Contribution margin divided by operating income." },
  { id: "sales-mix", chapter: 7, term: "Sales mix", line: "The proportion of total sales from each product." },
  { id: "sensitivity", chapter: 7, term: "Sensitivity analysis", line: "A what-if test of how results change if assumptions change." },
  // Chapter 8
  { id: "constraint", chapter: 8, term: "Constraint", line: "Anything that limits what a company can do, like machine time." },
  { id: "cost-plus", chapter: 8, term: "Cost-plus pricing", line: "Price set at cost plus a markup." },
  { id: "opportunity", chapter: 8, term: "Opportunity cost", line: "The benefit given up by choosing one option over another." },
  { id: "outsourcing", chapter: 8, term: "Outsourcing", line: "Buying a product or service instead of making it in-house." },
  { id: "relevant-info", chapter: 8, term: "Relevant information", line: "Future costs and revenues that differ among options." },
  { id: "sunk", chapter: 8, term: "Sunk cost", line: "A cost already incurred that no decision can change." },
  { id: "target-costing", chapter: 8, term: "Target costing", line: "Market price minus desired profit sets the allowed cost." },
  { id: "differential", chapter: 8, term: "Differential cost", line: "The difference in cost between two alternatives." },
  { id: "avoidable", chapter: 8, term: "Avoidable cost", line: "A cost that disappears if you choose one alternative." },
  { id: "joint-products", chapter: 8, term: "Joint products", line: "Products made from the same input." },
  { id: "split-off", chapter: 8, term: "Split-off point", line: "Where joint products become separate products." },
  { id: "joint-costs", chapter: 8, term: "Joint costs", line: "Costs incurred before the split-off point." },
  { id: "special-order", chapter: 8, term: "Special order", line: "A one-time sale outside normal business." },
  { id: "segment-margin", chapter: 8, term: "Segment margin", line: "A segment's margin after its own variable and traceable fixed costs." },
];

export const TERMS: Term[] = [...GUIDE_TERMS, ...BASE_TERMS];

export const TERM_BY_ID = new Map(TERMS.map((t) => [t.id, t]));
