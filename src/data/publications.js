// me: set in bold in author lists
// kinds: the groups, in page order, each with its BibTeX type
// entries, newest first in each group:
//   kind, year, title, authors, venue (HTML)
//   image: optional picture in public/images/
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
    year: '[Year]',
    title: '[Article title]',
    authors: ['[Authors]'],
    venue: '<i>[Journal name]</i>, [volume]([issue]), [pages], [Year].',
    links: [
      { label: 'PDF', href: '#' },
      { label: 'DOI', href: '#' },
    ],
    reference: '<i>[Journal name], [volume]</i>([issue]), [pages].',
    bibtex: { journal: '[Journal name]', volume: '[volume]', number: '[issue]', pages: '[pages]', doi: '[DOI]' },
  },
  {
    kind: 'under-review',
    year: '2026',
    title: 'Health Priorities for Rural Alaska Native Communities at the Extremes of Weather and Climate Change',
    authors: [
      'Hueffer, K.', 'Brinkman, T.', 'Robinson, H.', 'Joseph, V.', 'Chaliak, J. A.', 'John, S.', 'Clinton, M.', 'Shaw, J.',
      'Peter, T.', 'Bersamin, A.', 'Allen, J.', 'Azadda, R. D.', 'Grogan-Kaylor, A.', 'Lee, K.', 'Rasmus, S.',
    ],
    venue: 'Submitted to <i>BMC Medicine</i> (Springer Nature), 2026.',
  },
  {
    kind: 'reports',
    year: '[Year]',
    title: 'Prevention of Incarceration and Recidivism Impacting Alaska Native People',
    authors: ['[Authors]'],
    venue: 'Final report to the Alaska Legislature, [Year].',
    links: [{ label: 'Report', href: '#' }],
    reference: 'Final report to the Alaska Legislature.',
    bibtex: { institution: '[Institution]', type: 'Final report to the Alaska Legislature' },
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
    links: [{ label: 'View poster', href: '/images/publications/publication-5.jpg' }],
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
    links: [{ label: 'View poster', href: '/images/publications/publication-1.jpg' }],
    reference: '2026 CEAL Annual Meeting.',
    bibtex: { howpublished: 'Poster, 2026 CEAL Annual Meeting' },
  },
  {
    kind: 'thesis',
    year: '2025',
    title: '[Thesis title]',
    authors: ['Azadda, R. D.'],
    venue: 'Master’s thesis, Statistics and Data Science, University of Alaska Fairbanks, 2025.',
    links: [{ label: 'PDF', href: '#' }],
    reference: 'Master’s thesis, University of Alaska Fairbanks.',
    bibtex: { school: 'University of Alaska Fairbanks' },
  },
];
