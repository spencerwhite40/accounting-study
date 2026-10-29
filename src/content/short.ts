import type { Concept } from "./types";

/** One plain line per term, spelled out. Used in flashcards and questions; the full definition stays in the term sheet. */
const SHORT: Record<string, string> = {
  "ch1.audit-committee": "Board group that oversees the audits and the outside accountants.",
  "ch1.board-of-directors": "Elected by shareholders to oversee the company's management.",
  "ch1.budget": "The plan written in numbers, used to judge results.",
  "ch1.management-accountant": "Accountant who serves managers inside the company, not outside investors.",
  "ch1.ceo": "Top executive who runs the company day to day for the board.",
  "ch1.cfo": "Executive who owns money, financial risk and financial reporting.",
  "ch1.coo": "Executive who runs operations: production, marketing and distribution.",
  "ch1.controller": "Chief accountant: financial reporting, managerial accounting and taxes.",
  "ch1.controlling": "Comparing actual results to the plan, then adjusting.",
  "ch1.cost-benefit-analysis": "Weighing what a plan costs against what it delivers.",
  "ch1.cross-functional-teams": "A team made of people from different departments.",
  "ch1.decision-making": "Choosing between alternatives. Part of every manager's job.",
  "ch1.directing": "Assigning tasks and resources to carry out the plan.",
  "ch1.erp": "One software system that connects every department's information.",
  "ch1.xbrl": "Tags on financial numbers so computers can read them.",
  "ch1.ifrs": "International accounting rules. US rules are moving toward them.",
  "ch1.ima": "Professional group for management accountants. Awards the CMA.",
  "ch1.internal-audit": "In-house team that tests the company's controls. Reports to the audit committee.",
  "ch1.jit": "Receive materials and finish goods only when needed.",
  "ch1.lean-production": "Producing with as little waste as possible.",
  "ch1.planning": "Setting goals and deciding how to reach them.",
  "ch1.sox": "Law after Enron: executives certify the numbers and audits become more independent.",
  "ch1.supply-chain-management": "Managing goods and information from supplier to customer.",
  "ch1.sustainability": "Meeting today's needs without harming future generations.",
  "ch1.throughput-time": "Time from raw materials to finished unit.",
  "ch1.treasurer": "Makes sure the company has enough cash and invests spare funds.",
  "ch1.tqm": "Continuously improving processes to delight customers.",

  "ch2.allocate": "Spread an indirect cost across cost objects using a basis.",
  "ch2.assign": "Attach costs to cost objects: trace direct costs, allocate indirect costs.",
  "ch2.average-cost": "Total cost divided by units produced.",
  "ch2.controllable-costs": "Costs a manager can change in the near term.",
  "ch2.conversion-costs": "Direct labor plus manufacturing overhead.",
  "ch2.cost-object": "Anything you want a separate cost for.",
  "ch2.cost-of-goods-manufactured": "Cost of the goods finished this period.",
  "ch2.cost-of-goods-sold": "Cost of the goods sold this period.",
  "ch2.differential-cost": "A cost that differs between the options.",
  "ch2.direct-cost": "A cost you can trace to the cost object.",
  "ch2.direct-labor": "Pay of workers who physically make the product.",
  "ch2.direct-material": "Materials you can trace to each unit.",
  "ch2.finished-goods-inventory": "Completed products waiting to be sold.",
  "ch2.fixed-cost": "A cost that stays the same as volume changes.",
  "ch2.indirect-cost": "Related to the cost object but not traceable, so it is allocated.",
  "ch2.indirect-labor": "Factory workers who do not build the product themselves.",
  "ch2.indirect-materials": "Factory materials too minor to trace to each unit.",
  "ch2.inventoriable-product-costs": "Direct materials, direct labor and manufacturing overhead, held as inventory until sold.",
  "ch2.manufacturing-overhead": "All factory costs except direct materials and direct labor.",
  "ch2.marginal-cost": "Extra cost of making one more unit.",
  "ch2.other-indirect-costs": "Plant depreciation, utilities, insurance and taxes.",
  "ch2.period-costs": "Selling and administrative costs, expensed when incurred.",
  "ch2.prime-costs": "Direct materials plus direct labor.",
  "ch2.raw-materials-inventory": "Materials bought but not yet used in production.",
  "ch2.research-and-development": "Creating new products and processes, the first step of the value chain.",
  "ch2.sunk-costs": "Money already spent. Never relevant to a decision.",
  "ch2.total-costs": "Every cost across the whole value chain.",
  "ch2.trace": "Assign a direct cost straight to the cost object that used it.",
  "ch2.value-chain": "Linked activities that add value, from research to customer service.",
  "ch2.variable-costs": "A cost that rises and falls with volume.",
  "ch2.work-in-process-inventory": "Partly finished products still in production.",
  "ch2.direct-materials-used": "Raw materials moved into production.",
  "ch2.total-manufacturing-costs": "Direct materials, direct labor and overhead added this period.",
  "ch2.gross-profit": "Sales minus cost of goods sold.",
  "ch2.operating-income": "Gross profit minus selling and administrative costs.",
  "ch2.total-cost-at-volume": "Fixed costs plus variable cost per unit times units.",

  "ch3.bill-of-materials": "List of every material needed to make a product.",
  "ch3.billing-rate": "Hourly rate charged to a customer: cost plus profit.",
  "ch3.cost-driver": "What causes a cost to occur.",
  "ch3.cost-plus-pricing": "Price set at cost plus a markup.",
  "ch3.job-cost-record": "One sheet collecting every cost of a single job.",
  "ch3.job-costing": "Tracking the cost of each custom job separately.",
  "ch3.labor-time-record": "Timesheet showing hours worked on each job.",
  "ch3.materials-requisition": "Form that pulls materials from storage and charges a job.",
  "ch3.overallocated-overhead": "More overhead applied than actually incurred. Credit balance left.",
  "ch3.predetermined-overhead-rate": "Estimated overhead divided by estimated activity, set before the year.",
  "ch3.process-costing": "Averaging costs over many identical units.",
  "ch3.production-schedule": "Plan of what to make and how many.",
  "ch3.purchase-order": "Order sent to a supplier authorizing a shipment.",
  "ch3.raw-materials-record": "Card tracking each material received, used and on hand.",
  "ch3.receiving-report": "Record of what actually arrived in a shipment.",
  "ch3.stock-inventory": "Items kept on hand to fill orders quickly.",
  "ch3.subsidiary-ledger": "Detail accounts that add up to one control account.",
  "ch3.underallocated-overhead": "Less overhead applied than actually incurred. Debit balance left.",
  "ch3.applied-overhead": "Overhead charged to jobs: rate times actual activity.",

  "ch4.activity-based-costing": "Overhead rate for each activity, so products pay for what they use.",
  "ch4.activity-based-management": "Using activity costs to manage and improve operations.",
  "ch4.appraisal-costs": "Cost of inspecting to catch defects before shipping.",
  "ch4.batch-level-activities": "Activities done once per batch, whatever its size.",
  "ch4.cost-distortion": "Some products overcosted, others undercosted.",
  "ch4.cost-of-quality-report": "Report of prevention, appraisal and failure costs.",
  "ch4.departmental-overhead-rates": "A separate overhead rate for each department.",
  "ch4.external-failure-costs": "Cost of defects found after the customer has the product.",
  "ch4.facility-level-activities": "Costs of keeping the company running, not tied to any product.",
  "ch4.internal-failure-costs": "Cost of defects found before shipping, like scrap and rework.",
  "ch4.lean-production": "Small batches, almost no inventory, built to order.",
  "ch4.non-value-added-activities": "Activities customers would not pay for.",
  "ch4.plantwide-overhead-rate": "One overhead rate for the entire plant.",
  "ch4.prevention-costs": "Spending to stop defects before they happen.",
  "ch4.product-level-costs": "Activities done once per product, whatever the volume.",
  "ch4.tqm": "Continuous improvement of quality in every process.",
  "ch4.unit-level-activities": "Activities done every time a unit is made.",
  "ch4.value-engineering": "Redesigning processes to remove waste and cut cost.",
  "ch4.value-added-activities": "Activities customers are willing to pay for.",
  "ch4.waste-activities": "Another name for non-value-added activities.",
};

export function shortOf(c: Concept): string {
  return SHORT[c.id.replace("ac241.", "")] ?? c.plain;
}
export function hasShort(c: Concept): boolean {
  return SHORT[c.id.replace("ac241.", "")] !== undefined;
}

/** Terms whose meaning is identical to another's, so they must never appear as each other's wrong answers. */
const SYNONYMS: string[][] = [["ch4.waste-activities", "ch4.non-value-added-activities"]];
export function sameMeaning(a: Concept, b: Concept): boolean {
  if (a.id === b.id) return true;
  const norm = (t: string) => t.replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase();
  if (norm(a.term) === norm(b.term)) return true;
  const ka = a.id.replace("ac241.", ""), kb = b.id.replace("ac241.", "");
  return SYNONYMS.some((g) => g.includes(ka) && g.includes(kb));
}
