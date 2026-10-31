import { cdf as phi, pdf as normalPdf, quantile as normalQuantile } from './normal.js';
import { chiSquareCdf, chiSquareQuantile, incompleteBeta, lnGamma } from './sampling.js';
import { spread } from './t-test.js';

const lnBeta = (a, b) => lnGamma(a) + lnGamma(b) - lnGamma(a + b);

function inverse(cdf, p, lo, hi, floor = -Infinity) {
  while (cdf(lo) > p && lo > floor) lo = Math.max(floor, lo - 2 * (hi - lo));
  while (cdf(hi) < p) hi += 2 * (hi - lo);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function poisson(mean) {
  if (mean === 0) return [{ j: 0, w: 1 }];
  const from = Math.max(0, Math.floor(mean - 8 * Math.sqrt(mean) - 3));
  const to = Math.ceil(mean + 8 * Math.sqrt(mean) + 10);
  const terms = [];
  for (let j = from; j <= to; j++) terms.push({ j, w: Math.exp(-mean + j * Math.log(mean) - lnGamma(j + 1)) });
  return terms;
}

export function normal(shift = 0) {
  return {
    pdf: (x) => normalPdf(x - shift),
    cdf: (x) => phi(x - shift),
    quantile: (p) => normalQuantile(p) + shift,
  };
}

const tPdf = (x, df) =>
  Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2) - 0.5 * Math.log(df * Math.PI) - ((df + 1) / 2) * Math.log1p((x * x) / df));

function tCdf(x, df) {
  const tail = incompleteBeta(df / (df + x * x), df / 2, 0.5) / 2;
  return x >= 0 ? 1 - tail : tail;
}

const smallSpreads = new Map();
function smallSpread(df) {
  if (!smallSpreads.has(df)) {
    const count = 800;
    const s = Array.from({ length: count }, (_, k) => Math.sqrt(chiSquareQuantile((k + 0.5) / count, df) / df));
    smallSpreads.set(df, { s, w: s.map(() => 1 / count) });
  }
  return smallSpreads.get(df);
}

export function studentT(df, shift = 0) {
  if (shift === 0) {
    const cdf = (x) => tCdf(x, df);
    return { pdf: (x) => tPdf(x, df), cdf, quantile: (p) => (p === 0.5 ? 0 : inverse(cdf, p, -1, 1)) };
  }
  const { s, w } = df < 3 ? smallSpread(df) : spread(df);
  const cdf = (x) => {
    let sum = 0;
    for (let j = 0; j < s.length; j++) sum += w[j] * phi(x * s[j] - shift);
    return sum;
  };
  const pdf = (x) => {
    let sum = 0;
    for (let j = 0; j < s.length; j++) sum += w[j] * s[j] * normalPdf(x * s[j] - shift);
    return sum;
  };
  return { pdf, cdf, quantile: (p) => inverse(cdf, p, shift - 1, shift + 1) };
}

function chiPdf(x, k) {
  if (x < 0) return 0;
  if (x === 0) return k === 2 ? 0.5 : k < 2 ? Infinity : 0;
  return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lnGamma(k / 2));
}

export function chiSquare(k, lambda = 0) {
  if (lambda === 0) {
    return { pdf: (x) => chiPdf(x, k), cdf: (x) => (x > 0 ? chiSquareCdf(x, k) : 0), quantile: (p) => chiSquareQuantile(p, k) };
  }
  const terms = poisson(lambda / 2);
  const cdf = (x) => (x > 0 ? terms.reduce((sum, { j, w }) => sum + w * chiSquareCdf(x, k + 2 * j), 0) : 0);
  const pdf = (x) => terms.reduce((sum, { j, w }) => sum + w * chiPdf(x, k + 2 * j), 0);
  return { pdf, cdf, quantile: (p) => inverse(cdf, p, 0, k + lambda + 1, 0) };
}

function fPdf(x, d1, d2) {
  if (x < 0) return 0;
  if (x === 0) return d1 === 2 ? 1 : d1 < 2 ? Infinity : 0;
  return Math.exp(
    0.5 * (d1 * Math.log(d1) + d2 * Math.log(d2)) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log(d1 * x + d2) - lnBeta(d1 / 2, d2 / 2),
  );
}

export function fisherF(d1, d2, lambda = 0) {
  const terms = poisson(lambda / 2);
  const cdf = (x) => (x > 0 ? terms.reduce((sum, { j, w }) => sum + w * incompleteBeta((d1 * x) / (d1 * x + d2), d1 / 2 + j, d2 / 2), 0) : 0);
  const pdf = (x) => terms.reduce((sum, { j, w }) => sum + (w * d1 * fPdf((x * d1) / (d1 + 2 * j), d1 + 2 * j, d2)) / (d1 + 2 * j), 0);
  return { pdf, cdf, quantile: (p) => inverse(cdf, p, 0, 2 + lambda / d1, 0) };
}
