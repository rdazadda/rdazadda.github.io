import { eigen, varimax } from './q-method.js';
import { chiSquareCdf } from './sampling.js';

export const START = { model: 'components', m: 5, rotation: 'varimax', test: null };
export const MOST = 6;

const LOWER = 0.005;
const MINUS = '−';
const KEEP = ' ';
const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six'];
const CAPITALS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

const total = (xs) => xs.reduce((a, b) => a + b, 0);
const transpose = (a) => a[0].map((_, j) => a.map((row) => row[j]));
const multiply = (a, b) => a.map((row) => b[0].map((_, j) => total(row.map((x, k) => x * b[k][j]))));
const identity = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)));
const column = (a, j) => a.map((row) => row[j]);
const squares = (xs) => total(xs.map((x) => x * x));

function inverse(matrix) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    [a[c], a[p]] = [a[p], a[c]];
    const d = a[c][c];
    for (let j = 0; j < 2 * n; j++) a[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[c][j];
    }
  }
  return a.map((row) => row.slice(n));
}

const smc = (r) => inverse(r).map((row, i) => 1 - 1 / row[i]);
const reduce = (r) => {
  const s = smc(r);
  return r.map((row, i) => row.map((x, j) => (i === j ? s[i] : x)));
};

function suitability(r, n) {
  const p = r.length;
  const q = inverse(r);
  let shared = 0;
  let partial = 0;
  const each = r.map((row, i) => {
    let a = 0;
    let b = 0;
    row.forEach((x, j) => {
      if (j === i) return;
      a += x * x;
      b += (q[i][j] * q[i][j]) / (q[i][i] * q[j][j]);
    });
    shared += a;
    partial += b;
    return a / (a + b);
  });
  const chi2 = -total(eigen(r).values.map(Math.log)) * (n - 1 - (2 * p + 5) / 6);
  const df = (p * (p - 1)) / 2;
  return { kmo: shared / (shared + partial), each, bartlett: { chi2, df, p: 1 - chiSquareCdf(chi2, df) } };
}

function partials(r) {
  const p = r.length;
  const { values, vectors } = eigen(r);
  const average = (c) => {
    const d = c.map((row, i) => Math.sqrt(row[i]));
    return (total(c.flatMap((row, i) => row.map((x, j) => (x / (d[i] * d[j])) ** 2))) - p) / (p * (p - 1));
  };
  return Array.from({ length: p - 1 }, (_, m) =>
    average(r.map((row, i) => row.map((x, j) => x - total(Array.from({ length: m }, (__, k) => vectors[i][k] * vectors[j][k] * values[k]))))),
  );
}

function stretch(r, psi, q) {
  const root = psi.map(Math.sqrt);
  const { values, vectors } = eigen(r.map((row, i) => row.map((x, j) => x / (root[i] * root[j]))));
  return {
    values,
    loadings: root.map((s, i) => Array.from({ length: q }, (_, k) => s * vectors[i][k] * Math.sqrt(Math.max(values[k] - 1, 0)))),
  };
}

function discrepancy(r, psi, q) {
  const { values, loadings } = stretch(r, psi, q);
  return {
    f: -(total(values.slice(q).map((e) => Math.log(e) - e)) - q + r.length),
    g: psi.map((x, i) => (squares(loadings[i]) + x - r[i][i]) / (x * x)),
    loadings,
  };
}

function update(h, s, y) {
  const sy = total(s.map((x, i) => x * y[i]));
  const hy = h.map((row) => total(row.map((x, j) => x * y[j])));
  const yhy = total(y.map((x, i) => x * hy[i]));
  return h.map((row, i) => row.map((x, j) => x - (hy[i] * s[j] + s[i] * hy[j]) / sy + ((1 + yhy / sy) * s[i] * s[j]) / sy));
}

function likelihood(r, q) {
  const p = r.length;
  const clamp = (x) => Math.min(1, Math.max(LOWER, x));
  const isFree = (psi, g) => psi.map((x, i) => !((x <= LOWER && g[i] > 0) || (x >= 1 && g[i] < 0)));
  let psi = smc(r).map((s) => clamp(1 - s));
  let now = discrepancy(r, psi, q);
  let h = identity(p);
  let fresh = true;
  for (let step = 0; step < 1000; step++) {
    const free = isFree(psi, now.g);
    const g = now.g.map((x, i) => (free[i] ? x : 0));
    if (Math.max(...g.map(Math.abs)) < 1e-6) break;
    let d = h.map((row, i) => (free[i] ? -total(row.map((x, j) => x * g[j])) : 0));
    if (total(d.map((x, i) => x * g[i])) >= 0) {
      h = identity(p);
      d = g.map((x) => -x);
    }
    let t = 1;
    let accepted = null;
    for (let k = 0; k < 40 && !accepted; k++, t /= 2) {
      const trial = psi.map((x, i) => clamp(x + t * d[i]));
      const next = discrepancy(r, trial, q);
      if (next.f <= now.f + 1e-4 * total(g.map((x, i) => x * (trial[i] - psi[i])))) accepted = { trial, next };
    }
    if (!accepted) {
      if (fresh) break;
      h = identity(p);
      fresh = true;
      continue;
    }
    const s = accepted.trial.map((x, i) => x - psi[i]);
    const y = accepted.next.g.map((x, i) => x - now.g[i]);
    if (total(s.map((x, i) => x * y[i])) > 1e-18) h = update(h, s, y);
    psi = accepted.trial;
    now = accepted.next;
    fresh = false;
  }
  for (let step = 0; step < 20; step++) {
    const free = isFree(psi, now.g)
      .map((on, i) => (on ? i : -1))
      .filter((i) => i >= 0);
    if (Math.max(...free.map((i) => Math.abs(now.g[i]))) < 1e-13) break;
    const nudge = 1e-6;
    const columns = free.map((i) => {
      const up = discrepancy(r, psi.map((x, k) => (k === i ? x + nudge : x)), q).g;
      const down = discrepancy(r, psi.map((x, k) => (k === i ? x - nudge : x)), q).g;
      return free.map((j) => (up[j] - down[j]) / (2 * nudge));
    });
    const hessian = columns.map((row, a) => row.map((x, b) => (x + columns[b][a]) / 2));
    const inv = inverse(hessian);
    const move = inv.map((row) => -total(row.map((x, b) => x * now.g[free[b]])));
    psi = psi.map((x, i) => {
      const a = free.indexOf(i);
      return a < 0 ? x : clamp(x + move[a]);
    });
    now = discrepancy(r, psi, q);
    if (Math.max(...move.map(Math.abs)) < 1e-15) break;
  }
  return now.loadings;
}

function components(r, m) {
  const { values, vectors } = eigen(r);
  return vectors.map((row) => Array.from({ length: m }, (_, k) => row[k] * Math.sqrt(values[k])));
}

function quartimin(l) {
  const sq = l.map((row) => row.map((x) => x * x));
  const others = sq.map((row) => row.map((x) => total(row) - x));
  return {
    f: total(sq.flatMap((row, i) => row.map((x, j) => x * others[i][j]))) / 4,
    gq: l.map((row, i) => row.map((x, j) => x * others[i][j])),
  };
}

function oblimin(a, eps = 1e-5) {
  const rotate = (t) => multiply(a, transpose(inverse(t)));
  const gradient = (l, gq, t) => transpose(multiply(multiply(transpose(l), gq), inverse(t))).map((row) => row.map((x) => -x));
  let t = identity(a[0].length);
  let l = rotate(t);
  let q = quartimin(l);
  let g = gradient(l, q.gq, t);
  let alpha = 1;
  for (let step = 0; step <= 1000; step++) {
    const sums = t[0].map((_, j) => total(t.map((row, i) => row[j] * g[i][j])));
    const gp = g.map((row, i) => row.map((x, j) => x - t[i][j] * sums[j]));
    const s = Math.sqrt(total(gp.flatMap((row) => row.map((x) => x * x))));
    if (s < eps) break;
    alpha *= 2;
    let next;
    for (let k = 0; k <= 10; k++) {
      const x = t.map((row, i) => row.map((v, j) => v - alpha * gp[i][j]));
      const norms = x[0].map((_, j) => 1 / Math.sqrt(squares(column(x, j))));
      const tt = x.map((row) => row.map((v, j) => v * norms[j]));
      const lt = rotate(tt);
      next = { t: tt, l: lt, q: quartimin(lt) };
      if (q.f - next.q.f > 0.5 * s * s * alpha) break;
      alpha /= 2;
    }
    ({ t, l, q } = next);
    g = gradient(l, q.gq, t);
  }
  return { loadings: l, phi: multiply(transpose(t), t) };
}

function arrange(loadings, phi = null, byVariance = false) {
  const m = loadings[0].length;
  const signs = Array.from({ length: m }, (_, j) => (total(column(loadings, j)) < 0 ? -1 : 1));
  const signed = loadings.map((row) => row.map((x, j) => x * signs[j]));
  const top = (j) => column(signed, j).reduce((best, x, i, all) => (Math.abs(x) > Math.abs(all[best]) ? i : best), 0);
  const key = (j) => (byVariance ? -squares(column(signed, j)) : top(j));
  const order = Array.from({ length: m }, (_, j) => j).sort((a, b) => key(a) - key(b));
  return {
    loadings: signed.map((row) => order.map((j) => row[j])),
    phi: phi && order.map((a) => order.map((b) => phi[a][b] * signs[a] * signs[b])),
  };
}

const leftover = (r, l) => r.reduce((count, row, i) => count + row.filter((x, j) => j > i && Math.abs(x - total(l[i].map((v, k) => v * l[j][k]))) > 0.1).length, 0);

function solution(r, raw) {
  const unrotated = arrange(raw, null, true).loadings;
  const result = { h2: unrotated.map(squares), unrotated, leftover: leftover(r, unrotated) };
  if (raw[0].length > 1) {
    result.varimax = arrange(varimax(raw)).loadings;
    const turned = oblimin(raw);
    const { loadings, phi } = arrange(turned.loadings, turned.phi);
    Object.assign(result, { pattern: loadings, phi, structure: multiply(loadings, phi) });
  }
  return result;
}

function generator(seed) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
}

function correlate(data) {
  const n = data.length;
  const p = data[0].length;
  const means = Array.from({ length: p }, (_, j) => total(column(data, j)) / n);
  const centered = data.map((row) => row.map((x, j) => x - means[j]));
  const cross = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (__, j) => total(centered.map((row) => row[i] * row[j]))));
  return cross.map((row, i) => row.map((x, j) => x / Math.sqrt(cross[i][i] * cross[j][j])));
}

function parallel(n, p, sets, seed) {
  const normal = generator(seed);
  const sum = new Array(p).fill(0);
  for (let s = 0; s < sets; s++) {
    const r = correlate(Array.from({ length: n }, () => Array.from({ length: p }, normal)));
    eigen(reduce(r)).values.forEach((x, k) => {
      sum[k] += x;
    });
  }
  return sum.map((x) => x / sets);
}

const firstBelow = (real, random) => {
  const k = real.findIndex((x, i) => x <= random[i]);
  return k < 0 ? real.length : k;
};

export function analyze(r, n, { sets = 1000, seed = 1939 } = {}) {
  const full = eigen(r).values;
  const reduced = eigen(reduce(r)).values;
  const random = parallel(n, r.length, sets, seed);
  const map = partials(r);
  return {
    n,
    p: r.length,
    pairs: (r.length * (r.length - 1)) / 2,
    ...suitability(r, n),
    eigen: { full, reduced, random },
    map,
    keep: {
      kaiser: full.filter((x) => x > 1).length,
      parallel: firstBelow(reduced, random),
      map: map.slice(1).reduce((best, x, i, all) => (x < all[best] ? i : best), 0) + 1,
    },
    factors: Array.from({ length: MOST }, (_, k) => solution(r, likelihood(r, k + 1))),
    components: Array.from({ length: MOST }, (_, k) => solution(r, components(r, k + 1))),
  };
}

export function shrink(result, digits = 6) {
  const round = (x) => (typeof x === 'number' && !Number.isInteger(x) ? Number(x.toFixed(digits)) : Array.isArray(x) ? x.map(round) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])) : x);
  return round(result);
}

const hundredths = (v) => {
  const k = Math.round(Number(Math.abs(v).toFixed(2)) * 100);
  return v < 0 ? -k : k;
};
export const bounded = (v) => {
  const k = hundredths(v);
  return (k < 0 ? MINUS : '') + (Math.abs(k) / 100).toFixed(2).replace(/^0/, '');
};
const plain = (v) => Math.abs(v).toFixed(2);
const sum = (xs) => total(xs).toFixed(2);
const mean = (xs) => (total(xs) / xs.length).toFixed(2).replace(/^0/, '');

export function pick({ model, m, rotation }, result) {
  const set = (model === 'components' ? result.components : result.factors)[m - 1];
  if (m === 1 || rotation === 'none') return { loadings: set.unrotated, phi: null, structure: null, set };
  if (rotation === 'varimax') return { loadings: set.varimax, phi: null, structure: null, set };
  return { loadings: set.pattern, phi: set.phi, structure: set.structure ?? null, set };
}

const named = ({ m, rotation }) => m === 4 && rotation !== 'none';

export function headings(state, names) {
  const short = state.model === 'components' ? 'Component' : 'Factor';
  return Array.from({ length: state.m }, (_, j) => (named(state) ? names[j] : `${short} ${j + 1}`));
}

function between(phi) {
  const values = phi.flatMap((row, i) => row.filter((_, j) => j > i));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values.length === 1 ? `at ${bounded(lo)}` : `from ${bounded(lo)} to ${bounded(hi)}`;
}

const SPACING = 1.62;
const GAP = 4;
const fixed = (x) => String(Math.round(x * 10000) / 10000);
const at = (px, units) => `calc(var(--first) + ${px}px + ${fixed(units)} * var(--unit))`;

export const zeroAt = (j, plus = 0) => at(GAP * j, SPACING * (j + 1) + plus);
export const centerAt = (j) => zeroAt(j, (1 - (SPACING - 1)) / 2);

export function place(j, v) {
  return { left: zeroAt(j, Math.min(v, 0)), width: `calc(${fixed(Math.abs(v))} * var(--unit))` };
}

export function numberAt(j, v) {
  return v < 0 ? { left: at(GAP * j + 5, SPACING * (j + 1)), transform: 'none' } : { left: at(GAP * j - 5, SPACING * (j + 1)), transform: 'translateX(-100%)' };
}

const SCREE = { x1: 54, step: 38, zeroY: 158, unit: 48, topY: 16, r: 4.5, axisX: 36, lineEnd: 412, randY: 146 };

export function scree({ model, m }, result) {
  const pca = model === 'components';
  const e = (pca ? result.eigen.full : result.eigen.reduced).slice(0, 10);
  const x = (k) => SCREE.x1 + k * SCREE.step;
  const y = (v) => Math.round((SCREE.zeroY - v * SCREE.unit) * 10) / 10;
  const points = e.map((v, k) => [x(k), k === 0 ? SCREE.topY : y(v)]);
  const r = SCREE.r;
  const dot = ([px, py]) => `M${px - r} ${py} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  const kept = pca ? result.keep.kaiser : result.keep.parallel;
  return {
    title: pca ? 'Eigenvalues of all the variance' : 'Eigenvalues of the shared variance',
    verdict: pca ? `The eigenvalue-over-1 rule keeps ${NUMBERS[kept - 1]}` : `Parallel analysis keeps ${NUMBERS[kept - 1]}`,
    aria: pca
      ? `Scree of the first 10 eigenvalues of all the variance, with a cut at 1. The ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][kept - 1]} eigenvalue, ${plain(e[kept - 1])}, is the last above 1.`
      : `Scree of the first 10 eigenvalues of the shared variance against random data. The first ${NUMBERS[kept - 1]} lie above the random line.`,
    real: `M${points.map((point) => point.join(' ')).join(' L')}`,
    kept: points.slice(0, m).map(dot).join(' '),
    dropped: points.slice(m).map(dot).join(' '),
    reference: pca ? `M${SCREE.axisX} ${y(1)} H${SCREE.lineEnd}` : `M${result.eigen.random.slice(0, 10).map((v, k) => `${x(k)} ${y(v)}`).join(' L')}`,
    first: plain(e[0]),
    firstX: x(0) + 9,
    firstY: SCREE.topY + 4,
    realLabel: pca ? '' : 'Real data',
    realX: x(1) + 8,
    realY: y(e[1]) - 8,
    referenceLabel: pca ? 'Cut at 1' : 'Random data',
    referenceX: pca ? SCREE.lineEnd : x(0),
    referenceY: pca ? y(1) - 6 : SCREE.randY,
    referenceAnchor: pca ? 'end' : 'start',
  };
}

export const hint = (test) => (test === null ? 'Common factors, 4 and Oblimin give the careful route. Pick a test to see its numbers.' : 'Pick the same test again to clear it.');
export const explained = (state, result) => `${sum(pick(state, result).set.h2)} of ${result.p}`;
export const leftOver = (state, result) => `${pick(state, result).set.leftover} of ${result.pairs}`;
export const loadTitle = ({ m, rotation }) => (rotation === 'oblimin' && m > 1 ? 'Pattern coefficients' : 'Loadings');

export function narrate(state, result, tests, names) {
  const { model, m, rotation, test } = state;
  const pca = model === 'components';
  const { loadings, structure, set } = pick(state, result);
  const f = result.factors[m - 1];
  const c = result.components[m - 1];
  const pattern = rotation === 'oblimin' && m > 1;
  const short = pca ? 'component' : 'factor';
  const ref = (j) => (named(state) ? names[j] : `${short}${KEEP}${j + 1}`);
  const noun = pca ? (m === 1 ? 'principal component' : 'principal components') : m === 1 ? 'common factor' : 'common factors';
  const turned = { none: 'unrotated', varimax: 'rotated with varimax', oblimin: 'rotated with oblimin' }[rotation];
  const isDefault = pca && m === 5 && rotation === 'varimax';
  const isCareful = !pca && m === 4 && rotation === 'oblimin';
  const lead = isDefault
    ? 'This is the default route, five principal components rotated with varimax.'
    : isCareful
      ? 'This is the careful route, four common factors rotated with oblimin.'
      : null;

  if (test !== null) {
    const label = tests[test];
    const row = loadings[test];
    const items = row.map((v, j) => ({ v, j, k: Math.abs(hundredths(v)) })).sort((a, b) => b.k - a.k || a.j - b.j);
    const salient = items.filter((it) => it.k >= 30);
    const one = (it) => `${bounded(it.v)} on ${ref(it.j)}`;
    let first = lead;
    if (!first && m === 1) first = `This is one ${noun}, which ${rotation === 'none' ? 'needs no rotation.' : `${rotation} cannot change.`}`;
    if (!first) first = `These are ${NUMBERS[m - 1]} ${noun}, ${turned}.`;
    let load;
    if (salient.length === 0) {
      load = `${label} has no ${pattern ? 'pattern coefficient' : 'loading'} of .30 or more, and its largest is ${one(items[0])}.`;
    } else if (m === 1) {
      load = `${label} loads ${bounded(row[0])} on the single ${short}.`;
    } else if (salient.length === 1) {
      load = pattern ? `${label} has a pattern coefficient of ${one(salient[0])}, and no other reaches .30.` : `${label} loads ${one(salient[0])}, and no other loading reaches .30.`;
    } else if (salient.length > 3) {
      load = `${label} has ${pattern ? 'pattern coefficients' : 'loadings'} of .30 or more on ${NUMBERS[salient.length - 1]} ${short}s, the largest ${one(salient[0])}.`;
    } else {
      const list = salient.map(one);
      const text = list.length === 2 ? `${list[0]} and ${list[1]}` : `${list[0]}, ${list[1]} and ${list[2]}`;
      load = `${label} ${pattern ? 'has pattern coefficients of' : 'loads'} ${text}.`;
    }
    let second;
    if (!pca && pattern) second = `Its correlation with ${ref(items[0].j)}, the structure coefficient, is ${bounded(structure[test][items[0].j])}.`;
    else if (pca) second = `Its communality is ${bounded(c.h2[test])} as a component and ${bounded(f.h2[test])} as a common factor.`;
    else second = `Its communality is ${bounded(f.h2[test])} as a common factor and ${bounded(c.h2[test])} as a component.`;
    return [first, load, second].join(' ');
  }

  const opening =
    lead ||
    (m === 1
      ? `One ${noun} accounts for ${sum(set.h2)} of the tests’ total variance of ${result.p}.`
      : `${CAPITALS[m - 1]} ${noun}, ${turned}, account for ${sum(set.h2)} of the tests’ total variance of ${result.p}.`);

  if (pca) {
    const fifth = plain(result.eigen.full[result.keep.kaiser - 1]);
    const kaiser = `The eigenvalue-over-1 rule keeps ${NUMBERS[result.keep.kaiser - 1]}, since the ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][result.keep.kaiser - 1]} eigenvalue, ${fifth}, just clears 1.`;
    const shared = `Components take in each test’s unique variance, so the mean communality is ${mean(c.h2)} against ${mean(f.h2)} for ${NUMBERS[m - 1]} common ${m === 1 ? 'factor.' : 'factors.'}`;
    if (isDefault) return [lead, kaiser, shared].join(' ');
    let third;
    if (m === 1) third = rotation === 'none' ? 'With one component there is nothing to rotate.' : `With one component, ${rotation} has nothing to rotate.`;
    else if (rotation === 'none') {
      const first = column(c.unrotated, 0);
      third = `Unrotated, every test loads ${bounded(Math.min(...first))} to ${bounded(Math.max(...first))} on component${KEEP}1, a general component that is hard to read.`;
    } else if (rotation === 'oblimin') third = `Oblimin lets the components correlate, here ${between(c.phi)}.`;
    else third = `${CAPITALS[m - 1]} components leave ${c.leftover} residual correlations larger than .10, against ${f.leftover} for ${NUMBERS[m - 1]} common factors.`;
    return [opening, shared, third].join(' ');
  }

  const over = f.leftover;
  const pairs = result.pairs;
  let count;
  if (m === 1) count = `A single factor leaves ${over} of the ${pairs} residual correlations larger than .10.`;
  else if (m === 2) count = `Two factors still leave ${over} of the ${pairs} residual correlations larger than .10.`;
  else if (m === 3) count = rotation === 'none' ? `Three factors leave ${over} of the ${pairs} residual correlations larger than .10.` : `Three factors leave ${over} residual correlations larger than .10, and the memory tests lose their factor.`;
  else if (m === 4) count = `Parallel analysis and Velicer’s MAP both keep four, and only ${over} of ${pairs} residual correlations are larger than .10.`;
  else if (m === 5)
    count =
      rotation === 'none'
        ? `A fifth factor leaves ${over} residual correlations larger than .10, the same as four.`
        : rotation === 'varimax'
          ? `A new factor forms around Straight and curved capitals and Code, and residuals larger than .10 stay at ${over}.`
          : 'Visual perception joins Code and Straight and curved capitals on a new factor.';
  else count = rotation === 'none' ? `Six factors leave only ${over} residual correlations larger than .10, though parallel analysis keeps four.` : 'One factor now rests on Paper form board alone, a sign of too many factors.';

  let turn;
  if (isCareful) turn = `Spatial, verbal, speed and memory tests each load on their own factor, and the factors correlate ${between(f.phi).replace('from ', '')}.`;
  else if (m === 1) turn = rotation === 'none' ? 'With one factor there is nothing to rotate.' : `With one factor, ${rotation} has nothing to rotate.`;
  else if (rotation === 'none' && m === 6) turn = `Unrotated, Paper form board loads ${bounded(f.unrotated[2][1])} on factor${KEEP}2, a sign of too many factors.`;
  else if (rotation === 'none') {
    const first = column(f.unrotated, 0);
    turn = `Unrotated, every test loads ${bounded(Math.min(...first))} to ${bounded(Math.max(...first))} on factor${KEEP}1, a general factor that is hard to read.`;
  } else if (rotation === 'varimax') {
    const before = squares(column(f.unrotated, 0));
    const after = Math.max(...f.varimax[0].map((_, j) => squares(column(f.varimax, j))));
    turn = `Varimax keeps the factors uncorrelated and cuts the largest one’s variance from ${plain(before)} to ${plain(after)}.`;
  } else turn = `Oblimin lets the factors correlate, here ${between(f.phi)}.`;
  return [opening, count, turn].join(' ');
}
