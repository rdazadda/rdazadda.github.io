const jumps = [...document.querySelectorAll('[data-jump]')];

const mark = () => {
  for (const jump of jumps) {
    if (jump.hash === location.hash) jump.setAttribute('aria-current', 'true');
    else jump.removeAttribute('aria-current');
  }
};

mark();
addEventListener('hashchange', mark);

for (const button of document.querySelectorAll('[data-hide]')) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const label = button.querySelector('span');
  const closed = label.textContent;
  button.addEventListener('click', () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
    label.textContent = opening ? button.dataset.hide : closed;
  });
}

for (const button of document.querySelectorAll('[data-copy]')) {
  const source = document.getElementById(button.dataset.copy);
  const label = button.querySelector('span');
  const idle = label.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.innerText);
      label.textContent = 'Copied';
      setTimeout(() => {
        label.textContent = idle;
      }, 2000);
    } catch {}
  });
}
