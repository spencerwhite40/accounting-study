/**
 * Exam-style scenarios modelled on the ACC241 Exam 1 review activities:
 * a Reeder-style job-costing cost flow and a Placer-style ABC cost flow.
 * Every number is generated, every answer derived, so each run is a new problem.
 */
import type { CalcInstance, Unit } from "../content/types";
import type { Item } from "./items";

export interface JournalLine { account: string; amount: number }
export interface ScenarioContext { title: string; intro: string; lines: string[] }

export type ExamItem =
  | (Extract<Item, { kind: "calc" }> & { context: ScenarioContext })
  | { kind: "journal"; id: string; concept: string; context: ScenarioContext; text: string; debits: JournalLine[]; credits: JournalLine[]; accounts: string[]; explain: string };

const r = (rng: () => number, lo: number, hi: number, step = 1) => lo + Math.floor(rng() * ((hi - lo) / step + 1)) * step;
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function calcItem(id: string, concept: string, context: ScenarioContext, title: string, givens: { label: string; value: number; unit: Unit }[], question: string, answer: number, unit: Unit, formula: string, steps: string[], direction?: CalcInstance["direction"]): ExamItem {
  const inst: CalcInstance = {
    target: "exam",
    title,
    givens,
    question,
    answer: Math.round(answer * 100) / 100,
    unit,
    chain: [{ node: "exam", name: title, formula, inputs: steps.map((s) => ({ label: s, value: NaN, unit: "" as Unit, derived: false })), result: Math.round(answer * 100) / 100, unit, concept }],
    hidden: [],
  };
  if (direction) inst.direction = direction;
  return { kind: "calc", id, concept, title, inst, context };
}

const ACCOUNTS = ["Raw Materials", "Work in Process", "Manufacturing Overhead", "Finished Goods", "Cost of Goods Sold", "Accounts Payable", "Salaries and Wages Payable", "Wage and Salary Expense", "Prepaid Insurance", "Insurance Expense", "Advertising Expense", "Accumulated Depreciation", "Depreciation Expense", "Accounts Receivable", "Sales Revenue", "Cash", "Sales Commissions Expense", "Sales Travel Expense"];

function journal(id: string, concept: string, context: ScenarioContext, text: string, debits: JournalLine[], credits: JournalLine[], explain: string): ExamItem {
  return { kind: "journal", id, concept, context, text, debits, credits, accounts: ACCOUNTS, explain };
}

/** Reeder-style job costing flow using direct labor COST as the allocation base. */
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
  const rate = r(rng, 125, 250, 25) / 100; // e.g. 1.5 = 150% of DL cost
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
  const under = actualMOH - applied; // positive = underapplied
  const adjCogs = cogs + under;
  const gm = sales - adjCogs;
  const sa = saWages + insSA + adv + depSA;
  const noi = gm - sa;

  const ctx: ScenarioContext = {
    title: "Job costing flow",
    intro: `Beginning balances: Raw Materials ${money(begRM)}, Work in Process ${money(begWIP)}, Finished Goods ${money(begFG)}. Overhead is applied using direct labor cost; the predetermined rate was based on estimated manufacturing overhead of ${money(estMOH)} and estimated direct labor cost of ${money(estDL)}.`,
    lines: [
      `a. Raw materials purchased on account, ${money(purch)}.`,
      `b. Raw materials issued to production, ${money(issued)}: ${money(dm)} direct and ${money(im)} indirect.`,
      `c. Employee services incurred, not yet paid: direct labor ${money(dl)}; indirect labor ${money(il)}; selling and administrative wages ${money(saWages)}.`,
      `d. Factory utility costs incurred, ${money(util)}.`,
      `e. Prepaid insurance of ${money(insTotal)} expired (${insPct}% factory, ${100 - insPct}% selling and administration).`,
      `f. Advertising costs incurred, ${money(adv)}.`,
      `g. Depreciation for the year: ${money(depF)} on factory assets, ${money(depSA)} on selling and administrative assets.`,
      `h. Manufacturing overhead applied to jobs.`,
      `i. Jobs costing ${money(cogm)} were completed and transferred to finished goods.`,
      `j. Sales for the year, all on credit, ${money(sales)}.`,
      `k. Goods sold had cost ${money(cogs)} to manufacture.`,
    ],
  };
  const g = (label: string, value: number, unit: Unit = "$") => ({ label, value, unit });
  const items: ExamItem[] = [
    calcItem("ex:job:rate", C + "predetermined-overhead-rate", ctx, "Predetermined overhead rate (% of direct labor cost)", [g("Estimated manufacturing overhead", estMOH), g("Estimated direct labor cost", estDL)], "What is the predetermined overhead rate, as a percentage of direct labor cost?", rate * 100, "%", "Estimated MOH ÷ Estimated direct labor cost", [`${money(estMOH)} ÷ ${money(estDL)} = ${rate} = ${rate * 100}% of DL cost`]),
    journal("ex:job:j-a", "ac241.ch2.raw-materials-inventory", ctx, ctx.lines[0] as string, [{ account: "Raw Materials", amount: purch }], [{ account: "Accounts Payable", amount: purch }], "Purchases go into Raw Materials (an asset) until used."),
    journal("ex:job:j-b", "ac241.ch2.indirect-materials", ctx, ctx.lines[1] as string, [{ account: "Work in Process", amount: dm }, { account: "Manufacturing Overhead", amount: im }], [{ account: "Raw Materials", amount: issued }], "Direct materials go to WIP; indirect materials go to Manufacturing Overhead. Raw Materials is credited for the total issued."),
    journal("ex:job:j-c", "ac241.ch2.indirect-labor", ctx, ctx.lines[2] as string, [{ account: "Work in Process", amount: dl }, { account: "Manufacturing Overhead", amount: il }, { account: "Wage and Salary Expense", amount: saWages }], [{ account: "Salaries and Wages Payable", amount: dl + il + saWages }], "Direct labor to WIP, indirect labor to overhead, and selling and admin wages straight to expense (a period cost)."),
    journal("ex:job:j-e", "ac241.ch2.period-costs", ctx, ctx.lines[4] as string, [{ account: "Manufacturing Overhead", amount: insF }, { account: "Insurance Expense", amount: insSA }], [{ account: "Prepaid Insurance", amount: insTotal }], "The factory share is overhead (product cost); the selling and admin share is a period expense."),
    journal("ex:job:j-g", "ac241.ch2.other-indirect-costs", ctx, ctx.lines[6] as string, [{ account: "Manufacturing Overhead", amount: depF }, { account: "Depreciation Expense", amount: depSA }], [{ account: "Accumulated Depreciation", amount: depF + depSA }], "Factory depreciation is overhead; office depreciation is a period expense."),
    calcItem("ex:job:applied", C + "applied-overhead", ctx, "Manufacturing overhead applied", [g("Predetermined rate (% of DL cost)", rate * 100, "%"), g("Actual direct labor cost", dl)], "How much manufacturing overhead was applied to jobs (entry h)?", applied, "$", "Rate × actual direct labor cost", [`${rate * 100}% × ${money(dl)} = ${money(applied)}`]),
    journal("ex:job:j-h", C + "applied-overhead", ctx, `h. Manufacturing overhead applied to jobs: ${money(applied)}.`, [{ account: "Work in Process", amount: applied }], [{ account: "Manufacturing Overhead", amount: applied }], "Applying overhead moves cost out of the MOH account into WIP."),
    journal("ex:job:j-i", "ac241.ch2.finished-goods-inventory", ctx, ctx.lines[8] as string, [{ account: "Finished Goods", amount: cogm }], [{ account: "Work in Process", amount: cogm }], "Completed jobs move from WIP to Finished Goods at their job-cost-sheet cost."),
    journal("ex:job:j-k", "ac241.ch2.cost-of-goods-sold", ctx, `${ctx.lines[9]} ${ctx.lines[10]} Record the cost side of the sale.`, [{ account: "Cost of Goods Sold", amount: cogs }], [{ account: "Finished Goods", amount: cogs }], "Two entries record a sale: AR/Sales for the price, and COGS/Finished Goods for the cost. This is the cost entry."),
    calcItem("ex:job:actual", "ac241.ch2.manufacturing-overhead", ctx, "Actual manufacturing overhead incurred", [g("Indirect materials", im), g("Indirect labor", il), g("Factory utilities", util), g("Factory insurance", insF), g("Factory depreciation", depF)], "What total was debited to Manufacturing Overhead during the year (actual overhead)?", actualMOH, "$", "Indirect materials + indirect labor + factory utilities + factory insurance + factory depreciation", [`${money(im)} + ${money(il)} + ${money(util)} + ${money(insF)} + ${money(depF)} = ${money(actualMOH)}`]),
    calcItem("ex:job:overunder", C + "underallocated-overhead", ctx, "Over- or under-applied overhead", [g("Actual manufacturing overhead", actualMOH), g("Overhead applied", applied)], "By how much is overhead over- or under-applied, and which is it?", Math.abs(under), "$", "Actual overhead − Applied overhead (debit balance left = underapplied)", [`${money(actualMOH)} actual vs ${money(applied)} applied → ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"}`], { prompt: "Which is it?", options: ["Overapplied (credit balance left in MOH)", "Underapplied (debit balance left in MOH)"], answer: under > 0 ? 1 : 0 }),
    journal("ex:job:j-close", C + "underallocated-overhead", ctx, `Close the ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"} overhead to Cost of Goods Sold.`, under > 0 ? [{ account: "Cost of Goods Sold", amount: under }] : [{ account: "Manufacturing Overhead", amount: -under }], under > 0 ? [{ account: "Manufacturing Overhead", amount: under }] : [{ account: "Cost of Goods Sold", amount: -under }], under > 0 ? "Underapplied: debit COGS (raising it), credit MOH to zero it out." : "Overapplied: debit MOH to zero it out, credit COGS (lowering it)."),
    calcItem("ex:job:endrm", "ac241.ch2.raw-materials-inventory", ctx, "Ending raw materials balance", [g("Beginning raw materials", begRM), g("Purchases", purch), g("Raw materials issued to production", issued)], "What is the ending balance in Raw Materials?", endRM, "$", "Beginning + purchases − issued (direct and indirect)", [`${money(begRM)} + ${money(purch)} − ${money(issued)} = ${money(endRM)}`]),
    calcItem("ex:job:dm", "ac241.ch2.direct-materials-used", ctx, "Direct materials used", [g("Raw materials used in production", issued), g("Indirect materials", im)], "On the schedule of cost of goods manufactured, what is direct materials used?", dm, "$", "Raw materials used − indirect materials", [`${money(issued)} − ${money(im)} = ${money(dm)}`, "Indirect materials belong in overhead, not in direct materials."]),
    calcItem("ex:job:tmc", "ac241.ch2.total-manufacturing-costs", ctx, "Total manufacturing costs", [g("Direct materials used", dm), g("Direct labor", dl), g("Manufacturing overhead applied", applied)], "What are total manufacturing costs for the year on the COGM schedule?", tmc, "$", "DM used + DL + overhead APPLIED (not actual)", [`${money(dm)} + ${money(dl)} + ${money(applied)} = ${money(tmc)}`, "The schedule uses applied overhead; the variance is handled in COGS."]),
    calcItem("ex:job:endwip", "ac241.ch2.work-in-process-inventory", ctx, "Ending work in process balance", [g("Beginning work in process", begWIP), g("Total manufacturing costs", tmc), g("Cost of goods manufactured (completed)", cogm)], "What is the ending balance in Work in Process?", endWIP, "$", "Beginning WIP + total manufacturing costs − cost of goods manufactured", [`${money(begWIP)} + ${money(tmc)} − ${money(cogm)} = ${money(endWIP)}`]),
    calcItem("ex:job:endfg", "ac241.ch2.finished-goods-inventory", ctx, "Ending finished goods balance", [g("Beginning finished goods", begFG), g("Cost of goods manufactured", cogm), g("Cost of goods sold (unadjusted)", cogs)], "What is the ending balance in Finished Goods?", endFG, "$", "Beginning FG + COGM − unadjusted COGS", [`${money(begFG)} + ${money(cogm)} − ${money(cogs)} = ${money(endFG)}`]),
    calcItem("ex:job:adjcogs", C + "underallocated-overhead", ctx, "Adjusted cost of goods sold", [g("Unadjusted cost of goods sold", cogs), g(under > 0 ? "Underapplied overhead" : "Overapplied overhead", Math.abs(under))], "What is cost of goods sold after closing the overhead variance?", adjCogs, "$", "Unadjusted COGS + underapplied (or − overapplied)", [`${money(cogs)} ${under > 0 ? "+" : "−"} ${money(Math.abs(under))} = ${money(adjCogs)}`]),
    calcItem("ex:job:gm", "ac241.ch2.gross-profit", ctx, "Gross margin", [g("Sales", sales), g("Adjusted cost of goods sold", adjCogs)], "What is gross margin on the income statement?", gm, "$", "Sales − adjusted COGS", [`${money(sales)} − ${money(adjCogs)} = ${money(gm)}`]),
    calcItem("ex:job:noi", "ac241.ch2.operating-income", ctx, "Net operating income", [g("Gross margin", gm), g("Selling and administrative wages", saWages), g("Insurance expense (S&A share)", insSA), g("Advertising expense", adv), g("Depreciation expense (S&A)", depSA)], "What is net operating income?", noi, "$", "Gross margin − selling and administrative expenses (period costs only)", [`S&A = ${money(saWages)} + ${money(insSA)} + ${money(adv)} + ${money(depSA)} = ${money(sa)}`, `${money(gm)} − ${money(sa)} = ${money(noi)}`, "Factory costs never appear here; they went through inventory and COGS."]),
  ];
  return items;
}

/** Placer-style ABC flow: several activity rates, total applied, over/under, income statement. */
export function abcScenario(rng: () => number): ExamItem[] {
  const C4 = "ac241.ch4.";
  const pools = [
    { name: "Machining", measure: "machine-hours", unit: "MH", rate: r(rng, 120, 240, 10), exp: r(rng, 800, 1500, 50) },
    { name: "Purchase orders", measure: "number of orders", unit: "order", rate: r(rng, 100, 200, 10), exp: r(rng, 400, 800, 20) },
    { name: "Parts management", measure: "number of part types", unit: "part type", rate: r(rng, 150, 250, 10), exp: r(rng, 200, 400, 10) },
    { name: "Testing", measure: "number of tests", unit: "test", rate: r(rng, 400, 800, 50), exp: r(rng, 200, 300, 5) },
    { name: "General factory", measure: "direct labor-hours", unit: "DLH", rate: r(rng, 10, 20, 1), exp: r(rng, 15000, 25000, 500) },
  ].map((p) => ({ ...p, est: p.rate * p.exp, actual: Math.round(p.exp * (0.9 + rng() * 0.2) / 5) * 5 }));
  const totalEst = pools.reduce((a, p) => a + p.est, 0);
  const begRM = r(rng, 5, 20, 1) * 1000, begWIP = r(rng, 4, 20, 1) * 1000, begFG = r(rng, 8, 30, 1) * 1000;
  const purch = r(rng, 500, 700, 5) * 1000;
  const issued = Math.min(begRM + purch - r(rng, 2, 10, 1) * 1000, r(rng, 500, 700, 5) * 1000);
  const im = r(rng, 30, 60, 1) * 1000; const dm = issued - im;
  const dl = r(rng, 80, 120, 5) * 1000, il = r(rng, 250, 350, 5) * 1000, comm = r(rng, 60, 110, 5) * 1000, adminSal = r(rng, 200, 300, 5) * 1000;
  const travel = r(rng, 20, 50, 1) * 1000, otherOH = r(rng, 180, 280, 1) * 1000, adv = r(rng, 150, 220, 5) * 1000;
  const depF = r(rng, 180, 240, 5) * 1000, depSA = r(rng, 40, 80, 5) * 1000;
  const appliedByPool = pools.map((p) => p.rate * p.actual);
  const applied = appliedByPool.reduce((a, b) => a + b, 0);
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
  const ctx: ScenarioContext = {
    title: "ABC flow",
    intro: `ABC used for external reports. Beginning balances: Raw Materials ${money(begRM)}, Work in Process ${money(begWIP)}, Finished Goods ${money(begFG)}. Activity cost pools for the year: ` + pools.map((p) => `${p.name} (${p.measure}): estimated overhead ${money(p.est)}, expected activity ${p.exp.toLocaleString()} ${p.unit}s`).join("; ") + ".",
    lines: [
      `a. Raw materials purchased on account, ${money(purch)}.`,
      `b. Raw materials withdrawn for production, ${money(issued)} (${money(dm)} direct, ${money(im)} indirect).`,
      `c. Employee services: direct labor ${money(dl)}; indirect labor ${money(il)}; sales commissions ${money(comm)}; administrative salaries ${money(adminSal)}.`,
      `d. Sales travel costs, ${money(travel)}.`,
      `e. Various factory overhead costs, ${money(otherOH)}.`,
      `f. Advertising, ${money(adv)}.`,
      `g. Depreciation: ${money(depF)} factory, ${money(depSA)} selling and administrative.`,
      `h. Overhead applied. Actual activity: ` + pools.map((p) => `${p.name} ${p.actual.toLocaleString()} ${p.unit}s`).join(", ") + ".",
      `i. Goods completed, ${money(cogm)} per the ABC system.`,
      `j. Goods sold on account for ${money(sales)}; they cost ${money(cogs)} to manufacture.`,
    ],
  };
  const g = (label: string, value: number, unit: Unit = "$") => ({ label, value, unit });
  const p0 = pools[0] as (typeof pools)[number];
  const p3 = pools[3] as (typeof pools)[number];
  const items: ExamItem[] = [
    calcItem("ex:abc:rate0", C4 + "activity-based-costing", ctx, `Activity rate: ${p0.name}`, [g(`Estimated overhead, ${p0.name}`, p0.est), g(`Expected ${p0.measure}`, p0.exp, "units")], `What is the activity rate for ${p0.name} (per ${p0.unit})?`, p0.rate, "$", "Estimated overhead for the pool ÷ expected activity for the pool", [`${money(p0.est)} ÷ ${p0.exp.toLocaleString()} = ${money(p0.rate)} per ${p0.unit}`]),
    calcItem("ex:abc:rate3", C4 + "activity-based-costing", ctx, `Activity rate: ${p3.name}`, [g(`Estimated overhead, ${p3.name}`, p3.est), g(`Expected ${p3.measure}`, p3.exp, "units")], `What is the activity rate for ${p3.name} (per ${p3.unit})?`, p3.rate, "$", "Estimated overhead for the pool ÷ expected activity for the pool", [`${money(p3.est)} ÷ ${p3.exp.toLocaleString()} = ${money(p3.rate)} per ${p3.unit}`]),
    journal("ex:abc:j-b", "ac241.ch2.indirect-materials", ctx, ctx.lines[1] as string, [{ account: "Work in Process", amount: dm }, { account: "Manufacturing Overhead", amount: im }], [{ account: "Raw Materials", amount: issued }], "Direct to WIP, indirect to overhead, Raw Materials credited for the total."),
    journal("ex:abc:j-c", "ac241.ch2.period-costs", ctx, ctx.lines[2] as string, [{ account: "Work in Process", amount: dl }, { account: "Manufacturing Overhead", amount: il }, { account: "Sales Commissions Expense", amount: comm }, { account: "Wage and Salary Expense", amount: adminSal }], [{ account: "Salaries and Wages Payable", amount: dl + il + comm + adminSal }], "Only direct labor touches WIP. Indirect labor is overhead. Commissions and admin salaries are period expenses."),
    calcItem("ex:abc:applied", C4 + "activity-based-costing", ctx, "Total manufacturing overhead applied", pools.map((p) => g(`${p.name}: rate ${money(p.rate)} per ${p.unit}, actual ${p.actual.toLocaleString()} ${p.unit}s`, p.rate * p.actual)), "What total overhead was applied to production (sum of all activity pools)?", applied, "$", "Σ (activity rate × actual activity) across every pool", [...pools.map((p, i) => `${p.name}: ${money(p.rate)} × ${p.actual.toLocaleString()} = ${money(appliedByPool[i] as number)}`), `Total applied = ${money(applied)}`]),
    journal("ex:abc:j-h", "ac241.ch3.applied-overhead", ctx, `h. Overhead applied to production: ${money(applied)}.`, [{ account: "Work in Process", amount: applied }], [{ account: "Manufacturing Overhead", amount: applied }], "Same entry as job costing: the total of all activity pools moves from MOH into WIP."),
    calcItem("ex:abc:actual", "ac241.ch2.manufacturing-overhead", ctx, "Actual manufacturing overhead", [g("Indirect materials", im), g("Indirect labor", il), g("Various factory overhead", otherOH), g("Factory depreciation", depF)], "What is actual manufacturing overhead for the year?", actualMOH, "$", "All debits to Manufacturing Overhead: indirect materials + indirect labor + other factory overhead + factory depreciation", [`${money(im)} + ${money(il)} + ${money(otherOH)} + ${money(depF)} = ${money(actualMOH)}`, "Sales travel, advertising, commissions and office depreciation are period costs."]),
    calcItem("ex:abc:overunder", "ac241.ch3.underallocated-overhead", ctx, "Over- or under-applied overhead", [g("Actual manufacturing overhead", actualMOH), g("Total overhead applied", applied)], "By how much is overhead over- or under-applied, and which is it?", Math.abs(under), "$", "Actual − Applied", [`${money(actualMOH)} − ${money(applied)} = ${money(under)} → ${under > 0 ? "underapplied" : "overapplied"}`], { prompt: "Which is it?", options: ["Overapplied", "Underapplied"], answer: under > 0 ? 1 : 0 }),
    journal("ex:abc:j-close", "ac241.ch3.underallocated-overhead", ctx, `Close the ${money(Math.abs(under))} ${under > 0 ? "underapplied" : "overapplied"} overhead to Cost of Goods Sold.`, under > 0 ? [{ account: "Cost of Goods Sold", amount: under }] : [{ account: "Manufacturing Overhead", amount: -under }], under > 0 ? [{ account: "Manufacturing Overhead", amount: under }] : [{ account: "Cost of Goods Sold", amount: -under }], under > 0 ? "Underapplied raises COGS." : "Overapplied lowers COGS."),
    calcItem("ex:abc:endwip", "ac241.ch2.work-in-process-inventory", ctx, "Ending work in process", [g("Beginning work in process", begWIP), g("Direct materials", dm), g("Direct labor", dl), g("Overhead applied", applied), g("Goods completed", cogm)], "What is the ending balance in Work in Process?", begWIP + tmc - cogm, "$", "Beginning + DM + DL + applied OH − completed", [`${money(begWIP)} + ${money(dm)} + ${money(dl)} + ${money(applied)} − ${money(cogm)} = ${money(begWIP + tmc - cogm)}`]),
    calcItem("ex:abc:cogs", "ac241.ch2.cost-of-goods-sold", ctx, "Cost of goods sold on the income statement", [g("Cost of goods sold per job cost sheets", cogs), g(under > 0 ? "Underapplied overhead" : "Overapplied overhead", Math.abs(under))], "What cost of goods sold appears on the income statement?", adjCogs, "$", "Unadjusted COGS + underapplied / − overapplied", [`${money(cogs)} ${under > 0 ? "+" : "−"} ${money(Math.abs(under))} = ${money(adjCogs)}`]),
    calcItem("ex:abc:ni", "ac241.ch2.operating-income", ctx, "Net income", [g("Sales revenue", sales), g("Adjusted cost of goods sold", adjCogs), g("Administrative salaries", adminSal), g("Sales commissions", comm), g("Sales travel", travel), g("Advertising", adv), g("Depreciation (S&A)", depSA)], "What is net income for the year?", ni, "$", "Sales − adjusted COGS − selling and administrative expenses", [`Gross profit = ${money(sales)} − ${money(adjCogs)} = ${money(gp)}`, `S&A = ${money(sa)}`, `Net income = ${money(ni)}`]),
  ];
  return items;
}

export const SCENARIOS = [
  { id: "job", title: "Job costing flow", sub: "entries · T-accounts · over/under · COGM · income statement", make: jobCostingScenario },
  { id: "abc", title: "ABC flow", sub: "activity rates · total applied · over/under · net income", make: abcScenario },
];
