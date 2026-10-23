// kinds: the groups, in page order
// entries, newest first in each group:
//   kind, year (the start year), title (the project name), funder, role, years, about (HTML)
//   images: optional pictures in public/images/ (4:3); more than one take turns
//   links: optional [{ label, href }]
export const kinds = [
  { id: 'current', heading: 'Current projects', short: 'Current' },
  { id: 'completed', heading: 'Completed projects', short: 'Completed' },
];

export const entries = [
  {
    kind: 'current',
    year: '2025',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2025–present',
    about: 'One or two sentences.',
    images: ['/images/research/ak-ceal.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
  {
    kind: 'current',
    year: '2024',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2024–present',
    about: 'One or two sentences.',
    images: ['/images/research/ak-ace.png', '/images/research/ak-ace-framework.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
  {
    kind: 'current',
    year: '2023',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2023–present',
    about: 'One or two sentences.',
    images: ['/images/research/our-food-is-medicine.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
  {
    kind: 'current',
    year: '2022',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2022–present',
    about: 'One or two sentences.',
    images: ['/images/research/native-transformations.jpg', '/images/research/native-transformations-model.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
  {
    kind: 'current',
    year: '2021',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2021–present',
    about: 'One or two sentences.',
    images: ['/images/research/alaska-inbre.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
  {
    kind: 'completed',
    year: '2023',
    title: 'Project name',
    funder: 'Funder and award number',
    role: 'Your role',
    years: '2023–2024',
    about: 'One or two sentences.',
    images: ['/images/research/afn-criminal-justice-report.png'],
    links: [{ label: 'Project page', href: '#' }],
  },
];
