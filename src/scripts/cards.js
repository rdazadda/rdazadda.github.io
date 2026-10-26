const section = document.querySelector('[data-cards]');

if (section) {
  const cards = [...section.querySelectorAll('[data-card]')];
  const PILE = [
    [0, 0, -3],
    [7, -5, 5],
    [-9, 6, -7],
    [10, 8, 8],
    [-6, -9, -4],
    [5, 10, 3],
    [-11, -3, -9],
    [8, -8, 6],
  ];
  const RADIUS = 450;

  const progress = (value) => Math.max(0, Math.min(1, value));
  const easeOut = (value) => 1 - (1 - value) ** 3;
  const easeInOut = (value) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);
  const easeSine = (value) => (1 - Math.cos(Math.PI * value)) / 2;

  const unify = () => {
    for (const card of cards) card.style.height = '';
    const tallest = Math.max(...cards.map((card) => card.offsetHeight));
    for (const card of cards) card.style.height = `${tallest}px`;
  };

  const land = () => {
    for (const card of cards) card.style.transform = '';
    try {
      sessionStorage.setItem('cards-opened', '1');
    } catch {}
  };

  const open = () => {
    const homes = cards.map((card) => [card.offsetLeft + card.offsetWidth / 2, card.offsetTop + card.offsetHeight / 2]);
    const tops = [...new Set(cards.map((card) => card.offsetTop))].sort((a, b) => a - b);
    const rows = cards.map((card) => tops.indexOf(card.offsetTop));
    const center = section.clientWidth / 2;
    const middle = (homes[0][1] + homes[homes.length - 1][1]) / 2;
    const half = cards[0].offsetHeight / 2;
    const rx = Math.max(0, Math.min(RADIUS, center - cards[0].offsetWidth / 2 - 9));
    const ry = Math.min(RADIUS ** 2 / rx, middle - half - 10, section.offsetHeight - middle - half - 10);
    const end = 5.9 + 0.1 * (tops.length - 1);
    const start = performance.now();
    const frame = (now) => {
      const t = (now - start) / 1000;
      const spread = easeOut(progress((t - 0.8) / 1.8));
      const turn = 90 * easeSine(progress((t - 0.8) / 3.6));
      cards.forEach((card, i) => {
        const angle = ((180 + (360 / cards.length) * i + turn) * Math.PI) / 180;
        const [px, py, pr] = PILE[i % PILE.length];
        const x = center + px * (1 - spread) + rx * spread * Math.cos(angle);
        const y = middle + py * (1 - spread) + ry * spread * Math.sin(angle);
        const stay = 1 - easeInOut(progress((t - 4.4 - 0.1 * rows[i]) / 1.5));
        card.style.transform = `translate(${(x - homes[i][0]) * stay}px, ${(y - homes[i][1]) * stay}px) rotate(${pr * (1 - spread)}deg)`;
      });
      if (t < end) requestAnimationFrame(frame);
      else land();
    };
    frame(start);
    section.classList.remove('opening');
  };

  const watcher = new ResizeObserver(unify);
  for (const card of cards) watcher.observe(card.querySelector('.label'));

  unify();
  if (section.classList.contains('opening')) open();
}
