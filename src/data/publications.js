// me: set in bold in author lists
// kinds: the groups, in page order, each with its BibTeX type
// entries, newest first in each group:
//   kind, year, title, authors, venue (HTML)
//   image: optional picture in public/images/ (4:3)
//   links: optional [{ label, href }]
//   reference: the citation after the title; none while under review
//   bibtex: fields besides title, author and year; none while under review
export const me = 'Azadda, R. D.';

export const kinds = [
  { id: 'articles', heading: 'Journal articles', short: 'Journal articles', bibtex: 'article' },
  { id: 'under-review', heading: 'Manuscripts under review', short: 'Under review' },
  { id: 'reports', heading: 'Reports', short: 'Reports', bibtex: 'techreport' },
  { id: 'presentations', heading: 'Presentations and posters', short: 'Presentations and posters', bibtex: 'misc' },
  { id: 'thesis', heading: 'Master’s thesis', short: 'Master’s thesis', bibtex: 'mastersthesis' },
];

export const entries = [
  {
    kind: 'articles',
    year: '2026',
    title: 'Health priorities for rural Alaska Native communities at the extremes of weather and climate change',
    authors: [
      'Hueffer, K.', 'Brinkman, T.', 'Robinson, H. D.', 'Joseph, V.', 'Chaliak, J. A.', 'John, S.', 'Clinton, M.', 'Shaw, J.',
      'Peter, T.', 'Bersamin, A.', 'Allen, J.', 'Azadda, R. D.', 'Grogan-Kaylor, A.', 'Lee, K.', 'Rasmus, S.',
    ],
    venue: '<i>BMC Medicine</i>, 2026.',
    image: '/images/publications/hueffer2026health.png',
    links: [
      { label: 'PDF', href: '/papers/hueffer2026health.pdf' },
      { label: 'DOI', href: 'https://doi.org/10.1186/s12916-026-05176-1' },
    ],
    reference: '<i>BMC Medicine</i>. https://doi.org/10.1186/s12916-026-05176-1',
    bibtex: { journal: 'BMC Medicine', doi: '10.1186/s12916-026-05176-1' },
  },
  {
    kind: 'under-review',
    year: '2026',
    title: 'Quantifying Uncertainty in Q Methodology: Bayesian Factor Analysis from an Exact Rank-Order Likelihood',
    authors: [
      'Azadda, R. D.', 'Agbi-Kaiser, H. O.', 'Robinson, H. D.', 'Lee, K.', 'AKE-ACE Team', 'Hueffer, K.', 'Peter, T.', 'Rasmus, S.',
    ],
    venue: 'Submitted to <i>Behavior Research Methods</i>, 2026.',
    image: '/images/publications/azadda2026quantifying.png',
  },
  {
    kind: 'reports',
    year: '2025',
    title: 'Recommendations to Reduce the Overrepresentation of Alaska Native People in the Criminal Justice System',
    authors: ['Alaska Federation of Natives'],
    venue: 'Final report to the Alaska Legislature, 2025.',
    image: '/images/publications/afn2025recommendations.png',
    links: [{ label: 'Report', href: 'https://www.legfin.akleg.gov/BudgetBackupDocuments/FY2027/LegReports/Report159.pdf' }],
    reference: 'Final report to the Alaska Legislature. https://www.legfin.akleg.gov/BudgetBackupDocuments/FY2027/LegReports/Report159.pdf',
    bibtex: {
      institution: 'Alaska Federation of Natives',
      type: 'Final report to the Alaska Legislature',
      url: 'https://www.legfin.akleg.gov/BudgetBackupDocuments/FY2027/LegReports/Report159.pdf',
    },
  },
  {
    kind: 'presentations',
    year: '2026',
    title: 'An adapted version of Q-methodology provides an in-depth understanding of the impact of climate change and health on rural Alaskan communities',
    authors: [
      'Robinson, H. D.', 'Hueffer, K.', 'Peter, T.', 'Brinkman, T.', 'Clinton, M.', 'Bersamin, A.', 'Charles, W.', 'Joseph, V.',
      'John, S.', 'Chaliak, A. J.', 'Azadda, R. D.', 'Allen, J.', 'Lee, K.', 'Grogan-Kaylor, A.', 'Rowles, F.', 'Rasmus, S.',
    ],
    venue: 'Poster, 2026 CEAL Annual Meeting.',
    image: '/images/publications/publication-5.jpg',
    links: [{ label: 'View poster', href: '/papers/robinson2026adapted.pdf' }],
    reference: '2026 CEAL Annual Meeting.',
    bibtex: { howpublished: 'Poster, 2026 CEAL Annual Meeting' },
  },
  {
    kind: 'presentations',
    year: '2026',
    title: 'The Qungasvik-Healthy Hearts Intervention: A culturally grounded and evidence-based intervention to support increased physical activity, a traditional Yup’ik diet, and social connection for Elders and youth in Alaska',
    authors: [
      'Rasmus, S.', 'Cueva, K.', 'Robinson, H. D.', 'Grogan-Kaylor, A.', 'O’Brien, D.', 'Bersamin, A.', 'Allen, J.',
      'Lee, K.', 'Azadda, R. D.', 'Chaliak, A. J.', 'Johnson, J.', 'Joe, J.', 'Rowles, F.', 'Shaw, J.',
    ],
    venue: 'Poster, 2026 CEAL Annual Meeting.',
    image: '/images/publications/publication-1.jpg',
    links: [{ label: 'View poster', href: '/papers/rasmus2026qungasvik.pdf' }],
    reference: '2026 CEAL Annual Meeting.',
    bibtex: { howpublished: 'Poster, 2026 CEAL Annual Meeting' },
  },
  {
    kind: 'thesis',
    year: '2025',
    title: 'Dynamic Pairwise Sparse Tuning (DPST) vs. Static two-predictor selection: a neural network approach',
    authors: ['Azadda, R. D.'],
    venue: 'Master’s thesis, Statistics and Data Science, University of Alaska Fairbanks, 2025.',
    image: '/images/publications/azadda2025dynamic.png',
    links: [{ label: 'PDF', href: 'https://scholarworks.alaska.edu/cgi/viewcontent.cgi?article=1067&context=uaf_grad_math_stats' }],
    reference: 'Master’s thesis, University of Alaska Fairbanks. https://scholarworks.alaska.edu/uaf_grad_math_stats/68',
    bibtex: { school: 'University of Alaska Fairbanks', url: 'https://scholarworks.alaska.edu/uaf_grad_math_stats/68' },
  },
];
