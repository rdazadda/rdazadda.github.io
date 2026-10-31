import { formatAlpha, formatPercent } from './narration.js';
import { cdf, quantile } from './normal.js';
import { N_LIMIT, amount, count, firstPassing } from './planning.js';
import { tCritical } from './sampling.js';
import { above, power } from './t-test.js';

export const DESIGNS = [
  { id: 'two', label: 'Two groups' },
  { id: 'paired', label: 'Paired' },
];

export const START = {
  design: 'two',
  bound: 10,
  truth: 0,
  sd: 20,
  rho: 0.5,
  target: 0.8,
  alpha: 0.05,
  dropout: 0.1,
  n: 70,
  fixed: false,
};

const criticals = new Map();

function critical(alpha, df) {
  const key = `${alpha} ${df}`;
  if (!criticals.has(key)) criticals.set(key, tCritical(alpha, df));
  return criticals.get(key);
}

const both = (alpha, df) => critical(alpha / 2, df);

const spreadOf = (s) => s.sd * Math.sqrt(s.design === 'paired' ? 2 * (1 - s.rho) : 2);
export const lowest = (s) => (s.design === 'paired' ? 3 : 2);

function shape(s, n) {
  return { df: s.design === 'paired' ? n - 1 : 2 * n - 2, se: spreadOf(s) / Math.sqrt(n) };
}

export const standardError = (s, n) => spreadOf(s) / Math.sqrt(n);
export const level = (s) => `${Number(((1 - 2 * s.alpha) * 100).toFixed(1))}%`;

export function halfWidth(s, n) {
  const { df, se } = shape(s, n);
  return critical(s.alpha, df) * se;
}

export function powerAt(s, n, bound = s.bound) {
  const { df, se } = shape(s, n);
  const t = critical(s.alpha, df);
  return Math.max(0, above({ df, t, shift: (bound + s.truth) / se }) + above({ df, t, shift: (bound - s.truth) / se }) - 1);
}

function differenceCut(s, n) {
  const { df, se } = shape(s, n);
  return both(s.alpha, df) * se;
}

export function differs(s, n) {
  const { df, se } = shape(s, n);
  return power({ df, t: both(s.alpha, df), shift: s.truth / se });
}

export function regions(s, n) {
  const inside = Math.max(0, s.bound - halfWidth(s, n));
  const cut = differenceCut(s, n);
  return { inside, cut, near: Math.min(inside, cut), far: Math.max(inside, cut) };
}

export function outcomes(s, n) {
  const se = standardError(s, n);
  const { inside, cut } = regions(s, n);
  const within = (a) => cdf((a - s.truth) / se) - cdf((-a - s.truth) / se);
  const shown = powerAt(s, n);
  const different = differs(s, n);
  const overlap = Math.min(inside > cut ? within(inside) - within(cut) : 0, shown, different);
  const result = { equivalent: shown - overlap, overlap, different: different - overlap };
  return { ...result, unclear: Math.max(0, 1 - result.equivalent - result.overlap - result.different) };
}

export function needed(s) {
  const room = s.bound - Math.abs(s.truth);
  if (room <= 0) return Infinity;
  const zb = quantile(Math.abs(s.truth) < 1e-9 ? 1 - (1 - s.target) / 2 : s.target);
  const start = (((quantile(1 - s.alpha) + zb) * spreadOf(s)) / room) ** 2 + 2;
  return firstPassing((n) => powerAt(s, n) >= s.target, start, lowest(s));
}

export function smallestBound(s, n) {
  let lo = Math.abs(s.truth);
  let hi = lo + 1;
  while (powerAt(s, n, hi) < s.target) {
    lo = hi;
    hi *= 2;
    if (hi > 1e6) return Infinity;
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (powerAt(s, n, mid) < s.target) lo = mid;
    else hi = mid;
  }
  return hi;
}

export const snap = (s, n) => Math.min(N_LIMIT, Math.max(lowest(s), Math.round(n)));

export function narrate(s) {
  const bounds = `±${amount(s.bound)}`;
  if (Math.abs(s.truth) >= s.bound) {
    return `A true effect of ${amount(s.truth)} lies at or beyond the bounds of ${bounds}, so no study can show the effect is too small to matter.`;
  }
  const who = s.design === 'paired' ? `${count(s.n)} people, each measured twice` : `${count(s.n)} people in each group`;
  const truth = Math.abs(s.truth) < 1e-9 ? '' : `, if the true effect is ${amount(s.truth)}`;
  const reach = halfWidth(s, s.n);
  const first = `With ${who}, the plan has ${formatPercent(powerAt(s, s.n))} power to show the effect lies within ${bounds}${truth}.`;
  const second =
    reach < s.bound
      ? `Each study’s ${level(s)} interval reaches about ±${amount(reach)} around its estimate, so the estimate must land within ±${amount(s.bound - reach)} of zero.`
      : `Each study’s ${level(s)} interval reaches about ±${amount(reach)}, wider than the bounds, so no study can show it.`;
  return `${first} ${second}`;
}

const decimal = (v) => (v === 0 ? '0' : v.toFixed(2).replace(/^0/, ''));
const whole = (p) => `${Math.round(100 * p)}%`;

export function report(s) {
  const paired = s.design === 'paired';
  const groups = (n) => (paired ? `${count(n)} participants` : `${count(n)} participants in each group (${count(2 * n)} in total)`);
  const scale = Number((s.bound / spreadOf(s) * (paired ? 1 : Math.SQRT2)).toFixed(2));
  const sentences = [
    `We planned the sample size for an equivalence test using two one-sided ${paired ? 'paired ' : ''}t tests, each at α = ${formatAlpha(s.alpha)}, with ${whole(s.target)} power.`,
    `We set the equivalence bounds at ±${amount(s.bound)}, the smallest ${paired ? 'change' : 'difference'} that would matter, based on [the reason for these bounds].`,
    paired
      ? `We take the standard deviation of each measurement to be ${s.sd} and the correlation between the two measurements to be ${decimal(s.rho)}, from [the source of these values], so the bounds are ±${scale} in units of <i>d</i><sub>z</sub>.`
      : `We take the standard deviation to be ${s.sd}, from [the source of this value], so the bounds are ±${scale} in units of <i>d</i>.`,
  ];
  const truth = `Assuming the true ${paired ? 'change' : 'difference'} is ${amount(s.truth)}`;
  if (Math.abs(s.truth) >= s.bound && !s.fixed) {
    sentences.push(`${truth}, which lies at or beyond the bounds, no sample size can show equivalence.`);
  } else if (s.fixed) {
    const narrowest = smallestBound(s, s.n);
    sentences.push(`The analyzed sample is fixed by [the reason, such as the budget or the people available] at ${groups(s.n)}.`);
    sentences.push(narrowest === Infinity ? 'With this sample, no bounds reach the target power.' : `${truth}, the study has ${whole(s.target)} power to show equivalence for bounds of ±${amount(narrowest)} or wider.`);
  } else {
    sentences.push(`${truth}, this requires ${groups(s.n)}.`);
  }
  if (s.dropout > 0 && (s.fixed || Math.abs(s.truth) < s.bound)) {
    sentences.push(`Allowing for ${whole(s.dropout)} dropout, we will recruit ${groups(Math.ceil(s.n / (1 - s.dropout) - 1e-9))}.`);
  }
  if (s.fixed || Math.abs(s.truth) < s.bound) sentences.push(`With this sample, each ${level(s)} confidence interval will reach about ±${amount(halfWidth(s, s.n))} around its estimate.`);
  sentences.push('Power was approximated with the noncentral t distribution, using [the software and its version].');
  return sentences.join(' ');
}
