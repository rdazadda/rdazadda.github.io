for (const box of document.querySelectorAll('[data-fit-width]')) {
  const sheet = box.firstElementChild;
  const fit = () => {
    const scale = Math.min(1, box.clientWidth / sheet.offsetWidth);
    sheet.style.transform = scale < 1 ? `scale(${scale})` : '';
    box.style.height = scale < 1 ? `${sheet.offsetHeight * scale}px` : '';
  };
  const watcher = new ResizeObserver(fit);
  watcher.observe(box);
  watcher.observe(sheet);
}
