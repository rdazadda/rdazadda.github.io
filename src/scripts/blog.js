const STEP = 5;
const PEEK = 28;
const wide = window.matchMedia('(min-width: 1024px)');

const older = document.querySelector('[data-older]');
older?.addEventListener('click', () => {
  const waiting = [...document.querySelectorAll('[data-posts] > [hidden]')];
  for (const post of waiting.slice(0, STEP)) post.hidden = false;
  older.hidden = waiting.length <= STEP;
});

const list = document.querySelector('[data-list]');
const rows = [...list.querySelectorAll('a')];
const fit = () => {
  const seen = rows.filter((row) => !row.hidden);
  const limit = wide.matches ? 8 : 5;
  list.style.maxHeight = seen.length > limit ? `${seen[limit].offsetTop - seen[0].offsetTop + seen[0].parentElement.firstElementChild.offsetHeight + PEEK}px` : '';
};
new ResizeObserver(fit).observe(list);

const topics = [...document.querySelectorAll('[data-topics] button')];
for (const button of topics) {
  button.addEventListener('click', () => {
    const topic = button.getAttribute('aria-pressed') === 'true' ? null : button.dataset.topic;
    for (const other of topics) other.setAttribute('aria-pressed', String(other.dataset.topic === topic));
    for (const row of rows) row.hidden = topic !== null && row.dataset.topic !== topic;
    for (const year of list.children) year.hidden = [...year.querySelectorAll('a')].every((row) => row.hidden);
    list.scrollTop = 0;
    fit();
    list.scrollIntoView({ block: 'nearest' });
  });
}
