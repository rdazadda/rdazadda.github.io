import { START, formatAlpha, formatEffect, formatP, formatPercent, minus, narrate, pNumber } from '../lib/narration.js';
import { density, pValue, power, tTest } from '../lib/t-test.js';

const ALPHAS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2];
const N_MIN = 5;
const N_MAX = 1000;
const LEFT = 0;
const RIGHT = 1000;
const MIDDLE = (LEFT + RIGHT) / 2;
const BASES = [230, 470];
const HEIGHT = 172;
const SAMPLES = Array.from({ length: 251 }, (_, i) => LEFT + 4 * i);
const SVG_NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.querySelector('.significance');
const svg = root.querySelector('svg');
const find = (selector) => root.querySelector(selector);

const state = { ...START };
let settled = { ...START };
let tests;
let domain = null;
let shown = null;
let dragging = false;
let pending = null;
let running = false;
let last = null;

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const xOf = (v) => LEFT + ((v - shown[0]) / (shown[1] - shown[0])) * (RIGHT - LEFT);
const vOf = (px) => shown[0] + ((px - LEFT) / (RIGHT - LEFT)) * (shown[1] - shown[0]);

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

function outward(width, gap) {
  const at = xOf(state.result);
  const side = state.result >= 0 ? 1 : -1;
  const fits = side > 0 ? at + gap + width <= RIGHT : at - gap - width >= LEFT;
  return fits ? side : -side;
}

function dodge(label, x, lo, hi, fits) {
  const half = label.getComputedTextLength() / 2;
  if (hi - lo < 2 * half + 8) return null;
  const inside = (c) => clamp(c, lo + 4 + half, hi - 4 - half);
  const at = xOf(state.result);
  const spot = inside(x);
  const peak = inside(xOf(state.d));
  const spots = [spot, ...[0.25, 0.5, 0.75, 1].map((u) => spot + (peak - spot) * u), at - half - 8, at + half + 8];
  return spots
    .filter((c) => c === inside(c) && Math.abs(c - at) >= half + 8 && fits(c, half))
    .sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot))[0] ?? null;
}

const paths = {};
for (const name of ['null-middle', 'null-tail', 'p-tail', 'null-line', 'real-middle', 'real-tail', 'real-line']) paths[name] = find(`.${name}`);
const cuts = [find('.cut.low'), find('.cut.high')];
const cutLabels = [find('.cut-label.low'), find('.cut-label.high')];
const needle = find('.needle');
const knob = find('.knob');
const needleLabel = find('.needle-label');
const studyValue = find('.study-value');
const pLabel = find('.p-label');
const pRest = find('.p-rest');
const alarmLabel = find('.alarm-label');
const wrongLabel = find('.wrong-label');
const lanes = [find('.lane.null'), find('.lane.real')];
const areaLabels = { found: find('.area-label.found'), missed: find('.area-label.missed') };
const axisGroup = find('.axis');
const readouts = {
  power: find('.readout.power .number'),
  powerMeaning: find('.readout.power .meaning'),
  alarms: find('.readout.alarms .number'),
  p: find('.readout.p .number'),
};
const resultInput = find('.result');
const restart = find('.restart');
const narration = find('.narration');

const SLIDERS = {
  n: {
    toValue: (n) => Math.round((1000 * Math.log(n / N_MIN)) / Math.log(N_MAX / N_MIN)),
    fromValue: (v) => Math.round(N_MIN * (N_MAX / N_MIN) ** (v / 1000)),
    text: (n) => n.toLocaleString('en-US'),
  },
  d: { toValue: (d) => Math.round(d * 100), fromValue: (v) => v / 100, text: (d) => d.toFixed(2) },
  alpha: { toValue: (a) => ALPHAS.indexOf(a), fromValue: (v) => ALPHAS[v], text: formatAlpha },
};

const rulers = {};
for (const input of root.querySelectorAll('.sliders input')) {
  rulers[input.dataset.name] = { input, value: input.closest('.ruler').querySelector('.value') };
}

function refit() {
  const { se, df } = tests[0];
  const reach = 4.3 * se * (1 + 2 / df);
  const lo = Math.min(-reach, state.d - reach, state.result - 0.25 * reach);
  const hi = Math.max(reach, state.d + reach, state.result + 0.25 * reach);
  if (domain && lo >= domain[0] && hi <= domain[1] && hi - lo > 0.55 * (domain[1] - domain[0])) return;
  const pad = 0.04 * (hi - lo);
  domain = [lo - pad, hi + pad];
  if (!shown || reduceMotion) shown = [...domain];
}

function showControls() {
  for (const [name, { input, value }] of Object.entries(rulers)) {
    const text = SLIDERS[name].text(state[name]);
    input.value = SLIDERS[name].toValue(state[name]);
    value.textContent = text;
    input.setAttribute('aria-valuetext', text);
  }
  resultInput.value = Math.round(state.result * 100);
  resultInput.setAttribute('aria-valuetext', `A study observes ${formatEffect(state.result)}`);
  root.classList.toggle('no-effect', state.d === 0);
}

function showText() {
  const real = state.d > 0;
  readouts.power.textContent = real ? formatPercent(power(tests[1])) : 'none';
  readouts.powerMeaning.textContent = real ? 'share of real-effect studies that are significant' : 'no real effect to find';
  readouts.alarms.textContent = formatPercent(state.alpha);
  readouts.p.textContent = pNumber(pValue(tests[0], state.result));
  narration.innerHTML = narrate(state, settled);
}

function settle() {
  settled = { ...state };
}

function set(changes) {
  Object.assign(state, changes);
  tests = [tTest(state.n, 0, state.alpha), tTest(state.n, state.d, state.alpha)];
  if (!dragging) refit();
  showControls();
  showText();
  kick();
}

function drawCurves(values, heights, scale, cut) {
  const band = (w, a, b) => {
    const lo = Math.max(a, shown[0]);
    const hi = Math.min(b, shown[1]);
    if (hi <= lo) return '';
    const base = BASES[w];
    const points = [[xOf(lo), base - scale * density(tests[w], lo)]];
    values.forEach((v, i) => {
      if (v > lo && v < hi) points.push([SAMPLES[i], base - heights[w][i]]);
    });
    points.push([xOf(hi), base - scale * density(tests[w], hi)]);
    return `M${round(xOf(lo))},${base}L${points.map(([px, py]) => `${round(px)},${round(py)}`).join('L')}L${round(xOf(hi))},${base}Z`;
  };
  const line = (w) => {
    const first = Math.max(0, heights[w].findIndex((h) => h > 0.3) - 1);
    const end = Math.min(SAMPLES.length - 1, heights[w].findLastIndex((h) => h > 0.3) + 1);
    return `M${SAMPLES.slice(first, end + 1).map((px, i) => `${px},${round(BASES[w] - heights[w][first + i])}`).join('L')}`;
  };
  const far = Math.abs(state.result);
  paths['null-middle'].setAttribute('d', band(0, -cut, cut));
  paths['null-tail'].setAttribute('d', band(0, -Infinity, -cut) + band(0, cut, Infinity));
  paths['p-tail'].setAttribute('d', band(0, -Infinity, -far) + band(0, far, Infinity));
  paths['null-line'].setAttribute('d', line(0));
  paths['real-middle'].setAttribute('d', band(1, -cut, cut));
  paths['real-tail'].setAttribute('d', band(1, -Infinity, -cut) + band(1, cut, Infinity));
  paths['real-line'].setAttribute('d', line(1));
}

function drawMarks(cut) {
  const xs = [xOf(-cut), xOf(cut)];
  cuts.forEach((line, i) => place(line, { x1: xs[i], x2: xs[i] }));
  cutLabels.forEach((label, i) => place(label, { x: xs[i], visibility: 'visible' }));
  if (xs[1] - xs[0] < cutLabels[0].getComputedTextLength() + 12) cutLabels[0].setAttribute('visibility', 'hidden');
  const at = xOf(state.result);
  place(needle, { x1: at, x2: at });
  place(knob, { cx: at });
  const width = needleLabel.getComputedTextLength();
  const side = outward(width, 10);
  place(needleLabel, { x: at + side * 10, 'text-anchor': side > 0 ? 'start' : 'end' });
  const taken = side > 0 ? [at + 4, at + 16 + width] : [at - 16 - width, at - 4];
  cutLabels.forEach((label, i) => {
    const labelHalf = label.getComputedTextLength() / 2;
    if (xs[i] + labelHalf > taken[0] && xs[i] - labelHalf < taken[1]) label.setAttribute('visibility', 'hidden');
  });
  studyValue.textContent = formatEffect(state.result);
  const valueHalf = studyValue.getComputedTextLength() / 2;
  place(studyValue, { x: clamp(at, LEFT + valueHalf, RIGHT - valueHalf) });
}

function drawAlarmLabel(scale, cut) {
  const y = BASES[0] - scale * density(tests[0], cut) - 10;
  const width = alarmLabel.getComputedTextLength();
  const at = xOf(state.result);
  const taken = [box(pLabel), box(lanes[0])];
  for (const side of state.result < 0 ? [1, -1] : [-1, 1]) {
    const x = xOf(side * cut) + side * 6;
    const spot = side < 0 ? [x - width, y - 13, x, y + 4] : [x, y - 13, x + width, y + 4];
    if (spot[0] < LEFT || spot[2] > RIGHT) continue;
    if (at > spot[0] - 6 && at < spot[2] + 6) continue;
    if (taken.some((other) => meets(other, spot))) continue;
    place(alarmLabel, { x, y, 'text-anchor': side < 0 ? 'end' : 'start', visibility: 'visible' });
    return;
  }
  alarmLabel.setAttribute('visibility', 'hidden');
}

function drawLabels(scale, cut) {
  const real = state.d > 0;
  const at = xOf(state.result);
  lanes[1].textContent = real ? 'Real effect' : 'No effect';
  [0, state.d].forEach((center, w) => {
    const left = xOf(center) > MIDDLE + 40;
    place(lanes[w], { x: left ? LEFT : RIGHT - 2, 'text-anchor': left ? 'start' : 'end' });
  });

  pRest.textContent = ` ${formatP(pValue(tests[0], state.result))}`;
  const side = outward(pLabel.getComputedTextLength(), 12);
  const y = Math.max(80, BASES[0] - scale * density(tests[0], state.result) - 12);
  place(pLabel, { x: at + side * 12, y, 'text-anchor': side > 0 ? 'start' : 'end' });

  drawAlarmLabel(scale, cut);

  const se = tests[1].se;
  const foundAt = Math.max(cut, state.d) + 0.9 * se;
  const areas = [
    [areaLabels.found, foundAt, xOf(cut), RIGHT, xOf(Math.min(shown[1], foundAt + se)) - xOf(cut) > 60],
    [areaLabels.missed, clamp(state.d, -cut + 0.3 * se, cut - 0.6 * se), xOf(-cut), xOf(cut), xOf(cut) - xOf(-cut) > 80],
  ];
  const curve = (px) => scale * density(tests[1], vOf(px));
  const fits = (x, half) => curve(x) > 36 && Math.min(curve(x - half), curve(x + half)) > 0.36 * curve(x) + 6;
  for (const [label, value, lo, hi, room] of areas) {
    const x = real && room ? dodge(label, xOf(value), lo, hi, fits) : null;
    const height = x === null ? 0 : curve(x);
    place(label, { x: x ?? 0, y: BASES[1] - height * 0.36 + 5, visibility: x === null ? 'hidden' : 'visible' });
  }

  const wrongHeight = scale * density(tests[1], -cut);
  const wrongEnd = xOf(-cut) - 6;
  const wrongStart = wrongEnd - wrongLabel.getComputedTextLength();
  const wrongShows = real && wrongHeight >= 3 && wrongStart >= LEFT && (at < wrongStart - 6 || at > wrongEnd + 6);
  place(wrongLabel, { x: wrongEnd, y: BASES[1] - wrongHeight - 10, visibility: wrongShows ? 'visible' : 'hidden' });
}

function drawAxis() {
  axisGroup.replaceChildren();
  const [lo, hi] = shown;
  const raw = (hi - lo) / 6;
  const unit = 10 ** Math.floor(Math.log10(raw));
  const error = raw / unit;
  const [lead, parts] = error >= 7.07 ? [10, 5] : error >= 3.16 ? [5, 5] : error >= 1.41 ? [2, 4] : [1, 5];
  const step = lead * unit;
  const minor = step / parts;
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const valueAt = Number(studyValue.getAttribute('x'));
  const valueHalf = studyValue.getComputedTextLength() / 2;
  for (let i = Math.ceil(lo / minor - 1e-9); i <= Math.floor(hi / minor + 1e-9); i++) {
    const x = xOf(i * minor);
    const major = i % parts === 0;
    make('line', { class: major ? 'axis-tick' : 'axis-tick minor', x1: x, x2: x, y1: 471, y2: major ? 479 : 475 }, axisGroup);
    if (!major) continue;
    const label = make('text', { class: 'axis-label', x, y: 497 }, axisGroup);
    label.textContent = i === 0 ? '0' : minus((i * minor).toFixed(digits));
    const width = label.getComputedTextLength();
    if (Math.abs(x - valueAt) < valueHalf + width / 2 + 8 || x - width / 2 < LEFT || x + width / 2 > RIGHT) label.setAttribute('visibility', 'hidden');
  }
}

function draw() {
  const cut = tests[0].cutoff;
  const scale = HEIGHT / density(tests[0], 0);
  const values = SAMPLES.map(vOf);
  const heights = tests.map((test) => values.map((v) => scale * density(test, v)));
  drawCurves(values, heights, scale, cut);
  drawMarks(cut);
  drawLabels(scale, cut);
  drawAxis();
}

function frame(now) {
  const dt = last === null ? 16 : Math.min(64, now - last);
  last = now;
  const k = reduceMotion ? 1 : 1 - Math.exp(-dt / 110);
  const span = domain[1] - domain[0];
  let moving = false;
  shown = shown.map((v, i) => {
    const gap = domain[i] - v;
    if (Math.abs(gap) < 1e-4 * span) return domain[i];
    moving = true;
    return v + gap * k;
  });
  draw();
  if (moving) requestAnimationFrame(frame);
  else {
    running = false;
    last = null;
  }
}

function kick() {
  if (running) return;
  running = true;
  requestAnimationFrame(frame);
}

for (const [name, { input }] of Object.entries(rulers)) {
  input.addEventListener('input', () => {
    const value = SLIDERS[name].fromValue(Number(input.value));
    if (value !== state[name]) set({ [name]: value });
    else showControls();
  });
  input.addEventListener('change', settle);
}

rulers.n.input.addEventListener('keydown', (event) => {
  const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[event.key];
  const to = { Home: N_MIN, End: N_MAX }[event.key] ?? (by ? clamp(state.n + by, N_MIN, N_MAX) : null);
  if (to === null) return;
  event.preventDefault();
  if (to === state.n) return;
  set({ n: to });
  settle();
});

const pointer = (event) => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());

function moveTo(event) {
  const v = vOf(clamp(pointer(event).x, LEFT, RIGHT));
  set({ result: Math.round(v * 100) / 100 });
}

function begin(event) {
  dragging = true;
  svg.setPointerCapture(event.pointerId);
  moveTo(event);
}

function release() {
  if (!dragging) return;
  dragging = false;
  set({});
  settle();
}

svg.addEventListener('pointerdown', (event) => {
  if (event.button > 0) return;
  if (event.pointerType === 'mouse') {
    event.preventDefault();
    begin(event);
  } else pending = { id: event.pointerId, x: event.clientX, y: event.clientY };
});

svg.addEventListener('pointermove', (event) => {
  if (dragging) moveTo(event);
  else if (pending && pending.id === event.pointerId) {
    const dx = Math.abs(event.clientX - pending.x);
    const dy = Math.abs(event.clientY - pending.y);
    if (dx > 6 && dx > dy) {
      pending = null;
      begin(event);
    } else if (dy > 6) pending = null;
  }
});

svg.addEventListener('pointerup', (event) => {
  if (pending && pending.id === event.pointerId) {
    pending = null;
    moveTo(event);
    settle();
  }
  release();
});

svg.addEventListener('pointercancel', () => {
  pending = null;
  release();
});

resultInput.addEventListener('input', () => set({ result: Number(resultInput.value) / 100 }));
resultInput.addEventListener('change', settle);
resultInput.addEventListener('focus', () => root.classList.add('result-focus'));
resultInput.addEventListener('blur', () => root.classList.remove('result-focus'));

restart.addEventListener('click', () => {
  settled = { ...START };
  set({ ...START });
});

new ResizeObserver(() => draw()).observe(svg);
document.fonts.ready.then(() => draw());
set({});
