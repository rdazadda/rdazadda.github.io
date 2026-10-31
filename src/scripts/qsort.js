import { PEOPLE, SORTS, STATEMENTS } from '../data/lipset.js';
import { analyze, correlations, cutoff, summarize } from '../lib/q-method.js';
import { formatEffect } from '../lib/narration.js';

const C = 280;
const B = 300;
const R = 250;
const WIDTH = 560;
const DOT = 8;
const SVG_NS = 'http://www.w3.org/2000/svg';
const HINT = 'Pick a person on the map, or a statement in the sort.';
const ANCHORS = {
  right: [DOT + 6, 6, 'start'],
  left: [-DOT - 6, 6, 'end'],
  above: [0, -DOT - 8, 'middle'],
  below: [0, DOT + 20, 'middle'],
  'upper right': [DOT, -DOT - 2, 'start'],
  'upper left': [-DOT, -DOT - 2, 'end'],
  'lower right': [DOT, DOT + 16, 'start'],
  'lower left': [-DOT, DOT + 16, 'end'],
};
const OBSTACLES = [
  { x0: 0, x1: WIDTH, y0: 304, y1: 356 },
  { x0: 130, x1: 430, y0: 12, y1: 36 },
  { x0: 30, x1: 96, y0: 278, y1: 294 },
];

const root = document.querySelector('.qsort');
const find = (selector) => root.querySelector(selector);
const all = (selector) => [...root.querySelectorAll(selector)];

const base = analyze(SORTS, 3);
const similar = correlations(SORTS);
const state = { view: 0, cut: cutoff(STATEMENTS.length), person: -1, statement: 15 };
let result = base;

const viewButtons = all('[data-view]');
const viewNumbers = all('.view-number');
const wedges = [find('.wedge.right'), find('.wedge.left')];
const group = find('.people');
const slider = find('.control input');
const sliderValue = find('.control .value');
const who = find('.picked .who');
const load = find('.picked .load');
const alike = find('.alike');
const alikeName = find('.r-with');
const alikeList = find('.alike-list');
const columns = all('.column');
const built = find('.built');
const colors = find('.colors');
const number = find('.statement-number');
const words = find('.statement-words');
const places = all('[data-place]');
const verdictLine = find('.verdict');
const needed = find('.needed');

const signed = (v) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
const bounded = (x) => formatEffect(x).replace('0.', '.');
const list = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);
const fill = (input) => input.style.setProperty('--fill', `${(100 * (input.value - input.min)) / (input.max - input.min)}%`);
const overlap = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

function make(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  parent.append(el);
  return el;
}

const people = PEOPLE.map(({ id, country }, i) => {
  const g = make('g', { class: 'person', tabindex: '0', role: 'button', 'aria-pressed': 'false' }, group);
  make('circle', { class: 'hit', r: 20 }, g);
  make('circle', { class: 'ring', r: 13 }, g);
  make('circle', { class: 'dot', r: DOT }, g);
  const label = make('text', { class: 'id' }, g);
  label.textContent = id;
  g.style.transition = 'none';
  const pick = () => set({ person: state.person === i ? -1 : i });
  g.addEventListener('click', pick);
  g.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    pick();
  });
  return { g, label, id, country };
});

const tiles = STATEMENTS.map((text, k) => {
  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = 'tile';
  tile.textContent = `S${k + 1}`;
  tile.title = text;
  tile.setAttribute('aria-label', `S${k + 1}, ${text}`);
  tile.addEventListener('click', () => set({ statement: k }));
  return tile;
});

function wedge(side) {
  const corner = R / Math.SQRT2;
  const inner = (C + side * state.cut * R).toFixed(1);
  const top = (B - state.cut * R).toFixed(1);
  return `M ${inner} ${B} L ${C + side * R} ${B} A ${R} ${R} 0 0 ${side > 0 ? 0 : 1} ${(C + side * corner).toFixed(1)} ${(B - corner).toFixed(1)} L ${inner} ${top} Z`;
}

function spot(side, extra) {
  const [dx, dy, anchor] = ANCHORS[side];
  const level = side === 'right' || side === 'left';
  return [dx + Math.sign(dx) * extra, level ? dy : dy + Math.sign(dy) * extra, anchor];
}

function box(p, side) {
  const [dx, dy, anchor] = spot(side, p.extra);
  const x0 = p.x + dx - (anchor === 'end' ? p.w : anchor === 'middle' ? p.w / 2 : 0) - 2;
  return { x0, x1: x0 + p.w + 4, y0: p.y + dy - 19, y1: p.y + dy + 5 };
}

function sides(points) {
  const dots = points.map((p) => ({ x0: p.x - DOT - 3, x1: p.x + DOT + 3, y0: p.y - DOT - 3, y1: p.y + DOT + 3 }));
  const chosen = [];
  const boxes = [];
  for (let pass = 0; pass < 4; pass++) {
    points.forEach((p, i) => {
      const near = p.x >= C ? ['right', 'left'] : ['left', 'right'];
      const order = [...near, 'above', 'below', 'upper right', 'upper left', 'lower right', 'lower left'];
      let best = null;
      order.forEach((side, n) => {
        const b = box(p, side);
        let score = n;
        if (b.x0 < 0 || b.x1 > WIDTH || b.y0 < 0) score += 1e6;
        dots.forEach((d, j) => {
          if (j !== i) score += 10 * overlap(b, d);
        });
        OBSTACLES.forEach((o) => {
          score += 4 * overlap(b, o);
        });
        boxes.forEach((o, j) => {
          if (j !== i && o) score += 10 * overlap(b, o);
        });
        if (!best || score < best.score) best = { side, b, score };
      });
      chosen[i] = best.side;
      boxes[i] = best.b;
    });
  }
  return chosen;
}

function status(i) {
  if (!result.flagged[i][state.view]) return 'does not count';
  return result.loadings[i][state.view] < 0 ? 'counts, reversed' : 'counts';
}

function verdict({ label, tests }) {
  if (label === 'Consensus') return 'No real difference (consensus)';
  if (label === 'Distinguishes all') return 'All three viewpoints differ';
  const only = label.match(/^Distinguishes f(\d) only$/);
  if (only) return `Viewpoint ${only[1]} differs from the other two`;
  const [a, b] = tests.find((t) => t.mark).pair;
  return `Only viewpoints ${a + 1} and ${b + 1} differ`;
}

function drawMap() {
  const v = state.view;
  wedges[0].setAttribute('d', wedge(1));
  wedges[1].setAttribute('d', wedge(-1));
  const points = result.loadings.map((row, i) => {
    const rest = Math.sqrt(row.reduce((sum, x, f) => (f === v ? sum : sum + x * x), 0));
    return { x: C + row[v] * R, y: B - rest * R, w: people[i].label.getComputedTextLength() || 36, extra: i === state.person ? 5 : 0 };
  });
  const chosen = sides(points);
  points.forEach((p, i) => {
    const { g, label, id, country } = people[i];
    const [dx, dy, anchor] = spot(chosen[i], p.extra);
    g.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    label.setAttribute('x', dx);
    label.setAttribute('y', dy);
    label.setAttribute('text-anchor', anchor);
    g.classList.toggle('counts', result.flagged[i][v]);
    g.setAttribute('aria-pressed', String(state.person === i));
    g.setAttribute('aria-label', `${id}, ${country}, ${status(i)} for viewpoint ${v + 1}`);
  });
}

function drawPicked() {
  alike.hidden = state.person < 0;
  if (state.person < 0) {
    who.textContent = HINT;
    load.hidden = true;
    return;
  }
  const { id, country } = PEOPLE[state.person];
  alikeName.textContent = id;
  const others = PEOPLE.map((_, i) => i).filter((i) => i !== state.person);
  others.sort((a, b) => similar[state.person][b] - similar[state.person][a]);
  alikeList.replaceChildren(
    ...others.map((i) => {
      const item = document.createElement('li');
      const name = document.createElement('b');
      name.textContent = PEOPLE[i].id;
      item.append(name, ` ${bounded(similar[state.person][i])}`);
      return item;
    }),
  );
  const name = document.createElement('b');
  name.textContent = id;
  who.replaceChildren(name, `, ${country}, ${status(state.person)}`);
  load.hidden = false;
  load.querySelector('b').textContent = bounded(result.loadings[state.person][state.view]);
}

function drawSort() {
  const v = state.view;
  const array = result.arrays[v];
  const names = PEOPLE.flatMap(({ id }, i) => (result.flagged[i][v] ? [result.loadings[i][v] < 0 ? `${id} (reversed)` : id] : []));
  built.textContent = `Weighted average of ${list(names)}.`;
  for (const column of columns) {
    const value = Number(column.dataset.column);
    column.replaceChildren(...tiles.filter((_, k) => array[k] === value));
  }
  tiles.forEach((tile, k) => {
    tile.dataset.tone = String((state.person >= 0 ? SORTS[state.person][k] : array[k]) + 4);
    tile.setAttribute('aria-pressed', String(k === state.statement));
  });
  colors.textContent =
    state.person >= 0 ? `Colors show where ${PEOPLE[state.person].id} put each statement.` : `Colors show where viewpoint ${v + 1} puts each statement.`;
}

function drawStatement() {
  const k = state.statement;
  number.textContent = `S${k + 1}`;
  words.textContent = STATEMENTS[k];
  places.forEach((row, f) => {
    row.classList.toggle('current', f === state.view);
    row.querySelector('.spot').textContent = signed(result.arrays[f][k]);
    row.querySelector('.z').textContent = `z ${formatEffect(result.factors[f].z[k])}`;
  });
  const found = result.statements[k];
  verdictLine.textContent = verdict(found);
  const gaps = found.tests.map((t) => (1.96 * t.needed).toFixed(2));
  const low = gaps.reduce((a, b) => (Number(b) < Number(a) ? b : a));
  const high = gaps.reduce((a, b) => (Number(b) > Number(a) ? b : a));
  const span = low === high ? `more than ${low} apart` : `more than ${low} to ${high} apart, depending on the pair`;
  needed.innerHTML = `A real difference needs z-scores ${span} (<i>p</i> &lt; .05).`;
}

function draw() {
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(Number(button.dataset.view) === state.view));
  for (const span of viewNumbers) span.textContent = String(state.view + 1);
  slider.value = String(state.cut);
  fill(slider);
  sliderValue.textContent = bounded(state.cut);
  slider.setAttribute('aria-valuetext', bounded(state.cut));
  drawMap();
  drawPicked();
  drawSort();
  drawStatement();
}

function set(changes) {
  Object.assign(state, changes);
  if ('cut' in changes) result = summarize(SORTS, base.loadings, state.cut);
  draw();
}

for (const button of viewButtons) button.addEventListener('click', () => set({ view: Number(button.dataset.view) }));
slider.addEventListener('input', () => set({ cut: Number(slider.value) }));

draw();
requestAnimationFrame(() => {
  for (const { g } of people) g.style.transition = '';
});
document.fonts.ready.then(() => drawMap());
