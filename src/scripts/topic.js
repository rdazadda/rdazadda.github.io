const sections = [...document.querySelectorAll('[data-parts] > section')];
const buttons = [...document.querySelectorAll('[data-show]')];

for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const section of sections) section.hidden = button.dataset.show !== 'all' && section.id !== button.dataset.show;
  });
}

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
