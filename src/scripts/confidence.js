import { LEVELS, STUDY_SIZES } from '../data/sleep-survey.js';
import { NARROW, START, WIDE, figure, figureLabel, hours, keyedValue, levelAt, narrate, read, readouts, rowAt, studyText, valueAt, zoneAt } from '../lib/confidence.js';
import { SHARE_NARROW, SHARE_WIDE, SURVEY_POINT, narrateShare, pointAt, readShare, readoutsShare, shareFigure, shareLabel } from '../lib/proportions.js';
import { PAIR_NARROW, PAIR_WIDE, narratePair, pairFigure, pairLabel, pairZone, readPair, shiftAt, statsOf } from '../lib/two-intervals.js';

const root = document.querySelector('.confidence');
const find = (selector) => root.querySelector(selector);
const all = (selector) => [...root.querySelectorAll(selector)];
const part = (name) => find(`[data-section="${name}"]`);

const state = { ...START };
const figures = {
  many: [
    [part('many').querySelector('.figure.wide'), WIDE],
    [part('many').querySelector('.figure.narrow'), NARROW],
  ],
  pair: [
    [part('pair').querySelector('.figure.wide'), PAIR_WIDE],
    [part('pair').querySelector('.figure.narrow'), PAIR_NARROW],
  ],
  share: [
    [part('share').querySelector('.figure.wide'), SHARE_WIDE],
    [part('share').querySelector('.figure.narrow'), SHARE_NARROW],
  ],
};
const sliders = {
  level: find('[data-name="level"]'),
  size: find('[data-name="size"]'),
  pairSize: find('[data-name="pair-size"]'),
  shareSize: find('[data-name="share-size"]'),
};
const keys = {
  value: find('#ci-value'),
  study: find('#ci-study'),
  shift: find('#ci-shift'),
  point: find('#ci-point'),
};

let view;
let pairView;
let shareView;

function showSlider(input, value, spoken, shown) {
  input.value = value;
  input.style.setProperty('--fill', `${(100 * value) / Number(input.max)}%`);
  input.setAttribute('aria-valuetext', spoken);
  input.closest('.ruler').querySelector('.value').textContent = shown;
}

function showChoice(key, value) {
  for (const button of all(`[data-choice="${key}"]`)) button.setAttribute('aria-pressed', String(button.dataset.value === value));
}

function showReadouts(name, items) {
  for (const [key, item] of Object.entries(items)) {
    const node = part(name).querySelector(`[data-read="${key}"]`);
    node.querySelector('.read-name').innerHTML = item.name;
    node.querySelector('.read-number').textContent = item.number;
    node.querySelector('.read-note').innerHTML = item.note;
  }
}

function showFigures(name, draw, title) {
  for (const [node, G] of figures[name]) {
    const svg = node.querySelector('svg');
    svg.innerHTML = draw(G);
    svg.setAttribute('aria-label', title);
  }
}

function drawMany() {
  view = read(state);
  state.chosen = view.chosen;
  const n = STUDY_SIZES[state.size];
  showSlider(sliders.level, state.level, `${LEVELS[state.level]}%`, `${view.level}%`);
  showSlider(sliders.size, state.size, `${n} people`, view.nText);
  showChoice('order', state.order);
  showChoice('only', state.only ? 'only' : 'all');
  showChoice('truth', state.shown ? 'shown' : 'hidden');
  keys.value.value = Math.round(state.value * 100);
  keys.value.setAttribute('aria-valuetext', `${hours(state.value)} hours`);
  keys.study.value = state.chosen + 1;
  keys.study.setAttribute('aria-valuetext', studyText(view));
  root.toggleAttribute('data-hidden', !state.shown);
  part('many').querySelector('.narration').innerHTML = narrate(view);
  showReadouts('many', readouts(view));
  showFigures('many', (G) => figure(G, view), figureLabel(view));
}

function drawPair() {
  pairView = readPair(state);
  showSlider(sliders.pairSize, state.size, `${pairView.n} people`, pairView.nText);
  showChoice('bars', state.bars);
  keys.shift.value = Math.round((pairView.m2 - pairView.real) * 100);
  keys.shift.setAttribute('aria-valuetext', `Weekend mean ${hours(pairView.m2)} hours`);
  part('pair').querySelector('.narration').innerHTML = narratePair(pairView);
  const stats = statsOf(pairView);
  for (const cell of part('pair').querySelectorAll('[data-stat]')) cell.textContent = stats[cell.dataset.stat];
  showFigures('pair', (G) => pairFigure(G, pairView), pairLabel(pairView));
}

function drawShare() {
  shareView = readShare(state);
  showSlider(sliders.shareSize, state.shareSize, `${shareView.n} people`, String(shareView.n));
  showChoice('method', state.method);
  keys.point.value = state.point;
  keys.point.setAttribute('aria-valuetext', `True proportion ${(state.point / 1000).toFixed(3)}`);
  part('share').querySelector('.narration').innerHTML = narrateShare(shareView);
  showReadouts('share', readoutsShare(shareView));
  showFigures('share', (G) => shareFigure(G, shareView), shareLabel(shareView));
}

const DRAW = { many: drawMany, pair: drawPair, share: drawShare };

function draw() {
  for (const button of all('[data-page]')) button.setAttribute('aria-pressed', String(button.dataset.page === state.view));
  for (const section of all('[data-section]')) section.hidden = section.dataset.section !== state.view;
  DRAW[state.view]();
}

function set(changes) {
  Object.assign(state, changes);
  draw();
}

function place(event, node, G) {
  const box = node.getBoundingClientRect();
  const scale = G.W / box.width;
  return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
}

function applyMany(mode, G, { x, y }) {
  if (mode === 'level') {
    const level = levelAt(G, y);
    if (level !== state.level) set({ level });
  } else if (mode === 'value') {
    const value = valueAt(G, x, state.shown);
    if (value !== state.value) set({ value });
  } else if (mode === 'row' && view.rows.length) {
    const chosen = view.order[rowAt(G, y, view.rows.length)];
    if (chosen !== state.chosen) set({ chosen });
  }
}

const CURSORS = { level: 'ns-resize', value: 'ew-resize', row: 'pointer' };

for (const [node, G] of figures.many) {
  let mode = null;
  let touched = false;
  node.addEventListener('pointerdown', (event) => {
    touched = event.pointerType === 'touch';
    const at = place(event, node, G);
    const zone = zoneAt(G, view, at.x, at.y);
    if (!zone || (touched && zone === 'row')) return;
    mode = zone;
    node.setPointerCapture(event.pointerId);
    applyMany(mode, G, at);
  });
  node.addEventListener('pointermove', (event) => {
    const at = place(event, node, G);
    if (mode) applyMany(mode, G, at);
    else if (event.pointerType === 'mouse') node.style.cursor = CURSORS[zoneAt(G, view, at.x, at.y)] || '';
  });
  const finish = () => {
    mode = null;
  };
  node.addEventListener('pointerup', finish);
  node.addEventListener('pointercancel', finish);
  node.addEventListener('click', (event) => {
    if (!touched) return;
    const at = place(event, node, G);
    if (zoneAt(G, view, at.x, at.y) === 'row') applyMany('row', G, at);
  });
}

for (const [node, G] of figures.pair) {
  let dragging = false;
  node.addEventListener('pointerdown', (event) => {
    const at = place(event, node, G);
    const onStrip = event.target.classList.contains('strip');
    if (!pairZone(G, at.x, at.y) || (event.pointerType === 'touch' && !onStrip)) return;
    dragging = true;
    node.setPointerCapture(event.pointerId);
    set({ shift: shiftAt(G, pairView, at.y) });
  });
  node.addEventListener('pointermove', (event) => {
    const at = place(event, node, G);
    if (dragging) set({ shift: shiftAt(G, pairView, at.y) });
    else if (event.pointerType === 'mouse') node.style.cursor = pairZone(G, at.x, at.y) ? 'ns-resize' : '';
  });
  const finish = () => {
    dragging = false;
  };
  node.addEventListener('pointerup', finish);
  node.addEventListener('pointercancel', finish);
}

function movePoint(G, x) {
  const raw = pointAt(G, x);
  const point = Math.abs(raw - SURVEY_POINT) <= 3 ? SURVEY_POINT : raw;
  if (point !== state.point) set({ point });
}

for (const [node, G] of figures.share) {
  node.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.buttons) movePoint(G, place(event, node, G).x);
  });
  node.addEventListener('pointerdown', (event) => movePoint(G, place(event, node, G).x));
}

sliders.level.addEventListener('input', () => set({ level: Number(sliders.level.value) }));
sliders.size.addEventListener('input', () => set({ size: Number(sliders.size.value), shift: 0 }));
sliders.pairSize.addEventListener('input', () => set({ size: Number(sliders.pairSize.value), shift: 0 }));
sliders.shareSize.addEventListener('input', () => set({ shareSize: Number(sliders.shareSize.value) }));
keys.value.addEventListener('input', () => set({ value: keyedValue(Number(keys.value.value), state.shown) }));
keys.study.addEventListener('input', () => set({ chosen: Number(keys.study.value) - 1, shift: 0 }));
keys.shift.addEventListener('input', () => set({ shift: Number(keys.shift.value) / 100 }));
keys.point.addEventListener('input', () => set({ point: Number(keys.point.value) }));

const CHOICES = {
  order: (value) => ({ order: value }),
  only: (value) => ({ only: value === 'only' }),
  truth: (value) => ({ shown: value === 'shown' }),
  bars: (value) => ({ bars: value }),
  method: (value) => ({ method: value }),
};
for (const button of all('[data-choice]')) button.addEventListener('click', () => set(CHOICES[button.dataset.choice](button.dataset.value)));
for (const button of all('[data-page]')) button.addEventListener('click', () => set({ view: button.dataset.page }));
for (const button of all('[data-action="again"]')) button.addEventListener('click', () => set({ seed: state.seed + 1, shift: 0 }));
for (const button of all('[data-action="restart"]')) button.addEventListener('click', () => set({ ...START, view: state.view }));

draw();
