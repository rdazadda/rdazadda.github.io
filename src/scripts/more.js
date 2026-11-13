const LIMIT = 4;
const PEEK = 28;

for (const list of document.querySelectorAll('[data-more]')) {
  const items = [...list.children];
  if (items.length <= LIMIT) continue;
  const fit = () => {
    list.style.maxHeight = `${items[LIMIT].offsetTop - items[0].offsetTop + PEEK}px`;
  };
  new ResizeObserver(fit).observe(list);
}
