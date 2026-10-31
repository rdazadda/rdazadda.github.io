import { cdf, quantile } from './normal.js';
import { formatAlpha, formatPercent, formatPower } from './narration.js';
import { tCritical } from './sampling.js';
import { power } from './t-test.js';

export const ALPHAS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2];
export const LEVELS = [0.5, 0.8, 0.9, 0.95];
export const TOP = 30;
export const N_MIN = 2;
export const N_MAX = 1000;
export const N_LIMIT = 10000000;

export const DESIGNS = [
  { id: 'two', label: 'Two groups' },
  { id: 'paired', label: 'Paired' },
  { id: 'proportions', label: 'Proportions' },
  { id: 'clusters', label: 'Clusters' },
];

export const START = {
  design: 'two',
  guess: 15,
  half: 5,
  target: 0.8,
  alpha: 0.05,
  sd: 20,
  rate: 0.5,
  rho: 0.5,
  size: 10,
  icc: 0.05,
  dropout: 0.1,
  n: 29,
  fixed: false,
};

const criticals = new Map();
const zs = new Map();

function critical(alpha, df) {
  const key = `${alpha} ${df}`;
  if (!criticals.has(key)) criticals.set(key, tCritical(alpha / 2, df));
  return criticals.get(key);
}

function z(p) {
  if (!zs.has(p)) zs.set(p, quantile(p));
  return zs.get(p);
}

export const stepOf = (s) => (s.design === 'clusters' ? s.size : 1);
export const lowest = (s) => (s.design === 'clusters' ? 2 * s.size : N_MIN);
export const topOf = (s) => (s.design === 'proportions' ? Math.min(TOP, Math.floor(s.rate * 900) / 10) : TOP);
export const grainOf = (s) => (topOf(s) >= 15 ? 0.5 : 0.1);
export const low = (s) => Math.max(grainOf(s), s.guess - s.half);
export const high = (s) => Math.min(topOf(s), s.guess + s.half);
export const unitOf = (s) => (s.design === 'proportions' ? ' points' : '');
export const recruit = (s) => Math.ceil(s.n / (1 - s.dropout) - 1e-9);
export const count = (n) => n.toLocaleString('en-US');

export function amount(v) {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? `${r}` : r.toFixed(1);
}

export function snap(s, n) {
  const step = stepOf(s);
  return Math.min(Math.floor(N_MAX / step) * step, Math.max(lowest(s), Math.round(n / step) * step));
}

export function powerAt(s, n, effect) {
  if (s.design === 'proportions') {
    const p1 = s.rate;
    const p2 = s.rate - effect / 100;
    const mean = (p1 + p2) / 2;
    const pooled = z(1 - s.alpha / 2) * Math.sqrt(2 * mean * (1 - mean));
    const spread = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    const reach = (Math.abs(effect) / 100) * Math.sqrt(n);
    return cdf((reach - pooled) / spread) + cdf((-reach - pooled) / spread);
  }
  let df;
  let se;
  if (s.design === 'paired') {
    df = n - 1;
    se = s.sd * Math.sqrt((2 * (1 - s.rho)) / n);
  } else if (s.design === 'clusters') {
    const k = n / s.size;
    df = 2 * k - 2;
    se = s.sd * Math.sqrt((2 * (s.icc + (1 - s.icc) / s.size)) / k);
  } else {
    df = 2 * n - 2;
    se = s.sd * Math.sqrt(2 / n);
  }
  return power({ df, t: critical(s.alpha, df), shift: effect / se });
}

function estimate(s, effect, level) {
  const za = z(1 - s.alpha / 2);
  const zb = z(level);
  if (s.design === 'proportions') {
    const p1 = s.rate;
    const p2 = s.rate - effect / 100;
    const mean = (p1 + p2) / 2;
    return ((za * Math.sqrt(2 * mean * (1 - mean)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) / (effect / 100)) ** 2;
  }
  const spread = {
    two: Math.sqrt(2),
    paired: Math.sqrt(2 * (1 - s.rho)),
    clusters: Math.sqrt(2 * (s.icc + (1 - s.icc) / s.size)),
  }[s.design];
  const units = (((za + zb) * s.sd * spread) / effect) ** 2;
  return s.design === 'paired' ? units + 2 : units + 1;
}

export function needed(s, effect, level) {
  if (effect <= 0) return Infinity;
  const step = stepOf(s);
  const first = lowest(s) / step;
  const last = Math.ceil(N_LIMIT / step);
  const seen = new Map();
  const at = (u) => {
    if (!seen.has(u)) seen.set(u, powerAt(s, u * step, effect));
    return seen.get(u);
  };
  let u = Math.min(last, Math.max(first, Math.round(estimate(s, effect, level)) || first));
  if (at(u) >= level) {
    while (u > first && at(u - 1) >= level) u--;
  } else {
    while (u < last && at(u) < level) u++;
    if (at(u) < level) return Infinity;
  }
  if (u === first) return u * step;
  const a = Math.sqrt(u - 1);
  const b = Math.sqrt(u);
  const qa = quantile(at(u - 1));
  const qb = quantile(at(u));
  const root = qb > qa ? a + ((quantile(level) - qa) / (qb - qa)) * (b - a) : b;
  return step * root * root;
}

export function planned(s, effect, level) {
  const v = needed(s, effect, level);
  if (v === Infinity) return Infinity;
  const step = stepOf(s);
  return Math.max(lowest(s), Math.ceil(v / step - 1e-9) * step);
}

export function firstPassing(passes, start, least = N_MIN) {
  let lo = least - 1;
  let hi = Math.max(least, Math.round(start) || least);
  while (!passes(hi)) {
    if (hi >= N_LIMIT) return Infinity;
    lo = hi;
    hi = Math.min(N_LIMIT, hi * 2);
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (passes(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function fit(s) {
  const v = planned(s, s.guess, s.target);
  return v === Infinity ? Math.ceil(N_LIMIT / stepOf(s)) * stepOf(s) : v;
}

export function smallest(s, n, level) {
  const top = topOf(s);
  if (powerAt(s, n, top) < level) return Infinity;
  let lo = 0;
  let hi = top;
  for (let i = 0; i < 36; i++) {
    const mid = (lo + hi) / 2;
    if (powerAt(s, n, mid) < level) lo = mid;
    else hi = mid;
  }
  return hi;
}

export function share(s) {
  const lo = low(s);
  const hi = high(s);
  if (hi - lo < 1e-9) return powerAt(s, s.n, lo) >= s.target ? 1 : 0;
  const found = smallest(s, s.n, s.target);
  return Math.min(1, Math.max(0, (hi - found) / (hi - lo)));
}

function people(s) {
  if (s.design === 'paired') return `${count(s.n)} people, each measured twice`;
  if (s.design === 'clusters') return `${count(s.n)} people in each group, ${count(s.n / s.size)} clusters of ${s.size}`;
  return `${count(s.n)} people in each group`;
}

export function narrate(s) {
  const points = s.design === 'proportions';
  const one = (v) => (points ? `a difference of ${amount(v)} points` : `an effect of ${amount(v)}`);
  const many = (v) => (points ? `differences of ${amount(v)} points` : `effects of ${amount(v)}`);
  const target = formatPercent(s.target);
  const at = (v) => formatPower(powerAt(s, s.n, v), s.target);
  const lo = low(s);
  const hi = high(s);
  const opening = `With ${people(s)}, the plan`;
  if (hi - lo < 1e-9) {
    const need = planned(s, lo, s.target);
    const per = s.design === 'paired' ? 'people' : 'in each group';
    const rest = need === Infinity ? `more than ${count(N_LIMIT)} ${per}` : `${count(need)} ${per}`;
    return `${opening} has ${at(lo)} power at the best guess, ${one(lo)}. Reaching ${target} there takes ${rest}.`;
  }
  const found = smallest(s, s.n, s.target);
  if (found <= lo) return `${opening} has ${target} power for every ${points ? 'difference' : 'effect'} in the likely range. Even at ${one(lo)}, power is ${at(lo)}.`;
  if (found <= hi) {
    return `${opening} has ${target} power only for ${many(found)} or more. That covers ${Math.round(100 * share(s))}% of the likely range, and at ${one(lo)}, power falls to ${at(lo)}.`;
  }
  return `${opening} falls short of ${target} power across the whole likely range. Even at ${one(hi)}, power is only ${at(hi)}.`;
}

const decimal = (v) => (v === 0 ? '0' : v.toFixed(2).replace(/^0/, ''));
const whole = (p) => `${Math.round(100 * p)}%`;

export function report(s) {
  const points = s.design === 'proportions';
  const paired = s.design === 'paired';
  const clusters = s.design === 'clusters';
  const size = (v) => (points ? `${amount(v)} percentage ${amount(v) === '1' ? 'point' : 'points'}` : amount(v));
  const odds = (p) => (p >= 0.995 ? 'over 99%' : formatPower(p, s.target));
  const groups = (n) => (paired ? `${count(n)} participants` : `${count(n)} participants in each group (${count(2 * n)} in total)`);
  const cells = (n) => (clusters ? `, or ${count(n / s.size)} clusters of ${s.size} in each group` : '');
  const design = Number((1 + (s.size - 1) * s.icc).toFixed(2));
  const test = {
    two: 'a two-sided, two-sample t test',
    paired: 'a two-sided paired t test',
    proportions: 'a two-sided test of two proportions',
    clusters: 'a two-sided t test on cluster means',
  }[s.design];
  const effect = {
    two: [`a difference of ${amount(s.guess)} between the groups`, `We take the standard deviation to be ${s.sd}, from [the source of this value], so <i>d</i> = ${Number((s.guess / s.sd).toFixed(2))}.`],
    paired: [`a mean change of ${amount(s.guess)}`, `We take the standard deviation of each measurement to be ${s.sd} and the correlation between the two measurements to be ${decimal(s.rho)}, from [the source of these values], so <i>d</i><sub>z</sub> = ${Number((s.guess / (s.sd * Math.sqrt(2 * (1 - s.rho)))).toFixed(2))}.`],
    proportions: [`the rate to drop from ${whole(s.rate)} in the control group to ${amount(100 * s.rate - s.guess)}% in the treated group, a difference of ${size(s.guess)}`, 'The control group rate comes from [the source of this value].'],
    clusters: [`a difference of ${amount(s.guess)} between the groups`, `We take the standard deviation to be ${s.sd} and the intraclass correlation to be ${decimal(s.icc)} for clusters of ${s.size} people, from [the source of these values], which gives a design effect of ${design}.`],
  }[s.design];
  const sentences = [
    `We planned the sample size for ${test}, with α = ${formatAlpha(s.alpha)} and ${whole(s.target)} power.`,
    `We expect ${effect[0]}, based on [the source of this estimate].`,
    effect[1],
  ];
  if (s.fixed) {
    const found = smallest(s, s.n, s.target);
    sentences.push(`The analyzed sample is fixed by [the reason, such as the budget or the people available] at ${groups(s.n)}${cells(s.n)}.`);
    sentences.push(found === Infinity ? `With this sample, no effect up to ${size(topOf(s))} reaches ${whole(s.target)} power.` : `With this sample, the study has ${whole(s.target)} power to detect effects of ${size(found)} or larger.`);
  } else {
    sentences.push(`This requires ${groups(s.n)}${cells(s.n)}.`);
    if (clusters) {
      const plain = needed({ ...s, design: 'two' }, s.guess, s.target);
      const simple = Math.ceil((plain * design) / s.size - 1e-9) * s.size;
      if (s.n > simple && s.n / s.size < 20) sentences.push(`This is more than the design effect alone suggests, because a test on ${count(s.n / s.size)} clusters in each group has only ${count((2 * s.n) / s.size - 2)} degrees of freedom.`);
    }
  }
  if (s.dropout > 0) sentences.push(`Allowing for ${whole(s.dropout)} dropout, we will recruit ${groups(recruit(s))}.`);
  const lo = low(s);
  const hi = high(s);
  if (hi - lo > 1e-9) {
    const need = planned(s, lo, s.target);
    const cover = need === Infinity ? '' : `, and ${count(need)} ${paired ? 'participants' : 'in each group'} would give ${whole(s.target)} power across the whole range`;
    sentences.push(`Because the true effect may differ from this estimate, we also checked a likely range of ${amount(lo)} to ${size(hi)}. With this sample, power is ${odds(powerAt(s, s.n, lo))} at ${amount(lo)} and ${odds(powerAt(s, s.n, hi))} at ${amount(hi)}${cover}.`);
  }
  sentences.push(`Power was computed with ${points ? 'the normal approximation for two proportions, pooled and without a continuity correction' : 'the exact noncentral t distribution'}, using [the software and its version].`);
  return sentences.join(' ');
}
