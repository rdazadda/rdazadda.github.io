import { ANSWERS, PEOPLE } from '../data/sleep-survey.js';
import { quantile } from './normal.js';
import { incompleteBeta, lnGamma } from './sampling.js';

const BLUE = '#1f5a88';
const DEEP = '#143d5e';
const INK = '#30394f';
const TEXT = '#1f2933';
const MUTED = '#46505c';
const ORANGE = '#d55e00';
const ORANGE_TEXT = '#b04a00';
const GOLD = '#c99400';
const GOLD_TEXT = '#7d5c00';
const HALO = 'paint-order="stroke" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"';
const Z = quantile(0.975);
const FLOOR = 0.7;
const NOMINAL = 0.95;
const SHORT_FILL = '#f8dcc7';
const OVER_FILL = '#cfe0ed';

const SURVEY_SHARE = ANSWERS.reduce((sum, a) => sum + (a[1] < a[0] ? a[2] : 0), 0) / PEOPLE;
export const SURVEY_POINT = Math.round(SURVEY_SHARE * 1000);

export const SHARE_SIZES = [];
for (let n = 5; n <= 30; n++) SHARE_SIZES.push(n);
for (let n = 32; n <= 60; n += 2) SHARE_SIZES.push(n);
for (let n = 65; n <= 100; n += 5) SHARE_SIZES.push(n);
for (let n = 110; n <= 200; n += 10) SHARE_SIZES.push(n);

export const METHODS = [
  { id: 'wald', tab: 'Usual (Wald)', name: 'Usual (Wald)', other: 'the usual interval' },
  { id: 'wilson', tab: 'Wilson', name: 'Wilson', other: 'the Wilson interval' },
  { id: 'agresti', tab: 'Agresti-Coull', name: 'Agresti-Coull', other: 'the Agresti-Coull interval' },
  { id: 'jeffreys', tab: 'Jeffreys', name: 'Jeffreys', other: 'the Jeffreys interval' },
  { id: 'exact', tab: 'Exact', name: 'Exact (Clopper-Pearson)', other: 'the Clopper-Pearson interval' },
];

export const SHARE_WIDE = {
  W: 1240, H: 610, plotL: 60, plotR: 1216, titleY: 16, legendY: 38, top: 56, base: 346, tickY: 368, axisTitleY: 392,
  stripNameY: 428, stripBase: 556, stripTall: 100, countY: 576, countTitleY: 602, tick: 14, label: 15, knob: 8, labelMax: 25, belowMin: 80,
};

export const SHARE_NARROW = {
  W: 940, H: 660, plotL: 66, plotR: 920, titleY: 20, legendY: 46, top: 66, base: 372, tickY: 398, axisTitleY: 426,
  stripNameY: 464, stripBase: 594, stripTall: 100, countY: 618, countTitleY: 648, tick: 17, label: 17.5, knob: 9, labelMax: 15, belowMin: 96,
};

const round1 = (v) => Math.round(v * 10) / 10;
const label = (x, y, content, attrs = '') => (content === '' ? '' : `<text x="${round1(x)}" y="${round1(y)}" ${attrs}>${content}</text>`);
const path = (d, attrs) => (d ? `<path d="${d}" ${attrs} />` : '');
const percent = (c) => `${(c * 100).toFixed(1)}%`;
const shareText = (v) => {
  const size = Math.abs(v).toFixed(2).replace(/^0/, '');
  return v <= -0.005 ? `−${size}` : size;
};
const pointText = (point) => (point === 0 ? '0' : point === 1000 ? '1' : (point / 1000).toFixed(3).replace(/^0/, '').replace(/0+$/, ''));

function bisect(f, goal) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const INTERVALS = {
  wald: (x, n) => {
    const h = x / n;
    const m = Z * Math.sqrt((h * (1 - h)) / n);
    return [h - m, h + m];
  },
  wilson: (x, n) => {
    const h = x / n;
    const z2 = Z * Z;
    const c = (x + z2 / 2) / (n + z2);
    const m = ((Z * Math.sqrt(n)) / (n + z2)) * Math.sqrt(h * (1 - h) + z2 / (4 * n));
    return [c - m, c + m];
  },
  agresti: (x, n) => {
    const z2 = Z * Z;
    const size = n + z2;
    const c = (x + z2 / 2) / size;
    const m = Z * Math.sqrt((c * (1 - c)) / size);
    return [c - m, c + m];
  },
  jeffreys: (x, n) => [
    x === 0 ? 0 : bisect((v) => incompleteBeta(v, x + 0.5, n - x + 0.5), 0.025),
    x === n ? 1 : bisect((v) => incompleteBeta(v, x + 0.5, n - x + 0.5), 0.975),
  ],
  exact: (x, n) => [
    x === 0 ? 0 : bisect((v) => incompleteBeta(v, x, n - x + 1), 0.025),
    x === n ? 1 : bisect((v) => incompleteBeta(v, x + 1, n - x), 0.975),
  ],
};

function chances(table, p) {
  const lp = Math.log(p);
  const lq = Math.log(1 - p);
  return table.logC.map((c, x) => Math.exp(c + x * lp + (table.n - x) * lq));
}

const coverageAt = (table, p) => chances(table, p).reduce((sum, chance, x) => (table.lo[x] <= p && p <= table.hi[x] ? sum + chance : sum), 0);

const tables = new Map();
function tableFor(method, n) {
  const key = `${method}|${n}`;
  if (!tables.has(key)) {
    const table = { n, lo: [], hi: [], logC: [] };
    let total = 0;
    for (let x = 0; x <= n; x++) {
      const [lo, hi] = INTERVALS[method](x, n);
      table.lo.push(lo);
      table.hi.push(hi);
      table.logC.push(lnGamma(n + 1) - lnGamma(x + 1) - lnGamma(n - x + 1));
      total += incompleteBeta(hi, x + 1, n - x + 1) - incompleteBeta(lo, x + 1, n - x + 1);
    }
    const points = [1e-6, 1 - 1e-6];
    for (let i = 1; i < 2000; i++) points.push(i / 2000);
    for (const edge of [...table.lo, ...table.hi]) {
      if (edge > 1e-5 && edge < 1 - 1e-5) points.push(edge - 1e-9, edge + 1e-9);
    }
    points.sort((a, b) => a - b);
    let lowest = 2;
    let lowestAt = 0;
    table.line = points.map((p) => {
      const c = coverageAt(table, p);
      if (c < lowest) {
        lowest = c;
        lowestAt = Math.round(p * 1000);
      }
      return [p, c];
    });
    table.average = total / (n + 1);
    table.lowest = lowest;
    table.lowestAt = lowestAt;
    tables.set(key, table);
  }
  return tables.get(key);
}

export function readShare(state) {
  const n = SHARE_SIZES[state.shareSize];
  const method = METHODS.find((m) => m.id === state.method);
  const table = tableFor(state.method, n);
  const p = state.point / 1000;
  const bars = chances(table, p);
  const count = Math.round(n * p);
  return {
    n,
    method,
    table,
    point: state.point,
    p,
    bars,
    caught: bars.reduce((sum, chance, x) => (table.lo[x] <= p && p <= table.hi[x] ? sum + chance : sum), 0),
    onSurvey: state.point === SURVEY_POINT,
    count,
    lo: table.lo[count],
    hi: table.hi[count],
  };
}

export function narrateShare(v) {
  const first = `In the survey, ${percent(SURVEY_SHARE)} of people sleep less on weekends than on weekdays.`;
  const second = v.onSurvey
    ? `With ${v.n} people, ${v.method.other} catches that share ${percent(v.caught)} of the time, against a nominal 95%.`
    : `With ${v.n} people and a true proportion of ${pointText(v.point)}, ${v.method.other} catches it ${percent(v.caught)} of the time, against a nominal 95%.`;
  const impossible = v.lo <= -0.005 ? ', and a share below zero is impossible' : v.hi >= 1.005 ? ', and a share above one is impossible' : '';
  const third = `A study that finds ${v.count} such ${v.count === 1 ? 'person' : 'people'} gets an interval from ${shareText(v.lo)} to ${shareText(v.hi)}${impossible}.`;
  return `${first} ${second} ${third}`;
}

export function readoutsShare(v) {
  const edge = Math.min(v.table.lowestAt, 1000 - v.table.lowestAt);
  return {
    here: { name: `At a true proportion of ${pointText(v.point)}`, number: percent(v.caught), note: 'the blue bars’ chances add up to this' },
    average: { name: 'Average over all proportions', number: percent(v.table.average), note: `with ${v.n} people` },
    lowest: { name: 'Lowest', number: percent(v.table.lowest), note: edge === 500 ? 'near a true proportion of .5' : `near true proportions of ${pointText(edge)} and ${pointText(1000 - edge)}` },
  };
}

export const shareLabel = (v) => `Actual coverage of a nominal 95% interval against the true proportion, for ${v.method.name} with ${v.n} people. At ${pointText(v.point)} it is ${percent(v.caught)}.`;

export function pointAt(G, x) {
  const point = Math.round(((x - G.plotL) / (G.plotR - G.plotL)) * 1000);
  return Math.min(999, Math.max(1, point));
}

function curvesFor(G, table, px, py) {
  if (!table.curves) table.curves = {};
  if (!table.curves[G.W]) {
    const y95 = round1(py(NOMINAL));
    const first = round1(px(table.line[0][0]));
    const last = round1(px(table.line[table.line.length - 1][0]));
    const runs = [];
    let run = null;
    let line = '';
    let short = '';
    let over = '';
    for (const [p, c] of table.line) {
      const x = round1(px(p));
      line += `${line ? 'L' : 'M'}${x} ${round1(py(c))}`;
      short += `L${x} ${round1(py(Math.min(c, NOMINAL)))}`;
      over += `L${x} ${round1(py(Math.max(c, NOMINAL)))}`;
      if (c >= FLOOR) run = null;
      else if (run) run.end = x;
      else {
        run = { start: x, end: x };
        runs.push(run);
      }
    }
    table.curves[G.W] = { line, short: `M${first} ${y95}${short}L${last} ${y95}Z`, over: `M${first} ${y95}${over}L${last} ${y95}Z`, runs };
  }
  return table.curves[G.W];
}

export function shareFigure(G, v) {
  const width = G.plotR - G.plotL;
  const px = (p) => G.plotL + width * p;
  const py = (c) => G.base - ((Math.max(c, FLOOR) - FLOOR) / (1 - FLOOR)) * (G.base - G.top);
  const curves = curvesFor(G, v.table, px, py);
  const tallest = Math.max(...v.bars);
  const pitch = width / v.n;
  const barWidth = Math.min(2 * (G.W - G.plotR), 44, 0.8 * pitch);
  let caughtBars = '';
  let missedBars = '';
  let chances = '';
  v.bars.forEach((chance, x) => {
    const holds = v.table.lo[x] <= v.p && v.p <= v.table.hi[x];
    const h = (chance / tallest) * G.stripTall;
    const center = G.plotL + pitch * x;
    if (h >= 0.5) {
      const bar = `M${round1(center - barWidth / 2)} ${G.stripBase}v${round1(-h)}h${round1(barWidth)}v${round1(h)}Z`;
      if (holds) caughtBars += bar;
      else missedBars += bar;
    }
    if (v.n <= G.labelMax && chance >= 0.0005) chances += label(Math.min(center, G.W - 1.5 * G.tick), G.stripBase - h - 6, `${(chance * 100).toFixed(1)}%`, `text-anchor="middle" ${HALO}`);
  });
  const stepCount = v.n <= 10 ? 1 : v.n <= 20 ? 2 : v.n <= 50 ? 5 : v.n <= 100 ? 10 : 20;
  const counts = [];
  for (let x = 0; x <= v.n; x += stepCount) counts.push(x);
  const cx = px(v.p);
  const onChart = v.caught >= FLOOR;
  const knobY = py(v.caught);
  const flip = v.p > 0.88;
  const missed = (100 - Number((v.caught * 100).toFixed(1))).toFixed(1);
  const y95 = py(NOMINAL);
  const percents = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
  const surveyX = px(SURVEY_POINT / 1000);

  return [
    path(curves.short, `fill="${SHORT_FILL}"`),
    path(curves.over, `fill="${OVER_FILL}"`),
    path(percents.filter((c) => c !== NOMINAL && c !== FLOOR).map((c) => `M${G.plotL} ${round1(py(c))}H${G.plotR}`).join(''), `fill="none" stroke="${INK}" stroke-opacity="0.14"`),
    path(`M${G.plotL} ${G.top}V${G.base}H${G.plotR}${percents.map((c) => `M${G.plotL - 6} ${round1(py(c))}H${G.plotL}`).join('')}${[0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => `M${round1(px(p))} ${G.base}v6`).join('')}`, `fill="none" stroke="${INK}"`),
    path(`M${G.plotL} ${round1(y95)}H${G.plotR}`, `fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="6 4"`),
    path(curves.line, `fill="none" stroke="${DEEP}" stroke-width="1.8" stroke-linejoin="round"`),
    path(caughtBars, `fill="${BLUE}"`),
    path(missedBars, `fill="${ORANGE}"`),
    path(`M${round1(G.plotL - barWidth / 2)} ${G.stripBase}H${round1(G.plotR + barWidth / 2)}${counts.map((x) => `M${round1(G.plotL + pitch * x)} ${G.stripBase}v5`).join('')}`, `fill="none" stroke="${INK}"`),
    path(`M${round1(surveyX)} ${G.base}v10`, `fill="none" stroke="${GOLD}" stroke-width="2.2"`),
    `<line x1="${round1(cx)}" x2="${round1(cx)}" y1="${G.top - 6}" y2="${G.stripBase}" stroke="${GOLD}" stroke-width="2.2" />`,
    `<circle cx="${round1(cx)}" cy="${round1(knobY)}" r="${G.knob}" fill="${onChart ? GOLD : '#ffffff'}" stroke="${onChart ? '#ffffff' : GOLD}" stroke-width="2.5" />`,

    `<g font-size="${G.tick}" fill="${MUTED}" text-anchor="end">${percents.map((c) => label(G.plotL - 10, py(c) + 5, `${Math.round(c * 100)}%`, c === NOMINAL ? `font-weight="700" fill="${TEXT}"` : '')).join('')}</g>`,
    `<g font-size="${G.tick}" fill="${MUTED}" text-anchor="middle">`,
    [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => label(px(p), G.tickY, p === 0 ? '0' : p === 1 ? '1' : String(p).replace(/^0/, ''), HALO)).join(''),
    counts.map((x) => label(G.plotL + pitch * x, G.countY, String(x))).join(''),
    '</g>',
    `<g font-size="${G.tick}" fill="${TEXT}">${chances}</g>`,
    label(surveyX - 6, G.tickY, `survey ${pointText(SURVEY_POINT)}`, `font-size="${G.tick}" fill="${GOLD_TEXT}" font-weight="700" text-anchor="end" ${HALO}`),

    `<g font-size="${G.label}" fill="${TEXT}">`,
    label(0, G.titleY, 'Actual coverage of a nominal 95% interval', 'font-weight="700"'),
    label(G.W, G.titleY, `${v.method.name}, ${v.n} people`, 'text-anchor="end"'),
    label(0, G.legendY, `<tspan fill="${ORANGE_TEXT}" font-weight="700">Orange</tspan> falls short of 95%. <tspan fill="${BLUE}" font-weight="700">Blue</tspan> goes over.`),
    label(v.p > 0.5 ? G.plotL + 6 : G.plotR - 4, y95 - 6, 'nominal 95%', `${v.p > 0.5 ? '' : 'text-anchor="end"'} ${HALO}`),
    curves.runs.filter((run) => run.end - run.start >= G.belowMin && (cx < run.start - 70 || cx > run.end + 70)).map((run) => label((run.start + run.end) / 2, G.base - 8, 'below 70%', `fill="${ORANGE_TEXT}" text-anchor="middle" ${HALO}`)).join(''),
    label((G.plotL + G.plotR) / 2, G.axisTitleY, 'True proportion', `text-anchor="middle" ${HALO}`),
    label(G.plotL, G.stripNameY, `Chance of each count at a true proportion of ${pointText(v.point)}`, `font-weight="700" ${HALO}`),
    label(G.plotR, G.stripNameY, `<tspan fill="${BLUE}">caught ${percent(v.caught)}</tspan><tspan dx="16" fill="${ORANGE_TEXT}">missed ${missed}%</tspan>`, `text-anchor="end" font-weight="700" ${HALO}`),
    label((G.plotL + G.plotR) / 2, G.countTitleY, `Count out of ${v.n} people`, 'text-anchor="middle"'),
    label(flip ? cx - 13 : cx + 13, knobY < G.top + 26 ? knobY + 22 : knobY - 9, percent(v.caught), `font-size="${G.label + 1}" fill="${GOLD_TEXT}" font-weight="700" text-anchor="${flip ? 'end' : 'start'}" ${HALO}`),
    '</g>',
  ].join('');
}
