for (const button of document.querySelectorAll('[data-copy]')) {
  const source = button.previousElementSibling;
  const label = button.querySelector('span');
  const idle = label.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(source.innerText.replaceAll('\u00a0', ' '));
      label.textContent = 'Copied';
      setTimeout(() => {
        label.textContent = idle;
      }, 2000);
    } catch {}
  });
}
