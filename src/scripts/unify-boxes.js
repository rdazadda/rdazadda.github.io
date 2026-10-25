const boxes = [...document.querySelectorAll('.stackpreview')];

const unify = () => {
  for (const box of boxes) box.style.height = '';
  const tallest = Math.max(...boxes.map((box) => box.offsetHeight));
  for (const box of boxes) box.style.height = `${tallest}px`;
};

const watcher = new ResizeObserver(unify);
for (const box of boxes) watcher.observe(box.querySelector('.slides'));
