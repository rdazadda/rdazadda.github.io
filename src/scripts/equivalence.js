import { START, halfWidth, level, lowest, narrate, needed, outcomes, powerAt, regions, report, smallestBound, snap, standardError } from '../lib/equivalence.js';
import { formatAlpha, formatPercent, minus } from '../lib/narration.js';
import { pdf } from '../lib/normal.js';
import { ALPHAS, amount, count } from '../lib/planning.js';

const L = 74;
const R = 724;
const PEAK = 80;
const BASE = 330;
const ST = 546;
const SB = 646;
const N_LO = Math.log(2);
const N_HI = Math.log(1000);
const N_TICKS = [2, 5, 10, 20, 50, 100, 200, 500, 1000];
const CURVE = Array.from({ length: 81 }, (_, i) => Math.round(Math.exp(N_LO + (i / 80) * (N_HI - N_LO))));
const KINDS = ['equivalent', 'overlap', 'unclear', 'different'];
const SVG_NS = 'http://www.w3.org/2000/svg';

const root = document.querySelector('.equivalence');
const svg = root.querySelector('svg');
const find = (selector) => root.querySelector(selector);

const state = { ...START };
let domain = 15;
let drag = null;
let pending = null;
let queued = false;

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const halves = (v) => Math.round(v * 2) / 2;
const percent = (p) => `${Math.round(100 * p)}%`;
const decimal = (v) => (v === 0 ? '0' : v.toFixed(2).replace(/^0/, ''));
const signed = (v) => minus(amount(v));

const xOf = (v) => L + ((v + domain) / (2 * domain)) * (R - L);
const vOf = (px) => ((px - L) / (R - L)) * 2 * domain - domain;
const nx = (n) => L + ((Math.log(clamp(n, 2, 1000)) - N_LO) / (N_HI - N_LO)) * (R - L);
const nOf = (px) => Math.exp(N_LO + ((px - L) / (R - L)) * (N_HI - N_LO));
const sy = (p) => SB - p * (SB - ST);

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
  title: find('.curve-title'),
  line: find('.curve-line'),
  regions: Object.fromEntries(KINDS.map((kind) => [kind, [...root.querySelectorAll(`.region.${kind}`)]])),
  bounds: [find('.bound.low'), find('.bound.high')],
  brackets: [find('.bracket.low'), find('.bracket.high')],
  bracketLabels: [find('.bracket-label.low'), find('.bracket-label.high')],
  zone: find('.zone-label'),
  share: find('.share-label'),
  truth: find('.truth'),
  truthDot: find('.truth-dot'),
  outcomeTitle: find('.outcome-title'),
  bars: Object.fromEntries(KINDS.map((kind) => [kind, find(`.bar.${kind}`)])),
  target: find('.strip-target'),
  curve: find('.strip-curve'),
  plan: find('.plan'),
  planDot: find('.plan-dot'),
  planLabel: find('.plan-label'),
};
const axes = find('.axes');
const legend = find('.legend');
const readouts = {
  name: find('.answer-name'),
  number: find('.answer-number'),
  note: find('.answer-note'),
  power: find('.facts .power'),
  narrowest: find('.facts .narrowest'),
  reachName: find('.facts .reach-name'),
  reach: find('.facts .reach'),
};
const narration = find('.narration');
const template = document.getElementById('report-text');
const keep = find('.keep input');
const peopleInput = find('input.people');
const restart = find('.restart');
const designs = [...root.querySelectorAll('.designs button')];

const SLIDERS = {
  bound: { toValue: (s) => Math.round(s.bound * 2), fromValue: (v) => v / 2, text: (s) => `±${amount(s.bound)}` },
  truth: { toValue: (s) => Math.round(s.truth * 2), fromValue: (v) => v / 2, text: (s) => signed(s.truth) },
  sd: { toValue: (s) => s.sd, fromValue: (v) => v, text: (s) => `${s.sd}` },
  rho: { toValue: (s) => Math.round(s.rho * 20), fromValue: (v) => v / 20, text: (s) => decimal(s.rho) },
  target: { toValue: (s) => Math.round(s.target * 100), fromValue: (v) => v / 100, text: (s) => percent(s.target) },
  alpha: { toValue: (s) => ALPHAS.indexOf(s.alpha), fromValue: (v) => ALPHAS[v], text: (s) => formatAlpha(s.alpha) },
  dropout: { toValue: (s) => Math.round(s.dropout * 100), fromValue: (v) => v / 100, text: (s) => percent(s.dropout) },
};

const rulers = {};
for (const input of root.querySelectorAll('.controls input')) {
  const control = input.closest('.control');
  rulers[input.dataset.name] = { input, control, value: control.querySelector('.value') };
}

const paired = () => state.design === 'paired';
const reachable = () => Math.abs(state.truth) < state.bound;
const who = (n) => (paired() ? `${count(n)} people` : `${count(n)} in each group`);

function showControls() {
  for (const [name, { input, control, value }] of Object.entries(rulers)) {
    const only = control.dataset.designs;
    control.hidden = Boolean(only) && !only.split(' ').includes(state.design);
    const { toValue, text } = SLIDERS[name];
    input.value = toValue(state);
    value.textContent = text(state);
    input.setAttribute('aria-valuetext', text(state));
  }
  for (const button of designs) button.setAttribute('aria-pressed', String(button.dataset.design === state.design));
  keep.checked = state.fixed;
  place(peopleInput, { min: lowest(state) });
  peopleInput.value = state.n;
  peopleInput.setAttribute('aria-valuetext', paired() ? `${count(state.n)} people` : `${count(state.n)} people in each group`);
}

function note() {
  if (!state.fixed && !reachable()) return 'No sample can show this, because the true effect lies at or beyond the bounds.';
  const many = Math.ceil(state.n / (1 - state.dropout) - 1e-9);
  const people = paired() ? `${count(many)} people` : `${count(many)} in each group, ${count(2 * many)} in total`;
  const dropout = state.dropout > 0 ? `, to allow for ${percent(state.dropout)} dropout` : '';
  return `Recruit ${people}${dropout}.`;
}

function showText() {
  const narrowest = smallestBound(state, state.n);
  readouts.name.textContent = paired() ? 'People' : 'People in each group';
  readouts.number.textContent = !state.fixed && !reachable() ? 'None' : count(state.n);
  readouts.note.textContent = note();
  readouts.power.textContent = formatPercent(powerAt(state, state.n));
  readouts.narrowest.textContent = narrowest === Infinity ? 'none' : `±${amount(narrowest)}`;
  readouts.reachName.textContent = `Each ${level(state)} interval`;
  readouts.reach.textContent = `±${amount(halfWidth(state, state.n))}`;
  narration.textContent = narrate(state);
  if (template) template.innerHTML = report(state);
}

function set(changes) {
  Object.assign(state, changes);
  if ('n' in changes && !('fixed' in changes)) state.fixed = true;
  if (state.fixed) state.n = snap(state, state.n);
  else if (reachable()) state.n = needed(state);
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
  domain = Math.max(1.5 * state.bound + Math.abs(state.truth), Math.abs(state.truth) + 4 * standardError(state, state.n));
}

function niceStep(span) {
  const raw = span / 6;
  const unit = 10 ** Math.floor(Math.log10(raw));
  return unit * [1, 2, 2.5, 5, 10].find((m) => m * unit >= raw);
}

function drawCurve() {
  const se = standardError(state, state.n);
  const height = (v) => BASE - (pdf((v - state.truth) / se) / pdf(0)) * (BASE - PEAK);
  const values = Array.from({ length: 161 }, (_, i) => -domain + (i * 2 * domain) / 160);
  const area = (a, b) => {
    const lo = Math.max(a, -domain);
    const hi = Math.min(b, domain);
    if (hi - lo < 1e-9) return '';
    const inner = values.filter((v) => v > lo && v < hi);
    return `M${round(xOf(lo))},${BASE}L${[lo, ...inner, hi].map((v) => `${round(xOf(v))},${round(height(v))}`).join('L')}L${round(xOf(hi))},${BASE}Z`;
  };
  const { inside, cut, near, far } = regions(state, state.n);
  marks.regions.equivalent[0].setAttribute('d', inside > 0 ? area(-near, near) : '');
  marks.regions.overlap.forEach((path, i) => path.setAttribute('d', inside > cut ? (i ? area(cut, inside) : area(-inside, -cut)) : ''));
  marks.regions.unclear.forEach((path, i) => path.setAttribute('d', cut > inside ? (i ? area(inside, cut) : area(-cut, -inside)) : ''));
  marks.regions.different.forEach((path, i) => path.setAttribute('d', i ? area(far, domain) : area(-domain, -far)));
  marks.line.setAttribute('d', `M${values.map((v) => `${round(xOf(v))},${round(height(v))}`).join('L')}`);

  marks.title.textContent = `Where one study’s estimate can land, with ${who(state.n)}`;
  const reach = halfWidth(state, state.n);
  marks.bounds.forEach((line, i) => place(line, { x1: xOf(i ? state.bound : -state.bound), x2: xOf(i ? state.bound : -state.bound) }));
  marks.brackets.forEach((path, i) => {
    const outer = xOf(i ? state.bound : -state.bound);
    const inner = xOf(i ? inside : -inside);
    place(path, { d: `M${round(outer)},58V66M${round(outer)},62H${round(inner)}M${round(inner)},58V66`, visibility: inside > 0 ? 'visible' : 'hidden' });
    place(marks.bracketLabels[i], { x: (outer + inner) / 2, visibility: inside > 0 && Math.abs(outer - inner) > 24 ? 'visible' : 'hidden' });
    marks.bracketLabels[i].textContent = amount(reach);
  });
  marks.zone.textContent = inside > 0 ? `must land within ±${amount(inside)}` : 'no estimate can land inside';
  place(marks.zone, { x: xOf(0) });

  const tx = xOf(state.truth);
  place(marks.truth, { x1: tx, x2: tx, y1: PEAK });
  place(marks.truthDot, { cx: tx, cy: PEAK });
  const shares = outcomes(state, state.n);
  const spot = clamp(state.truth, -near, near);
  const room = xOf(near) - xOf(-near) > 46 && BASE - height(spot) > 44;
  marks.share.textContent = percent(shares.equivalent);
  place(marks.share, { x: xOf(spot), y: BASE - 24, visibility: inside > 0 && room ? 'visible' : 'hidden' });
  return shares;
}

function drawOutcomes(shares) {
  marks.outcomeTitle.textContent = `What a study with ${who(state.n)} concludes`;
  let x = L;
  for (const kind of KINDS) {
    const width = shares[kind] * (R - L);
    place(marks.bars[kind], { x, width: Math.max(0, width) });
    x += width;
  }
  legend.replaceChildren();
  const names = {
    equivalent: `Shows it is within ±${amount(state.bound)}`,
    overlap: 'Shows both',
    unclear: 'Can’t tell',
    different: 'Differs from zero',
  };
  let cx = L;
  let cy = 478;
  for (const kind of KINDS) {
    if (shares[kind] < 0.005) continue;
    const swatch = make('rect', { class: kind, y: cy - 11, width: 12, height: 12 }, legend);
    const label = make('text', { class: kind, y: cy }, legend);
    label.textContent = `${names[kind]}, ${percent(shares[kind])}`;
    const width = 18 + label.getComputedTextLength();
    if (cx + width > R && cx > L) {
      cx = L;
      cy += 22;
      place(swatch, { y: cy - 11 });
      place(label, { y: cy });
    }
    place(swatch, { x: cx });
    place(label, { x: cx + 18 });
    cx += width + 26;
  }
}

function drawStrip() {
  place(marks.curve, { d: `M${CURVE.map((n) => `${round(nx(n))},${round(sy(powerAt(state, Math.max(n, lowest(state)))))}`).join('L')}` });
  place(marks.target, { y1: sy(state.target), y2: sy(state.target) });
  const x = nx(state.n);
  place(marks.plan, { x1: x, x2: x });
  place(marks.planDot, { cx: x, cy: sy(powerAt(state, state.n)) });
  marks.planLabel.textContent = count(state.n);
  const half = marks.planLabel.getComputedTextLength() / 2;
  place(marks.planLabel, { x: clamp(x, L + half, R - half) });
}

function drawAxes() {
  axes.replaceChildren();
  for (const [x1, y1, x2, y2] of [
    [L, BASE, R, BASE],
    [L, ST, L, SB],
    [L, SB, R, SB],
  ]) make('line', { class: 'axis-line', x1, y1, x2, y2 }, axes);

  const marked = [-state.bound, state.bound];
  for (const v of marked) {
    make('text', { class: 'axis-label bound-mark', x: xOf(v), y: 352, 'text-anchor': 'middle' }, axes).textContent = signed(v);
  }
  const step = niceStep(2 * domain);
  for (let v = Math.ceil(-domain / step) * step; v <= domain + 1e-9; v += step) {
    const x = xOf(v);
    make('line', { class: 'axis-tick', x1: x, x2: x, y1: BASE, y2: BASE + 5 }, axes);
    if (marked.some((m) => Math.abs(xOf(m) - x) < 30)) continue;
    make('text', { class: 'axis-label', x, y: 352, 'text-anchor': 'middle' }, axes).textContent = signed(Number(v.toFixed(2)));
  }

  for (const n of N_TICKS) {
    const x = nx(n);
    make('line', { class: 'axis-tick', x1: x, x2: x, y1: SB, y2: SB + 5 }, axes);
    make('text', { class: 'axis-label', x, y: 668, 'text-anchor': 'middle' }, axes).textContent = count(n);
  }
  const ty = sy(state.target);
  make('text', { class: 'axis-label bound-mark', x: L - 10, y: ty + 5, 'text-anchor': 'end' }, axes).textContent = percent(state.target);
  for (const [p, label] of [
    [0, '0%'],
    [1, '100%'],
  ]) {
    const at = sy(p);
    make('line', { class: 'axis-tick', x1: L - 5, x2: L, y1: at, y2: at }, axes);
    if (Math.abs(at - ty) >= 15) make('text', { class: 'axis-label', x: L - 10, y: at + 5, 'text-anchor': 'end' }, axes).textContent = label;
  }
}

function draw() {
  if (!drag) refit();
  drawOutcomes(drawCurve());
  drawStrip();
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
peopleInput.addEventListener('input', () => set({ n: Number(peopleInput.value) }));
peopleInput.addEventListener('focus', () => root.classList.add('people-focus'));
peopleInput.addEventListener('blur', () => root.classList.remove('people-focus'));
restart.addEventListener('click', () => set({ ...START }));

const pointer = (event) => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());

function modeAt(p) {
  if (p.x < L - 10 || p.x > R + 10) return null;
  if (p.y >= 30 && p.y <= BASE + 30) {
    const nearest = Math.min(Math.abs(p.x - xOf(-state.bound)), Math.abs(p.x - xOf(state.bound)));
    return nearest < 10 ? 'bound' : 'truth';
  }
  if (p.y >= ST - 10 && p.y <= SB + 30) return 'n';
  return null;
}

function move(p) {
  const v = vOf(clamp(p.x, L, R));
  if (drag === 'bound') set({ bound: clamp(halves(Math.abs(v)), 0.5, 30) });
  else if (drag === 'truth') set({ truth: clamp(halves(v), -15, 15) });
  else set({ n: snap(state, nOf(clamp(p.x, L, R))) });
}

function begin(event, mode) {
  drag = mode;
  svg.setPointerCapture(event.pointerId);
  move(pointer(event));
}

svg.addEventListener('pointerdown', (event) => {
  if (event.button > 0) return;
  const mode = modeAt(pointer(event));
  if (!mode) return;
  if (event.pointerType === 'mouse') {
    event.preventDefault();
    begin(event, mode);
  } else pending = { id: event.pointerId, x: event.clientX, y: event.clientY, mode };
});

svg.addEventListener('pointermove', (event) => {
  if (drag) move(pointer(event));
  else if (pending && pending.id === event.pointerId) {
    const dx = Math.abs(event.clientX - pending.x);
    const dy = Math.abs(event.clientY - pending.y);
    if (dx > 6 && dx > dy) {
      const { mode } = pending;
      pending = null;
      begin(event, mode);
    } else if (dy > 6) pending = null;
  }
});

svg.addEventListener('pointerup', (event) => {
  if (pending && pending.id === event.pointerId) {
    drag = pending.mode;
    move(pointer(event));
    pending = null;
  }
  drag = null;
  set({});
});

svg.addEventListener('pointercancel', () => {
  pending = null;
  drag = null;
});

document.fonts.ready.then(() => draw());
set({});
