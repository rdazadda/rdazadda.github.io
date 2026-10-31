import {
  START,
  STUDIES,
  copy,
  critical,
  edges,
  effect,
  evidence,
  facts,
  h0,
  h1,
  hitTest,
  interval,
  intervalName,
  longRun,
  named,
  narrate,
  number,
  observed,
  pText,
  pValue,
  pieces,
  piecesNote,
  report,
  power,
  powerText,
  reading,
  scale,
  showsAlternative,
  showsData,
  showsInterval,
  showsP,
  showsRule,
  simulate,
  simulationText,
  slot,
  symbol,
  studyKey,
  studyText,
  symmetric,
  tailNote,
  twoTailed,
} from '../lib/testing.js';
import { formatAlpha, formatEffect, formatPercent, minus } from '../lib/narration.js';
import { ALPHAS } from '../lib/planning.js';

const L = 40;
const R = 724;
const TOP = 70;
const BASE = 330;
const SAMPLES = 241;
const RANGES = { d: [-2, 2], chi: [0, 60], f: [0, 20] };
const STEPS = 1200;
const N_MIN = 2;
const N_MAX = 1000;
const LIMIT = 40;
const CAPS = { chi: 120, f: 30 };
const GROW = 1600;
const SVG_NS = 'http://www.w3.org/2000/svg';

const root = document.querySelector('.testing');
const svg = root.querySelector('svg');
const find = (selector) => root.querySelector(selector);
const pair = (name) => [find(`.${name}.low`), find(`.${name}.high`)];

const state = copy(START);
const studies = { key: '', values: [], shown: 0, runs: 0, start: 0 };
const still = window.matchMedia('(prefers-reduced-motion: reduce)');
let domain = [-4, 7];
let density = 1;
let drag = false;
let pending = null;
let queued = false;

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const xOf = (v) => L + ((v - domain[0]) / (domain[1] - domain[0])) * (R - L);
const vOf = (px) => domain[0] + ((px - L) / (R - L)) * (domain[1] - domain[0]);

function place(el, attrs) {
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, typeof value === 'number' ? round(value) : value);
}

function make(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  place(el, attrs);
  parent.append(el);
  return el;
}

const marks = {
  title: find('.chart-title'),
  h0Area: find('.h0-area'),
  h0Line: find('.h0-line'),
  beta: find('.beta-area'),
  power: pair('power-area'),
  alpha: pair('alpha-area'),
  p: pair('p-area'),
  h1Line: find('.h1-line'),
  critical: pair('critical'),
  h1Label: find('.curve-label.h1'),
  alphaLabel: find('.area-label.alpha'),
  powerLabel: find('.area-label.power'),
  missedLabel: find('.area-label.missed'),
  pLabel: find('.area-label.p'),
  observed: find('line.observed'),
  knob: find('.knob'),
  observedLabel: find('.observed-label'),
  interval: find('.interval'),
  intervalZero: find('.interval-zero'),
  intervalLine: find('.interval-line'),
  intervalCaps: pair('interval-cap'),
  intervalDot: find('.interval-dot'),
  intervalLabel: find('.interval-label'),
  studies: { plain: find('.study-dots.plain'), beyond: find('.study-dots.beyond'), extreme: find('.study-dots.extreme') },
  xTitle: find('.x-title'),
};
const axes = find('.axes');
const readouts = {
  name: find('.reading-name'),
  number: find('.reading-number'),
  tag: find('.tag'),
  line: find('.reading-line'),
  ruler: find('.ruler'),
  dot: find('.ruler-dot'),
  longRun: find('.long-run'),
  pieces: find('.pieces'),
  piecesList: find('.pieces-list'),
  piecesNote: find('.pieces-note'),
  facts: find('.facts'),
  tailNote: find('.tail-note'),
};
const narration = find('.narration');
const steps = find('.steps');
const stepButtons = [...root.querySelectorAll('[data-step]')];
const restart = find('.restart');
const families = [...root.querySelectorAll('[data-family]')];
const logics = [...root.querySelectorAll('[data-logic]')];
const tailsGroup = find('.tails');
const tailButtons = [...root.querySelectorAll('[data-tails]')];
const upper = find('.upper');
const locked = find('.locked');
const populationGroup = find('.population');
const populationButtons = [...root.querySelectorAll('[data-population]')];
const studyLine = find('.study-text');
const runButton = find('.run');
const clearButton = find('.clear');
const simulated = find('.simulate-result');
const template = document.getElementById('report-text');

const SLIDERS = {
  observed: {
    toValue: (s) => {
      const [lo, hi] = RANGES[slot(s)];
      return Math.round(((s.statistic[slot(s)] - lo) / (hi - lo)) * STEPS);
    },
    fromValue: (v, s) => {
      const [lo, hi] = RANGES[slot(s)];
      return Number((lo + (v / STEPS) * (hi - lo)).toFixed(symmetric(s) ? 3 : 2));
    },
    text: (s) => (symmetric(s) ? formatEffect(s.statistic.d) : number(observed(s))),
  },
  n: {
    toValue: (s) => Math.round((1000 * Math.log(s.n / N_MIN)) / Math.log(N_MAX / N_MIN)),
    fromValue: (v) => Math.round(N_MIN * (N_MAX / N_MIN) ** (v / 1000)),
    text: (s) => s.n.toLocaleString('en-US'),
  },
  k: { toValue: (s) => s.k, fromValue: (v) => v, text: (s) => `${s.k}` },
  df1: { toValue: (s) => s.df1, fromValue: (v) => v, text: (s) => `${s.df1}` },
  df2: { toValue: (s) => s.df2, fromValue: (v) => v, text: (s) => `${s.df2}` },
  alpha: { toValue: (s) => ALPHAS.indexOf(s.alpha), fromValue: (v) => ALPHAS[v], text: (s) => formatAlpha(s.alpha) },
  effect: {
    top: (s) => (symmetric(s) ? 150 : 60),
    toValue: (s) => Math.round(s.effect[slot(s)] * (symmetric(s) ? 100 : 2)),
    fromValue: (v, s) => v / (symmetric(s) ? 100 : 2),
    text: (s) => (symmetric(s) ? s.effect.d.toFixed(2) : `${s.effect[s.family]}`),
  },
};

const rulers = {};
for (const input of root.querySelectorAll('.control input')) {
  const control = input.closest('.control');
  rulers[input.dataset.name] = { input, control, value: control.querySelector('.value'), label: control.querySelector('label') };
}

function showControls() {
  const fixed = state.logic === 'np' && state.step === 'result';
  for (const [name, { input, control, value, label }] of Object.entries(rulers)) {
    const only = control.dataset.families;
    let hide = Boolean(only) && !only.split(' ').includes(state.family);
    if (name === 'observed') hide = !showsData(state);
    if (name === 'alpha') hide = !showsRule(state);
    if (name === 'effect') hide = !showsAlternative(state);
    control.hidden = hide;
    const { top, toValue, text } = SLIDERS[name];
    if (top) input.max = String(top(state));
    input.value = toValue(state);
    input.disabled = fixed && name !== 'observed';
    value.textContent = text(state);
    input.setAttribute('aria-valuetext', text(state));
    if (name === 'observed') label.textContent = symmetric(state) ? 'Observed effect size (d)' : `Observed ${symbol(state)}`;
    if (name === 'effect') label.textContent = `Effect if H₁ is true (${symmetric(state) ? 'd' : 'λ'})`;
  }
  tailsGroup.hidden = !symmetric(state);
  upper.hidden = symmetric(state);
  for (const button of tailButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.tails === state.tails));
    button.disabled = fixed;
  }
  locked.hidden = !fixed;
  populationGroup.hidden = state.family !== 't';
  for (const button of populationButtons) button.setAttribute('aria-pressed', String(button.dataset.population === state.population));
  for (const button of families) button.setAttribute('aria-pressed', String(button.dataset.family === state.family));
  for (const button of logics) button.setAttribute('aria-pressed', String(button.dataset.logic === state.logic));
  steps.hidden = state.logic !== 'np';
  for (const button of stepButtons) button.setAttribute('aria-pressed', String(button.dataset.step === state.step));
}

function row([name, value]) {
  const line = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = name;
  dd.textContent = value;
  line.append(dt, dd);
  return line;
}

function showText() {
  const result = reading(state);
  readouts.name.textContent = result.name;
  readouts.number.hidden = !result.value;
  readouts.number.textContent = result.value ?? '';
  readouts.tag.hidden = !result.tag;
  readouts.tag.textContent = result.tag ?? '';
  readouts.tag.className = `tag ${result.kind ?? ''}`;
  readouts.line.textContent = result.line;
  readouts.ruler.hidden = state.logic !== 'fisher';
  readouts.dot.style.left = `${(100 * evidence(pValue(state))).toFixed(1)}%`;
  readouts.longRun.hidden = state.logic !== 'np';
  readouts.longRun.textContent = longRun(state);
  readouts.pieces.hidden = state.logic !== 'nhst';
  readouts.piecesList.replaceChildren(...pieces(state).map(row));
  readouts.piecesNote.textContent = piecesNote;
  readouts.facts.replaceChildren(...facts(state).map(row));
  const note = tailNote(state);
  readouts.tailNote.hidden = !note;
  readouts.tailNote.textContent = note;
  studyLine.textContent = studyText(state);
  const seen = studies.values.slice(0, studies.shown);
  simulated.hidden = !seen.length;
  simulated.textContent = simulationText(state, seen);
  clearButton.hidden = !studies.values.length;
  if (template) template.innerHTML = report(state);
  narration.textContent = narrate(state);
}

function set(changes) {
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'observed') state.statistic[slot(state)] = value;
    else if (key === 'effect') state.effect[slot(state)] = value;
    else state[key] = value;
  }
  if ('tails' in changes && !('peeked' in changes)) state.peeked = state.tails !== 'two' && showsData(state);
  showControls();
  schedule();
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    if (studies.key && studies.key !== studyKey(state)) forget();
    showText();
    draw();
  });
}

function forget() {
  studies.key = '';
  studies.values = [];
  studies.shown = 0;
}

function grow(id) {
  requestAnimationFrame((now) => {
    if (id !== studies.runs || !studies.key) return;
    studies.shown = Math.min(STUDIES, Math.max(1, Math.round(((now - studies.start) / GROW) * STUDIES)));
    schedule();
    if (studies.shown < STUDIES) grow(id);
  });
}

function run() {
  studies.runs += 1;
  studies.key = studyKey(state);
  studies.values = simulate(state, studies.runs);
  studies.start = performance.now();
  studies.shown = still.matches ? STUDIES : 0;
  schedule();
  if (!still.matches) grow(studies.runs);
}

function refit() {
  const c = critical(state);
  const x = observed(state);
  if (symmetric(state)) {
    const reach = [4, h0(state).quantile(0.995), c + 0.8];
    if (showsData(state)) reach.push(Math.abs(x) + 0.8, ...interval(state).filter(Number.isFinite).map((v) => Math.abs(v) + 0.5));
    const side = Math.min(LIMIT, Math.max(...reach));
    const far = showsAlternative(state) ? Math.min(LIMIT, effect(state) + 3.5) : 0;
    domain = [-side, Math.max(side, far)];
    return;
  }
  let hi = Math.max(h0(state).quantile(0.995), 1.25 * c, x + 1);
  if (showsAlternative(state)) hi = Math.max(hi, h1(state).quantile(0.98));
  domain = [0, Math.min(CAPS[state.family], hi)];
}

function niceStep(span) {
  const raw = span / 8;
  const unit = 10 ** Math.floor(Math.log10(raw));
  return unit * [1, 2, 2.5, 5, 10].find((m) => m * unit >= raw);
}

const boxOf = (el) => (el.getAttribute('visibility') === 'hidden' ? null : el.getBBox());
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

function placeMissed(alt, height, from, to) {
  const label = marks.missedLabel;
  const [lo, hi] = domain;
  const a = Math.max(from, lo);
  const b = Math.min(to, hi);
  let mass = 0;
  let moment = 0;
  for (let i = 0; i <= 120; i++) {
    const v = a + (i * (b - a)) / 120;
    const y = alt.pdf(v);
    if (!Number.isFinite(y)) continue;
    mass += y;
    moment += v * y;
  }
  label.textContent = `missed ${formatPercent(1 - power(state))}`;
  place(label, { visibility: 'hidden' });
  if (b <= a || mass <= 0) return;
  const width = label.getComputedTextLength();
  const blocked = [marks.alphaLabel, marks.powerLabel, marks.h1Label, marks.observedLabel, marks.pLabel].map(boxOf).filter(Boolean);
  if (showsData(state)) blocked.push({ x: xOf(clamp(observed(state), lo, hi)) - 6, y: 58, width: 12, height: BASE - 58 });
  if (showsRule(state)) for (const edge of edges(state)) blocked.push({ x: xOf(edge) - 4, y: 92, width: 8, height: BASE - 92 });
  const center = xOf(moment / mass);
  for (let shift = 0; shift <= 400; shift += 4) {
    for (const x of shift ? [center - shift, center + shift] : [center]) {
      const box = { x: x - width / 2, y: BASE - 36, width, height: 18 };
      if (box.x < Math.max(L, xOf(a)) + 2 || box.x + width > Math.min(R, xOf(b)) - 2) continue;
      if (BASE - height(alt, vOf(x)) < 30) continue;
      if (blocked.some((other) => overlaps(box, other))) continue;
      place(label, { x, y: BASE - 22, visibility: 'visible' });
      return;
    }
  }
}

function drawCurves() {
  const [lo, hi] = domain;
  const values = Array.from({ length: SAMPLES }, (_, i) => lo + (i * (hi - lo)) / (SAMPLES - 1));
  const null0 = h0(state);
  const alt = showsAlternative(state) ? h1(state) : null;
  const skip = lo + 0.02 * (hi - lo);
  let tallest = 0;
  let body = 0;
  for (const v of values) {
    for (const d of alt ? [null0, alt] : [null0]) {
      const y = d.pdf(v);
      if (!Number.isFinite(y)) continue;
      tallest = Math.max(tallest, y);
      if (v >= skip) body = Math.max(body, y);
    }
  }
  if (tallest > 3 * body) tallest = body;
  const scaleY = (BASE - TOP) / tallest;
  density = scaleY;
  const height = (d, v) => BASE - Math.min(BASE, d.pdf(v) * scaleY);
  const line = (d) => `M${values.map((v) => `${round(xOf(v))},${round(height(d, v))}`).join('L')}`;
  const area = (d, a, b) => {
    const from = Math.max(a, lo);
    const to = Math.min(b, hi);
    if (to - from < 1e-9) return '';
    const inner = values.filter((v) => v > from && v < to);
    return `M${round(xOf(from))},${BASE}L${[from, ...inner, to].map((v) => `${round(xOf(v))},${round(height(d, v))}`).join('L')}L${round(xOf(to))},${BASE}Z`;
  };

  place(marks.h0Area, { d: area(null0, lo, hi) });
  place(marks.h0Line, { d: line(null0) });

  const c = critical(state);
  const two = twoTailed(state);
  const down = symmetric(state) && state.tails === 'lower';
  const lowSide = two || down;
  const highSide = two || !down;
  const rule = showsRule(state);
  marks.alpha[0].setAttribute('d', rule && lowSide ? area(null0, lo, -c) : '');
  marks.alpha[1].setAttribute('d', rule && highSide ? area(null0, c, hi) : '');
  marks.critical.forEach((mark, i) => {
    const show = rule && (i ? highSide : lowSide);
    const x = xOf(i ? c : -c);
    place(mark, { x1: x, x2: x, visibility: show && x >= L && x <= R ? 'visible' : 'hidden' });
  });

  const missed = two ? [-c, c] : down ? [-c, hi] : [lo, c];
  if (alt) {
    place(marks.beta, { d: area(alt, ...missed) });
    marks.power[0].setAttribute('d', lowSide ? area(alt, lo, -c) : '');
    marks.power[1].setAttribute('d', highSide ? area(alt, c, hi) : '');
    place(marks.h1Line, { d: line(alt) });
    let mode = values[0];
    for (const v of values) if (alt.pdf(v) > alt.pdf(mode)) mode = v;
    const peak = alt.pdf(mode);
    const shoulder = values.find((v) => v > mode && alt.pdf(v) < 0.6 * peak) ?? mode;
    marks.h1Label.textContent = 'If H₁ were true';
    const right = xOf(shoulder) + 10 + 120 <= R;
    place(marks.h1Label, { x: right ? xOf(shoulder) + 10 : xOf(shoulder) - 10, y: height(alt, shoulder) - 6, 'text-anchor': right ? 'start' : 'end', visibility: 'visible' });
    marks.powerLabel.textContent = `power ${powerText(state)}`;
    const span = hi - lo;
    const spot = down ? Math.max(lo + 0.06 * span, Math.min(-c, mode) - 0.08 * span) : Math.min(hi - 0.06 * span, Math.max(c, mode) + 0.08 * span);
    place(marks.powerLabel, { x: clamp(xOf(spot), L + 50, R - 50), y: BASE - 22, visibility: 'visible' });
  } else {
    for (const mark of [marks.beta, ...marks.power, marks.h1Line]) mark.setAttribute('d', '');
    for (const mark of [marks.h1Label, marks.powerLabel, marks.missedLabel]) place(mark, { visibility: 'hidden' });
  }

  if (rule) {
    marks.alphaLabel.textContent = `α = ${formatAlpha(state.alpha)}`;
    const seen = xOf(clamp(observed(state), lo, hi));
    const sides = two ? [[-c, 'end'], [c, 'start']] : down ? [[-c, 'end'], [-c, 'start']] : [[c, 'end'], [c, 'start']];
    const spots = sides.map(([edge, anchor]) => {
      const x = xOf(edge) + (anchor === 'end' ? -8 : 8);
      return { edge, anchor, x, from: anchor === 'end' ? x - 64 : x, to: anchor === 'end' ? x : x + 64 };
    });
    const free = spots.find((spot) => (!showsData(state) || seen < spot.from - 6 || seen > spot.to + 6) && spot.from > L && spot.to < R) ?? spots[0];
    place(marks.alphaLabel, {
      x: free.x,
      y: Math.min(BASE - 28, height(null0, free.edge) - 12),
      'text-anchor': free.anchor,
      visibility: free.from > L && free.to < R ? 'visible' : 'hidden',
    });
  } else {
    place(marks.alphaLabel, { visibility: 'hidden' });
  }

  const data = showsData(state);
  const x = observed(state);
  const pShown = data && showsP(state);
  marks.p[0].setAttribute('d', pShown && two ? area(null0, lo, -Math.abs(x)) : pShown && down ? area(null0, lo, x) : '');
  marks.p[1].setAttribute('d', pShown && !down ? area(null0, two ? Math.abs(x) : x, hi) : '');
  const px = xOf(clamp(x, lo, hi));
  for (const mark of [marks.observed, marks.knob, marks.observedLabel]) place(mark, { visibility: data ? 'visible' : 'hidden' });
  place(marks.observed, { x1: px, x2: px });
  place(marks.knob, { cx: px });
  const side = px + 100 <= R ? 'start' : 'end';
  const lx = side === 'start' ? px + 8 : px - 8;
  marks.observedLabel.textContent = `${symbol(state)} = ${number(x)}`;
  place(marks.observedLabel, { x: lx, 'text-anchor': side });
  marks.pLabel.textContent = pText(pValue(state));
  place(marks.pLabel, { x: lx, y: 72, 'text-anchor': side, visibility: pShown ? 'visible' : 'hidden' });

  if (alt) placeMissed(alt, height, ...missed);

  marks.title.textContent = `If H₀ were true, ${named(state)} would land here`;
  marks.xTitle.textContent = `Test statistic ${named(state)}`;
}

function drawInterval() {
  const tall = symmetric(state);
  svg.setAttribute('viewBox', `0 0 740 ${tall ? 440 : 400}`);
  place(marks.xTitle, { y: tall ? 434 : 390 });
  const show = showsInterval(state);
  place(marks.interval, { display: show ? 'inline' : 'none' });
  if (!show) return;
  const [lo, hi] = domain;
  const [a, b] = interval(state);
  const xa = xOf(clamp(a, lo, hi));
  const xb = xOf(clamp(b, lo, hi));
  const zero = xOf(0);
  place(marks.intervalZero, { x1: zero, x2: zero });
  place(marks.intervalLine, { x1: xa, x2: xb });
  place(marks.intervalCaps[0], { x1: xa, x2: xa, visibility: a >= lo ? 'visible' : 'hidden' });
  place(marks.intervalCaps[1], { x1: xb, x2: xb, visibility: b <= hi ? 'visible' : 'hidden' });
  place(marks.intervalDot, { cx: xOf(clamp(observed(state), lo, hi)) });
  const label = marks.intervalLabel;
  label.textContent = intervalName(state);
  const half = label.getComputedTextLength() / 2;
  place(label, { x: clamp((xa + xb) / 2, 2 + half, 738 - half) });
}

const dot = (x, y, r) => `M${round(x - r)},${round(y)}a${r},${r} 0 1 0 ${round(2 * r)},0a${r},${r} 0 1 0 ${round(-2 * r)},0`;

function drawStudies() {
  const paths = { plain: [], beyond: [], extreme: [] };
  const [lo, hi] = domain;
  const perUnit = (R - L) / (hi - lo);
  const size = clamp(Math.sqrt((density * perUnit) / STUDIES), 3, 12);
  const rise = (density * perUnit) / (STUDIES * size);
  const r = round(Math.max(0.6, Math.min(size, rise) / 2 - 0.3));
  const hit = hitTest(state);
  const marked = state.logic === 'fisher' ? 'extreme' : 'beyond';
  const piles = new Map();
  for (const v of studies.values.slice(0, studies.shown)) {
    if (v < lo || v > hi) continue;
    const column = Math.floor((xOf(v) - L) / (2 * size));
    const below = piles.get(column) ?? 0;
    piles.set(column, below + 1);
    const y = BASE - (Math.floor(below / 2) + 0.5) * rise;
    if (y < 34) continue;
    paths[hit(v) ? marked : 'plain'].push(dot(L + (2 * column + (below % 2) + 0.5) * size, y, r));
  }
  for (const [kind, el] of Object.entries(marks.studies)) el.setAttribute('d', paths[kind].join(''));
}

function drawAxes() {
  axes.replaceChildren();
  make('line', { class: 'axis-line', x1: L, y1: BASE, x2: R, y2: BASE }, axes);
  const marked = [];
  if (showsRule(state)) {
    for (const v of edges(state)) {
      const x = xOf(v);
      if (x < L || x > R) continue;
      marked.push(x);
      make('text', { class: 'axis-label critical-mark', x, y: 352, 'text-anchor': 'middle' }, axes).textContent = number(v);
    }
  }
  const [lo, hi] = domain;
  const step = niceStep(hi - lo);
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    const x = xOf(v);
    make('line', { class: 'axis-tick', x1: x, x2: x, y1: BASE, y2: BASE + 5 }, axes);
    if (marked.some((m) => Math.abs(m - x) < 34)) continue;
    make('text', { class: 'axis-label', x, y: 352, 'text-anchor': 'middle' }, axes).textContent = minus(String(Number(v.toFixed(2))));
  }
}

function draw() {
  if (!drag) refit();
  drawInterval();
  drawCurves();
  drawStudies();
  drawAxes();
}

for (const [name, { input }] of Object.entries(rulers)) {
  input.addEventListener('input', () => {
    set({ [name]: SLIDERS[name].fromValue(Number(input.value), state) });
  });
}

for (const button of families) button.addEventListener('click', () => button.dataset.family !== state.family && set({ family: button.dataset.family }));
for (const button of logics) button.addEventListener('click', () => button.dataset.logic !== state.logic && set({ logic: button.dataset.logic, step: 'plan' }));
for (const button of stepButtons) button.addEventListener('click', () => button.dataset.step !== state.step && set({ step: button.dataset.step }));
for (const button of tailButtons) button.addEventListener('click', () => button.dataset.tails !== state.tails && set({ tails: button.dataset.tails }));
for (const button of populationButtons) button.addEventListener('click', () => button.dataset.population !== state.population && set({ population: button.dataset.population }));
runButton.addEventListener('click', run);
clearButton.addEventListener('click', () => {
  forget();
  schedule();
});
restart.addEventListener('click', () => {
  forget();
  Object.assign(state, copy(START));
  set({});
});

const pointer = (event) => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
const inside = (p) => p.x >= L - 10 && p.x <= R + 10 && p.y >= 30 && p.y <= BASE + 30;

function move(p) {
  const [lo, hi] = RANGES[slot(state)];
  const v = vOf(clamp(p.x, L, R));
  if (symmetric(state)) set({ observed: Number(clamp(v / scale(state), lo, hi).toFixed(3)) });
  else set({ observed: Number(clamp(v, lo, hi).toFixed(2)) });
}

function begin(event) {
  drag = true;
  svg.setPointerCapture(event.pointerId);
  move(pointer(event));
}

svg.addEventListener('pointerdown', (event) => {
  if (event.button > 0 || !showsData(state) || !inside(pointer(event))) return;
  if (event.pointerType === 'mouse') {
    event.preventDefault();
    begin(event);
  } else pending = { id: event.pointerId, x: event.clientX, y: event.clientY };
});

svg.addEventListener('pointermove', (event) => {
  if (drag) move(pointer(event));
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
    move(pointer(event));
  }
  drag = false;
  schedule();
});

svg.addEventListener('pointercancel', () => {
  pending = null;
  drag = false;
});

document.fonts.ready.then(() => draw());
set({});
