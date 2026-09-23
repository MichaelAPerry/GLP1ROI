// Actuarial model for the GLP-1 obesity coverage ROI calculator.
// Pure functions only — no React — so the math can be unit-tested and audited.

// Research defaults by obesity class, in 2026 dollars.
// excessCost: Milliman commercial-claims excess cost vs. healthy-weight reference
//   (2018$: I $1,775 · II $3,468 · III $11,481), trended ~25% to 2026.
// eventProb / eventCost: annual probability and average allowed cost of a major
//   obesity-driven event (joint replacement, cardiovascular hospitalization,
//   bariatric surgery, diabetes onset complications). This is a SUBSET of
//   excessCost, not an addition to it — see projectCohort().
// sickDays: sick days avoided per year once weight loss is established
//   (Finkelstein et al.: obesity adds ~1.1–1.7 absent days/yr; more at Class III).
export const OBESITY_CLASSES = {
  I: {
    label: 'Class I Obesity (BMI 30–34.9)',
    short: 'Class I',
    bmi: 32.5,
    excessCost: 2200,
    eventProb: 0.008,
    eventCost: 42000,
    sickDays: 0.75,
  },
  II: {
    label: 'Class II Obesity (BMI 35–39.9)',
    short: 'Class II',
    bmi: 37.5,
    excessCost: 4300,
    eventProb: 0.013,
    eventCost: 48000,
    sickDays: 1.25,
  },
  III: {
    label: 'Class III Obesity (BMI 40+)',
    short: 'Class III',
    bmi: 44,
    excessCost: 14300,
    eventProb: 0.025,
    eventCost: 55000,
    sickDays: 2.0,
  },
};

// Excess-cost curve by BMI, anchored at healthy weight (BMI 25 → $0) and the class
// defaults above. Used only for its shape: how much of a member's excess cost goes
// away when their BMI falls by a given percentage.
const CURVE = [
  [25, 0],
  [32.5, 2200],
  [37.5, 4300],
  [44, 14300],
];

export function excessAtBmi(bmi) {
  if (bmi <= CURVE[0][0]) return 0;
  for (let i = 1; i < CURVE.length; i++) {
    const [x0, y0] = CURVE[i - 1];
    const [x1, y1] = CURVE[i];
    if (bmi <= x1) return y0 + ((bmi - x0) / (x1 - x0)) * (y1 - y0);
  }
  const [x0, y0] = CURVE[CURVE.length - 2];
  const [x1, y1] = CURVE[CURVE.length - 1];
  return y1 + ((bmi - x1) / (x1 - x0)) * (y1 - y0);
}

// Share of a class's excess medical cost averted by sustained weight loss.
// `realization` discounts the cross-sectional cost gap for damage weight loss
// can't undo (existing joint wear, established disease) and for selection bias.
export function avertedShareFor(obesityClass, weightLossPct, realizationPct) {
  const bmi = OBESITY_CLASSES[obesityClass].bmi;
  const after = excessAtBmi(bmi * (1 - weightLossPct / 100));
  return (1 - after / excessAtBmi(bmi)) * (realizationPct / 100);
}

// Share of the full benefit realized in each year on therapy. Weight loss plateaus
// around months 12–18, and claims studies (e.g. Aon 2025–26) show medical cost
// offsets appear in year 2+, not year 1.
export const BENEFIT_RAMP = [0.15, 0.5, 0.8, 1.0];
export const rampFor = (year) => BENEFIT_RAMP[Math.min(year, BENEFIT_RAMP.length) - 1];

export const SCENARIOS = {
  conservative: {
    label: 'Conservative',
    weightLoss: 10,
    realization: 60,
    eventReduction: 15,
    persistY1: 40,
    persistAnnual: 75,
    drugTrend: 0,
    medicalTrend: 5,
  },
  base: {
    label: 'Base case',
    weightLoss: 14,
    realization: 70,
    eventReduction: 20,
    persistY1: 50,
    persistAnnual: 80,
    drugTrend: -2,
    medicalTrend: 6,
  },
  optimistic: {
    label: 'With adherence program',
    weightLoss: 18,
    realization: 80,
    eventReduction: 25,
    persistY1: 65,
    persistAnnual: 85,
    drugTrend: -5,
    medicalTrend: 7,
  },
};

export function defaultInputs(obesityClass = 'II', scenario = 'base') {
  const c = OBESITY_CLASSES[obesityClass];
  return {
    obesityClass,
    scenario,
    // Sized for Lenape Technical School: ~71 staff (NCES), roughly 160 covered lives
    // with dependents, and a handful of members on therapy.
    members: 5,
    coveredLives: 160,
    tenure: 10,
    retireeYears: 0,
    drugCost: 6800,
    copayMonthly: 35,
    monitoringCost: 300,
    subRate: 120,
    sickDayPayout: 135,
    payoutEligible: 50,
    sickDays: c.sickDays,
    excessCost: c.excessCost,
    eventProb: c.eventProb * 100,
    eventCost: c.eventCost,
    wageTrend: 3,
    discountRate: 3,
    ...stripLabel(SCENARIOS[scenario]),
  };
}

function stripLabel({ label, ...rest }) {
  return rest;
}

// Projects one cohort of members who start therapy in year 1.
// The horizon is active tenure plus any years the member stays on the district plan
// as a retiree (LVTEA Early Retirement Incentive: up to 10 years or until Medicare).
// Substitute savings stop at retirement; drug cost and medical offsets continue.
// Returns one row per year with annual and cumulative figures (totals for `members`).
//
// Persistence: E(t) = share still on therapy at the end of year t.
//   Drug spend uses the average share on therapy during the year, (E(t-1)+E(t))/2.
//   Benefits accrue only to members still on therapy at year end — people who stop
//   regain most of the weight within a year, so no lasting benefit is credited.
// Medical offsets: excess cost is split into the expected catastrophic-event piece
//   (eventProb × eventCost) and the remaining routine excess utilization, so events
//   are never double counted.
export function projectCohort(inp) {
  const N = inp.members;
  const pct = (v) => v / 100;
  const avertedShare = avertedShareFor(inp.obesityClass, inp.weightLoss, inp.realization);
  const rows = [];
  let prevOn = 1;
  let cumDrug = 0;
  let cumMedical = 0;
  let cumSubs = 0;
  let npv = 0;
  let npvPlan = 0;

  const horizon = inp.tenure + (inp.retireeYears || 0);
  for (let t = 1; t <= horizon; t++) {
    const active = t <= inp.tenure;
    const onEnd = t === 1 ? pct(inp.persistY1) : prevOn * pct(inp.persistAnnual);
    const avgOn = (prevOn + onEnd) / 2;
    const ramp = rampFor(t);

    const medF = (1 + pct(inp.medicalTrend)) ** (t - 1);
    const drugF = (1 + pct(inp.drugTrend)) ** (t - 1);
    const wageF = (1 + pct(inp.wageTrend)) ** (t - 1);

    const eventExpected = pct(inp.eventProb) * inp.eventCost * medF;
    const routineExcess = Math.max(0, inp.excessCost * medF - eventExpected);

    const drugPrice = inp.drugCost * drugF;
    // Plan pays the net price less the member's brand copay.
    const planDrugPrice = Math.max(0, drugPrice - inp.copayMonthly * 12);
    const drug = N * avgOn * (planDrugPrice + inp.monitoringCost * medF);
    const benefitShare = N * onEnd * ramp;
    const avertedRoutine = benefitShare * routineExcess * avertedShare;
    const avertedEvents = benefitShare * eventExpected * pct(inp.eventReduction);
    const medical = avertedRoutine + avertedEvents;
    // A sick day not taken is banked; members who retire eligible are paid for it
    // ($135/day into a 403(b) under the LVTEA contract), which offsets the sub savings.
    const payoutOffset = inp.sickDayPayout * pct(inp.payoutEligible);
    const subs = active ? benefitShare * inp.sickDays * (inp.subRate * wageF - payoutOffset) : 0;

    cumDrug += drug;
    cumMedical += medical;
    cumSubs += subs;
    const disc = (1 + pct(inp.discountRate)) ** -(t - 0.5);
    npv += (medical + subs - drug) * disc;
    npvPlan += (medical - drug) * disc;

    rows.push({
      year: t,
      active,
      onTherapy: onEnd,
      avgOnTherapy: avgOn,
      drugUnits: N * avgOn * drugF, // drug spend per $1 of year-1 net price
      copayUnits: N * avgOn * inp.copayMonthly * 12,
      monitoring: N * avgOn * inp.monitoringCost * medF,
      drug,
      medical,
      avertedRoutine,
      avertedEvents,
      eventsAverted: benefitShare * pct(inp.eventProb) * pct(inp.eventReduction),
      subs,
      net: medical + subs - drug,
      cumDrug,
      cumMedical,
      cumTotal: cumMedical + cumSubs,
      cumSubs,
      cumNet: cumMedical + cumSubs - cumDrug,
      cumNetPlan: cumMedical - cumDrug,
    });
    prevOn = onEnd;
  }

  return { ...summarize(rows, inp, npv, npvPlan), avertedShare };
}

function summarize(rows, inp, npv, npvPlan) {
  const last = rows[rows.length - 1];
  const breakEvenTotal = rows.find((r) => r.cumTotal >= r.cumDrug)?.year ?? null;
  const breakEvenMedical = rows.find((r) => r.cumMedical >= r.cumDrug)?.year ?? null;
  const drugUnits = rows.reduce((s, r) => s + r.drugUnits, 0);
  const monitoring = rows.reduce((s, r) => s + r.monitoring, 0);
  const copays = rows.reduce((s, r) => s + r.copayUnits, 0);

  // Year-1 net annual drug price at which coverage exactly breaks even over the tenure.
  const priceToBreakEven = (savings) =>
    drugUnits > 0 ? Math.max(0, (savings - monitoring + copays) / drugUnits) : 0;

  // Cumulative probability that an untreated member has a major event over the horizon.
  const eventRiskOverTenure = 1 - (1 - inp.eventProb / 100) ** rows.length;
  const months = 12 * rows.length;

  return {
    rows,
    totals: {
      drug: last.cumDrug,
      medical: last.cumMedical,
      subs: last.cumSubs,
      averted: last.cumTotal,
      net: last.cumNet,
      netPlan: last.cumNetPlan,
      npv,
      npvPlan,
      roi: last.cumDrug > 0 ? last.cumTotal / last.cumDrug : 0,
      roiPlan: last.cumDrug > 0 ? last.cumMedical / last.cumDrug : 0,
      // Net cost spread across every covered life on the plan, per member per month.
      netCostPmpm: inp.coveredLives > 0 ? -last.cumNet / (inp.coveredLives * months) : 0,
      netCostPmpmPlan: inp.coveredLives > 0 ? -last.cumNetPlan / (inp.coveredLives * months) : 0,
    },
    breakEvenTotal,
    breakEvenMedical,
    breakEvenPrice: priceToBreakEven(last.cumTotal),
    breakEvenPricePlan: priceToBreakEven(last.cumMedical),
    eventRiskOverTenure,
    eventsAverted: rows.reduce((s, r) => s + r.eventsAverted, 0),
  };
}

// Runs the model for every obesity class with that class's research defaults,
// keeping all non-class assumptions (price, persistence, tenure…) from `inp`.
export function compareClasses(inp) {
  return Object.entries(OBESITY_CLASSES).map(([key, c]) => {
    const result = projectCohort({
      ...inp,
      obesityClass: key,
      excessCost: c.excessCost,
      eventProb: c.eventProb * 100,
      eventCost: c.eventCost,
      sickDays: c.sickDays,
    });
    return { key, ...c, ...result };
  });
}
