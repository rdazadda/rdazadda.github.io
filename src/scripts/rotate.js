const DELAY = 5000;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const play = (video) => video.play().catch(() => {});

for (const container of document.querySelectorAll('[data-rotate]')) {
  const slides = [...container.children];
  let current = 0;
  let timer;

  const clip = () => slides[current].querySelector('video');

  const show = (index) => {
    clip()?.pause();
    slides[current].classList.remove('current');
    slides[current].inert = true;
    current = index;
    slides[current].classList.add('current');
    slides[current].inert = false;
    const video = clip();
    if (video) video.currentTime = 0;
  };

  const stop = () => {
    clearTimeout(timer);
    clip()?.pause();
  };
  const start = () => {
    stop();
    if (reduceMotion) return;
    const video = clip();
    if (video) play(video);
    else timer = setTimeout(next, DELAY);
  };
  const next = () => {
    show((current + 1) % slides.length);
    start();
  };

  for (const video of container.querySelectorAll('video')) video.addEventListener('ended', next);
  container.addEventListener('mouseenter', stop);
  container.addEventListener('mouseleave', start);
  start();
}

for (const video of document.querySelectorAll('.slides:not([data-rotate]) video')) {
  if (reduceMotion) continue;
  const container = video.closest('.slides');
  container.addEventListener('mouseenter', () => video.pause());
  container.addEventListener('mouseleave', () => play(video));
  play(video);
}
