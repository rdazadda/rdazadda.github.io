import { ANSWERS, COVERAGE, LEVELS, NARROW_QUARTER, NEXT_MEANS, PEOPLE, STUDY_SIZES, TRUE_MEAN, WIDE_QUARTER } from '../data/sleep-survey.js';
import { cdf, quantile } from './normal.js';
import { tCritical, tTail } from './sampling.js';

export const START = {
  view: 'many',
  level: 6,
  size: 3,
  seed: 2739,
  value: 0,
  chosen: 0,
  shown: true,
  order: 'run',
  only: false,
  shift: 0,
  bars: 'ci',
  method: 'wald',
  shareSize: 5,
  point: 141,
};

const STUDIES = 100;
const AXIS_MIN = -2;
const AXIS_MAX = 4;
const P_TICKS = [
  [1, '1', '0%'],
  [0.5, '.50', '50%'],
  [0.2, '.20', '80%'],
  [0.1, '.10', '90%'],
  [0.05, '.05', '95%'],
  [0.01, '.01', '99%'],
  [0.001, '.001', '99.9%'],
];
const RUNGS = [0, 3, 5, 6, 8];
const HOURS = [-2, -1, 0, 1, 2, 3, 4];

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
const ITALIC_P = '<tspan font-style="italic">p</tspan>';

const difference = (answer) => answer[1] - answer[0];
const TRUE_SD = Math.sqrt(ANSWERS.reduce((sum, a) => sum + a[2] * (difference(a) - TRUE_MEAN) ** 2, 0) / PEOPLE);

export const WIDE = {
  W: 1240, H: 848, plotL: 48, plotR: 1180,
  labelY1: 14, labelY2: 33, curveTop: 44, curveBase: 214, numA: 232,
  heapTop: 246, heapBase: 322, barY: 338,
  rowsTitleY: 358, rows0: 368, pitch: 3.2, bellTop: 694, axisB: 794, numB: 812, axisTitleY: 838,
  rowLine: 1.2, rowMiss: 1.7, rowChosen: 3.4, rHit: 1.9, rMiss: 2.4,
  barW: 5, candW: 2, knob: 7, cross: 4.5, dotMax: 5, barWide: 18, meanDot: 6,
  legend1: 940, legend2: 1066, legendText: 34, rightPad: 12, axisTitleR: 1240,
  candLabelHalf: 62, pLabelW: 70, pClear: 16, nameW: 96, levelClear: 13,
  tick: 14, label: 15, title: 16,
};

export const NARROW = {
  W: 940, H: 932, plotL: 58, plotR: 880,
  labelY1: 17, labelY2: 40, curveTop: 56, curveBase: 236, numA: 258,
  heapTop: 272, heapBase: 352, barY: 372,
  rowsTitleY: 396, rows0: 408, pitch: 3.4, bellTop: 754, axisB: 858, numB: 882, axisTitleY: 916,
  rowLine: 1.5, rowMiss: 2, rowChosen: 3.8, rHit: 2.1, rMiss: 2.7,
  barW: 6, candW: 2.4, knob: 9, cross: 5.5, dotMax: 5, barWide: 14, meanDot: 6.5,
  legend1: 610, legend2: 752, legendText: 36, rightPad: 10, axisTitleR: 940,
  candLabelHalf: 72, pLabelW: 85, pClear: 19, nameW: 112, levelClear: 16,
  tick: 17, label: 17.5, title: 18.5,
};

const round1 = (v) => Math.round(v * 10) / 10;
const clampHours = (h) => Math.min(AXIS_MAX, Math.max(AXIS_MIN, h));
const pxOf = (G, h) => G.plotL + ((h - AXIS_MIN) * (G.plotR - G.plotL)) / (AXIS_MAX - AXIS_MIN);
const segment = (x1, x2, y) => `M${round1(x1)} ${round1(y)}H${round1(x2)}`;
const dot = (x, y, r) => `M${round1(x - r)} ${round1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const path = (d, attrs) => (d ? `<path d="${d}" ${attrs} />` : '');
const label = (x, y, content, attrs = '') => (content === '' ? '' : `<text x="${round1(x)}" y="${round1(y)}" ${attrs}>${content}</text>`);

const zOfP = (p) => quantile(1 - p / 2);
const Z_MAX = zOfP(0.001);
const LEVEL_Z = LEVELS.map((level) => zOfP(1 - level / 100));
const yOfZ = (G, z) => G.curveTop + (Math.min(z, Z_MAX) / Z_MAX) * (G.curveBase - G.curveTop);

const tCache = new Map();
function tStar(levelIndex, df) {
  const key = `${levelIndex}|${df}`;
  if (!tCache.has(key)) tCache.set(key, tCritical((1 - LEVELS[levelIndex] / 100) / 2, df));
  return tCache.get(key);
}

const CURVE_STEPS = 40;
const shapes = new Map();
function curveShape(df) {
  if (!shapes.has(df)) {
    const shape = [];
    for (let k = 0; k <= CURVE_STEPS; k++) {
      const z = (k / CURVE_STEPS) * Z_MAX;
      shape.push({ t: k === 0 ? 0 : tCritical(1 - cdf(z), df), z });
    }
    shapes.set(df, shape);
  }
  return shapes.get(df);
}

function mulberry32(start) {
  let a = start;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUMULATIVE = [];
ANSWERS.reduce((sum, answer) => {
  CUMULATIVE.push(sum + answer[2]);
  return sum + answer[2];
}, 0);

function drawAnswer(next) {
  const u = next() * PEOPLE;
  let lo = 0;
  let hi = ANSWERS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (u < CUMULATIVE[mid]) hi = mid;
    else lo = mid + 1;
  }
  return ANSWERS[lo];
}

function drawPeople(seed, n) {
  const next = mulberry32(seed);
  const people = new Array(n);
  for (let i = 0; i < n; i++) people[i] = drawAnswer(next);
  return people;
}

export function meanAndSd(values) {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squares = values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0);
  return { mean, sd: Math.sqrt(squares / (values.length - 1)) };
}

let lastSet = { key: '' };
function studySet(seed, n) {
  const key = `${seed}|${n}`;
  if (lastSet.key !== key) {
    const master = mulberry32(seed);
    const list = [];
    for (let i = 0; i < STUDIES; i++) {
      const own = Math.floor(master() * 4294967296);
      list.push({ id: i + 1, seed: own, ...meanAndSd(drawPeople(own, n).map(difference)) });
    }
    const asRun = list.map((study, i) => i);
    const byMean = asRun.slice().sort((a, b) => list[b].mean - list[a].mean);
    const byWidth = asRun.slice().sort((a, b) => list[a].sd - list[b].sd || a - b);
    lastSet = { key, list, asRun, byMean, byWidth };
  }
  return lastSet;
}

const peopleCache = { key: '' };
export function peopleOf(seed, study, n) {
  const key = `${seed}|${study.id}|${n}`;
  if (peopleCache.key !== key) {
    peopleCache.key = key;
    peopleCache.people = drawPeople(study.seed, n);
  }
  return peopleCache.people;
}

function pValue(mean, se, df, h) {
  if (se === 0) return Math.abs(mean - h) < 1e-9 ? 1 : 0;
  return 2 * tTail(Math.abs(mean - h) / se, df);
}

export function hours(v) {
  const size = Math.abs(v).toFixed(2);
  return v <= -0.005 ? `−${size}` : size;
}

export function pNumber(p) {
  if (p >= 0.9995) return '1.00';
  if (p < 0.001) return '< .001';
  return p.toFixed(3).slice(1);
}

const pEquals = (p) => (p < 0.001 ? '< .001' : `= ${pNumber(p)}`);
const percent = (v) => `${(Math.round(v * 1000 + 1e-9) / 10).toFixed(1)}%`;

export function read(state) {
  const n = STUDY_SIZES[state.size];
  const level = LEVELS[state.level];
  const set = studySet(state.seed, n);
  const df = n - 1;
  const root = Math.sqrt(n);
  const t = tStar(state.level, df);
  const halfOf = (s) => (t * s.sd) / root;
  const catches = (s) => Math.abs(s.mean - TRUE_MEAN) <= halfOf(s);
  const ordered = { run: set.asRun, mean: set.byMean, width: set.byWidth }[state.order];
  const order = state.only ? ordered.filter((i) => Math.abs(set.list[i].mean) > halfOf(set.list[i])) : ordered;
  const chosen = !state.only || !order.length || order.includes(state.chosen) ? state.chosen : order[0];
  const study = set.list[chosen];
  const se = study.sd / root;
  const margin = t * se;
  const lo = study.mean - margin;
  const hi = study.mean + margin;
  const sdOfMeans = TRUE_SD / root;
  const z = LEVEL_Z[state.level];
  let caught = 0;
  let contains = 0;
  let inside = 0;
  let outside = 0;
  let total = 0;
  let chosenRow = -1;
  const rows = order.map((index, row) => {
    const s = set.list[index];
    const half = halfOf(s);
    const hit = catches(s);
    total += s.mean;
    if (hit) caught += 1;
    else if (Math.abs(s.mean - TRUE_MEAN) > z * sdOfMeans) outside += 1;
    if (Math.abs(s.mean - state.value) <= half) contains += 1;
    if (index !== chosen && s.mean >= lo && s.mean <= hi) inside += 1;
    if (index === chosen) chosenRow = row;
    return { mean: s.mean, half, hit };
  });
  return {
    n,
    nText: n.toLocaleString('en-US'),
    level,
    df,
    seed: state.seed,
    study,
    chosen,
    se,
    margin,
    lo,
    hi,
    z,
    sdOfMeans,
    order,
    rows,
    chosenRow,
    caught,
    contains,
    inside,
    outside,
    average: rows.length ? total / rows.length : 0,
    narrowCaught: set.byWidth.slice(0, 25).filter((i) => catches(set.list[i])).length,
    wideCaught: set.byWidth.slice(-25).filter((i) => catches(set.list[i])).length,
    narrowMisses: set.byWidth.slice(0, 25).filter((i) => !catches(set.list[i])).length,
    value: state.value,
    p: pValue(study.mean, se, df, state.value),
    hit: catches(study),
    shown: state.shown,
    orderName: state.order,
    only: state.only,
    longRun: percent(COVERAGE[state.size][state.level]),
    nextRun: percent(NEXT_MEANS[state.size][state.level]),
    narrowRun: percent(NARROW_QUARTER[state.size][state.level]),
    wideRun: percent(WIDE_QUARTER[state.size][state.level]),
  };
}

const pWords = (p) => (p < 0.001 ? '<i>p</i> below .001' : `<i>p</i> = ${pNumber(p)}`);

function holders(count, total) {
  if (count === 0) return `none of the ${total} intervals contains it`;
  return `${count} of the ${total} intervals ${count === 1 ? 'contains' : 'contain'} it`;
}

function valueSentence(v) {
  const total = v.rows.length;
  const gap = Math.min(Math.abs(v.value - v.lo), Math.abs(v.value - v.hi));
  if (v.margin > 0 && gap <= Math.min(0.03, 0.25 * v.margin)) return `A value of ${hours(v.value)} sits next to a limit of study ${v.study.id}’s interval with ${pWords(v.p)}, and nothing sudden happens as it crosses.`;
  if (v.value === 0) return `A difference of 0 has ${pWords(v.p)} in study ${v.study.id}, and ${holders(v.contains, total)}.`;
  if (v.shown && v.value === TRUE_MEAN) return `At the true value study ${v.study.id} has ${pWords(v.p)}, and the ${v.contains} intervals containing it are the ones that caught it.`;
  return `A value of ${hours(v.value)} hours has ${pWords(v.p)} in study ${v.study.id}, and ${holders(v.contains, total)}.`;
}

export function narrate(v) {
  if (v.only) {
    const kept = v.rows.length;
    if (kept === 0) return `With only significant results kept, none of the 100 studies is left at ${v.level}% confidence. Every interval contains 0.`;
    const first = `Only the ${kept} of 100 studies whose ${v.level}% intervals leave out 0 are kept.`;
    if (!v.shown) return `${first} Their average is ${hours(v.average)} hours. ${valueSentence(v)}`;
    const raised = v.average - TRUE_MEAN > 0.05 ? ' Keeping only these results makes the effect look larger than it is.' : '';
    return `${first} Their average is ${hours(v.average)} hours, and the true value is ${hours(TRUE_MEAN)}.${raised}`;
  }
  const first = v.shown
    ? `Each row is a study of ${v.nText} people from the survey, whose true average is ${hours(TRUE_MEAN)} hours more sleep on weekends.`
    : `Each row is a study of ${v.nText} people from the survey.`;
  const count = v.caught === STUDIES ? 'all 100 intervals' : `${v.caught} of the 100 intervals`;
  const missed = STUDIES - v.caught;
  let second = `At ${v.level}% confidence, ${count} caught it, and the long-run rate is ${v.longRun}.`;
  if (!v.shown) second = 'With the true value hidden, as in real research, nobody can see which intervals missed.';
  else if (!v.hit) second = `At ${v.level}% confidence, ${count} caught it, and study ${v.study.id} is ${missed === 1 ? 'the one' : `one of the ${missed}`} that missed.`;
  else if (v.orderName === 'mean' && missed === 1) second = `At ${v.level}% confidence, ${count} caught it, and the one miss has its mean ${v.outside === 1 ? 'outside' : 'inside'} the heavy span.`;
  else if (v.orderName === 'mean' && missed > 1) second = `At ${v.level}% confidence, ${count} caught it, and ${v.outside === missed ? `all ${missed} misses have means` : v.outside === 0 ? `none of the ${missed} misses has its mean` : v.outside === 1 ? `1 of the ${missed} misses has its mean` : `${v.outside} of the ${missed} misses have means`} outside the heavy span.`;
  if (v.shown && v.orderName === 'width' && missed > 0) {
    const among = v.narrowMisses === missed
      ? (missed === 1 ? 'the one miss is' : `all ${missed} misses are`)
      : v.narrowMisses === 0
        ? `none of the ${missed} misses is`
        : `${v.narrowMisses} of the ${missed} misses ${v.narrowMisses === 1 ? 'is' : 'are'}`;
    const verdict = v.narrowMisses > missed / 4 ? ', so a narrow interval is not a safer one' : '';
    return `${first} ${second} With the narrowest on top, ${among} among the 25 narrowest${verdict}.`;
  }
  return `${first} ${second} ${valueSentence(v)}`;
}

export function readouts(v) {
  const contains = {
    name: `Intervals that contain ${hours(v.value)}`,
    number: v.rows.length ? `${v.contains} of ${v.rows.length}` : 'None left',
    note: `study ${v.study.id} has <i>p</i> ${pEquals(v.p)}`,
  };
  const inside = {
    name: `Other means inside study ${v.study.id}’s interval`,
    number: v.rows.length ? `${v.inside} of ${v.rows.length - 1}` : 'None left',
    note: v.only ? 'among the studies kept' : `long-run rate ${v.nextRun}, not ${v.level}%`,
  };
  if (v.only) {
    return {
      caught: {
        name: `Average of these ${v.rows.length}`,
        number: v.rows.length ? `${hours(v.average)} hours` : 'None left',
        note: v.shown ? `the true value is ${hours(TRUE_MEAN)}` : 'the true value is hidden',
      },
      contains,
      inside,
    };
  }
  if (v.orderName === 'width' && v.shown) {
    return {
      caught: { name: 'The 25 narrowest intervals caught it', number: `${v.narrowCaught} of 25`, note: `long-run rate ${v.narrowRun}` },
      contains: { name: 'The 25 widest intervals caught it', number: `${v.wideCaught} of 25`, note: `long-run rate ${v.wideRun}` },
      inside,
    };
  }
  return {
    caught: {
      name: 'Caught the true value',
      number: v.shown ? `${v.caught} of 100` : 'Hidden',
      note: v.shown ? `long-run rate ${v.longRun}` : 'nobody can see this in real research',
    },
    contains,
    inside,
  };
}

export const figureLabel = (v) =>
  `One axis of hours more sleep on weekends, shared by the p value curve of study ${v.study.id}, its people and its ${v.level}% interval, ${hours(v.lo)} to ${hours(v.hi)}, and ${v.rows.length} studies of ${v.nText} people.`;

export const studyText = (v) => `Study ${v.study.id}, ${hours(v.lo)} to ${hours(v.hi)}`;

function curvePath(G, v) {
  const x = (h) => round1(pxOf(G, h));
  if (v.study.sd === 0) return `M${x(v.study.mean)} ${G.curveTop}V${G.curveBase}`;
  const shape = curveShape(v.df);
  const points = [];
  for (let k = CURVE_STEPS; k >= 0; k--) points.push([v.study.mean - shape[k].t * v.se, shape[k].z]);
  for (let k = 1; k <= CURVE_STEPS; k++) points.push([v.study.mean + shape[k].t * v.se, shape[k].z]);
  const inside = points.filter(([h]) => h >= AXIS_MIN && h <= AXIS_MAX);
  return inside.length ? `M${inside.map(([h, z]) => `${x(h)} ${round1(yOfZ(G, z))}`).join('L')}` : '';
}

function heapMarks(G, values) {
  const counts = new Map();
  let off = 0;
  for (const value of values) {
    if (value < AXIS_MIN || value > AXIS_MAX) off += 1;
    else counts.set(value, (counts.get(value) || 0) + 1);
  }
  const tallest = Math.max(1, ...counts.values());
  const room = G.heapBase - G.heapTop;
  const r = Math.min(G.dotMax, room / (2 * tallest));
  const useDots = r >= 1.4;
  let marks = '';
  counts.forEach((count, value) => {
    const x = pxOf(G, value);
    if (useDots) {
      for (let k = 0; k < count; k++) marks += dot(x, G.heapBase - r - k * 2 * r, Math.round(r * 100) / 100);
    } else {
      const h = (count / tallest) * room;
      const left = Math.max(G.plotL, x - G.barWide / 2);
      const width = Math.min(G.plotR, x + G.barWide / 2) - left;
      marks += `M${round1(left)} ${G.heapBase}v${round1(-h)}h${round1(width)}v${round1(h)}Z`;
    }
  });
  return { marks, off, useDots };
}

function bellMarks(G, sd, z) {
  const height = G.axisB - G.bellTop;
  const point = (k) => `${round1(pxOf(G, TRUE_MEAN + k * sd))} ${round1(G.axisB - height * Math.exp((-k * k) / 2))}`;
  const trace = (from, to, steps) => {
    const out = [];
    for (let i = 0; i <= steps; i++) out.push(point(from + ((to - from) * i) / steps));
    return out.join('L');
  };
  const area = (from, to, steps) => `M${round1(pxOf(G, TRUE_MEAN + from * sd))} ${G.axisB}L${trace(from, to, steps)}L${round1(pxOf(G, TRUE_MEAN + to * sd))} ${G.axisB}Z`;
  return {
    tails: `${area(-3.6, -z, 16)}${area(z, 3.6, 16)}`,
    middle: area(-z, z, 40),
    curve: `M${trace(-3.6, 3.6, 72)}`,
    span: segment(pxOf(G, TRUE_MEAN - z * sd), pxOf(G, TRUE_MEAN + z * sd), G.axisB),
  };
}

function frameMarks(G) {
  let d = `M${G.plotL} ${G.curveTop}V${G.curveBase}H${G.plotR}V${G.curveTop}`;
  for (const [p] of P_TICKS) {
    const y = round1(yOfZ(G, zOfP(p)));
    d += `M${G.plotL - 5} ${y}H${G.plotL}M${G.plotR} ${y}H${G.plotR + 5}`;
  }
  d += `M${G.plotL} ${G.heapBase}H${G.plotR}M${G.plotL} ${G.axisB}H${G.plotR}`;
  for (let h = AXIS_MIN; h <= AXIS_MAX; h += 0.5) {
    const x = round1(pxOf(G, h));
    const size = Number.isInteger(h) ? 6 : 3;
    d += `M${x} ${G.curveBase}v${size}M${x} ${G.axisB}v${size}`;
  }
  return d;
}

const pYOf = (G, p) => Math.min(yOfZ(G, zOfP(Math.max(p, 1e-12))), G.curveBase);

export function levelAt(G, y) {
  const z = ((y - G.curveTop) / (G.curveBase - G.curveTop)) * Z_MAX;
  let best = 0;
  LEVEL_Z.forEach((level, i) => {
    if (Math.abs(level - z) < Math.abs(LEVEL_Z[best] - z)) best = i;
  });
  return best;
}

function snapValue(h, shown) {
  if (Math.abs(h) < 0.02) return 0;
  if (shown && Math.abs(h - TRUE_MEAN) < 0.02) return TRUE_MEAN;
  return h;
}

export function valueAt(G, x, shown) {
  const h = AXIS_MIN + ((x - G.plotL) * (AXIS_MAX - AXIS_MIN)) / (G.plotR - G.plotL);
  return snapValue(clampHours(Math.round(h * 100) / 100), shown);
}

export const keyedValue = (hundredths, shown) => (shown && hundredths === 60 ? TRUE_MEAN : hundredths / 100);

export const rowAt = (G, y, count) => Math.min(count - 1, Math.max(0, Math.round((y - G.rows0) / G.pitch)));

export function zoneAt(G, v, x, y) {
  if (x < G.plotL - 10 || x > G.axisTitleR || y < G.labelY1 - 8 || y > G.axisB + 8) return null;
  const inCurve = y >= G.curveTop - 8 && y <= G.curveBase + 8;
  if (inCurve && (x > G.plotR - 10 || Math.abs(y - yOfZ(G, v.z)) <= 7)) return 'level';
  if (x > G.plotR + 10) return null;
  const rowsTop = G.rows0 - G.pitch;
  const rowsEnd = G.rows0 + v.rows.length * G.pitch;
  if (Math.abs(x - pxOf(G, v.value)) <= 10) return 'value';
  if (y >= rowsTop && y <= rowsEnd && v.rows.length) return 'row';
  return y < rowsTop ? 'value' : null;
}

export function figure(G, v) {
  const px = (h) => pxOf(G, h);
  const yLevel = yOfZ(G, v.z);
  const loX = px(clampHours(v.lo));
  const hiX = px(clampHours(v.hi));
  const meanX = px(clampHours(v.study.mean));
  const limits = [v.lo, v.hi].filter((h) => h >= AXIS_MIN && h <= AXIS_MAX);
  const count = v.rows.length;
  const rowsEnd = G.rows0 + Math.max(count - 1, 0) * G.pitch + G.pitch / 2;
  const chosenY = G.rows0 + v.chosenRow * G.pitch;
  const barColor = v.shown ? (v.hit ? BLUE : ORANGE) : INK;
  const barText = v.shown ? (v.hit ? BLUE : ORANGE_TEXT) : TEXT;
  const truthX = px(TRUE_MEAN);

  let hitLines = '';
  let missLines = '';
  let hitDots = '';
  let missDots = '';
  v.rows.forEach((row, i) => {
    const y = G.rows0 + i * G.pitch;
    const line = segment(px(clampHours(row.mean - row.half)), px(clampHours(row.mean + row.half)), y);
    const onAxis = row.mean >= AXIS_MIN && row.mean <= AXIS_MAX;
    if (row.hit || !v.shown) {
      hitLines += line;
      if (onAxis) hitDots += dot(px(row.mean), y, G.rHit);
    } else {
      missLines += line;
      if (onAxis) missDots += dot(px(row.mean), y, G.rMiss);
    }
  });
  const hitColor = v.shown ? BLUE : INK;

  let rungs = '';
  if (v.study.sd > 0) {
    for (const i of RUNGS) {
      const half = tStar(i, v.df) * v.se;
      rungs += segment(px(clampHours(v.study.mean - half)), px(clampHours(v.study.mean + half)), yOfZ(G, LEVEL_Z[i]));
    }
  }

  const heap = heapMarks(G, peopleOf(v.seed, v.study, v.n).map(difference));
  const bell = v.shown ? bellMarks(G, v.sdOfMeans, v.z) : null;
  const bellX = px(TRUE_MEAN + 3.6 * v.sdOfMeans) + 10;

  const cx = px(v.value);
  const yP = pYOf(G, v.p);
  let side = v.value < v.study.mean ? -1 : 1;
  if (side < 0 && cx - 9 - G.pLabelW < G.plotL) side = 1;
  if (side > 0 && cx + 9 + G.pLabelW > G.plotR) side = -1;
  const rightFits = hiX + 10 + G.nameW <= G.plotR;
  const leftFits = loX - 10 - G.nameW >= G.plotL;
  const nameRight = v.value <= v.study.mean ? rightFits : !leftFits;
  const nameFits = nameRight ? rightFits : leftFits;
  let pY = Math.max(yP - 8, G.curveTop + 12);
  if (Math.abs(pY - yLevel) < G.pClear) pY = pY > yLevel || (nameFits && side === (nameRight ? 1 : -1)) ? yLevel + G.pClear + 2 : yLevel - 7;

  const off = heap.off > 0 ? `, ${heap.off} off the axis` : '';
  const tickText = P_TICKS.map(([p, left, right]) => {
    const y = yOfZ(G, zOfP(p));
    if (Math.abs(y - yLevel) < G.levelClear) return '';
    return label(G.plotL - 10, y + 5, left, 'text-anchor="end"') + label(G.plotR + G.rightPad, y + 5, right);
  }).join('');

  const legendY = G.rowsTitleY - 5;
  const clipped = v.rows.filter((row) => row.mean - row.half < AXIS_MIN || row.mean + row.half > AXIS_MAX).length;
  const past = clipped ? `, ${clipped} ${clipped === 1 ? 'runs' : 'run'} past the axis` : '';
  const kept = count ? `The ${count} of 100 studies that exclude 0${past}` : 'None of the 100 studies excludes 0';
  const title = v.only ? kept : `100 studies of ${v.nText} people each${past}`;
  const titleEnd = G.plotL + title.length * G.title * 0.56;
  const meanShown = meanX - 40 > titleEnd && meanX + 40 < G.legend1;
  const averageX = px(clampHours(v.average));
  const averageLabelRight = averageX + 260 < G.plotR;

  return [
    count ? path(`M${round1(loX)} ${G.heapTop}H${round1(hiX)}V${round1(rowsEnd)}H${round1(loX)}Z`, 'fill="#e9eef3"') : '',
    path(frameMarks(G), `fill="none" stroke="${INK}" stroke-width="1"`),
    `<line x1="${round1(px(0))}" x2="${round1(px(0))}" y1="${G.labelY2 + 6}" y2="${G.axisB}" stroke="${MUTED}" stroke-width="1" />`,
    bell ? path(bell.tails, `fill="${ORANGE}"`) + path(bell.middle, 'fill="#e7ebef"') + path(bell.curve, `fill="none" stroke="${INK}" stroke-width="1.4"`) + path(bell.span, `fill="none" stroke="${INK}" stroke-width="5"`) : '',
    v.chosenRow >= 0 ? path(segment(G.plotL, G.plotR, chosenY), `fill="none" stroke="${INK}" stroke-width="0.75"`) + path(segment(loX, hiX, chosenY), `fill="none" stroke="${barColor}" stroke-width="${G.rowChosen}"`) : '',
    path(hitLines, `fill="none" stroke="${hitColor}" stroke-width="${G.rowLine}"`),
    path(missLines, `fill="none" stroke="${ORANGE}" stroke-width="${G.rowMiss}"`),
    v.shown ? `<line x1="${round1(truthX)}" x2="${round1(truthX)}" y1="${G.labelY2 + 6}" y2="${G.axisB}" stroke="${GOLD}" stroke-width="2" />` : '',
    path(hitDots, `fill="${hitColor}"`),
    path(missDots, `fill="#ffffff" stroke="${ORANGE}" stroke-width="1.3"`),
    path(limits.map((h) => `M${round1(px(h))} ${round1(yLevel)}V${round1(rowsEnd)}`).join(''), `fill="none" stroke="${barColor}" stroke-width="1" stroke-dasharray="3 3"`),
    v.only && count ? `<line x1="${round1(averageX)}" x2="${round1(averageX)}" y1="${G.rows0 - G.pitch}" y2="${round1(rowsEnd + 8)}" stroke="${INK}" stroke-width="2.4" />` : '',
    path(rungs, 'fill="none" stroke="#b8c1cc" stroke-width="1"'),
    path(curvePath(G, v), `fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`),
    `<line x1="${G.plotL}" x2="${G.plotR}" y1="${round1(yLevel)}" y2="${round1(yLevel)}" stroke="${DEEP}" stroke-width="1.5" />`,
    path(segment(loX, hiX, yLevel), `fill="none" stroke="${barColor}" stroke-width="3.5"`),
    path(limits.map((h) => dot(px(h), yLevel, G.cross)).join(''), `fill="#ffffff" stroke="${barColor}" stroke-width="2"`),
    path(heap.marks, `fill="${INK}" stroke="#ffffff" stroke-width="0.7"`),
    path(segment(loX, hiX, G.barY), `fill="none" stroke="${barColor}" stroke-width="${G.barW}"`),
    path(dot(meanX, G.barY, G.meanDot), `fill="${v.shown && !v.hit ? '#ffffff' : barColor}" stroke="${barColor}" stroke-width="2.5"`),
    `<line x1="${round1(cx)}" x2="${round1(cx)}" y1="${G.labelY1 + 5}" y2="${G.axisB}" stroke="${INK}" stroke-width="${G.candW}" />`,
    `<circle cx="${round1(cx)}" cy="${round1(yP)}" r="${G.cross}" fill="${INK}" stroke="#ffffff" stroke-width="1.5" />`,
    `<circle cx="${round1(cx)}" cy="${G.curveBase}" r="${G.knob}" fill="${INK}" stroke="#ffffff" stroke-width="2" />`,
    `<circle cx="${G.plotR}" cy="${round1(yLevel)}" r="${G.knob}" fill="${DEEP}" stroke="#ffffff" stroke-width="2" />`,

    `<g font-size="${G.tick}" fill="${MUTED}">`,
    label(0, G.labelY2, `${ITALIC_P} value`),
    label(G.axisTitleR, G.labelY2, 'Confidence level', 'text-anchor="end"'),
    tickText,
    '</g>',
    `<g font-size="${G.tick}" fill="${DEEP}" font-weight="700">`,
    label(G.plotL - 10, yLevel + 5, ((100 - v.level) / 100).toFixed(2).slice(1), 'text-anchor="end"'),
    label(G.plotR + G.rightPad, yLevel + 5, `${v.level}%`),
    '</g>',
    `<g font-size="${G.tick}" fill="${MUTED}" text-anchor="middle">`,
    HOURS.map((h) => label(px(h), G.numA, h < 0 ? `−${-h}` : String(h), HALO) + label(px(h), G.numB, h < 0 ? `−${-h}` : String(h))).join(''),
    '</g>',

    `<g font-size="${G.label}" fill="${TEXT}">`,
    label(px(0) - 6, G.labelY2, 'no difference', `text-anchor="end" ${HALO}`),
    v.shown ? label(truthX + 6, G.labelY2, `true value ${hours(TRUE_MEAN)}`, `fill="${GOLD_TEXT}" font-weight="700" ${HALO}`) : '',
    label(Math.min(G.plotR, Math.max(G.candLabelHalf, cx)), G.labelY1, `value ${hours(v.value)}`, `text-anchor="middle" font-weight="700" ${HALO}`),
    label(cx + side * 9, pY, `${ITALIC_P} ${pEquals(v.p)}`, `text-anchor="${side < 0 ? 'end' : 'start'}" font-weight="700" ${HALO}`),
    !nameFits ? '' : label(nameRight ? hiX + 10 : loX - 10, yLevel - 6, `${v.level}% interval`, `text-anchor="${nameRight ? 'start' : 'end'}" fill="${DEEP}" font-weight="700" ${HALO}`),
    label(G.plotR - 8, G.heapTop + 12, `${heap.useDots ? 'each dot is one person' : 'each bar counts the people with that answer'}${off}`, `text-anchor="end" ${HALO}`),
    label(Math.max(loX - 10, G.plotL + 36), G.barY + 5, hours(v.lo), `text-anchor="end" fill="${barText}" font-weight="700" ${HALO}`),
    label(Math.min(hiX + 10, G.plotR - 36), G.barY + 5, hours(v.hi), `fill="${barText}" font-weight="700" ${HALO}`),
    meanShown ? label(meanX, G.barY + 19, `mean ${hours(v.study.mean)}`, `text-anchor="middle" ${HALO}`) : '',
    v.chosenRow >= 0 ? label(G.plotL - 6, chosenY + 5, String(v.study.id), 'text-anchor="end" font-weight="700"') : '',
    v.only && count ? label(averageX + (averageLabelRight ? 8 : -8), rowsEnd + 18, `average of these ${count}, ${hours(v.average)}`, `${averageLabelRight ? '' : 'text-anchor="end"'} font-weight="700" ${HALO}`) : '',
    v.shown ? label(bellX, G.bellTop + 40, `about ${v.level}% of means`, HALO) + label(bellX, G.bellTop + 58, 'land in the heavy span', HALO) : '',
    v.shown ? label(truthX, G.numB, hours(TRUE_MEAN), `text-anchor="middle" fill="${GOLD_TEXT}" font-weight="700"`) : '',
    label((G.plotL + G.plotR) / 2, G.axisTitleY, 'Hours more sleep on weekends than on weekdays', 'text-anchor="middle"'),
    '</g>',

    label(G.plotL, G.rowsTitleY, title, `font-size="${G.title}" font-weight="700" fill="${TEXT}" ${HALO}`),
    v.shown
      ? `<g font-size="${G.label}" font-weight="700">${path(segment(G.legend1, G.legend1 + 28, legendY), `fill="none" stroke="${BLUE}" stroke-width="${G.rowLine}"`)}${path(dot(G.legend1 + 14, legendY, G.rHit + 0.5), `fill="${BLUE}"`)}${label(G.legend1 + G.legendText, G.rowsTitleY, `${v.caught} caught`, `fill="${BLUE}"`)}${path(segment(G.legend2, G.legend2 + 28, legendY), `fill="none" stroke="${ORANGE}" stroke-width="${G.rowMiss}"`)}${path(dot(G.legend2 + 14, legendY, G.rMiss + 0.5), `fill="#ffffff" stroke="${ORANGE}" stroke-width="1.3"`)}${label(G.legend2 + G.legendText, G.rowsTitleY, `${count - v.caught} missed`, `fill="${ORANGE_TEXT}"`)}</g>`
      : '',
  ].join('');
}
