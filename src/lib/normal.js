const SQRT_2PI = Math.sqrt(2 * Math.PI);

export const pdf = (z) => Math.exp((-z * z) / 2) / SQRT_2PI;

export function cdf(z) {
  const x = Math.abs(z);
  let tail = 0;
  if (x < 37) {
    const e = Math.exp((-x * x) / 2);
    if (x < 7.07106781186547) {
      let num = 3.52624965998911e-2 * x + 0.700383064443688;
      num = num * x + 6.37396220353165;
      num = num * x + 33.912866078383;
      num = num * x + 112.079291497871;
      num = num * x + 221.213596169931;
      num = num * x + 220.206867912376;
      let den = 8.83883476483184e-2 * x + 1.75566716318264;
      den = den * x + 16.064177579207;
      den = den * x + 86.7807322029461;
      den = den * x + 296.564248779674;
      den = den * x + 637.333633378831;
      den = den * x + 793.826512519948;
      den = den * x + 440.413735824752;
      tail = (e * num) / den;
    } else {
      let b = x + 0.65;
      b = x + 4 / b;
      b = x + 3 / b;
      b = x + 2 / b;
      b = x + 1 / b;
      tail = e / b / SQRT_2PI;
    }
  }
  return z > 0 ? 1 - tail : tail;
}

export function quantile(p) {
  let lo = -12;
  let hi = 12;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
