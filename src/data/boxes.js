// Homepage boxes, in order: title, link (the CV box opens public/cv.pdf), slides
// A slide:
//   image: a square picture in public/images/
//   caption: text or HTML; an array for more than one paragraph
//   video: optional clip; image is its still frame
//   alt: optional; without it the picture is read as the title
export const boxes = [
  {
    title: 'About',
    link: '#',
    slides: [
      { image: '/images/about/about-1.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-2.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-3.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-4.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-5.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-6.jpg', caption: 'My work, my background and life in Alaska.' },
      { image: '/images/about/about-7.jpg', caption: 'My work, my background and life in Alaska.' },
    ],
  },
  {
    title: 'Research Projects',
    link: '#',
    slides: [
      { image: '/images/research/research-1.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-2.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-3.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-4.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-5.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-6.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-7.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-8.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-9.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-10.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-11.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-12.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
      { image: '/images/research/research-13.jpg', caption: 'American Indian/Alaska Native research, actigraphy, multilevel, Bayesian, psychometric and qualitative analysis.' },
    ],
  },
  {
    title: 'Publications',
    link: '/publications/',
    slides: [
      { image: '/images/publications/publication-1.jpg', caption: 'Papers and reports.' },
      { image: '/images/publications/publication-2.jpg', caption: 'Papers and reports.' },
      { image: '/images/publications/publication-3.jpg', caption: 'Papers and reports.' },
      { image: '/images/publications/publication-4.jpg', caption: 'Papers and reports.' },
      { image: '/images/publications/publication-5.jpg', caption: 'Papers and reports.' },
    ],
  },
  {
    title: 'Software',
    link: '/software/',
    slides: [
      { image: '/images/software/software-1.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-2.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-3.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-4.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-5.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-6.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-7.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-8.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-9.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
      { image: '/images/software/software-10.jpg', caption: 'Explore my software for accelerometry, Q-sort and circadian rhythm analysis, and more.' },
    ],
  },
  {
    title: 'Interactive Visualizations',
    link: '#',
    slides: [
      { video: '/images/visualizations/visualization-1.mp4', image: '/images/visualizations/visualization-1.jpg', caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.' },
      { video: '/images/visualizations/visualization-2.mp4', image: '/images/visualizations/visualization-2.jpg', caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.' },
      { video: '/images/visualizations/visualization-3.mp4', image: '/images/visualizations/visualization-3.jpg', caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.' },
      { video: '/images/visualizations/visualization-4.mp4', image: '/images/visualizations/visualization-4.jpg', caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.' },
      { video: '/images/visualizations/visualization-5.mp4', image: '/images/visualizations/visualization-5.jpg', caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.' },
    ],
  },
  {
    title: 'Blog',
    link: '#',
    slides: [
      { video: '/images/blog/blog-1.mp4', image: '/images/blog/blog-1.png', caption: 'Statistics, biostatistics, psychometrics, qualitative analysis and others.' },
      { video: '/images/blog/blog-2.mp4', image: '/images/blog/blog-2.png', caption: 'Statistics, biostatistics, psychometrics, qualitative analysis and others.' },
      { video: '/images/blog/blog-3.mp4', image: '/images/blog/blog-3.png', caption: 'Statistics, biostatistics, psychometrics, qualitative analysis and others.' },
      { video: '/images/blog/blog-4.mp4', image: '/images/blog/blog-4.png', caption: 'Statistics, biostatistics, psychometrics, qualitative analysis and others.' },
      { video: '/images/blog/blog-5.mp4', image: '/images/blog/blog-5.png', caption: 'Statistics, biostatistics, psychometrics, qualitative analysis and others.' },
    ],
  },
  {
    title: 'The Art of Training Memory',
    link: '#',
    slides: [
      { video: '/images/memory/memory-1.mp4', image: '/images/memory/memory-1.png', caption: 'Learn quickly, recall more and get more done.' },
      { video: '/images/memory/memory-2.mp4', image: '/images/memory/memory-2.png', caption: 'Learn quickly, recall more and get more done.' },
      { video: '/images/memory/memory-3.mp4', image: '/images/memory/memory-3.png', caption: 'Learn quickly, recall more and get more done.' },
      { video: '/images/memory/memory-4.mp4', image: '/images/memory/memory-4.png', caption: 'Learn quickly, recall more and get more done.' },
    ],
  },
  {
    title: 'CV',
    link: '/cv.pdf',
    slides: [{ image: '/images/cv/cv-1.png', caption: 'Last updated October 13, 2026.' }],
  },
];
