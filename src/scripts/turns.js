const TURN = 10000;
const TOP = 80;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;

const stage = document.querySelector('[data-turns]');
const panels = [...stage.querySelectorAll(':scope > [data-turn]')];
let current = 0;
let held = false;
let pointed = false;
let focused = false;
let reading = scrollY > TOP;
let timer;

const show = (index) => {
  panels[current].classList.remove('current', 'arriving');
  current = index;
  panels[current].classList.add('current', 'arriving');
};

const stop = () => clearInterval(timer);

const start = () => {
  stop();
  if (held || pointed || focused || reading || reduceMotion) return;
  timer = setInterval(() => {
    if (!document.hidden) show((current + 1) % panels.length);
  }, TURN);
};

stage.addEventListener('click', (event) => {
  held = true;
  stop();
  const link = event.target.closest('a');
  const index = link ? panels.findIndex((panel) => panel.dataset.turn === link.getAttribute('href')) : -1;
  if (index === -1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  show(index);
  stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
});

if (hovers) {
  stage.addEventListener('mouseenter', () => {
    pointed = true;
    start();
  });
  stage.addEventListener('mouseleave', () => {
    pointed = false;
    start();
  });
}

stage.addEventListener('focusin', () => {
  focused = true;
  start();
});
stage.addEventListener('focusout', () => {
  focused = false;
  start();
});

addEventListener(
  'scroll',
  () => {
    if (scrollY > TOP === reading) return;
    reading = !reading;
    start();
  },
  { passive: true },
);

start();
