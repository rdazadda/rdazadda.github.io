import { MEANS, START, fit, isFactorial, names, narrate, neededFor, planFor, powerOf, report, snap, tests } from '../lib/groups.js';
import { formatAlpha, formatPower, minus } from '../lib/narration.js';
import { pdf } from '../lib/normal.js';
import { ALPHAS, count } from '../lib/planning.js';

const L = 74;
const R = 724;
const TOP = 96;
const BASE = 300;
const PT = 430;
const PB = 610;
const N_LO = Math.log(2);
const N_HI = Math.log(1000);
const N_TICKS = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
const NS = Array.from({ length: 61 }, (_, i) => Math.round(Math.exp(N_LO + (i / 60) * (N_HI - N_LO))));
const COLORS = [
  { line: '#c99400', text: '#7d5c00' },
  { line: '#1f5a88', text: '#1f5a88' },
  { line: '#30394f', text: '#30394f' },
  { line: '#6a4c93', text: '#6a4c93' },
];
const SVG_NS = 'http://www.w3.org/2000/svg';

const root = document.querySelector('.groups');
const svg = root.querySelector('svg');
const find = (selector) => root.querySelector(selector);

const copy = (s) => ({ ...s, means: [...s.means], plan: [...s.plan] });
const state = copy(START);
let domain = [-4, 7];
let built = '';
let drag = null;
let queued = false;

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const percent = (p) => `${Math.round(100 * p)}%`;
const trim = (v) => `${Number(v.toFixed(2))}`;

const ox = (v) => L + ((v - domain[0]) / (domain[1] - domain[0])) * (R - L);
const vOf = (px) => domain[0] + ((px - L) / (R - L)) * (domain[1] - domain[0]);
const nx = (n) => L + ((Math.log(clamp(n, 2, 1000)) - N_LO) / (N_HI - N_LO)) * (R - L);
const py = (p) => PB - p * (PB - PT);
const nAt = (v) => Math.round(Math.exp(N_LO + (v / 1000) * (N_HI - N_LO)));
const valueOfN = (n) => Math.round(((Math.log(clamp(n, 2, 1000)) - N_LO) / (N_HI - N_LO)) * 1000);
const short = (name) => name.replace(/Group /g, '');
const tag = (test) => ({ a: 'A', b: 'B', ab: 'interaction' })[test.id] ?? short(test.name);
const joined = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]);

function place(el, attrs) {
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, typeof value === 'number' ? round(value) : value);
}

function make(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  place(el, attrs);
  parent.append(el);
  return el;
}

function box(el) {
  const { x, y, width, height } = el.getBBox();
  return [x, y, x + width, y + height];
}

const meets = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const within = (a, area) => a[0] >= area[0] && a[1] >= area[1] && a[2] <= area[2] && a[3] <= area[3];

function settle(el, spots, taken, area) {
  for (const { x, y, anchor } of spots) {
    place(el, { x, y, 'text-anchor': anchor, visibility: 'visible' });
    const spot = box(el);
    if (within(spot, area) && !taken.some((other) => meets(other, spot))) {
      taken.push(spot);
      return;
    }
  }
  el.setAttribute('visibility', 'hidden');
}

const marks = {
  title: find('.bells-title'),
  target: find('.target'),
  plan: find('.plan'),
  planLabel: find('.plan-label'),
  peopleTitle: find('.people-title'),
};
const legend = find('.legend');
const bells = find('.bells');
const axes = find('.axes');
const markers = find('.markers');
const powers = find('.powers');
const crossings = find('.crossings');
const meanInputs = find('.mean-inputs');
const coverList = find('.cover-list');
const correct = find('.correct input');
const readouts = {
  name: find('.answer-name'),
  number: find('.answer-number'),
  note: find('.answer-note'),
  reachedName: find('.facts .reached-name'),
  reached: find('.facts .reached'),
  weakest: find('.facts .weakest'),
  every: find('.facts .every'),
};
const narration = find('.narration');
const template = document.getElementById('report-text');
const keep = find('.keep input');
const restart = find('.restart');
const designs = [...root.querySelectorAll('.designs button')];

const SLIDERS = {
  n: { toValue: (s) => valueOfN(s.n), fromValue: nAt, text: (s) => count(s.n) },
  sd: { toValue: (s) => Math.round(s.sd * 10), fromValue: (v) => v / 10, text: (s) => trim(s.sd) },
  target: { toValue: (s) => Math.round(s.target * 100), fromValue: (v) => v / 100, text: (s) => percent(s.target) },
  alpha: { toValue: (s) => ALPHAS.indexOf(s.alpha), fromValue: (v) => ALPHAS[v], text: (s) => formatAlpha(s.alpha) },
  dropout: { toValue: (s) => Math.round(s.dropout * 100), fromValue: (v) => v / 100, text: (s) => percent(s.dropout) },
};

const rulers = {};
for (const input of root.querySelectorAll('.controls input')) {
  const control = input.closest('.control');
  rulers[input.dataset.name] = { input, value: control.querySelector('.value'), label: control.querySelector('label') };
}

const unit = () => (isFactorial(state) ? 'cell' : 'group');

function build() {
  if (built === state.design) return;
  built = state.design;
  for (const parent of [legend, bells, markers, meanInputs, coverList]) parent.replaceChildren();
  names(state).forEach((name, i) => {
    const { line, text } = COLORS[i];
    make('rect', { y: 9, width: 12, height: 12, fill: line }, legend);
    make('text', { y: 20, fill: text }, legend).textContent = name;
    make('path', { class: 'fill', fill: line }, bells);
    make('path', { class: 'line', stroke: line }, bells);
    const group = make('g', {}, markers);
    make('line', { class: 'guide', y2: BASE }, group);
    make('circle', { class: 'knob', r: 10, fill: line }, group);
    make('text', { class: 'number' }, group).textContent = i + 1;
    make('circle', { class: 'grab', r: 20, 'data-index': i }, group);
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min: 0, max: 80, step: 1 });
    input.setAttribute('aria-label', `Expected mean of ${name}`);
    input.addEventListener('input', () => setMean(i, Number(input.value) / 20));
    input.addEventListener('focus', () => group.classList.add('focus'));
    input.addEventListener('blur', () => group.classList.remove('focus'));
    meanInputs.append(input);
  });
  for (const test of tests(state)) {
    const label = document.createElement('label');
    const tick = document.createElement('input');
    tick.type = 'checkbox';
    tick.dataset.test = test.id;
    tick.addEventListener('change', () => {
      const plan = state.plan.filter((id) => id !== test.id);
      if (tick.checked) plan.push(test.id);
      set({ plan });
    });
    label.append(tick, short(test.name));
    coverList.append(label);
  }
}

function setMean(i, value) {
  const means = [...state.means];
  means[i] = clamp(Math.round(value * 20) / 20, 0, 4);
  set({ means });
}

const fill = (input) => input.style.setProperty('--fill', `${(100 * (input.value - input.min)) / (input.max - input.min)}%`);

function showControls() {
  for (const [name, { input, value }] of Object.entries(rulers)) {
    const { toValue, text } = SLIDERS[name];
    input.value = toValue(state);
    fill(input);
    value.textContent = text(state);
    input.setAttribute('aria-valuetext', text(state));
  }
  rulers.n.label.textContent = `People in each ${unit()}`;
  for (const button of designs) button.setAttribute('aria-pressed', String(button.dataset.design === state.design));
  keep.checked = state.fixed;
  correct.checked = state.correct;
  for (const tick of coverList.querySelectorAll('input')) tick.checked = state.plan.includes(tick.dataset.test);
  [...meanInputs.children].forEach((input, i) => {
    input.value = Math.round(state.means[i] * 20);
    input.setAttribute('aria-valuetext', trim(state.means[i]));
  });
}

function note() {
  const many = Math.ceil(state.n / (1 - state.dropout) - 1e-9);
  const dropout = state.dropout > 0 ? `, to allow for ${percent(state.dropout)} dropout` : '';
  return `Recruit ${count(many)} in each ${unit()}, ${count(state.means.length * many)} in total${dropout}.`;
}

function showText() {
  const list = tests(state);
  const found = list.filter((test) => test.size >= 1e-9);
  const power = new Map(found.map((test) => [test, powerOf(state, test, state.n, list)]));
  const weakest = found.reduce((a, b) => (!a || power.get(b) < power.get(a) ? b : a), null);
  const every = found.length ? Math.max(...found.map((test) => neededFor(state, test, list))) : 0;
  readouts.name.textContent = `People in each ${unit()}`;
  readouts.number.textContent = count(state.n);
  readouts.note.textContent = note();
  readouts.reachedName.textContent = `Tests at ${percent(state.target)} power`;
  readouts.reached.textContent = `${found.filter((test) => power.get(test) >= state.target).length} of ${found.length}`;
  readouts.weakest.textContent = weakest ? `${short(weakest.name)}, ${formatPower(power.get(weakest), state.target)}` : 'none';
  readouts.weakest.classList.toggle('short', Boolean(weakest) && power.get(weakest) < state.target);
  readouts.every.textContent = !found.length ? 'none' : every === Infinity ? 'too many' : count(every);
  narration.textContent = narrate(state);
  if (template) template.innerHTML = report(state);
}

function set(changes) {
  Object.assign(state, changes);
  if ('design' in changes) {
    state.means = [...MEANS[state.design]];
    state.plan = [...planFor(state.design)];
  }
  if ('n' in changes && !('fixed' in changes)) state.fixed = true;
  state.n = state.fixed ? snap(state.n) : fit(state);
  build();
  showControls();
  schedule();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    showText();
    draw();
  });
}

function refit() {
  domain = [Math.min(...state.means) - 2.6 * state.sd, Math.max(...state.means) + 2.6 * state.sd];
}

function niceStep(span) {
  const raw = span / 6;
  const scale = 10 ** Math.floor(Math.log10(raw));
  return scale * [1, 2, 2.5, 5, 10].find((m) => m * scale >= raw);
}

function drawBells() {
  marks.title.textContent = `Where each ${unit()}’s scores fall`;
  let x = R;
  [...legend.children].reverse().forEach((el) => {
    if (el.tagName === 'text') {
      x -= el.getComputedTextLength();
      place(el, { x });
      x -= 18;
    } else {
      place(el, { x });
      x -= 22;
    }
  });
  const values = Array.from({ length: 121 }, (_, i) => domain[0] + (i * (domain[1] - domain[0])) / 120);
  const paths = [...bells.children];
  state.means.forEach((mean, i) => {
    const points = values.map((v) => `${round(ox(v))},${round(BASE - (pdf((v - mean) / state.sd) / pdf(0)) * (BASE - TOP))}`);
    place(paths[2 * i], { d: `M${points.join('L')}L${R},${BASE}L${L},${BASE}Z` });
    place(paths[2 * i + 1], { d: `M${points.join('L')}` });
  });
  const order = state.means.map((mean, i) => ({ i, x: ox(mean) })).sort((a, b) => a.x - b.x);
  const levels = [];
  order.forEach(({ i, x: at }, k) => {
    let level = 0;
    while (order.slice(0, k).some((other) => levels[other.i] === level && Math.abs(other.x - at) < 22)) level += 1;
    levels[i] = level;
  });
  [...markers.children].forEach((group, i) => {
    const [guide, knob, number, grab] = group.children;
    const at = ox(state.means[i]);
    const y = TOP - 18 - 24 * levels[i];
    place(guide, { x1: at, x2: at, y1: y + 10 });
    place(knob, { cx: at, cy: y });
    place(number, { x: at, y: y + 4 });
    place(grab, { cx: at, cy: y });
  });
}

function drawPowers() {
  const list = tests(state);
  powers.replaceChildren();
  crossings.replaceChildren();
  place(marks.target, { y1: py(state.target), y2: py(state.target) });
  const px = nx(state.n);
  place(marks.plan, { x1: px, x2: px });
  marks.planLabel.textContent = count(state.n);
  const half = marks.planLabel.getComputedTextLength() / 2;
  place(marks.planLabel, { x: clamp(px, L + half, R - half) });
  marks.peopleTitle.textContent = `People in each ${unit()}`;

  const shapes = new Map();
  for (const test of list.filter((t) => t.size >= 1e-9)) {
    const key = `${test.kind} ${test.size.toFixed(6)} ${test.d1 ?? ''}`;
    if (!shapes.has(key)) shapes.set(key, []);
    shapes.get(key).push(test);
  }
  const taken = [box(marks.planLabel)];
  const area = [L + 2, PT - 10, R, PB - 2];
  const labels = [];
  for (const group of shapes.values()) {
    const [test] = group;
    const enough = powerOf(state, test, state.n, list) >= state.target;
    const status = enough ? 'enough' : 'short';
    const planned = group.some((t) => state.plan.includes(t.id));
    const points = NS.map((n) => `${round(nx(n))},${round(py(powerOf(state, test, Math.max(n, 2), list)))}`);
    make('path', { d: `M${points.join('L')}`, class: `${status}${planned ? ' planned' : ''}` }, powers);
    const need = neededFor(state, test, list);
    if (need > 1000) continue;
    const cx = nx(need);
    const cy = py(state.target);
    make('circle', { cx, cy, r: 5, class: status }, crossings);
    taken.push([cx - 6, cy - 6, cx + 6, cy + 6]);
    const text = make('text', { class: status }, crossings);
    const words = joined(group.map(tag));
    text.textContent = `${words[0].toUpperCase()}${words.slice(1)}, ${count(need)}`;
    labels.push({ text, cx, cy });
  }
  labels.sort((a, b) => a.cx - b.cx);
  for (const { text, cx, cy } of labels) {
    settle(text, [
      { x: cx - 9, y: cy - 10, anchor: 'end' },
      { x: cx + 9, y: cy + 22, anchor: 'start' },
      { x: cx + 9, y: cy - 10, anchor: 'start' },
      { x: cx - 9, y: cy + 22, anchor: 'end' },
      { x: cx + 9, y: cy + 40, anchor: 'start' },
      { x: cx - 9, y: cy + 40, anchor: 'end' },
    ], taken, area);
  }
}

function drawAxes() {
  axes.replaceChildren();
  for (const [x1, y1, x2, y2] of [
    [L, BASE, R, BASE],
    [L, PT, L, PB],
    [L, PB, R, PB],
  ]) make('line', { class: 'axis-line', x1, y1, x2, y2 }, axes);
  const step = niceStep(domain[1] - domain[0]);
  for (let v = Math.ceil(domain[0] / step) * step; v <= domain[1] + 1e-9; v += step) {
    const x = ox(v);
    make('line', { class: 'axis-tick', x1: x, x2: x, y1: BASE, y2: BASE + 5 }, axes);
    make('text', { class: 'axis-label', x, y: 320, 'text-anchor': 'middle' }, axes).textContent = minus(trim(v));
  }
  for (const n of N_TICKS) {
    const x = nx(n);
    make('line', { class: 'axis-tick', x1: x, x2: x, y1: PB, y2: PB + 5 }, axes);
    make('text', { class: 'axis-label', x, y: 632, 'text-anchor': 'middle' }, axes).textContent = count(n);
  }
  const ty = py(state.target);
  make('text', { class: 'axis-label target-mark', x: L - 10, y: ty + 5, 'text-anchor': 'end' }, axes).textContent = percent(state.target);
  for (const [p, label] of [
    [0, '0%'],
    [1, '100%'],
  ]) {
    const at = py(p);
    make('line', { class: 'axis-tick', x1: L - 5, x2: L, y1: at, y2: at }, axes);
    if (Math.abs(at - ty) >= 15) make('text', { class: 'axis-label', x: L - 10, y: at + 5, 'text-anchor': 'end' }, axes).textContent = label;
  }
}

function draw() {
  if (drag === null) refit();
  drawBells();
  drawPowers();
  drawAxes();
}

for (const [name, { input }] of Object.entries(rulers)) {
  input.addEventListener('input', () => {
    const value = SLIDERS[name].fromValue(Number(input.value));
    if (value !== state[name]) set({ [name]: value });
    else showControls();
  });
}

for (const button of designs) {
  button.addEventListener('click', () => {
    if (button.dataset.design !== state.design) set({ design: button.dataset.design });
  });
}

keep.addEventListener('change', () => set({ fixed: keep.checked }));
correct.addEventListener('change', () => set({ correct: correct.checked }));
restart.addEventListener('click', () => set(copy(START)));

const pointer = (event) => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());

svg.addEventListener('pointerdown', (event) => {
  const grab = event.target.closest('.grab');
  if (!grab || event.button > 0) return;
  event.preventDefault();
  drag = Number(grab.dataset.index);
  svg.setPointerCapture(event.pointerId);
});

svg.addEventListener('pointermove', (event) => {
  if (drag !== null) setMean(drag, vOf(pointer(event).x));
});

function release() {
  if (drag === null) return;
  drag = null;
  schedule();
}

svg.addEventListener('pointerup', release);
svg.addEventListener('pointercancel', release);

document.fonts.ready.then(() => draw());
set({});
