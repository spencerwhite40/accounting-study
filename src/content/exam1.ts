/** Exam 1 study guide topics mapped to the concepts that cover them, plus the official formula sheet. */
const c1 = (s: string) => `ac241.ch1.${s}`;
const c2 = (s: string) => `ac241.ch2.${s}`;
const c3 = (s: string) => `ac241.ch3.${s}`;
const c4 = (s: string) => `ac241.ch4.${s}`;

export interface GuideItem { id: string; text: string; concepts: string[] }
export interface GuideSection { title: string; items: GuideItem[] }

export const STUDY_GUIDE: GuideSection[] = [
  { title: "1. The role of management accounting", items: [
    { id: "1a", text: "The four primary responsibilities of a manager", concepts: [c1("planning"), c1("directing"), c1("controlling"), c1("decision-making")] },
    { id: "1b", text: "Management accounting vs financial accounting", concepts: [c1("management-accountant")] },
    { id: "1c", text: "Where management accountants sit in the org structure", concepts: [c1("ceo"), c1("cfo"), c1("coo"), c1("controller"), c1("treasurer"), c1("internal-audit"), c1("audit-committee"), c1("board-of-directors")] },
    { id: "1d", text: "Skills required of management accountants", concepts: [c1("management-accountant"), c1("cross-functional-teams")] },
    { id: "1e", text: "The role of the IMA", concepts: [c1("ima")] },
    { id: "1f", text: "Ethical decision-making framework", concepts: [c1("ima")] },
    { id: "1g", text: "Purpose and major provisions of Sarbanes-Oxley", concepts: [c1("sox"), c1("audit-committee")] },
  ] },
  { title: "2. Terminology and concepts", items: [
    { id: "2a", text: "Service, merchandising and manufacturing companies and their inventories", concepts: [c2("raw-materials-inventory"), c2("work-in-process-inventory"), c2("finished-goods-inventory")] },
    { id: "2b", text: "The value chain and its elements", concepts: [c2("value-chain"), c2("research-and-development")] },
    { id: "2c", text: "Cost objects, direct costs and indirect costs", concepts: [c2("cost-object"), c2("direct-cost"), c2("indirect-cost"), c2("trace"), c2("allocate")] },
    { id: "2d", text: "Inventoriable costs (DM, DL, MOH) vs period costs", concepts: [c2("inventoriable-product-costs"), c2("period-costs"), c2("direct-material"), c2("direct-labor"), c2("manufacturing-overhead")] },
    { id: "2e", text: "Prime costs vs conversion costs", concepts: [c2("prime-costs"), c2("conversion-costs")] },
    { id: "2f", text: "Controllable vs uncontrollable costs", concepts: [c2("controllable-costs")] },
    { id: "2g", text: "Relevant vs irrelevant costs", concepts: [c2("differential-cost"), c2("sunk-costs")] },
    { id: "2h", text: "Fixed vs variable costs", concepts: [c2("fixed-cost"), c2("variable-costs")] },
    { id: "2i", text: "Total and average costs as volume changes", concepts: [c2("total-cost-at-volume"), c2("average-cost"), c2("marginal-cost")] },
  ] },
  { title: "3. Job costing", items: [
    { id: "3a", text: "Process costing vs job costing", concepts: [c3("job-costing"), c3("process-costing")] },
    { id: "3b", text: "Inventory flow: raw materials → WIP → finished goods", concepts: [c2("raw-materials-inventory"), c2("work-in-process-inventory"), c2("finished-goods-inventory"), c2("cost-of-goods-manufactured"), c2("cost-of-goods-sold")] },
    { id: "3c", text: "Documents in a job cost system and how they are used", concepts: [c3("production-schedule"), c3("bill-of-materials"), c3("raw-materials-record"), c3("job-cost-record"), c3("materials-requisition"), c3("labor-time-record"), c3("purchase-order"), c3("receiving-report")] },
    { id: "3d", text: "Allocating manufacturing overhead to jobs", concepts: [c3("predetermined-overhead-rate"), c3("applied-overhead"), c3("cost-driver")] },
    { id: "3e", text: "Disposing of over/under-allocated overhead", concepts: [c3("underallocated-overhead"), c3("overallocated-overhead")] },
    { id: "3f", text: "Journal entries through the job-costing cycle", concepts: [c2("raw-materials-inventory"), c2("indirect-materials"), c2("indirect-labor"), c3("applied-overhead"), c2("finished-goods-inventory"), c2("cost-of-goods-sold"), c3("underallocated-overhead")] },
  ] },
  { title: "4. Activity-based costing", items: [
    { id: "4a", text: "Cost distortion under plantwide and departmental rates", concepts: [c4("cost-distortion"), c4("plantwide-overhead-rate"), c4("departmental-overhead-rates")] },
    { id: "4b", text: "Steps to compute and use activity rates", concepts: [c4("activity-based-costing")] },
    { id: "4c", text: "The cost hierarchy: unit, batch, product, facility", concepts: [c4("unit-level-activities"), c4("batch-level-activities"), c4("product-level-costs"), c4("facility-level-activities")] },
    { id: "4d", text: "Activity-based management", concepts: [c4("activity-based-management")] },
    { id: "4e", text: "Value-added vs non-value-added activities", concepts: [c4("value-added-activities"), c4("non-value-added-activities"), c4("value-engineering")] },
    { id: "4f", text: "Benefits of ABC / ABM and signs of cost distortion", concepts: [c4("activity-based-costing"), c4("cost-distortion")] },
  ] },
  { title: "5. Lean vs traditional production", items: [
    { id: "5a", text: "JIT, cells, cross-training, small batches, setups, quality, supply chain", concepts: [c4("lean-production"), c1("jit"), c1("supply-chain-management"), c1("lean-production")] },
  ] },
  { title: "6. Total quality management", items: [
    { id: "6a", text: "Cost of quality categories", concepts: [c4("prevention-costs"), c4("appraisal-costs"), c4("internal-failure-costs"), c4("external-failure-costs")] },
    { id: "6b", text: "Cost of quality reporting", concepts: [c4("cost-of-quality-report"), c4("tqm")] },
  ] },
];

/** The formula sheet provided inside Exam 1 as "Question 1". */
export const FORMULA_SHEET = [
  { title: "Chapter 2 · Schedule of Cost of Goods Manufactured", lines: [
    "Beginning work in process inventory (1)",
    "  Beginning raw materials + Purchases of raw materials = Available for use − Ending raw materials = Direct materials used (2)",
    "  Direct labor (3)",
    "  Manufacturing overhead (4)",
    "= Total manufacturing costs incurred during the year (2)+(3)+(4) = (5)",
    "Total manufacturing costs to account for (1)+(5)",
    "Less: Ending work in process inventory (6)",
    "= Cost of Goods Manufactured (1)+(5)−(6)",
  ] },
  { title: "Chapter 2 · Schedule of Cost of Goods Sold", lines: [
    "Beginning finished goods inventory (7)",
    "Add: Cost of goods manufactured (8)",
    "= Cost of goods available for sale (7)+(8) = (9)",
    "− Ending finished goods inventory (10)",
    "= Cost of Goods Sold (7)+(8)−(10)",
  ] },
  { title: "Chapter 3 · Job costing", lines: [
    "O/H rate = Estimated total manufacturing overhead costs ÷ Estimated total amount of allocable base",
    "Applied (allocated) OH = O/H rate × base incurred",
  ] },
  { title: "Chapter 4 · Activity-based costing", lines: [
    "Same as job costing, except you find the O/H rate for each activity or department using that activity's allocable base.",
    "Add the applied OH for all activities to arrive at total applied (allocated) OH.",
  ] },
];

/** How heavily Exam 1 leans on each concept (calculation-heavy topics score highest). */
const SECTION_WEIGHT: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 3, "5": 1, "6": 1.5 };
export const EXAM_WEIGHT: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const sec of STUDY_GUIDE) {
    const wgt = SECTION_WEIGHT[sec.title.charAt(0)] ?? 1;
    for (const it of sec.items) for (const id of it.concepts) out[id] = Math.max(out[id] ?? 0, wgt);
  }
  // the review-activity mechanics get an extra bump
  for (const id of ["ac241.ch3.predetermined-overhead-rate", "ac241.ch3.applied-overhead", "ac241.ch3.underallocated-overhead", "ac241.ch3.overallocated-overhead", "ac241.ch2.cost-of-goods-manufactured", "ac241.ch2.cost-of-goods-sold", "ac241.ch2.direct-materials-used", "ac241.ch2.total-manufacturing-costs", "ac241.ch2.work-in-process-inventory", "ac241.ch4.activity-based-costing", "ac241.ch2.manufacturing-overhead", "ac241.ch2.operating-income"]) out[id] = 4;
  return out;
})();
