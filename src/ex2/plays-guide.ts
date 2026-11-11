import type { Play, Term } from "./types";

/** Study-guide topics outside Chapters 5 to 8: activity-based costing, and lean and quality. */
export const GUIDE_PLAYS: Play[] = [
  {
    id: "p4-abc", chapter: 4, name: "Activity-based rate and job overhead",
    gist: "Cost pool ÷ total activity = rate. Rate × the job's activity = overhead for that job.",
    sees: [
      "Overhead is split into activities, each with its own cost pool.",
      "Setups cost $60,000 for 300 setups. How much goes to a job that needs 12 setups?",
      "A plant-wide rate is distorting product costs. Find activity-based costs.",
      "Compute the rate for inspections.",
    ],
    needs: ["Cost in each activity cost pool", "Total usage of that activity (the driver)", "How much of each activity the job uses"],
    steps: [
      "Pick the activities and estimate each cost pool",
      "Choose a driver and estimate its total usage",
      "Rate = pool cost ÷ total usage",
      "Job overhead = rate × the job's usage, added across activities",
    ],
    skip: ["Direct labor hours for every pool (each activity has its own driver)"],
    trap: "One rate per activity, each with its own driver. Not one plant-wide rate.",
    example: "$60,000 ÷ 300 setups = $200 a setup. 12 setups × $200 = $2,400.",
    gather: [{
      q: "Find the setup overhead for Job 7.",
      items: [
        ["Setup cost pool, $60,000", true],
        ["Total setups for the year, 300", true],
        ["Setups Job 7 needs, 12", true],
        ["Total direct labor hours of all jobs", false, "Setups have their own driver."],
        ["Selling price of Job 7", false, "Price is not part of overhead."],
      ],
    }],
    routes: [{
      goal: "Setup overhead assigned to a job",
      given: ["$60,000 setup cost", "300 setups in total", "The job needs 12 setups"],
      steps: ["Find the setup cost pool", "Find total setups (the driver)", "Pool ÷ total setups = rate per setup", "Rate × the job's setups"],
    }],
  },
  {
    id: "p4-hierarchy", chapter: 4, name: "Cost hierarchy level",
    gist: "Unit: every unit. Batch: every batch. Product: each product line. Facility: keeps the plant open.",
    sees: [
      "Setting up machines before each production run. Which level?",
      "Redesigning one product line. Which level?",
      "Plant manager salary and building depreciation. Which level?",
      "Direct materials used on each unit. Which level?",
    ],
    needs: ["What triggers the activity: a unit, a batch, a product, or just having the facility"],
    steps: [
      "Ask what triggers the activity",
      "Each unit made → unit level",
      "Each batch run → batch level",
      "Needed per product line → product level; just keeps the plant open → facility level",
    ],
    skip: ["The dollar amount (the level depends on what triggers it)"],
    trap: "Facility costs follow no product's activity, so spreading them is arbitrary.",
    example: "Setups → batch. Product design → product. Rent → facility.",
    gather: [{
      q: "Place inspecting every batch before shipment in the hierarchy.",
      items: [
        ["What triggers it: each batch", true],
        ["Whether it happens for every unit or batch", true],
        ["The cost amount", false, "The amount does not set the level."],
        ["Whether customers value it", false, "That is value-added, a different question."],
      ],
    }],
    routes: [{
      goal: "Place an activity in the cost hierarchy",
      given: ["Machine setup for each production run"],
      steps: ["Ask what triggers the activity", "Each unit? Unit level", "Each batch? Batch level", "Each product line or the whole plant? Product or facility level"],
    }],
  },
  {
    id: "p9-coq", chapter: 9, name: "Cost of quality category",
    gist: "Prevention and appraisal avoid failure. Internal failure is caught before shipping. External failure is after.",
    sees: [
      "Training workers to prevent defects. Which category?",
      "Inspecting finished units before they ship. Which category?",
      "Scrap and rework found at the factory. Which category?",
      "Warranty claims and returned goods. Which category?",
    ],
    needs: ["Is it spent to prevent defects, find them, or fix them?", "Was the defect found before or after the customer had it?"],
    steps: [
      "Spent before any defect exists → prevention",
      "Spent finding defects → appraisal",
      "Defect fixed before shipping → internal failure",
      "Defect reached the customer → external failure",
    ],
    skip: ["The amount spent"],
    trap: "Inspection finds defects, so it is appraisal. Rework fixes them, so it is failure.",
    example: "Training → prevention. Testing → appraisal. Scrap → internal. Warranty → external.",
    gather: [{
      q: "Classify rework on units caught before shipping.",
      items: [
        ["The defect was found before shipping", true],
        ["Money is spent fixing a defect that already exists", true],
        ["The customer complained", false, "That would be external failure."],
        ["Hours of employee training", false, "Training is prevention."],
      ],
    }],
    routes: [{
      goal: "Classify a quality cost",
      given: ["Warranty repairs after the sale"],
      steps: ["Was it spent before a defect existed? No", "Was it spent finding defects? No", "Did the defect reach the customer? Yes", "External failure"],
    }],
  },
];

export const GUIDE_TERMS: Term[] = [
  { id: "abc", chapter: 4, term: "Activity-based costing", line: "Assigns overhead using a separate rate for each activity." },
  { id: "activity-pool", chapter: 4, term: "Activity cost pool", line: "The total cost of one activity." },
  { id: "unit-level", chapter: 4, term: "Unit-level activity", line: "Done for every unit made, like using materials." },
  { id: "batch-level", chapter: 4, term: "Batch-level activity", line: "Done each time a batch is run, like a setup." },
  { id: "product-level", chapter: 4, term: "Product-level activity", line: "Needed for a product line no matter the volume, like design." },
  { id: "facility-level", chapter: 4, term: "Facility-level activity", line: "Keeps the whole plant running, like rent. Also called organization-sustaining." },
  { id: "abm", chapter: 4, term: "Activity-based management", line: "Using activity cost information to improve operations." },
  { id: "value-added", chapter: 4, term: "Value-added activity", line: "An activity a customer will pay for." },
  { id: "non-value-added", chapter: 4, term: "Non-value-added activity", line: "An activity that adds no value, like moving or waiting. Cut it." },
  { id: "lean", chapter: 9, term: "Lean production", line: "Making goods without waste, especially inventory waste." },
  { id: "jit", chapter: 9, term: "Just-in-time", line: "Produce and buy only what is needed, when it is needed." },
  { id: "cell", chapter: 9, term: "Manufacturing cell", line: "A self-contained group of machines and workers making one product family." },
  { id: "cross-training", chapter: 9, term: "Cross-training", line: "Teaching workers several tasks and machines." },
  { id: "tqm", chapter: 9, term: "Total quality management", line: "Company-wide effort to prevent defects and keep improving." },
  { id: "prevention", chapter: 9, term: "Prevention costs", line: "Spent to stop defects before they happen, like training." },
  { id: "appraisal", chapter: 9, term: "Appraisal costs", line: "Spent to find defects, like inspection and testing." },
  { id: "internal-failure", chapter: 9, term: "Internal failure costs", line: "Defects fixed before shipping, like scrap and rework." },
  { id: "external-failure", chapter: 9, term: "External failure costs", line: "Defects found after the customer has the product, like warranty claims." },
  { id: "coq-report", chapter: 9, term: "Cost of quality report", line: "Lists quality costs by category, often as a percent of sales." },
];
