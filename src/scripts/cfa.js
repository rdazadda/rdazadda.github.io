import { FACTORS, TESTS } from '../data/nine-tests.js';
import { NARROW, START, WIDE, boxLabel, diagramLabel, fitText, hint, markup, narrate, status, tree } from '../lib/cfa.js';

const root = document.querySelector('.cfa');
const result = JSON.parse(root.querySelector('.cfa-result').textContent);
const labels = TESTS.map((test) => test.label);
const state = { ...START };

const find = (selector) => root.querySelector(selector);
const all = (selector) => [...root.querySelectorAll(selector)];

const buttons = {
  model: all('[data-model]'),
  path: all('[data-path]'),
};
const trees = [
  [find('.tree.wide'), WIDE],
  [find('.tree.narrow'), NARROW],
];

function draw() {
  for (const [key, list] of Object.entries(buttons)) {
    for (const button of list) button.setAttribute('aria-pressed', String(button.dataset[key] === state[key]));
  }
  const three = state.model === 'three';
  find('.tabs.paths').hidden = !three;
  find('.only').hidden = three;
  for (const [node, G] of trees) {
    node.setAttribute('aria-label', diagramLabel(state, result, labels, FACTORS));
    node.querySelector('svg').innerHTML = markup(G, tree(G, state, result, FACTORS, labels));
    for (const box of node.querySelectorAll('.box')) {
      const i = Number(box.dataset.test);
      box.setAttribute('aria-pressed', String(state.test === i));
      box.setAttribute('aria-label', boxLabel(state, result, labels, FACTORS, i));
    }
  }
  for (const [key, value] of Object.entries(fitText(state, result))) find(`[data-fit="${key}"]`).textContent = value;
  find('.hint').textContent = hint(state);
  find('.status').textContent = status(state);
  find('.narration').textContent = narrate(state, result, labels, FACTORS);
}

function set(changes) {
  Object.assign(state, changes);
  draw();
}

for (const button of buttons.model) {
  button.addEventListener('click', () => {
    if (button.dataset.model !== state.model) set({ model: button.dataset.model, path: 'none' });
  });
}
for (const button of buttons.path) button.addEventListener('click', () => set({ path: button.dataset.path }));
for (const box of all('.box')) {
  box.addEventListener('click', () => {
    const i = Number(box.dataset.test);
    set({ test: state.test === i ? null : i });
  });
}

draw();
