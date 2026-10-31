import { formatAlpha, formatPower } from '../lib/narration.js';
import {
  ALPHAS,
  LEVELS,
  N_MAX,
  N_LIMIT,
  N_MIN,
  START,
  amount,
  count,
  fit,
  grainOf,
  high,
  low,
  lowest,
  narrate,
  needed,
  planned,
  powerAt,
  recruit,
  report,
  share,
  smallest,
  snap,
  stepOf,
  topOf,
  unitOf,
} from '../lib/planning.js';

const L = 74;
const R = 724;
const T = 34;
const B = 474;
const ST = 518;
const SB = 638;
const LOG_LO = Math.log(N_MIN);
const LOG_HI = Math.log(N_MAX);
const Y_TICKS = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
const BANDS = ['b0', 'b1', 'b2', 'b3'];
const SPOTS = { 0.5: 0.56, 0.8: 0.7, 0.9: 0.82, 0.95: 0.93 };
const MAP = [L + 2, T + 2, R - 2, B - 2];
const STRIP_AREA = [L + 2, ST - 6, R - 2, SB];
const SVG_NS = 'http://www.w3.org/2000/svg';

const root = document.querySelector('.planning');
const svg = root.querySelector('svg');
const find = (selector) => root.querySelector(selector);

const state = { ...START };
let signature = '';
let contours = [];
let drag = null;
let pending = null;
let queued = false;

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const percent = (p) => `${Math.round(100 * p)}%`;
const decimal = (v) => (v === 0 ? '0' : v.toFixed(2).replace(/^0/, ''));
const trim = (v) => `${Number(v.toFixed(2))}`;
const toGrain = (v) => Number((Math.round(v / grainOf(state)) * grainOf(state)).toFixed(2));
const spread = (count, from) => Array.from({ length: count }, (_, i) => (topOf(state) * (i + from)) / (count - 1 + from));

const xOf = (v) => L + (v / topOf(state)) * (R - L);
const vOf = (px) => ((px - L) / (R - L)) * topOf(state);
const yOf = (n) => B - ((Math.log(n) - LOG_LO) / (LOG_HI - LOG_LO)) * (B - T);
const nOf = (py) => Math.exp(LOG_LO + ((B - py) / (B - T)) * (LOG_HI - LOG_LO));
const sy = (p) => SB - p * (SB - ST);
const planY = () => yOf(Math.min(state.n, N_MAX));
const yLimited = (n) => (n === Infinity ? T - 400 : Math.max(T - 400, yOf(n)));

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

const paths = {
  bands: Object.fromEntries(BANDS.map((name) => [name, find(`.band.${name}`)])),
  contours: [...root.querySelectorAll('.contour[data-level]')],
  target: find('.contour.target'),
  strip: find('.strip-curve'),
};
const labels = {
  contours: [...root.querySelectorAll('.contour-label[data-level]')],
  target: find('.contour-label.target'),
  people: find('.people-label'),
  ends: [find('.strip-label.low'), find('.strip-label.high')],
};
const marks = {
  barHalo: find('.bar-halo'),
  endsHalo: find('.ends-halo'),
  short: find('.plan-short'),
  long: find('.plan-long'),
  ends: [find('.plan-end.low'), find('.plan-end.high')],
  dot: find('.dot'),
  rangeBand: find('.range-band'),
  stripTarget: find('.strip-target'),
  stripEnds: [find('.strip-mark.low'), find('.strip-mark.high')],
  stripGuess: find('.strip-guess'),
  barGrab: find('.bar-grab'),
  endGrabs: [find('.end-grab.low'), find('.end-grab.high')],
  dotGrab: find('.dot-grab'),
};
const titles = { y: find('.y-title'), strip: find('.strip-title'), x: find('.x-title') };
const axes = find('.axes');
const readouts = {
  name: find('.answer-name'),
  number: find('.answer-number'),
  note: find('.answer-note'),
  coveredName: find('.covered-name'),
  covered: find('.covered'),
  low: find('.low-end'),
  whole: find('.whole'),
};
const narration = find('.narration');
const template = document.getElementById('report-text');
const keep = find('.keep input');
const peopleInput = find('input.people');
const restart = find('.restart');
const designs = [...root.querySelectorAll('.designs button')];

const SLIDERS = {
  guess: { toValue: (s) => Math.round(s.guess / grainOf(s)), fromValue: (v) => toGrain(v * grainOf(state)), text: (s) => amount(s.guess), unit: true },
  half: {
    toValue: (s) => Math.round(s.half / grainOf(s)),
    fromValue: (v) => toGrain(v * grainOf(state)),
    text: (s) => (s.half ? `${amount(low(s))} to ${amount(high(s))}` : amount(s.guess)),
    unit: true,
  },
  target: { toValue: (s) => Math.round(s.target * 100), fromValue: (v) => v / 100, text: (s) => percent(s.target) },
  alpha: { toValue: (s) => ALPHAS.indexOf(s.alpha), fromValue: (v) => ALPHAS[v], text: (s) => formatAlpha(s.alpha) },
  sd: { toValue: (s) => s.sd, fromValue: (v) => v, text: (s) => `${s.sd}` },
  rate: { toValue: (s) => Math.round(s.rate * 100), fromValue: (v) => v / 100, text: (s) => percent(s.rate) },
  dropout: { toValue: (s) => Math.round(s.dropout * 100), fromValue: (v) => v / 100, text: (s) => percent(s.dropout) },
  rho: { toValue: (s) => Math.round(s.rho * 20), fromValue: (v) => v / 20, text: (s) => decimal(s.rho) },
  size: { toValue: (s) => s.size, fromValue: (v) => v, text: (s) => `${s.size}` },
  icc: { toValue: (s) => Math.round(s.icc * 100), fromValue: (v) => v / 100, text: (s) => decimal(s.icc) },
};

const rulers = {};
for (const input of root.querySelectorAll('.controls input')) {
  const control = input.closest('.control');
  rulers[input.dataset.name] = { input, control, value: control.querySelector('.value') };
}

const paired = () => state.design === 'paired';

const fill = (input) => input.style.setProperty('--fill', `${(100 * (input.value - input.min)) / (input.max - input.min)}%`);

function showControls() {
  const grains = Math.floor(topOf(state) / grainOf(state) + 1e-9);
  place(rulers.guess.input, { min: 1, max: grains });
  place(rulers.half.input, { min: 0, max: Math.floor(grains / 2) });
  for (const [name, { input, control, value }] of Object.entries(rulers)) {
    const only = control.dataset.designs;
    control.hidden = Boolean(only) && !only.split(' ').includes(state.design);
    const { toValue, text, unit } = SLIDERS[name];
    input.value = toValue(state);
    fill(input);
    value.textContent = text(state);
    input.setAttribute('aria-valuetext', unit ? `${text(state)}${unitOf(state)}` : text(state));
  }
  for (const button of designs) button.setAttribute('aria-pressed', String(button.dataset.design === state.design));
  keep.checked = state.fixed;
  const step = stepOf(state);
  place(peopleInput, { min: lowest(state), max: Math.floor(N_MAX / step) * step, step });
  peopleInput.value = state.n;
  peopleInput.setAttribute('aria-valuetext', paired() ? `${count(state.n)} people` : `${count(state.n)} people in each group`);
}

function note() {
  const many = recruit(state);
  const clusters = state.design === 'clusters' ? `${count(state.n / state.size)} clusters of ${state.size} in each group. ` : '';
  const who = paired() ? `${count(many)} people` : `${count(many)} in each group, ${count(2 * many)} in total`;
  const dropout = state.dropout > 0 ? `, to allow for ${percent(state.dropout)} dropout` : '';
  return `${clusters}Recruit ${who}${dropout}.`;
}

function showText() {
  const lo = low(state);
  const atLow = powerAt(state, state.n, lo);
  const whole = planned(state, lo, state.target);
  readouts.name.textContent = paired() ? 'People' : 'People in each group';
  readouts.number.textContent = count(state.n);
  readouts.note.textContent = note();
  readouts.coveredName.textContent = `Range at ${percent(state.target)} power`;
  readouts.covered.textContent = percent(share(state));
  readouts.low.textContent = formatPower(atLow, state.target);
  readouts.low.classList.toggle('short', atLow < state.target);
  readouts.whole.textContent = whole === Infinity ? `over ${count(N_LIMIT)}` : count(whole);
  narration.textContent = narrate(state);
  if (template) template.innerHTML = report(state);
}

function set(changes) {
  const before = topOf(state);
  Object.assign(state, changes);
  const ratio = topOf(state) / before;
  if (ratio !== 1 && !('guess' in changes)) {
    state.guess *= ratio;
    state.half *= ratio;
  }
  const grain = grainOf(state);
  const grains = Math.floor(topOf(state) / grain + 1e-9);
  state.guess = clamp(toGrain(state.guess), grain, toGrain(grains * grain));
  state.half = clamp(toGrain(state.half), 0, toGrain(Math.floor(grains / 2) * grain));
  if ('n' in changes && !('fixed' in changes)) state.fixed = true;
  state.n = state.fixed ? snap(state, state.n) : fit(state);
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

function computeContours() {
  const key = [state.design, state.sd, state.alpha, state.target, state.rate, state.rho, state.size, state.icc].join(' ');
  if (key === signature) return;
  signature = key;
  contours = [...LEVELS, state.target].map((level) => spread(60, 1).map((v) => [xOf(v), yLimited(needed(state, v, level))]));
}

const line = (points) => `M${points.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}`;
const below = (points) => `M${L},${T - 2}L${points.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}L${R},${B + 2}L${L},${B + 2}Z`;

function drawMap() {
  BANDS.forEach((name, i) => paths.bands[name].setAttribute('d', below(contours[i])));
  paths.contours.forEach((path, i) => {
    path.setAttribute('d', line(contours[i]));
    path.setAttribute('visibility', Math.abs(LEVELS[i] - state.target) < 1e-9 ? 'hidden' : 'visible');
  });
  paths.target.setAttribute('d', line(contours[LEVELS.length]));
}

function drawPlan() {
  const lo = low(state);
  const hi = high(state);
  const y = planY();
  const x0 = xOf(lo);
  const x1 = xOf(hi);
  const found = smallest(state, state.n, state.target);
  const split = clamp(found === Infinity ? x1 : xOf(found), x0, x1);
  const span = x1 - x0 > 0.5;
  const shown = (on) => (on ? 'visible' : 'hidden');
  place(marks.barHalo, { x1: x0 - 1, x2: x1 + 1, y1: y, y2: y, visibility: shown(span) });
  place(marks.endsHalo, { d: `M${round(x0)},${round(y - 10)}V${round(y + 10)}M${round(x1)},${round(y - 10)}V${round(y + 10)}`, visibility: shown(span) });
  place(marks.short, { x1: x0, x2: split, y1: y, y2: y, visibility: shown(span && split > x0 + 1) });
  place(marks.long, { x1: split, x2: x1, y1: y, y2: y, visibility: shown(span && x1 > split + 1) });
  [x0, x1].forEach((x, i) => {
    place(marks.ends[i], { x1: x, x2: x, y1: y - 9, y2: y + 9, visibility: shown(span) });
    place(marks.endGrabs[i], { x: x - 16, y: y - 24, width: 32, height: 48, visibility: shown(span) });
  });
  const dotX = xOf(state.guess);
  place(marks.dot, { cx: dotX, cy: y });
  place(marks.dotGrab, { cx: dotX, cy: y });
  place(marks.barGrab, { x: x0 - 8, y: y - 22, width: x1 - x0 + 16, height: 44 });
  drawContourLabels([
    [x0 - 8, y - 12, x1 + 8, y + 12],
    [dotX - 12, y - 12, dotX + 12, y + 12],
  ]);
  return { lo, hi, y };
}

function slope(points, x) {
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    if (bx < x) continue;
    const u = (x - ax) / (bx - ax);
    return { y: ay + u * (by - ay), angle: (Math.atan2(by - ay, bx - ax) * 180) / Math.PI };
  }
  return null;
}

function tone(level) {
  if (level < 0.8) return 'tone-1';
  if (level < 0.9) return 'tone-2';
  if (level < 0.95) return 'tone-3';
  return 'tone-4';
}

function drawContourLabels(taken) {
  const jobs = [[labels.target, contours[LEVELS.length], state.target, `${percent(state.target)} power`, SPOTS[0.8]]];
  LEVELS.forEach((level, i) => {
    if (Math.abs(level - state.target) < 1e-9) labels.contours[i].setAttribute('visibility', 'hidden');
    else jobs.push([labels.contours[i], contours[i], level, percent(level), SPOTS[level]]);
  });
  for (const [label, points, level, text, spot] of jobs) {
    label.textContent = text;
    label.classList.remove('tone-1', 'tone-2', 'tone-3', 'tone-4');
    label.classList.add(tone(level));
    const length = label.getComputedTextLength();
    const home = L + spot * (R - L);
    const tries = Array.from({ length: 101 }, (_, k) => home + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 10);
    let placed = false;
    for (const x of tries) {
      if (x < L + 20 || x > R - 20) continue;
      const at = slope(points, x);
      if (!at || Math.abs(at.angle) > 55) continue;
      const a = (at.angle * Math.PI) / 180;
      const w = (length * Math.abs(Math.cos(a)) + 14 * Math.abs(Math.sin(a))) / 2;
      const h = (length * Math.abs(Math.sin(a)) + 14 * Math.abs(Math.cos(a))) / 2;
      const room = [x - w - 3, at.y - h - 3, x + w + 3, at.y + h + 3];
      if (!within(room, MAP) || taken.some((other) => meets(other, room))) continue;
      place(label, { x, y: at.y, transform: `rotate(${round(at.angle)} ${round(x)} ${round(at.y)})`, visibility: 'visible' });
      taken.push(room);
      placed = true;
      break;
    }
    if (!placed) label.setAttribute('visibility', 'hidden');
  }
}

function drawStrip({ lo, hi }) {
  const span = hi - lo > 1e-9;
  paths.strip.setAttribute('d', line(spread(121, 0).map((v) => [xOf(v), sy(powerAt(state, state.n, v))])));
  place(marks.rangeBand, { x: xOf(lo), width: xOf(hi) - xOf(lo), visibility: span ? 'visible' : 'hidden' });
  place(marks.stripTarget, { y1: sy(state.target), y2: sy(state.target) });
  titles.strip.textContent = paired() ? `Power with ${count(state.n)} people` : `Power with ${count(state.n)} in each group`;

  const gx = xOf(state.guess);
  const gy = sy(powerAt(state, state.n, state.guess));
  place(marks.stripGuess, { cx: gx, cy: gy });
  const taken = [[gx - 8, gy - 8, gx + 8, gy + 8]];
  const ends = [lo, hi].map((v, i) => {
    const p = powerAt(state, state.n, v);
    const x = xOf(v);
    const y = sy(p);
    const mark = marks.stripEnds[i];
    place(mark, { cx: x, cy: y, visibility: span ? 'visible' : 'hidden' });
    mark.classList.toggle('short', p < state.target);
    mark.classList.toggle('enough', p >= state.target);
    if (span) taken.push([x - 7, y - 7, x + 7, y + 7]);
    return { p, x, y };
  });
  ends.forEach(({ p, x, y }, i) => {
    const label = labels.ends[i];
    if (!span) {
      label.setAttribute('visibility', 'hidden');
      return;
    }
    label.textContent = formatPower(p, state.target);
    label.classList.toggle('short', p < state.target);
    label.classList.toggle('enough', p >= state.target);
    const spots = i
      ? [
          { x: x + 10, y: y + 18, anchor: 'start' },
          { x: x + 10, y: y + 5, anchor: 'start' },
          { x: x - 10, y: y - 9, anchor: 'end' },
        ]
      : [
          { x: x - 10, y: y + 5, anchor: 'end' },
          { x: x - 10, y: y - 9, anchor: 'end' },
          { x: x + 10, y: y + 18, anchor: 'start' },
        ];
    settle(label, spots, taken, STRIP_AREA);
  });
}

function rows() {
  if (state.design === 'proportions') {
    const rate = Math.round(state.rate * 100);
    return { second: 'treated', text: (v) => `${trim(rate - v)}%` };
  }
  return { second: 'd', text: (v) => trim(v / state.sd) };
}

function xTicks() {
  const top = topOf(state);
  const step = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10].find((v) => top / v <= 7);
  return Array.from({ length: Math.floor(top / step + 1e-9) + 1 }, (_, i) => Number((i * step).toFixed(2)));
}

function drawAxes({ y }) {
  axes.replaceChildren();
  for (const [x1, y1, x2, y2] of [
    [L, T, L, B],
    [L, B, R, B],
    [L, ST, L, SB],
    [L, SB, R, SB],
  ]) make('line', { class: 'axis-line', x1, y1, x2, y2 }, axes);

  place(labels.people, { y: y + 5 });
  labels.people.textContent = count(state.n);
  for (const n of Y_TICKS) {
    const ty = yOf(n);
    make('line', { class: 'axis-tick', x1: L - 5, x2: L, y1: ty, y2: ty }, axes);
    if (Math.abs(ty - y) >= 16) make('text', { class: 'axis-label', x: L - 10, y: ty + 5, 'text-anchor': 'end' }, axes).textContent = count(n);
  }

  const { second, text } = rows();
  for (const v of xTicks()) {
    const x = xOf(v);
    for (const at of [B, SB]) make('line', { class: 'axis-tick', x1: x, x2: x, y1: at, y2: at + 5 }, axes);
    make('text', { class: 'axis-label', x, y: 658, 'text-anchor': 'middle' }, axes).textContent = v;
    make('text', { class: 'axis-label', x, y: 680, 'text-anchor': 'middle' }, axes).textContent = text(v);
  }
  const secondLabel = make('text', { class: 'axis-label', x: L - 24, y: 680, 'text-anchor': 'end' }, axes);
  secondLabel.textContent = second;
  if (second === 'd') secondLabel.setAttribute('font-style', 'italic');

  const ty = sy(state.target);
  make('line', { class: 'axis-tick', x1: L - 5, x2: L, y1: ty, y2: ty }, axes);
  make('text', { class: 'axis-label target-mark', x: L - 10, y: ty + 5, 'text-anchor': 'end' }, axes).textContent = percent(state.target);
  for (const [p, label] of [
    [0, '0%'],
    [1, '100%'],
  ]) {
    const at = sy(p);
    make('line', { class: 'axis-tick', x1: L - 5, x2: L, y1: at, y2: at }, axes);
    if (Math.abs(at - ty) >= 15) make('text', { class: 'axis-label', x: L - 10, y: at + 5, 'text-anchor': 'end' }, axes).textContent = label;
  }

  titles.y.textContent = paired() ? 'People' : 'People in each group';
  titles.x.textContent = state.design === 'proportions' ? 'True difference (percentage points)' : 'True effect';
}

function draw() {
  computeContours();
  drawMap();
  const plan = drawPlan();
  drawStrip(plan);
  drawAxes(plan);
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
peopleInput.addEventListener('input', () => set({ n: Number(peopleInput.value) }));
peopleInput.addEventListener('focus', () => root.classList.add('people-focus'));
peopleInput.addEventListener('blur', () => root.classList.remove('people-focus'));
restart.addEventListener('click', () => set({ ...START }));

const pointer = (event) => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
const inMap = (p) => p.x >= L && p.x <= R && p.y >= T && p.y <= B;
const inStrip = (p) => p.x >= L && p.x <= R && p.y >= ST && p.y <= SB;

function modeAt(target, p) {
  const grab = target.closest('.grab');
  if (grab?.classList.contains('dot-grab')) return 'dot';
  if (grab?.classList.contains('end-grab')) return 'end';
  if (grab || inMap(p)) return 'bar';
  if (inStrip(p)) return 'guess';
  return null;
}

function move(p) {
  const { mode, dx, dy } = drag;
  if (mode === 'bar') set({ n: snap(state, nOf(p.y + dy)) });
  else if (mode === 'dot') set({ guess: vOf(p.x + dx) });
  else if (mode === 'end') set({ half: Math.abs(vOf(p.x + dx) - state.guess) });
  else set({ guess: vOf(p.x) });
}

function begin(event, mode, p, grabbed) {
  let dx = 0;
  if (mode === 'dot') dx = xOf(state.guess) - p.x;
  if (mode === 'end') {
    const ends = [xOf(low(state)), xOf(high(state))];
    dx = ends.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a)) - p.x;
  }
  drag = { mode, dx, dy: grabbed ? planY() - p.y : 0 };
  svg.setPointerCapture(event.pointerId);
  move(p);
}

svg.addEventListener('pointerdown', (event) => {
  if (event.button > 0) return;
  const p = pointer(event);
  const mode = modeAt(event.target, p);
  if (!mode) return;
  const grabbed = Boolean(event.target.closest('.grab'));
  if (event.pointerType === 'mouse' || grabbed) {
    event.preventDefault();
    begin(event, mode, p, grabbed);
  } else pending = { id: event.pointerId, x: event.clientX, y: event.clientY, mode };
});

svg.addEventListener('pointermove', (event) => {
  if (drag) move(pointer(event));
  else if (pending && pending.id === event.pointerId) {
    const dx = Math.abs(event.clientX - pending.x);
    const dy = Math.abs(event.clientY - pending.y);
    if (pending.mode === 'guess' && dx > 6 && dx > dy) {
      const { mode } = pending;
      pending = null;
      begin(event, mode, pointer(event), false);
    } else if (dx > 6 || dy > 6) pending = null;
  }
});

svg.addEventListener('pointerup', (event) => {
  if (pending && pending.id === event.pointerId) {
    drag = { mode: pending.mode, dx: 0, dy: 0 };
    move(pointer(event));
    pending = null;
  }
  drag = null;
});

svg.addEventListener('pointercancel', () => {
  pending = null;
  drag = null;
});

document.fonts.ready.then(() => draw());
set({});
