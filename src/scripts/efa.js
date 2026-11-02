import { GROUPS, TESTS } from '../data/twenty-four-tests.js';
import { START, bounded, explained, headings, hint, leftOver, loadTitle, narrate, numberAt, pick, place, scree } from '../lib/efa.js';

const root = document.querySelector('.efa');
const result = JSON.parse(root.querySelector('.efa-result').textContent);
const labels = TESTS.map((test) => test.label);
const names = GROUPS.slice(0, 4).map((group) => group.name);
const tones = GROUPS.slice(0, 4).map((group) => group.key);
const state = { ...START };

const find = (selector) => root.querySelector(selector);
const all = (selector) => [...root.querySelectorAll(selector)];
const width = (v) => `calc(${Math.round(v * 10000) / 10000} * var(--unit))`;

const buttons = {
  model: all('[data-model]'),
  m: all('[data-m]'),
  rotation: all('[data-rotation]'),
};
const rows = all('.row');
const columns = all('.head [data-j], .lines [data-j]');
const svg = find('.scree svg');

function drawScree() {
  const plot = scree(state, result);
  find('.scree-title').textContent = plot.title;
  find('.verdict').textContent = plot.verdict;
  svg.setAttribute('aria-label', plot.aria);
  for (const name of ['reference', 'real', 'dropped', 'kept']) svg.querySelector(`.${name}`).setAttribute('d', plot[name]);
  const text = (selector, value, x, y, anchor) => {
    const node = svg.querySelector(selector);
    node.textContent = value;
    node.setAttribute('x', x);
    node.setAttribute('y', y);
    if (anchor) node.setAttribute('text-anchor', anchor);
  };
  text('.first', plot.first, plot.firstX, plot.firstY);
  text('.real-label', plot.realLabel, plot.realX, plot.realY);
  text('.reference-label', plot.referenceLabel, plot.referenceX, plot.referenceY, plot.referenceAnchor);
}

function drawTable() {
  const { loadings, set } = pick(state, result);
  const heads = headings(state, names);
  const named = state.m === 4 && state.rotation !== 'none';
  for (const node of columns) {
    const j = Number(node.dataset.j);
    node.hidden = j >= state.m;
    if (node.classList.contains('column-name')) {
      node.textContent = heads[j] ?? '';
      if (named) node.dataset.tone = tones[j];
      else delete node.dataset.tone;
    }
  }
  find('.load-title').textContent = loadTitle(state);
  for (const row of rows) {
    const i = Number(row.dataset.test);
    const picked = state.test === i;
    row.setAttribute('aria-pressed', String(picked));
    row.setAttribute('aria-label', `${labels[i]}, communality ${bounded(set.h2[i])}, ${loadings[i].map((v, j) => `${heads[j]} ${bounded(v)}`).join(', ')}`);
    row.querySelector('.bar.h2').style.width = width(set.h2[i]);
    const h2Number = row.querySelector('.h2-number');
    h2Number.hidden = !picked;
    h2Number.textContent = picked ? bounded(set.h2[i]) : '';
    for (const bar of row.querySelectorAll('.bar.load')) {
      const j = Number(bar.dataset.j);
      bar.hidden = j >= state.m;
      if (j < state.m) Object.assign(bar.style, place(j, loadings[i][j]));
    }
    for (const number of row.querySelectorAll('.load-number')) {
      const j = Number(number.dataset.j);
      number.hidden = !picked || j >= state.m;
      if (number.hidden) continue;
      const spot = numberAt(j, loadings[i][j]);
      number.style.left = spot.left;
      number.style.transform = spot.transform;
      number.textContent = bounded(loadings[i][j]);
    }
  }
}

function draw() {
  for (const [key, list] of Object.entries(buttons)) {
    for (const button of list) button.setAttribute('aria-pressed', String(button.dataset[key] === String(state[key])));
  }
  drawScree();
  drawTable();
  find('.leftover').textContent = leftOver(state, result);
  find('.explained b').textContent = explained(state, result);
  find('.hint').textContent = hint(state.test);
  find('.narration').textContent = narrate(state, result, labels, names);
}

function set(changes) {
  Object.assign(state, changes);
  draw();
}

for (const button of buttons.model) button.addEventListener('click', () => set({ model: button.dataset.model }));
for (const button of buttons.m) button.addEventListener('click', () => set({ m: Number(button.dataset.m) }));
for (const button of buttons.rotation) button.addEventListener('click', () => set({ rotation: button.dataset.rotation }));
for (const row of rows) {
  row.addEventListener('click', () => {
    const i = Number(row.dataset.test);
    set({ test: state.test === i ? null : i });
  });
}

draw();
