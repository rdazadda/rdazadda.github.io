import { cdf, pdf } from './normal.js';
import { chiDensity, tCritical, tTail } from './sampling.js';

const STEPS = 240;
const spreads = new Map();

function spread(df) {
  if (spreads.has(df)) return spreads.get(df);
  const root = Math.sqrt(df);
  const lo = Math.max(0, root - 7.5);
  const h = (root + 7.5 - lo) / STEPS;
  const s = [];
  const w = [];
  let total = 0;
  for (let j = 0; j <= STEPS; j++) {
    const x = lo + j * h;
    const weight = (j === 0 || j === STEPS ? 1 : j % 2 ? 4 : 2) * chiDensity(x, df);
    if (weight === 0) continue;
    s.push(x / root);
    w.push(weight);
    total += weight;
  }
  const result = { s, w: w.map((value) => value / total) };
  spreads.set(df, result);
  return result;
}

export function tTest(n, d, alpha) {
  const df = 2 * n - 2;
  const se = Math.sqrt(2 / n);
  const t = tCritical(alpha / 2, df);
  return { n, d, alpha, df, se, t, cutoff: t * se, shift: d / se };
}

export function power({ df, t, shift }) {
  const { s, w } = spread(df);
  let sum = 0;
  for (let j = 0; j < s.length; j++) sum += w[j] * (1 - cdf(t * s[j] - shift) + cdf(-t * s[j] - shift));
  return sum;
}

export function density({ df, se, shift }, x) {
  const { s, w } = spread(df);
  const tValue = x / se;
  let sum = 0;
  for (let j = 0; j < s.length; j++) sum += w[j] * s[j] * pdf(tValue * s[j] - shift);
  return sum / se;
}

export const pValue = ({ df, se }, effect) => 2 * tTail(Math.abs(effect / se), df);
