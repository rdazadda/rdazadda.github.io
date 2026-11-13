const TURN = 6000;
const PEEK = 26;
const WIDE_HEIGHT = 330;
const PHONE_HEIGHT = 560;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;
const wide = window.matchMedia('(min-width: 1024px)');

const box = document.querySelector('[data-box]');
const stage = box.querySelector('[data-stage]');
const type = box.querySelector('[data-type]');
const count = box.querySelector('[data-count]');
const list = document.querySelector('[data-names]');
const panels = [...stage.children];
const names = [...list.querySelectorAll('button')];
let current = 0;
let held = false;
let seen = false;
let pointed = false;
let focused = false;
let timer;

const close = () => {
  for (const button of panels[current].querySelectorAll('[aria-expanded="true"]')) {
    button.setAttribute('aria-expanded', 'false');
    document.getElementById(button.getAttribute('aria-controls')).hidden = true;
  }
};

const reveal = (name) => {
  const top = name.offsetTop - name.closest('section').querySelector('h2').offsetHeight;
  const bottom = name.offsetTop + name.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
};

const show = (index) => {
  close();
  panels[current].classList.remove('current');
  panels[current].inert = true;
  names[current].removeAttribute('aria-current');
  current = index;
  panels[current].classList.add('current');
  panels[current].inert = false;
  names[current].setAttribute('aria-current', 'true');
  type.textContent = panels[current].dataset.type;
  count.textContent = `${current + 1} / ${panels.length}`;
  box.style.setProperty('--played', (current + 1) / panels.length);
  if (!list.matches(':hover')) reveal(names[current]);
};

const stop = () => clearInterval(timer);

const start = () => {
  stop();
  if (held || pointed || focused || reduceMotion || !seen) return;
  timer = setInterval(() => show((current + 1) % panels.length), TURN);
};

const hold = () => {
  held = true;
  stop();
};

const fit = () => {
  const limit = wide.matches ? WIDE_HEIGHT : PHONE_HEIGHT;
  const cut = names.find((name) => name.offsetTop + name.offsetHeight > limit);
  list.style.maxHeight = cut ? `${cut.offsetTop + PEEK}px` : '';
};

for (const button of box.querySelectorAll('[data-step]')) {
  button.addEventListener('click', () => {
    hold();
    show((current + Number(button.dataset.step) + panels.length) % panels.length);
  });
}

for (const button of stage.querySelectorAll('[aria-controls]')) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    const opening = panel.hidden;
    hold();
    close();
    if (!opening) return;
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  });
}

names.forEach((name, i) =>
  name.addEventListener('click', () => {
    hold();
    show(i);
    type.parentElement.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }),
);

if (hovers) {
  box.addEventListener('mouseenter', () => {
    pointed = true;
    start();
  });
  box.addEventListener('mouseleave', () => {
    pointed = false;
    start();
  });
}

box.addEventListener('focusin', () => {
  focused = true;
  start();
});
box.addEventListener('focusout', () => {
  focused = false;
  start();
});

new ResizeObserver(fit).observe(list.firstElementChild);
new IntersectionObserver((entries) => {
  seen = entries.at(-1).isIntersecting;
  start();
}).observe(box);
