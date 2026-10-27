const cards = [...document.querySelectorAll('[data-card]')];

const unify = () => {
  for (const card of cards) card.style.height = '';
  const tallest = Math.max(...cards.map((card) => card.offsetHeight));
  for (const card of cards) card.style.height = `${tallest}px`;
};

const watcher = new ResizeObserver(unify);
for (const card of cards) watcher.observe(card.querySelector('.label'));
