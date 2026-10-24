const sections = [...document.querySelectorAll('[data-groups] section')];
const buttons = [...document.querySelectorAll('[data-show]')];

for (const button of buttons) {
  button.addEventListener('click', () => {
    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
    for (const section of sections) section.hidden = button.dataset.show !== 'all' && section.id !== button.dataset.show;
  });
}
