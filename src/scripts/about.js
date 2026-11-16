const TURN = 5000;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;

const album = document.querySelector('[data-album]');
const pictures = [...album.querySelectorAll('img')];
const count = album.querySelector('[data-count]');
let current = 0;
let pointed = false;
let focused = false;
let timer;

const show = (index) => {
  pictures[current].classList.remove('current', 'arriving');
  current = (index + pictures.length) % pictures.length;
  pictures[current].classList.add('current', 'arriving');
  count.textContent = `${current + 1} / ${pictures.length}`;
};

const stop = () => clearInterval(timer);

const start = () => {
  stop();
  if (pointed || focused || reduceMotion) return;
  timer = setInterval(() => {
    if (!document.hidden) show(current + 1);
  }, TURN);
};

for (const button of album.querySelectorAll('[data-step]')) {
  button.addEventListener('click', () => {
    show(current + Number(button.dataset.step));
    start();
  });
}

if (hovers) {
  album.addEventListener('mouseenter', () => {
    pointed = true;
    start();
  });
  album.addEventListener('mouseleave', () => {
    pointed = false;
    start();
  });
}

album.addEventListener('focusin', () => {
  focused = Boolean(album.querySelector(':focus-visible'));
  start();
});
album.addEventListener('focusout', () => {
  focused = false;
  start();
});

start();
