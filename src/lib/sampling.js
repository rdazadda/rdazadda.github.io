const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lnGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const z = x - 1;
  let sum = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

const TINY = 1e-300;

function betaFraction(a, b, x) {
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const even = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    const odd = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    for (const step of [even, odd]) {
      d = 1 + step * d;
      if (Math.abs(d) < TINY) d = TINY;
      c = 1 + step / c;
      if (Math.abs(c) < TINY) c = TINY;
      d = 1 / d;
      h *= d * c;
    }
    if (Math.abs(d * c - 1) < 1e-15) break;
  }
  return h;
}

export function incompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaFraction(a, b, x)) / a : 1 - (front * betaFraction(b, a, 1 - x)) / b;
}

function bisect(f, goal, lo, hi, steps) {
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function tCritical(p, df) {
  const x = bisect((x) => incompleteBeta(x, df / 2, 0.5) / 2, p, 0, 1, 200);
  return Math.sqrt((df * (1 - x)) / x);
}

export const tTail = (t, df) => incompleteBeta(df / (df + t * t), df / 2, 0.5) / 2;

export const chiDensity = (x, df) =>
  x <= 0 ? 0 : Math.exp((1 - df / 2) * Math.LN2 + (df - 1) * Math.log(x) - (x * x) / 2 - lnGamma(df / 2));
