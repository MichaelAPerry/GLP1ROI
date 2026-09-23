// Evidence behind the default values. Shown on the page so reviewers can audit them.
export const SOURCES = [
  {
    use: 'Net drug cost',
    finding:
      'Employer net cost of Wegovy after rebates ≈ $6,830/yr; Novo’s 2027 list-price cut is not expected to change net price.',
    name: 'WTW, Mar 2026',
    url: 'https://www.wtwco.com/en-us/insights/2026/03/novo-nordisks-glp-1-price-cut-why-employers-net-costs-may-not-actually-drop',
  },
  {
    use: 'Net drug cost',
    finding: 'Employer net price analysis after the Wegovy price cut.',
    name: 'Employer Coverage (Substack)',
    url: 'https://employercoverage.substack.com/p/what-the-wegovy-price-cut-means-for',
  },
  {
    use: 'Excess medical cost by class',
    finding:
      'Commercially insured employees: Class I +$1,775, Class II +$3,468, Class III +$11,481 per year vs. healthy weight (2018$; trended ~25% to 2026). Study sponsored by Novo Nordisk.',
    name: 'Milliman claims analysis',
    url: 'https://www.novonordiskworks.com/content/dam/nnw/resource-library/pdf/milliman-white-paper.pdf',
  },
  {
    use: 'Excess medical cost (cross-check)',
    finding: 'National estimate: obesity +$1,861/yr, severe obesity +$3,097/yr per adult (2019$, all payers and ages).',
    name: 'Ward et al., PLOS ONE 2021',
    url: 'https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0247307',
  },
  {
    use: 'Sick days',
    finding: 'Obesity adds 1.1–1.7 missed workdays per year; Class III accounts for a disproportionate share of cost.',
    name: 'Finkelstein et al., JOEM 2010',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20881629/',
  },
  {
    use: 'Persistence',
    finding: 'About one-third of commercially insured adults with obesity (no diabetes) remain on therapy at 1 year.',
    name: 'JMCP 2024 claims study',
    url: 'https://www.jmcp.org/doi/10.18553/jmcp.2024.23332',
  },
  {
    use: 'Persistence',
    finding: 'Persistence often below 60% at 12–24 months; after stopping, 49% were heavier within a year than at start.',
    name: 'Current Diabetes Reports 2026 review',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13477449/',
  },
  {
    use: 'Timing of medical offsets',
    finding:
      'Weight-loss GLP-1 users: medical cost growth 3 points lower at 18 months, 7 points lower with ≥80% adherence; 47% (women) and 26% (men) fewer cardiovascular hospitalizations.',
    name: 'Aon, Jan 2026',
    url: 'https://aon.mediaroom.com/2026-01-13-Aons-Latest-GLP-1-Research-Reveals-Long-Term-Employer-Cost-Savings-and-Significant-Reductions-in-Cancer-Risk-for-Women',
  },
  {
    use: 'Counterpoint',
    finding:
      'Across the commercial market, obesity GLP-1 coverage raises total spending: drug cost exceeds utilization savings in the near term.',
    name: 'PHTI employer report, Dec 2025',
    url: 'https://phti.org/wp-content/uploads/sites/3/2025/12/PHTI-Employer-Approaches-to-GLP-1-Coverage-Market-Trend-Report.pdf',
  },
  {
    use: 'Value for money',
    finding:
      'ICER final report (Dec 2025): $53,400–$69,300 per QALY; net price $6,829 vs. health-benefit price benchmark $9,100–$12,500 for injectable semaglutide.',
    name: 'ICER, Dec 2025',
    url: 'https://icer.org/pressreleases/institute-for-clinical-and-economic-review-publishes-final-evidence-report-on-treatments-for-obesity/',
  },
  {
    use: 'Generic timing',
    finding:
      'US semaglutide compound patent expires Dec 5, 2031; Canadian generics launched in 2026 at roughly 40–60% below brand.',
    name: 'Drug Discovery Trends',
    url: 'https://www.drugdiscoverytrends.com/canada-approves-generic-semaglutide-from-dr-reddys-a-g7-first-enabled-by-novo-nordisks-lapsed-cad250-patent/',
  },
  {
    use: 'Diabetes prevention',
    finding: 'Tirzepatide: 94% lower risk of progressing from prediabetes to type 2 diabetes over 176 weeks.',
    name: 'SURMOUNT-1, NEJM 2024',
    url: 'https://www.nejm.org/doi/abs/10.1056/NEJMoa2410819',
  },
  {
    use: 'Diabetes cost',
    finding: 'People with diabetes average $19,736 a year in medical costs, about $12,022 of it attributable to diabetes.',
    name: 'ADA, Diabetes Care 2024',
    url: 'https://diabetesjournals.org/care/article/47/1/26/153797/Economic-Costs-of-Diabetes-in-the-U-S-in-2022',
  },
  {
    use: 'Joint replacement',
    finding: 'Class III obesity: 2.67× hazard of knee replacement vs. normal weight.',
    name: 'Prospective cohort, PMC',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7790262/',
  },
];

// Provisions of the LVTEA–Lenape Technical School agreement (July 1, 2022 – June 30, 2027)
// that change the model. Page numbers are the contract's printed page numbers.
export const CONTRACT_POINTS = [
  {
    title: 'The district pays almost the whole premium',
    ref: 'App. B §1, p. 23',
    body: 'Employees contribute only $100–$300 a year toward the Highmark EPO. Nearly every dollar of GLP-1 cost, and every dollar of savings, lands on the district.',
  },
  {
    title: 'Members already share the drug cost',
    ref: 'App. D.1, p. 36',
    body: 'Brand drugs carry a $35 (formulary) or $50 (non-formulary) copay per 30-day supply. Members on a GLP-1 report paying $50 a month, so $600 a year that the plan does not pay.',
  },
  {
    title: 'Retiree health extends the payback window',
    ref: 'App. B §9, pp. 25–28',
    body: 'Early retirees (20+ years PSERS, 10 at Lenape) keep district-paid coverage for up to 10 years or until Medicare. Savings from weight loss keep accruing in those years; this incentive expires June 30, 2027 unless renewed.',
  },
  {
    title: 'Avoided sick days are partly paid back later',
    ref: 'Art. IX §1, p. 9; App. B §11, p. 28',
    body: '10 sick days a year accumulate without limit and are bought out at $135/day at retirement for 20+ year staff, so a sick day saved is not a full substitute-rate saving.',
  },
  {
    title: 'The contract is up for renewal',
    ref: 'Art. XVI, p. 16',
    body: 'The agreement runs to June 30, 2027. GLP-1 coverage criteria, the retiree incentive and plan design can all be settled in the successor contract.',
  },
  {
    title: 'A small group',
    ref: 'NCES',
    body: 'About 71 staff and 33 classroom teachers. A handful of members on therapy means the dollars are modest, and one avoided joint replacement ($40–60K) moves the result noticeably.',
  },
];
