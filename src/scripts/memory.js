const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;

const panels = [...document.querySelector('[data-stage]').children];
const clips = panels.map((panel) => panel.querySelector('video'));
const tabs = [...document.querySelector('[data-tabs]').children];
const rows = [...document.querySelector('[data-parts]').children];
let current = 0;
let held = false;
let seen = false;
let frame;

const draw = () => {
  const clip = clips[current];
  panels[current].style.setProperty('--played', clip.duration ? clip.currentTime / clip.duration : 0);
  frame = requestAnimationFrame(draw);
};

const stop = () => {
  cancelAnimationFrame(frame);
  clips[current].pause();
};

const start = () => {
  stop();
  if (reduceMotion || !seen) return;
  clips[current].play().catch(() => {});
  draw();
};

const show = (index) => {
  stop();
  panels[current].classList.remove('current');
  panels[current].inert = true;
  rows[current].classList.remove('current');
  tabs[current].setAttribute('aria-pressed', 'false');
  current = index;
  panels[current].classList.add('current');
  panels[current].inert = false;
  rows[current].classList.add('current');
  tabs[current].setAttribute('aria-pressed', 'true');
  clips[current].currentTime = 0;
  start();
};

for (const clip of clips) {
  clip.addEventListener('ended', () => show(held ? current : (current + 1) % panels.length));
  if (!hovers) continue;
  clip.addEventListener('mouseenter', stop);
  clip.addEventListener('mouseleave', start);
}

tabs.forEach((tab, i) =>
  tab.addEventListener('click', () => {
    held = true;
    show(i);
  }),
);

new IntersectionObserver((entries) => {
  seen = entries.at(-1).isIntersecting;
  start();
}).observe(clips[0]);
