const boxes = [...document.querySelectorAll('.stackpreview')];

const unify = () => {
  for (const box of boxes) box.style.height = '';
  const tallest = Math.max(...boxes.map((box) => box.offsetHeight));
  for (const box of boxes) box.style.height = `${tallest}px`;
};

unify();
document.fonts.ready.then(unify);
window.addEventListener('load', unify);
window.addEventListener('resize', unify);
