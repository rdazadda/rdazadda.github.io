const sections = [...document.querySelectorAll('[data-sections] > section')];
const buttons = [...document.querySelectorAll('[data-show]')];

for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const section of sections) section.hidden = button.dataset.show !== 'all' && section.id !== button.dataset.show;
  });
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const print of document.querySelectorAll('[data-rotate]')) {
  const frame = print.parentElement;
  const pictures = [...print.children];
  let current = 0;
  let timer;

  const stop = () => clearTimeout(timer);
  const start = () => {
    stop();
    if (!reduceMotion) timer = setTimeout(next, 5000);
  };
  const next = () => {
    pictures[current].classList.remove('current');
    current = (current + 1) % pictures.length;
    pictures[current].classList.add('current');
    frame.href = pictures[current].getAttribute('src');
    start();
  };

  frame.addEventListener('mouseenter', stop);
  frame.addEventListener('mouseleave', start);
  start();
}
