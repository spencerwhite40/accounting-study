/**
 * Exam-style questions modelled on the ACC241 Exam 1 review activities.
 * One set of consistent numbers is generated per run, but every question
 * carries only the facts it needs, so each stands alone on a phone screen.
 */
import type { CalcInstance, Unit } from "../content/types";
import type { Item } from "./items";

export interface JournalLine { account: string; amount: number }
export type ExamItem =
  | Extract<Item, { kind: "calc" }>
  | Extract<Item, { kind: "journal" }>;

const r = (rng: () => number, lo: number, hi: number, step = 1) => lo + Math.floor(rng() * ((hi - lo) / step + 1)) * step;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const g = (label: string, value: number, unit: Unit = "$") => ({ label, value, unit });

function calcItem(id: string, concept: string, title: string, givens: { label: string; value: number; unit: Unit }[], question: string, answer: number, unit: Unit, formula: string, steps: string[], direction?: CalcInstance["direction"]): ExamItem {
  const rounded = Math.round(answer * 100) / 100;
  const inst: CalcInstance = {
    target: "exam",
    title,
    givens,
    question,
    answer: rounded,
    unit,
    chain: [{ node: "exam", name: title, formula, inputs: steps.map((s) => ({ label: s, value: NaN, unit: "" as Unit, derived: false })), result: rounded, unit, concept }],
    hidden: [],
  };
  if (direction) inst.direction = direction;
  return { kind: "calc", id, concept, title, inst, level: 0 };
}

const ACCOUNTS = ["Raw Materials", "Work in Process", "Manufacturing Overhead", "Finished Goods", "Cost of Goods Sold", "Accounts Payable", "Salaries and Wages Payable", "Wage and Salary Expense", "Prepaid Insurance", "Insurance Expense", "Advertising Expense", "Accumulated Depreciation", "Depreciation Expense", "Accounts Receivable", "Sales Revenue", "Sales Commissions Expense"];

function journal(id: string, concept: string, text: string, debits: JournalLine[], credits: JournalLine[], explain: string): ExamItem {
  return { kind: "journal", id, concept, text, debits, credits, accounts: ACCOUNTS, explain };
}

/** Job costing, overhead applied as a percentage of direct labor cost. */
export function jobCostingScenario(rng: () => number): ExamItem[] {
  const C = "ac241.ch3.";
  const begRM = r(rng, 10, 60, 1) * 1000, begWIP = r(rng, 40, 120, 1) * 1000, begFG = r(rng, 20, 90, 1) * 1000;
  const purch = r(rng, 120, 260, 5) * 1000;
  const issued = Math.min(begRM + purch - r(rng, 5, 30, 1) * 1000, r(rng, 120, 260, 5) * 1000);
  const im = r(rng, 10, 40, 1) * 1000;
  const dm = issued - im;
  const dl = r(rng, 150, 260, 5) * 1000, il = r(rng, 50, 120, 5) * 1000, saWages = r(rng, 60, 140, 5) * 1000;
  const util = r(rng, 20, 60, 1) * 1000;
  const insTotal = r(rng, 10, 40, 1) * 1000; const insPct = r(rng, 60, 90, 10); const insF = Math.round(insTotal * insPct / 100); const insSA = insTotal - insF;
  const adv = r(rng, 50, 150, 5) * 1000;
  const depF = r(rng, 80, 200, 5) * 1000, depSA = r(rng, 10, 40, 1) * 1000;
  const rate = r(rng, 125, 250, 25) / 100;
  const estDL = r(rng, 150, 260, 5) * 1000; const estMOH = Math.round(estDL * rate);
  const applied = Math.round(rate * dl);
  const actualMOH = im + il + util + insF + depF;
  const tmc = dm + dl + applied;
  const cogm = Math.round((begWIP + tmc) * (0.8 + rng() * 0.12) / 1000) * 1000;
  const endWIP = begWIP + tmc - cogm;
  const cogs = Math.round((begFG + cogm) * (0.8 + rng() * 0.12) / 1000) * 1000;
  const endFG = begFG + cogm - cogs;
  const endRM = begRM + purch - issued;
  const sales = Math.round(cogs * (1.3 + rng() * 0.4) / 1000) * 1000;
  const under = actualMOH - applied;
  const adjCogs = cogs + under;
  const gm = sales - adjCogs;
  const sa = saWages + insSA + adv + depSA;
  const noi = gm - sa;
  const pct = rate * 100;

  return [
    journal("ex:job:j-a", "ac241.ch2.raw-materials-inventory", `Raw materials bought on account: ${money(purch)}.`, [{ account: "Raw Materials", amount: purch }], [{ account: "Accounts Payable", amount: purch }], "Purchases go into Raw Materials until they are used."),
    journal("ex:job:j-b", "ac241.ch2.indirect-materials", `Raw materials issued to production: ${money(issued)}. Direct ${money(dm)}, indirect ${money(im)}.`, [{ account: "Work in Process", amount: dm }, { account: "Manufacturing Overhead", amount: im }], [{ account: "Raw Materials", amount: issued }], "Direct materials go to Work in Process. Indirect materials go to Manufacturing Overhead. Raw Materials is credited for the total."),
    journal("ex:job:j-c", "ac241.ch2.indirect-labor", `Wages incurred, not yet paid: direct labor ${money(dl)}, indirect labor ${money(il)}, selling and administrative ${money(saWages)}.`, [{ account: "Work in Process", amount: dl }, { account: "Manufacturing Overhead", amount: il }, { account: "Wage and Salary Expense", amount: saWages }], [{ account: "Salaries and Wages Payable", amount: dl + il + saWages }], "Direct labor goes to Work in Process, indirect labor to overhead, and selling and administrative wages straight to expense."),
    journal("ex:job:j-e", "ac241.ch2.period-costs", `Prepaid insurance of ${money(insTotal)} expired. ${insPct}% factory, ${100 - insPct}% selling and administrative.`, [{ account: "Manufacturing Overhead", amount: insF }, { account: "Insurance Expense", amount: insSA }], [{ account: "Prepaid Insurance", amount: insTotal }], "The factory share is overhead, a product cost. The rest is an expense."),
    journal("ex:job:j-g", "ac241.ch2.other-indirect-costs", `Depreciation: ${money(depF)} on factory assets, ${money(depSA)} on office assets.`, [{ account: "Manufacturing Overhead", amount: depF }, { account: "Depreciation Expense", amount: depSA }], [{ account: "Accumulated Depreciation", amount: depF + depSA }], "Factory depreciation is overhead. Office depreciation is an expense."),
    calcItem("ex:job:rate", C + "predetermined-overhead-rate", "Overhead rate as a percent of direct labor cost", [g("Estimated manufacturing overhead", estMOH), g("Estimated direct labor cost", estDL)], "What is the predetermined overhead rate, as a percent of direct labor cost?", pct, "%", "Estimated manufacturing overhead ÷ Estimated direct labor cost", [`${money(estMOH)} ÷ ${money(estDL)} = ${rate} = ${pct}%`]),
    calcItem("ex:job:applied", C + "applied-overhead", "Overhead applied to jobs", [g("Overhead rate, percent of direct labor cost", pct, "%"), g("Actual direct labor cost", dl)], "How much overhead was applied to jobs?", applied, "$", "Rate × actual direct labor cost", [`${pct}% × ${money(dl)} = ${money(applied)}`]),
    journal("ex:job:j-h", C + "applied-overhead", `Overhead applied to jobs: ${money(applied)}.`, [{ account: "Work in Process", amount: applied }], [{ account: "Manufacturing Overhead", amount: applied }], "Applying overhead moves cost from the overhead account into Work in Process."),
    journal("ex:job:j-i", "ac241.ch2.finished-goods-inventory", `Jobs costing ${money(cogm)} were completed.`, [{ account: "Finished Goods", amount: cogm }], [{ account: "Work in Process", amount: cogm }], "Completed jobs move from Work in Process to Finished Goods."),
    journal("ex:job:j-k", "ac241.ch2.cost-of-goods-sold", `Goods that cost ${money(cogs)} to make were sold. Record the cost side.`, [{ account: "Cost of Goods Sold", amount: cogs }], [{ account: "Finished Goods", amount: cogs }], "A sale has two entries. This is the cost entry: cost of goods sold up, finished goods down."),
    calcItem("ex:job:actual", "ac241.ch2.manufacturing-overhead", "Actual manufacturing overhead", [g("Indirect materials", im), g("Indirect labor", il), g("Factory utilities", util), g("Factory insurance", insF), g("Factory depreciation", depF)], "What is actual manufacturing overhead for the year?", actualMOH, "$", "Add every factory cost that is not direct materials or direct labor", [`${money(im)} + ${money(il)} + ${money(util)} + ${money(insF)} + ${money(depF)} = ${money(actualMOH)}`]),
    calcItem("ex:job:overunder", C + "underallocated-overhead", "Over or under applied overhead", [g("Actual overhead", actualMOH), g("Applied overhead", applied)], "By how much is overhead over or under applied?", Math.abs(under), "$", "Actual overhead − Applied overhead. Debit balance left means underapplied.", [`${money(actualMOH)} actual vs ${money(applied)} applied: ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"}`], { prompt: "Which one?", options: ["Overapplied", "Underapplied"], answer: under > 0 ? 1 : 0 }),
    journal("ex:job:j-close", C + "underallocated-overhead", `Close the ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"} overhead.`, under > 0 ? [{ account: "Cost of Goods Sold", amount: under }] : [{ account: "Manufacturing Overhead", amount: -under }], under > 0 ? [{ account: "Manufacturing Overhead", amount: under }] : [{ account: "Cost of Goods Sold", amount: -under }], under > 0 ? "Underapplied raises cost of goods sold." : "Overapplied lowers cost of goods sold."),
    calcItem("ex:job:adjcogs", C + "underallocated-overhead", "Cost of goods sold after closing", [g("Cost of goods sold before closing", cogs), g(under > 0 ? "Underapplied overhead" : "Overapplied overhead", Math.abs(under))], "What is cost of goods sold after closing the overhead?", adjCogs, "$", "Cost of goods sold, plus underapplied or minus overapplied", [`${money(cogs)} ${under > 0 ? "+" : "−"} ${money(Math.abs(under))} = ${money(adjCogs)}`]),
    calcItem("ex:job:endrm", "ac241.ch2.raw-materials-inventory", "Ending raw materials", [g("Beginning raw materials", begRM), g("Purchases", purch), g("Issued to production", issued)], "What is the ending balance in Raw Materials?", endRM, "$", "Beginning + purchases − issued", [`${money(begRM)} + ${money(purch)} − ${money(issued)} = ${money(endRM)}`]),
    calcItem("ex:job:dm", "ac241.ch2.direct-materials-used", "Direct materials used", [g("Raw materials used in production", issued), g("Indirect materials", im)], "What are direct materials used?", dm, "$", "Raw materials used − indirect materials", [`${money(issued)} − ${money(im)} = ${money(dm)}`, "Indirect materials belong in overhead."]),
    calcItem("ex:job:tmc", "ac241.ch2.total-manufacturing-costs", "Total manufacturing costs", [g("Direct materials used", dm), g("Direct labor", dl), g("Overhead applied", applied)], "What are total manufacturing costs?", tmc, "$", "Direct materials + direct labor + overhead APPLIED", [`${money(dm)} + ${money(dl)} + ${money(applied)} = ${money(tmc)}`, "Use applied overhead here, not actual."]),
    calcItem("ex:job:endwip", "ac241.ch2.work-in-process-inventory", "Ending work in process", [g("Beginning work in process", begWIP), g("Total manufacturing costs", tmc), g("Cost of jobs completed", cogm)], "What is the ending balance in Work in Process?", endWIP, "$", "Beginning + total manufacturing costs − completed", [`${money(begWIP)} + ${money(tmc)} − ${money(cogm)} = ${money(endWIP)}`]),
    calcItem("ex:job:endfg", "ac241.ch2.finished-goods-inventory", "Ending finished goods", [g("Beginning finished goods", begFG), g("Cost of goods manufactured", cogm), g("Cost of goods sold before closing", cogs)], "What is the ending balance in Finished Goods?", endFG, "$", "Beginning + manufactured − sold", [`${money(begFG)} + ${money(cogm)} − ${money(cogs)} = ${money(endFG)}`]),
    calcItem("ex:job:gm", "ac241.ch2.gross-profit", "Gross margin", [g("Sales", sales), g("Cost of goods sold after closing", adjCogs)], "What is gross margin?", gm, "$", "Sales − cost of goods sold", [`${money(sales)} − ${money(adjCogs)} = ${money(gm)}`]),
    calcItem("ex:job:noi", "ac241.ch2.operating-income", "Net operating income", [g("Gross margin", gm), g("Selling and administrative wages", saWages), g("Insurance expense", insSA), g("Advertising", adv), g("Office depreciation", depSA)], "What is net operating income?", noi, "$", "Gross margin − selling and administrative expenses", [`Expenses: ${money(saWages)} + ${money(insSA)} + ${money(adv)} + ${money(depSA)} = ${money(sa)}`, `${money(gm)} − ${money(sa)} = ${money(noi)}`, "Factory costs never appear here."]),
  ];
}

/** Activity-based costing with three activity pools. */
export function abcScenario(rng: () => number): ExamItem[] {
  const C4 = "ac241.ch4.";
  const pools = [
    { name: "Machining", unit: "machine hour", rate: r(rng, 120, 240, 10), exp: r(rng, 800, 1500, 50) },
    { name: "Purchase orders", unit: "order", rate: r(rng, 100, 200, 10), exp: r(rng, 400, 800, 20) },
    { name: "Testing", unit: "test", rate: r(rng, 400, 800, 50), exp: r(rng, 200, 300, 5) },
  ].map((p) => ({ ...p, est: p.rate * p.exp, actual: Math.round(p.exp * (0.9 + rng() * 0.2) / 5) * 5 }));
  const begWIP = r(rng, 4, 20, 1) * 1000, begFG = r(rng, 8, 30, 1) * 1000;
  const purch = r(rng, 500, 700, 5) * 1000;
  const issued = r(rng, 450, 600, 5) * 1000;
  const im = r(rng, 30, 60, 1) * 1000; const dm = issued - im;
  const dl = r(rng, 80, 120, 5) * 1000, il = r(rng, 250, 350, 5) * 1000, comm = r(rng, 60, 110, 5) * 1000, adminSal = r(rng, 200, 300, 5) * 1000;
  const travel = r(rng, 20, 50, 1) * 1000, otherOH = r(rng, 180, 280, 1) * 1000, adv = r(rng, 150, 220, 5) * 1000;
  const depF = r(rng, 180, 240, 5) * 1000, depSA = r(rng, 40, 80, 5) * 1000;
  const applied = pools.reduce((a, p) => a + p.rate * p.actual, 0);
  const actualMOH = im + il + otherOH + depF;
  const tmc = dm + dl + applied;
  const cogm = Math.round((begWIP + tmc) * (0.85 + rng() * 0.1) / 1000) * 1000;
  const cogs = Math.round((begFG + cogm) * (0.85 + rng() * 0.1) / 1000) * 1000;
  const sales = Math.round(cogs * (1.35 + rng() * 0.3) / 1000) * 1000;
  const under = actualMOH - applied;
  const adjCogs = cogs + under;
  const gp = sales - adjCogs;
  const sa = adminSal + comm + travel + adv + depSA;
  const ni = gp - sa;
  const [p0, p1, p2] = pools as [(typeof pools)[number], (typeof pools)[number], (typeof pools)[number]];
  void purch; void p1;
  return [
    calcItem("ex:abc:rate0", C4 + "activity-based-costing", `Activity rate: ${p0.name}`, [g(`Estimated ${p0.name.toLowerCase()} overhead`, p0.est), g(`Expected ${p0.unit}s`, p0.exp, "units")], `What is the activity rate for ${p0.name.toLowerCase()}, per ${p0.unit}?`, p0.rate, "$", "Estimated overhead for the activity ÷ expected activity", [`${money(p0.est)} ÷ ${p0.exp.toLocaleString()} = ${money(p0.rate)} per ${p0.unit}`]),
    calcItem("ex:abc:rate2", C4 + "activity-based-costing", `Activity rate: ${p2.name}`, [g(`Estimated ${p2.name.toLowerCase()} overhead`, p2.est), g(`Expected ${p2.unit}s`, p2.exp, "units")], `What is the activity rate for ${p2.name.toLowerCase()}, per ${p2.unit}?`, p2.rate, "$", "Estimated overhead for the activity ÷ expected activity", [`${money(p2.est)} ÷ ${p2.exp.toLocaleString()} = ${money(p2.rate)} per ${p2.unit}`]),
    journal("ex:abc:j-b", "ac241.ch2.indirect-materials", `Raw materials issued to production: ${money(issued)}. Direct ${money(dm)}, indirect ${money(im)}.`, [{ account: "Work in Process", amount: dm }, { account: "Manufacturing Overhead", amount: im }], [{ account: "Raw Materials", amount: issued }], "Direct goes to Work in Process, indirect to overhead. Raw Materials is credited for the total."),
    journal("ex:abc:j-c", "ac241.ch2.period-costs", `Wages incurred: direct labor ${money(dl)}, indirect labor ${money(il)}, sales commissions ${money(comm)}, administrative salaries ${money(adminSal)}.`, [{ account: "Work in Process", amount: dl }, { account: "Manufacturing Overhead", amount: il }, { account: "Sales Commissions Expense", amount: comm }, { account: "Wage and Salary Expense", amount: adminSal }], [{ account: "Salaries and Wages Payable", amount: dl + il + comm + adminSal }], "Only direct labor goes to Work in Process. Indirect labor is overhead. Commissions and administrative salaries are expenses."),
    calcItem("ex:abc:applied", C4 + "activity-based-costing", "Total overhead applied", pools.flatMap((p) => [g(`${p.name}: rate per ${p.unit}`, p.rate), g(`${p.name}: actual ${p.unit}s`, p.actual, "units")]), "What total overhead was applied?", applied, "$", "For each activity: rate × actual activity. Then add them up.", [...pools.map((p) => `${p.name}: ${money(p.rate)} × ${p.actual.toLocaleString()} = ${money(p.rate * p.actual)}`), `Total = ${money(applied)}`]),
    journal("ex:abc:j-h", "ac241.ch3.applied-overhead", `Overhead applied to production: ${money(applied)}.`, [{ account: "Work in Process", amount: applied }], [{ account: "Manufacturing Overhead", amount: applied }], "Same entry as job costing. The total of all activities moves into Work in Process."),
    calcItem("ex:abc:actual", "ac241.ch2.manufacturing-overhead", "Actual manufacturing overhead", [g("Indirect materials", im), g("Indirect labor", il), g("Other factory overhead", otherOH), g("Factory depreciation", depF)], "What is actual manufacturing overhead?", actualMOH, "$", "Add every factory cost that is not direct materials or direct labor", [`${money(im)} + ${money(il)} + ${money(otherOH)} + ${money(depF)} = ${money(actualMOH)}`, "Sales travel, advertising, commissions and office depreciation are not overhead."]),
    calcItem("ex:abc:overunder", "ac241.ch3.underallocated-overhead", "Over or under applied overhead", [g("Actual overhead", actualMOH), g("Applied overhead", applied)], "By how much is overhead over or under applied?", Math.abs(under), "$", "Actual overhead − Applied overhead", [`${money(actualMOH)} − ${money(applied)} = ${money(under)}: ${under > 0 ? "underapplied" : "overapplied"}`], { prompt: "Which one?", options: ["Overapplied", "Underapplied"], answer: under > 0 ? 1 : 0 }),
    journal("ex:abc:j-close", "ac241.ch3.underallocated-overhead", `Close the ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"} overhead.`, under > 0 ? [{ account: "Cost of Goods Sold", amount: under }] : [{ account: "Manufacturing Overhead", amount: -under }], under > 0 ? [{ account: "Manufacturing Overhead", amount: under }] : [{ account: "Cost of Goods Sold", amount: -under }], under > 0 ? "Underapplied raises cost of goods sold." : "Overapplied lowers cost of goods sold."),
    calcItem("ex:abc:endwip", "ac241.ch2.work-in-process-inventory", "Ending work in process", [g("Beginning work in process", begWIP), g("Direct materials", dm), g("Direct labor", dl), g("Overhead applied", applied), g("Goods completed", cogm)], "What is the ending balance in Work in Process?", begWIP + tmc - cogm, "$", "Beginning + direct materials + direct labor + applied overhead − completed", [`${money(begWIP)} + ${money(dm)} + ${money(dl)} + ${money(applied)} − ${money(cogm)} = ${money(begWIP + tmc - cogm)}`]),
    calcItem("ex:abc:cogs", "ac241.ch2.cost-of-goods-sold", "Cost of goods sold for the income statement", [g("Cost of goods sold before closing", cogs), g(under > 0 ? "Underapplied overhead" : "Overapplied overhead", Math.abs(under))], "What cost of goods sold goes on the income statement?", adjCogs, "$", "Cost of goods sold, plus underapplied or minus overapplied", [`${money(cogs)} ${under > 0 ? "+" : "−"} ${money(Math.abs(under))} = ${money(adjCogs)}`]),
    calcItem("ex:abc:ni", "ac241.ch2.operating-income", "Net income", [g("Sales", sales), g("Cost of goods sold after closing", adjCogs), g("Administrative salaries", adminSal), g("Sales commissions", comm), g("Sales travel", travel), g("Advertising", adv), g("Office depreciation", depSA)], "What is net income?", ni, "$", "Sales − cost of goods sold − selling and administrative expenses", [`Gross profit = ${money(sales)} − ${money(adjCogs)} = ${money(gp)}`, `Expenses = ${money(sa)}`, `Net income = ${money(ni)}`]),
  ];
}

export interface ExamPart { id: string; group: string; title: string; sub: string; make: (rng: () => number) => ExamItem[] }
const pick = (items: ExamItem[], ids: string[]) => ids.map((id) => items.find((x) => x.id === id)).filter((x): x is ExamItem => !!x);
export const EXAM_PARTS: ExamPart[] = [
  { id: "job-entries", group: "Job costing", title: "Journal entries", sub: "materials, wages, overhead, completion, sale", make: (rng) => pick(jobCostingScenario(rng), ["ex:job:j-a", "ex:job:j-b", "ex:job:j-c", "ex:job:j-e", "ex:job:j-g", "ex:job:j-h", "ex:job:j-i", "ex:job:j-k"]) },
  { id: "job-overhead", group: "Job costing", title: "Overhead", sub: "rate, applied, actual, over or under, closing", make: (rng) => pick(jobCostingScenario(rng), ["ex:job:rate", "ex:job:applied", "ex:job:actual", "ex:job:overunder", "ex:job:j-close", "ex:job:adjcogs"]) },
  { id: "job-balances", group: "Job costing", title: "Balances and statements", sub: "inventories, manufacturing costs, income", make: (rng) => pick(jobCostingScenario(rng), ["ex:job:endrm", "ex:job:dm", "ex:job:tmc", "ex:job:endwip", "ex:job:endfg", "ex:job:gm", "ex:job:noi"]) },
  { id: "abc-rates", group: "Activity-based costing", title: "Rates and entries", sub: "activity rates, materials, wages, applying overhead", make: (rng) => pick(abcScenario(rng), ["ex:abc:rate0", "ex:abc:rate2", "ex:abc:j-b", "ex:abc:j-c", "ex:abc:j-h"]) },
  { id: "abc-results", group: "Activity-based costing", title: "Overhead and results", sub: "total applied, over or under, net income", make: (rng) => pick(abcScenario(rng), ["ex:abc:applied", "ex:abc:actual", "ex:abc:overunder", "ex:abc:j-close", "ex:abc:endwip", "ex:abc:cogs", "ex:abc:ni"]) },
];
/** Everything, for mixing into ordinary sessions and for tests. */
export function allExamItems(rng: () => number): ExamItem[] {
  return [...jobCostingScenario(rng), ...abcScenario(rng)];
}
