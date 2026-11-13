const TURN = 5000;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hovers = window.matchMedia('(hover: hover)').matches;

const buttons = [...document.querySelectorAll('[data-show]')];
const parts = document.querySelector('[data-parts]');
const sections = [...parts.querySelectorAll('section')];

for (const button of buttons) {
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const section of sections) section.hidden = button.dataset.show !== 'all' && section.id !== button.dataset.show;
    parts.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

if (!reduceMotion) {
  for (const slides of document.querySelectorAll('[data-rotate]')) {
    const pictures = [...slides.children];
    let current = 0;
    let timer;

    const stop = () => clearInterval(timer);
    const start = () => {
      stop();
      timer = setInterval(() => {
        pictures[current].classList.remove('current');
        current = (current + 1) % pictures.length;
        pictures[current].classList.add('current');
      }, TURN);
    };

    if (hovers) {
      slides.parentElement.addEventListener('mouseenter', stop);
      slides.parentElement.addEventListener('mouseleave', start);
    }
    start();
  }
}
