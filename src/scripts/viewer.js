const PEEK = 26;
const PHONE_HEIGHT = 560;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;
const wide = window.matchMedia('(min-width: 1024px)');

const stage = document.querySelector('[data-stage]');
const list = document.querySelector('[data-names]');
const panels = [...stage.children];
const clips = panels.map((panel) => panel.querySelector('video'));
const names = [...list.querySelectorAll('a')];
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

const reveal = (name) => {
  const top = name.offsetTop - name.closest('section').querySelector('h2').offsetHeight;
  const bottom = name.offsetTop + name.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
};

const show = (index) => {
  stop();
  panels[current].classList.remove('current');
  panels[current].inert = true;
  names[current].removeAttribute('aria-current');
  current = index;
  panels[current].classList.add('current');
  panels[current].inert = false;
  names[current].setAttribute('aria-current', 'true');
  clips[current].currentTime = 0;
  if (!list.matches(':hover')) reveal(names[current]);
  start();
};

const turn = () => show(held ? current : (current + 1) % panels.length);

const fit = () => {
  const limit = wide.matches ? stage.offsetHeight : PHONE_HEIGHT;
  const cut = names.find((name) => name.offsetTop + name.offsetHeight > limit);
  list.style.maxHeight = cut ? `${cut.offsetTop + PEEK}px` : '';
};

for (const clip of clips) {
  clip.addEventListener('ended', turn);
  if (!hovers) continue;
  clip.addEventListener('mouseenter', stop);
  clip.addEventListener('mouseleave', start);
}

names.forEach((name, i) =>
  name.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    held = true;
    show(i);
    clips[i].scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }),
);

new ResizeObserver(fit).observe(stage);
new IntersectionObserver((entries) => {
  seen = entries.at(-1).isIntersecting;
  start();
}).observe(clips[0]);
