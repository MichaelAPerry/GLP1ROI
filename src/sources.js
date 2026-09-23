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
    use: 'Joint replacement',
    finding: 'Class III obesity: 2.67× hazard of knee replacement vs. normal weight.',
    name: 'Prospective cohort, PMC',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7790262/',
  },
];
