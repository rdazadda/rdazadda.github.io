// kinds: the groups, in page order
// entries, newest first in each group:
//   kind, year (the start year), title (the project name), pis (list of principal investigators), funder, role, years, about (HTML)
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
    title: 'Qungasvik (Toolbox)-Healthy Hearts: An Alaska Enrichment Initiative (AK Enrichment)',
    pis: ['Dr. Stacy Rasmus'],
    funder: 'NHLBI (OT2HL158287)',
    role: 'Member of the project’s Biostatistics (“Numbers”) Team, contributing to survey design and quantitative analyses, including multilevel modeling, physical activity analysis, and Bayesian methods. Out of this project, developed the CANHRActi dashboard and desktop apps and the actiRhythm package.',
    years: '2025 - present',
    about: 'A culturally grounded, evidence-based intervention promoting traditional Yup’ik diet, physical activity, and social connection for Alaska Native Elders and youth. Part of the NIH Community Engagement Alliance (CEAL) network.',
    images: ['/images/research/ak-ceal.png'],
    links: [
      { label: 'Qungasvik website', href: 'http://www.qungasvik.org/home/' },
      { label: 'AK CEAL project page', href: 'https://www.uaf.edu/canhr/research/akceal/index.php' },
      { label: 'NIH CEAL Network', href: 'https://nihceal.org/' },
    ],
  },
  {
    kind: 'current',
    year: '2025',
    title: 'Alaska Alliance for Community Engagement - Partnership for Action Toward Health (AK ACE - PATH)',
    pis: ['Dr. Stacy Rasmus'],
    funder: 'NHLBI (OT2HL158287)',
    role: 'Member of the project’s Biostatistics (“Numbers”) Team, contributing to quantitative analyses, including multilevel modeling, Q-methodology, and Bayesian methods. Out of this project, developed the canhrQsort dashboard and the bayesqm package.',
    years: '2025 - present',
    about: 'A research initiative implementing localized solutions to promote health and prevent chronic disease in rural Alaska Native communities, prioritizing Indigenous knowledge. Part of the NIH Community Engagement Alliance (CEAL) network.',
    images: ['/images/research/ak-ace.png', '/images/research/ak-ace-framework.png'],
    links: [{ label: 'AK ACE - PATH project page', href: 'https://www.uaf.edu/canhr/research/akace/index.php' }],
  },
  {
    kind: 'current',
    year: '2026',
    title: 'Neqpiaput Iinruugut (Our Food is Medicine)',
    pis: ['Dr. Andrea Bersamin'],
    funder: 'NHLBI (R01HL181633-01)',
    role: 'One of the project’s two statisticians, contributing to survey design and quantitative analyses, including multilevel modeling and other statistical methods.',
    years: '2026 - present',
    about: 'A tribally-driven Indigenous food sovereignty intervention to prevent coronary heart disease among Yup’ik Alaska Native communities in the Yukon-Kuskokwim Delta region, reconnecting participants with traditional foodways and ancestral knowledge.',
    images: ['/images/research/our-food-is-medicine.png'],
  },
  {
    kind: 'current',
    year: '2025',
    title: 'Native Transformations Project (NTP)',
    pis: ['Dr. Stacy Rasmus'],
    funder: 'NIH',
    role: 'Member of the project’s Biostatistics (“Numbers”) Team, contributing to the project’s analysis and developing the Intertribal Healthy Data Dashboard, an online platform for displaying community level health information and community level protective factors.',
    years: '2025 - present',
    about: 'A Tribally initiated, directed, and controlled (NWIC NARCH) research study on strengths, protections, and resilience against substance abuse among the Lummi Nation, Swinomish Indian Tribal Community, and Upper Skagit Indian Tribe (Pacific Northwest). NTP is led by Northwest Indian College (NWIC) and the Center for Alaska Native Health Research (CANHR) at the University of Alaska Fairbanks.',
    images: ['/images/research/native-transformations.jpg', '/images/research/native-transformations-model.png'],
    links: [{ label: 'Intertribal Healthy Data Dashboard', href: 'https://rdazadda.github.io/Intertribal-Healthy-Data-Dashboard/dashboard.html' }],
  },
  {
    kind: 'current',
    year: '2026',
    title: 'Alaska INBRE Community-Based Participatory Research (CBPR) Core',
    pis: ['Dr. Katie Cueva'],
    funder: 'NIH, through the Alaska INBRE (IDeA Network of Biomedical Research Excellence)',
    role: 'Member of the CBPR Core, conducting semi-structured interviews with CBPR researchers across Alaska, performing thematic analysis of interview transcripts, and helping produce one-pagers that synthesize community-engaged research practices into the Core’s CBPR Toolkit.',
    years: '2026 - present',
    about: 'A core within the Alaska INBRE (IDeA Network of Biomedical Research Excellence) - an NIH program supporting biomedical and behavioral research - that promotes equitable, inclusive, and sustainable community-based participatory research across Alaska. The Core developed a CBPR toolkit (Summer 2025, with a Community Advisory Board) providing guidance, training, and proposal support for researchers and community partners.',
    images: ['/images/research/alaska-inbre.png'],
    links: [{ label: 'CBPR Toolkit', href: 'https://alaskainbre.org/cbpr-core/cbpr-toolkit/' }],
  },
  {
    kind: 'completed',
    year: '2025',
    title: 'Preventing the Disproportionate Incarceration and Recidivism of Alaska Native People',
    pis: ['Dr. Katie Cueva'],
    funder: 'Alaska Federation of Natives',
    role: 'Statistician on the UAF CANHR team, one of the study’s partner teams, analyzing over 80 survey responses and contributing to thematic analysis of over 20 expert interview transcripts for the final stakeholder report to the Alaska Legislature.',
    years: '2025 - 2026',
    about: 'Investigated factors driving the disproportionate incarceration of Alaska Native people (40% of Alaska’s prison population despite making up 14% of the state population).',
    images: ['/images/research/afn-criminal-justice-report.png'],
    links: [{ label: 'Final Report to the Alaska Legislature', href: 'https://www.legfin.akleg.gov/BudgetBackupDocuments/FY2027/LegReports/Report159.pdf' }],
  },
];
