for (const button of document.querySelectorAll('[data-open]')) {
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
}
