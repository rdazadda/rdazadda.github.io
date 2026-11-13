const row = document.getElementById(location.hash.slice(1))?.querySelector('[data-open][aria-expanded="false"]');

if (row) {
  document.getElementById(row.getAttribute('aria-controls')).hidden = false;
  row.setAttribute('aria-expanded', 'true');
}
