// Homepage boxes, in order: title, link (the CV box opens public/cv.pdf), caption, slides
//   caption: optional text or HTML; the box's own page shows it under its title
// A slide:
//   image: a picture in public/images/
//   video: optional clip; image is its still frame
//   fill: optional; the picture fills the box and this part of it is kept, such as 'center', 'top' or 'center 36%'
//         without it the whole picture shows
//   zoom: optional; enlarges a whole picture, such as 1.3
export const boxes = [
  {
    title: 'About',
    link: '/about/',
    caption: 'My work, my background and life in Alaska.',
    slides: [
      { image: '/images/home/about-1.webp', fill: 'center' },
      { image: '/images/home/about-2.webp', fill: 'center' },
      { image: '/images/home/about-3.webp', fill: 'center' },
      { image: '/images/home/about-4.webp', fill: 'center' },
      { image: '/images/home/about-5.webp', fill: 'center' },
      { image: '/images/home/about-6.webp', fill: 'center' },
      { image: '/images/home/about-7.webp', fill: 'center' },
    ],
  },
  {
    title: 'Research Projects',
    link: '/research/',
    slides: [
      { image: '/images/research/research-1.jpg' },
      { image: '/images/research/research-2.jpg' },
      { image: '/images/research/research-3.jpg' },
      { image: '/images/home/research-4.webp', fill: 'center' },
      { image: '/images/home/research-5.webp', fill: 'center' },
      { image: '/images/research/research-6.jpg' },
      { image: '/images/home/research-7.webp', fill: 'center' },
      { image: '/images/research/research-8.jpg' },
      { image: '/images/home/research-9.webp', fill: 'center' },
      { image: '/images/home/research-10.webp', fill: 'center' },
      { image: '/images/research/research-11.jpg' },
    ],
  },
  {
    title: 'Publications',
    link: '/publications/',
    caption: 'Papers and reports.',
    slides: [
      { image: '/images/publications/publication-1.jpg', zoom: 1.3 },
      { image: '/images/publications/publication-2.jpg' },
      { image: '/images/publications/publication-3.jpg' },
      { image: '/images/publications/publication-4.jpg', fill: 'center 35%' },
      { image: '/images/publications/publication-5.jpg' },
      { image: '/images/publications/publication-6.jpg' },
      { image: '/images/publications/publication-7.jpg' },
    ],
  },
  {
    title: 'Software',
    link: '/software/',
    slides: [
      { image: '/images/software/software-1.jpg' },
      { image: '/images/software/software-2.jpg' },
      { image: '/images/software/software-3.jpg' },
      { image: '/images/software/software-4.jpg' },
      { image: '/images/home/software-5.webp', fill: 'center' },
      { image: '/images/home/software-6.webp', fill: 'center' },
      { image: '/images/home/software-7.webp', fill: 'center' },
      { image: '/images/home/software-8.webp', fill: 'center' },
      { image: '/images/home/software-9.webp', fill: 'center' },
      { image: '/images/software/software-10.jpg' },
    ],
  },
  {
    title: 'Interactive Visualizations',
    link: '/visualizations/',
    caption: 'Actigraphy/accelerometry analysis, statistics, biostatistics, psychometrics and qualitative analysis.',
    slides: [
      { video: '/images/home/visualization-1.mp4', image: '/images/home/visualization-1.webp', fill: 'center' },
      { video: '/images/home/visualization-2.mp4', image: '/images/home/visualization-2.webp', fill: 'center' },
      { video: '/images/home/visualization-3.mp4', image: '/images/home/visualization-3.webp', fill: 'center' },
      { video: '/images/home/visualization-4.mp4', image: '/images/home/visualization-4.webp', fill: 'center' },
      { video: '/images/home/visualization-5.mp4', image: '/images/home/visualization-5.webp', fill: 'center' },
      { video: '/images/home/visualization-8.mp4', image: '/images/home/visualization-8.webp', fill: 'center' },
      { video: '/images/home/visualization-6.mp4', image: '/images/home/visualization-6.webp', fill: 'center' },
      { video: '/images/home/visualization-7.mp4', image: '/images/home/visualization-7.webp', fill: 'center' },
      { video: '/images/home/visualization-9.mp4', image: '/images/home/visualization-9.webp', fill: 'center' },
      { video: '/images/home/visualization-10.mp4', image: '/images/home/visualization-10.webp', fill: 'center' },
      { video: '/images/home/visualization-11.mp4', image: '/images/home/visualization-11.webp', fill: 'center' },
      { video: '/images/home/visualization-12.mp4', image: '/images/home/visualization-12.webp', fill: 'center' },
    ],
  },
  {
    title: 'Blog',
    link: '/blog/',
    slides: [{ image: '/images/home/research-9.webp', fill: 'center' }],
  },
  {
    title: 'The Art of Training Memory',
    link: '/memory/',
    caption: 'Learn quickly, recall more and get more done.',
    slides: [
      { video: '/images/home/memory-1.mp4', image: '/images/home/memory-1.webp', fill: 'center' },
      { video: '/images/home/memory-2.mp4', image: '/images/home/memory-2.webp', fill: 'center' },
      { video: '/images/home/memory-3.mp4', image: '/images/home/memory-3.webp', fill: 'center' },
      { video: '/images/home/memory-4.mp4', image: '/images/home/memory-4.webp', fill: 'center' },
    ],
  },
  {
    title: 'CV',
    link: '/cv.pdf',
    slides: [{ image: '/images/cv/cv-1.png', fill: 'top' }],
  },
];
