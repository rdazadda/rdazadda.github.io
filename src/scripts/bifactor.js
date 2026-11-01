import { SCALES } from '../data/bifactor-scales.js';
import { analyze } from '../lib/bifactor.js';
import { formatEffect } from '../lib/narration.js';

const HINTS = {
  items: 'Pick an item in the table.',
  total: 'Loadings are summed for each factor, then squared.',
  subscales: 'Pick a subscale.',
  one: 'Here the bars show squared loadings.',
  scores: 'Faded bars mark the group factors that fall short.',
};
const START = { masc: 2, arsq: 0 };
const COUNTS = ['None', 'One', 'Two', 'Three', 'Four', 'Five'];

const root = document.querySelector('.bifactor');
const state = { scale: 0, tab: 'items' };
const scaleButtons = [...root.querySelectorAll('[data-scale]')];
const tabButtons = [...root.querySelectorAll('[data-tab]')];
const hint = root.querySelector('.hint');

const bounded = (x) => formatEffect(x).replace('0.', '.');
const two = (x) => x.toFixed(2);
const width = (x) => `${(100 * x).toFixed(2)}%`;
const near = (x) => Math.round(100 * x) / 100;

function share(x) {
  if (x > 0 && x < 0.005) return '<.01';
  if (x < 1 && x >= 0.995) return '>.99';
  return bounded(x);
}

function foot(line, label, general, group) {
  line.classList.toggle('blank', !label);
  line.querySelector('.foot-label').textContent = label;
  line.querySelector('.foot-general').textContent = general;
  line.querySelector('.foot-group').textContent = group;
}

function setup(scale) {
  const view = root.querySelector(`[data-view="${scale.key}"]`);
  const find = (selector) => view.querySelector(selector);
  const text = (selector, value) => {
    find(selector).textContent = value;
  };
  const result = analyze(scale.items);
  const local = { item: START[scale.key], subscale: 0 };
  const names = Object.fromEntries(scale.subscales.map(({ key, name }) => [key, name]));
  const place = (item) => scale.subscales.findIndex(({ key }) => key === item.subscale);
  const short = new Set(result.factors.filter(({ key, fd, h }) => key !== 'G' && !(near(fd) >= 0.9 && near(h) >= 0.7)).map(({ key }) => key));
  const groupsSquared = Object.values(result.ecv.groups).reduce((a, b) => a + b, 0);
  const groups = `${COUNTS[scale.subscales.length]} groups`;
  const titles = [find('.title.general'), find('.title.group')];
  const rows = [...view.querySelectorAll('.row')];
  const blocks = [...view.querySelectorAll('.block')];
  const grand = find('.grand');
  const choices = [...view.querySelectorAll('[data-subscale]')];

  function drawTable(tab) {
    const squared = tab === 'one';
    titles[0].textContent = squared ? 'General loading, squared' : 'General loading';
    titles[1].textContent = squared ? 'Group loading, squared' : 'Group loading';
    rows.forEach((row) => {
      const i = Number(row.dataset.item);
      const item = scale.items[i];
      const [general, group] = row.querySelectorAll('.bar');
      general.style.width = width(squared ? item.general ** 2 : item.general);
      group.style.width = width(squared ? item.group ** 2 : Math.abs(item.group));
      group.classList.toggle('negative', !squared && item.group < 0);
      group.classList.toggle('faint', tab === 'scores' && short.has(item.subscale));
      row.classList.toggle('dim', tab === 'subscales' && place(item) !== local.subscale);
      row.disabled = tab !== 'items' && tab !== 'subscales';
      row.setAttribute('aria-pressed', String(tab === 'items' && i === local.item));
    });
    blocks.forEach((block, k) => {
      const sub = result.subscales[k];
      const line = block.querySelector('.foot');
      const groupSum = `${two(sub.groupSums[sub.key])}² = ${two(sub.group)}`;
      if (tab === 'total') foot(line, 'Sum, squared', '', groupSum);
      else if (tab === 'subscales' && k === local.subscale) foot(line, 'Sum, squared', `${two(sub.generalSum)}² = ${two(sub.general)}`, groupSum);
      else if (tab === 'one') foot(line, 'Sum of squares', '', two(result.ecv.groups[sub.key]));
      else foot(line, '', '', '');
    });
    const t = result.total;
    const everything = `All ${scale.items.length} items`;
    if (tab === 'total') foot(grand, everything, `${two(t.generalSum)}² = ${two(t.general)}`, `${groups} = ${two(t.group)}`);
    else if (tab === 'one') foot(grand, everything, two(result.ecv.general), `${groups} = ${two(groupsSquared)}`);
    else foot(grand, '', '', '');
  }

  function drawItem() {
    const item = scale.items[local.item];
    const { general, group, unique, iecv } = result.items[local.item];
    const subscale = names[item.subscale];
    text('.item-name', item.label);
    text('.where', item.number ? `Item ${local.item + 1}, ${scale.short} item ${item.number}, ${subscale.toLowerCase()}` : subscale);
    find('.item-general').style.width = width(general);
    find('.item-group').style.left = width(general);
    find('.item-group').style.width = width(group);
    find('.bracket').style.width = width(general + group);
    text('.item-subscale', subscale);
    text('.item-g', bounded(item.general));
    text('.item-g2', share(general));
    text('.item-s', bounded(item.group));
    text('.item-s2', share(group));
    text('.item-u', share(unique));
    text('.item-iecv', share(iecv));
  }

  function drawSubscale() {
    const k = local.subscale;
    const sub = result.subscales[k];
    const name = scale.subscales[k].name;
    const part = sub.group / (sub.general + sub.group);
    choices.forEach((choice, j) => choice.setAttribute('aria-pressed', String(j === k)));
    text('.sub-title', `${name}, ${scale.items.filter((item) => item.subscale === sub.key).length} items`);
    text('.sub-name', name);
    text('.sub-s', two(sub.group));
    text('.sub-g', two(sub.general));
    text('.sub-u', two(sub.unique));
    text('.sub-v', two(sub.variance));
    text('.sub-omega', bounded(sub.omega));
    text('.sub-hs', bounded(sub.omegaHS));
    text('.sub-verdict', part < 0.4 ? `Mostly ${scale.general.toLowerCase()}` : part < 0.5 ? `Nearly half ${name.toLowerCase()}` : `Mostly ${name.toLowerCase()}`);
  }

  function draw() {
    for (const panel of view.querySelectorAll('[data-panel]')) panel.hidden = panel.dataset.panel !== state.tab;
    drawTable(state.tab);
    drawItem();
    drawSubscale();
  }

  const change = (changes) => {
    Object.assign(local, changes);
    draw();
  };
  for (const choice of choices) choice.addEventListener('click', () => change({ subscale: Number(choice.dataset.subscale) }));
  for (const row of rows) {
    row.addEventListener('click', () => {
      const i = Number(row.dataset.item);
      change(state.tab === 'subscales' ? { subscale: place(scale.items[i]) } : { item: i });
    });
  }
  return { view, draw };
}

const views = SCALES.map(setup);

function draw() {
  for (const button of scaleButtons) button.setAttribute('aria-pressed', String(button.dataset.scale === SCALES[state.scale].key));
  for (const button of tabButtons) button.setAttribute('aria-pressed', String(button.dataset.tab === state.tab));
  hint.textContent = HINTS[state.tab];
  views.forEach(({ view }, v) => {
    view.hidden = v !== state.scale;
  });
  views[state.scale].draw();
}

function set(changes) {
  Object.assign(state, changes);
  draw();
}

for (const button of scaleButtons) button.addEventListener('click', () => set({ scale: SCALES.findIndex(({ key }) => key === button.dataset.scale) }));
for (const button of tabButtons) button.addEventListener('click', () => set({ tab: button.dataset.tab }));

draw();
