import { hours, meanAndSd, pNumber, peopleOf, read } from './confidence.js';
import { tCritical, tTail } from './sampling.js';

const BLUE = '#1f5a88';
const INK = '#30394f';
const TEXT = '#1f2933';
const GOLD = '#c99400';
const GOLD_TEXT = '#7d5c00';
const HALO = 'paint-order="stroke" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"';
const ITALIC_P = '<tspan font-style="italic">p</tspan>';
const ITALIC_T = '<tspan font-style="italic">t</tspan>';
const NICE_STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2];

export const PAIR_WIDE = {
  W: 1240, H: 580, panels: [0, 640], width: 600, titleY: 20, axisTitleY: 50, top: 62, bottom: 505,
  axisL: 56, xA: 165, xB: 305, xD: 505, axisR: 548, nameY: 530, captionY: 566, cap: 12, r: 8.5, tick: 14, label: 15, title: 18, caption: 16, longMarks: true,
};

export const PAIR_NARROW = {
  W: 940, H: 600, panels: [0, 488], width: 452, titleY: 22, axisTitleY: 54, top: 68, bottom: 524,
  axisL: 46, xA: 128, xB: 228, xD: 350, axisR: 394, nameY: 552, captionY: 588, cap: 12, r: 9, tick: 16, label: 16.5, title: 18.5, caption: 17, longMarks: false,
};

const round1 = (v) => Math.round(v * 10) / 10;
const label = (x, y, content, attrs = '') => (content === '' ? '' : `<text x="${round1(x)}" y="${round1(y)}" ${attrs}>${content}</text>`);
const path = (d, attrs) => (d ? `<path d="${d}" ${attrs} />` : '');
const tickNumber = (v, step) => {
  if (Math.abs(v) < step / 100) return '0';
  const size = Math.abs(v).toFixed(step < 0.1 || step === 0.25 ? 2 : step < 1 ? 1 : 0);
  return v < 0 ? `−${size}` : size;
};
const pEquals = (p) => (p < 0.001 ? '< .001' : `= ${pNumber(p)}`);
const pWords = (p) => (p < 0.001 ? 'below .001' : pNumber(p));
const correlation = (r) => {
  if (!Number.isFinite(r)) return 'undefined';
  const size = Math.abs(r).toFixed(2);
  return `${r <= -0.005 ? '−' : ''}${size === '1.00' ? size : size.slice(1)}`;
};
const interval = (center, half) => `${hours(center - half)} to ${hours(center + half)}`;

export function readPair(state) {
  const base = read(state);
  const people = peopleOf(base.seed, base.study, base.n);
  const n = base.n;
  const first = meanAndSd(people.map((a) => a[0]));
  const second = meanAndSd(people.map((a) => a[1]));
  const root = Math.sqrt(n);
  const se1 = first.sd / root;
  const se2 = second.sd / root;
  const seSame = base.study.sd / root;
  const seSeparate = Math.hypot(se1, se2);
  const dfSeparate = seSeparate === 0 ? 2 * (n - 1) : seSeparate ** 4 / ((se1 ** 4 + se2 ** 4) / (n - 1));
  const tSame = tCritical(0.025, n - 1);
  const tSeparate = tCritical(0.025, dfSeparate);
  const w1 = tSame * se1;
  const w2 = tSame * se2;
  const averageW = (w1 + w2) / 2;
  const m1 = first.mean;
  const real = second.mean;
  const lowest = Math.min(real, m1 - 0.5 * averageW);
  const highest = Math.max(real, m1 + w1 + w2 + 0.6 * averageW);
  const m2 = Math.min(highest, Math.max(lowest, real + state.shift));
  const d = m2 - m1;
  const ci = state.bars === 'ci';
  const arm1 = ci ? w1 : se1;
  const arm2 = ci ? w2 : se2;
  const averageArm = (arm1 + arm2) / 2;
  const upper = Math.min(m1 + arm1, m2 + arm2);
  const lower = Math.max(m1 - arm1, m2 - arm2);
  const contact = m1 + arm1 + arm2;
  const halfSame = tSame * seSame;
  const halfSeparate = tSeparate * seSeparate;
  const reach = Math.max(w2, halfSeparate);
  const rawLow = Math.min(m1 - w1, lowest - reach);
  const rawHigh = Math.max(m1 + w1, highest + reach);
  const pad = 0.02 * (rawHigh - rawLow);
  const overlap = upper - lower;
  return {
    n,
    nText: base.nText,
    id: base.study.id,
    m1,
    m2,
    real,
    d,
    ci,
    moved: Math.abs(m2 - real) > 0.004,
    lowest,
    highest,
    arm1,
    arm2,
    averageArm,
    upper,
    lower,
    overlap,
    touching: Math.abs(overlap) < 0.005,
    share: Math.abs(overlap) / averageArm,
    first,
    second,
    sdDifference: base.study.sd,
    r: (first.sd ** 2 + second.sd ** 2 - base.study.sd ** 2) / (2 * first.sd * second.sd),
    se1,
    se2,
    w1,
    w2,
    pSame: seSame === 0 ? (d === 0 ? 1 : 0) : 2 * tTail(Math.abs(d) / seSame, n - 1),
    pSeparate: seSeparate === 0 ? (d === 0 ? 1 : 0) : 2 * tTail(Math.abs(d) / seSeparate, dfSeparate),
    seSame,
    seSeparate,
    dfSeparate,
    halfSame,
    halfSeparate,
    markA: ci ? contact - averageArm / 2 : contact + averageArm,
    markB: ci ? contact : contact + 2 * averageArm,
    ruleHolds: Math.max(w1, w2) <= 2 * Math.min(w1, w2),
    axisLow: rawLow - pad,
    axisHigh: rawHigh + pad,
  };
}

function relation(v) {
  if (v.touching) return 'just touch';
  if (v.ci) return v.overlap > 0 ? `overlap by ${hours(v.overlap)} hours, ${Math.round(v.share * 100)}% of their average margin of error` : `sit ${hours(-v.overlap)} hours apart, ${Math.round(v.share * 100)}% of their average margin of error`;
  return v.overlap > 0 ? `overlap by ${hours(v.overlap)} hours, ${v.share.toFixed(2)} average standard errors` : `leave a gap of ${hours(-v.overlap)} hours, ${v.share.toFixed(2)} average standard errors`;
}

export function narratePair(v) {
  const opening = v.moved ? `With weekends moved to ${hours(v.m2)}, ` : '';
  if (v.ci) {
    const who = opening ? `${opening}the two 95% intervals` : `Study ${v.id} asked ${v.nText} people about weekdays and weekends. The two 95% intervals`;
    return `${who} ${relation(v)}. If the same people answered both, the difference has <i>p</i> ${pEquals(v.pSame)}. If two separate groups answered, the same means and spreads give <i>p</i> ${pEquals(v.pSeparate)}.`;
  }
  const who = opening ? `${opening}standard error bars` : 'Standard error bars on the same means';
  return `${who} ${relation(v)}. Belia et al. (2005) found that many researchers confuse these bars with 95% intervals. Only the bars got shorter, so <i>p</i> is still ${pWords(v.pSame)} for the same people and ${pWords(v.pSeparate)} for two separate groups.`;
}

export function statsOf(v) {
  return {
    m1: hours(v.m1),
    sd1: v.first.sd.toFixed(2),
    se1: v.se1.toFixed(2),
    ci1: interval(v.m1, v.w1),
    m2: hours(v.m2),
    sd2: v.second.sd.toFixed(2),
    se2: v.se2.toFixed(2),
    ci2: interval(v.m2, v.w2),
    d: hours(v.d),
    sdD: v.sdDifference.toFixed(2),
    seD: v.seSame.toFixed(2),
    ciD: interval(v.d, v.halfSame),
    tD: v.seSame === 0 ? 'undefined' : hours(v.d / v.seSame),
    dfD: String(v.n - 1),
    pD: pNumber(v.pSame),
    seS: v.seSeparate.toFixed(2),
    ciS: interval(v.d, v.halfSeparate),
    tS: v.seSeparate === 0 ? 'undefined' : hours(v.d / v.seSeparate),
    dfS: v.dfSeparate.toFixed(1),
    pS: pNumber(v.pSeparate),
    r: correlation(v.r),
    over: `The ${v.ci ? 'intervals' : 'bars'} ${relation(v)}.`,
  };
}

export const pairLabel = (v) => `Two panels with the same two means, for the same people and for two separate groups. Each shows weekday and weekend sleep with error bars, and the difference on a second axis whose zero lines up with the weekday mean. The difference is ${hours(v.d)}, with p ${pEquals(v.pSame)} for the same people and p ${pEquals(v.pSeparate)} for two separate groups.`;

export function shiftAt(G, v, y) {
  const hour = v.axisHigh - ((y - G.top) * (v.axisHigh - v.axisLow)) / (G.bottom - G.top);
  return Math.min(v.highest, Math.max(v.lowest, hour)) - v.real;
}

export const pairZone = (G, x, y) => y >= G.top && y <= G.bottom && G.panels.some((left) => x >= left + G.axisL && x <= left + G.xD - 30);

function tBar(x, y1, y2, cap) {
  return `M${round1(x - cap)} ${round1(y1)}H${round1(x + cap)}M${round1(x)} ${round1(y1)}V${round1(y2)}M${round1(x - cap)} ${round1(y2)}H${round1(x + cap)}`;
}

function panel(G, v, left, same) {
  const y = (hour) => G.bottom - ((hour - v.axisLow) * (G.bottom - G.top)) / (v.axisHigh - v.axisLow);
  const range = v.axisHigh - v.axisLow;
  const step = NICE_STEPS.find((s) => range / s <= 7.5) || 5;
  const leftTicks = [];
  for (let k = Math.ceil(v.axisLow / step); k * step <= v.axisHigh; k++) leftTicks.push(k * step);
  const rightTicks = [];
  for (let k = Math.ceil((v.axisLow - v.m1) / step); v.m1 + k * step <= v.axisHigh; k++) rightTicks.push(k * step);
  const axisL = left + G.axisL;
  const xA = left + G.xA;
  const xB = left + G.xB;
  const xD = left + G.xD;
  const axisR = left + G.axisR;
  const halfD = v.ci ? (same ? v.halfSame : v.halfSeparate) : same ? v.seSame : v.seSeparate;
  const seD = same ? v.seSame : v.seSeparate;
  const bandTop = y(Math.max(v.upper, v.lower));
  const bandBottom = y(Math.min(v.upper, v.lower));
  const yMean = y(v.m2);
  const bandWord = v.touching ? 'just touching' : `${v.overlap > 0 ? 'overlap' : 'gap'} ${hours(Math.abs(v.overlap))}`;
  const bandCenter = bandBottom - bandTop < 24 ? bandTop - 7 : (bandTop + bandBottom) / 2 + 5;
  const onMark = !same && v.ruleHolds && [v.markA, v.markB].some((mark) => Math.abs(y(mark) + 5 - bandCenter) < G.tick + 4);
  const bandY = onMark ? bandBottom + G.tick + 5 : bandCenter;
  const placed = (center, arm) => [Math.min(y(center + arm), y(center) - G.tick - 3) + 5, y(center) + 5, Math.max(y(center - arm), y(center) + G.tick + 3) + 5];
  const ends = (x, center, arm, shown, color, anchor) => {
    const [top, mid, low] = placed(center, arm);
    return `<g font-size="${G.tick}" fill="${color}" text-anchor="${anchor}">${label(x, top, hours(shown + arm), HALO)}${label(x, mid, hours(shown), `font-weight="700" ${HALO}`)}${label(x, low, hours(shown - arm), HALO)}</g>`;
  };
  const markWords = (v.ci ? ['half overlap', 'just touching'] : ['gap of 1 SE', 'gap of 2 SE']).map((word, i) => `${word}, ${ITALIC_P} ${G.longMarks ? `about ${['.05', '.01'][i]} or less` : `≈ ${['.05', '.01'][i]}`}`);
  const pieces = [
    path(`M${xB} ${G.top}V${G.bottom}`, 'fill="none" stroke="#d3dae2"'),
    path(`M${xA} ${round1(bandTop)}H${xB}V${round1(bandBottom)}H${xA}Z`, `fill="${v.overlap > 0 ? '#e7ebef' : 'none'}"`),
    path(`M${xA} ${round1(bandTop)}H${xB}M${xA} ${round1(bandBottom)}H${xB}`, `fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 4"`),
    path(`M${xA + 12} ${round1(y(v.m1))}H${axisR}`, `fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 4"`),
    path(`M${xB + 12} ${round1(yMean)}H${xD - 12}`, `fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="1.5 4"`),
    path(`M${axisL} ${G.top}V${G.bottom}${leftTicks.map((h) => `M${axisL - 6} ${round1(y(h))}H${axisL}`).join('')}`, `fill="none" stroke="${INK}"`),
    path(`M${axisR} ${G.top}V${G.bottom}${rightTicks.map((h) => `M${axisR} ${round1(y(v.m1 + h))}h6`).join('')}`, `fill="none" stroke="${INK}"`),
    path(tBar(xA, y(v.m1 + v.arm1), y(v.m1 - v.arm1), G.cap), `fill="none" stroke="${INK}" stroke-width="3"`),
    path(tBar(xB, y(v.m2 + v.arm2), y(v.m2 - v.arm2), G.cap), `fill="none" stroke="${BLUE}" stroke-width="3"`),
    path(tBar(xD, y(v.m2 + halfD), y(v.m2 - halfD), G.cap), `fill="none" stroke="${GOLD}" stroke-width="3"`),
    `<circle cx="${xA}" cy="${round1(y(v.m1))}" r="${G.r - 1.5}" fill="${INK}" stroke="#ffffff" stroke-width="2" />`,
    `<circle cx="${xB}" cy="${round1(yMean)}" r="${G.r}" fill="${BLUE}" stroke="#ffffff" stroke-width="2" />`,
    path(`M${xD} ${round1(yMean - 10)}L${xD + 9} ${round1(yMean + 7)}L${xD - 9} ${round1(yMean + 7)}Z`, `fill="${GOLD}" stroke="#ffffff" stroke-width="1.5"`),
    `<g font-size="${G.tick}" fill="${TEXT}" text-anchor="end">${leftTicks.map((h) => label(axisL - 10, y(h) + 5, tickNumber(h, step))).join('')}</g>`,
    `<g font-size="${G.tick}" fill="${GOLD_TEXT}">${rightTicks.map((h) => label(axisR + 11, y(v.m1 + h) + 5, tickNumber(h, step), Math.abs(h) < step / 2 ? 'font-weight="700"' : '')).join('')}</g>`,
    label(left, G.titleY, same ? 'Same people' : 'Two separate groups', `font-size="${G.title}" font-weight="700" fill="${TEXT}"`),
    label(left + G.width, G.titleY, `${v.ci ? '95% CIs' : 'SE bars'}, <tspan font-style="italic">n</tspan> = ${v.nText}${same ? '' : ' each'}`, `font-size="${G.tick}" fill="${TEXT}" text-anchor="end"`),
    label(left, G.axisTitleY, 'Hours of sleep', `font-size="${G.tick}" fill="${TEXT}"`),
    label(left + G.width, G.axisTitleY, 'Weekends minus weekdays', `font-size="${G.tick}" fill="${GOLD_TEXT}" text-anchor="end"`),
    ends(xA - 18, v.m1, v.arm1, v.m1, INK, 'end'),
    ends(xB + 18, v.m2, v.arm2, v.m2, BLUE, 'start'),
    ends(xD - 18, v.m2, halfD, v.d, GOLD_TEXT, 'end'),
    label((xA + xB) / 2, bandY, bandWord, `font-size="${G.tick}" fill="${TEXT}" text-anchor="middle" ${HALO}`),
    `<g font-size="${G.label}" font-weight="700" text-anchor="middle">`,
    label(xA, G.nameY, 'Weekdays', `fill="${INK}"`),
    label(xB, G.nameY, 'Weekends', `fill="${BLUE}"`),
    label(xD, G.nameY, 'Difference', `fill="${GOLD_TEXT}"`),
    '</g>',
    label(left + G.width / 2, G.captionY, `${same ? 'Paired' : 'Welch'} ${ITALIC_T}(${same ? v.n - 1 : v.dfSeparate.toFixed(1)})${seD === 0 ? ' undefined' : ` = ${hours(v.d / seD)}`}, ${ITALIC_P} ${pEquals(same ? v.pSame : v.pSeparate)}`, `font-size="${G.caption}" font-weight="700" fill="${TEXT}" text-anchor="middle"`),
  ];
  if (!same && v.ruleHolds) {
    pieces.push(
      path(`M${xB - 12} ${round1(y(v.markA))}H${xB}M${xB - 12} ${round1(y(v.markB))}H${xB}`, `fill="none" stroke="${INK}" stroke-width="1.5"`),
      `<g font-size="${G.tick}" fill="${TEXT}" text-anchor="end">`,
      label(xB - 18, y(v.markB) + 5, markWords[1], HALO),
      label(xB - 18, y(v.markA) + 5, markWords[0], HALO),
      '</g>',
    );
  }
  return pieces.join('');
}

export const pairFigure = (G, v) => panel(G, v, G.panels[0], true) + panel(G, v, G.panels[1], false);
