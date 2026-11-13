const root = document.documentElement;
const button = document.getElementById('menu-button');
const topBar = document.querySelector('.top');
const masthead = document.querySelector('.masthead');
const sections = document.getElementById('sections');
const wide = matchMedia('(min-width: 1024px)');
let lastY = 0;

function setMenu(open) {
  if (open) {
    masthead.style.transition = 'none';
    masthead.style.setProperty('--below', `${masthead.getBoundingClientRect().bottom}px`);
    masthead.style.transition = '';
  }
  button.setAttribute('aria-expanded', String(open));
  root.classList.toggle('menu-open', open);
}

button.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));

sections.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
  setMenu(false);
  button.focus();
});

wide.addEventListener('change', () => setMenu(false));

addEventListener(
  'scroll',
  () => {
    const y = Math.max(0, scrollY);
    if (Math.abs(y - lastY) < 6) return;
    root.classList.toggle('tucked', y > lastY && y > topBar.offsetHeight);
    lastY = y;
  },
  { passive: true },
);

topBar.addEventListener('focusin', () => root.classList.remove('tucked'));
