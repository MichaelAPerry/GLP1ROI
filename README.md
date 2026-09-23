# GLP-1 Coverage ROI Calculator

An interactive model for district and union leadership weighing whether the district
health plan should keep covering GLP-1 medications for obesity. It compares cumulative
drug spend against the excess medical costs and substitute-teacher costs that untreated
obesity generates over an employee's tenure.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # writes one self-contained dist/index.html you can email or open offline
npm test         # unit tests for the actuarial model
```

## What's where

| File | Purpose |
|---|---|
| `src/model.js` | All the math: research defaults by obesity class, scenarios, cohort projection, break-even price. No UI code, so it can be audited on its own. |
| `src/App.jsx` | The dashboard (React, Tailwind, Recharts). |
| `src/sources.js` | Citations shown on the page for every default value. |
| `src/model.test.js` | Hand-checked tests of the model. |
| `glp1-coverage-roi.html` | Built single-file page, ready to upload to any static site. |

## Model in brief

- **One cohort** of members starts therapy in year 1. Drug spend follows the share still on
  therapy (year-1 persistence, then annual persistence). Members who stop get no lasting
  benefit credited.
- **Averted medical cost** = the class's excess cost × the share removed by the chosen weight
  loss (read off a BMI cost curve) × a causal-share discount. Benefits ramp in: 15% / 50% /
  80% / 100% in years 1–4.
- **Major events** (joint replacement, cardiac hospitalization, bariatric surgery) are an
  expected-value slice *of* the excess cost, reduced by the event-risk-reduction input, so
  nothing is counted twice.
- **Untreated weight gain**: without treatment BMI drifts up each year (default +0.2), so the
  averted cost grows over time. Starting BMI can be entered directly or from height and weight.
- **Generics**: the drug price steps down to a set share of brand in a chosen year (base case:
  40% in year 7, after the US semaglutide patent ends in December 2031).
- **Substitute savings** = sick days avoided × daily sub rate. These hit the district's
  operating budget, not the plan, and are reported separately.
- **Break-even net price** = the year-1 net annual drug price at which total savings equal
  total cost over the chosen tenure. This is the number to take into rebate negotiations.

These are planning estimates, not a certified actuarial opinion. Replace the defaults with the
plan's own claims, contracted net price and absence data before a final decision.
