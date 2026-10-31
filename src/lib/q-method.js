const LEVELS = [
  { mark: '*', z: 1.96 },
  { mark: '**', z: 2.576 },
  { mark: '***', z: 3.291 },
  { mark: '6*', z: 4.8916 },
];

const total = (xs) => xs.reduce((a, b) => a + b, 0);
const average = (xs) => total(xs) / xs.length;
const columns = (m) => m[0].map((_, j) => m.map((row) => row[j]));
const multiply = (a, b) => a.map((row) => b[0].map((_, j) => total(row.map((x, k) => x * b[k][j]))));

function sd(xs) {
  const m = average(xs);
  return Math.sqrt(total(xs.map((x) => (x - m) ** 2)) / (xs.length - 1));
}

function correlation(x, y) {
  const mx = average(x);
  const my = average(y);
  const dx = x.map((v) => v - mx);
  const dy = y.map((v) => v - my);
  return total(dx.map((v, i) => v * dy[i])) / Math.sqrt(total(dx.map((v) => v * v)) * total(dy.map((v) => v * v)));
}

function eigen(matrix) {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const v = a.map((_, i) => a.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-300) continue;
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = a.map((_, i) => i).sort((i, j) => a[j][j] - a[i][i]);
  return {
    values: order.map((i) => a[i][i]),
    vectors: v.map((row) => order.map((i) => row[i])),
  };
}

const signed = (loadings) => {
  const signs = columns(loadings).map((col) => (total(col) < 0 ? -1 : 1));
  return loadings.map((row) => row.map((x, j) => x * signs[j]));
};

function components(r, k) {
  const { values, vectors } = eigen(r);
  const root = values.slice(0, k).map((x) => Math.sqrt(Math.max(x, Number.EPSILON)));
  return signed(vectors.map((row) => root.map((s, j) => row[j] * s)));
}

function polar(b) {
  const { values, vectors } = eigen(multiply(columns(b), b));
  const inverse = vectors.map((row) => row.map((x, j) => x / Math.sqrt(values[j])));
  return {
    rotation: multiply(b, multiply(inverse, columns(vectors))),
    spread: total(values.map(Math.sqrt)),
  };
}

function varimax(loadings, eps = 1e-5) {
  const lengths = loadings.map((row) => Math.sqrt(total(row.map((x) => x * x))));
  const x = loadings.map((row, i) => row.map((v) => v / lengths[i]));
  const p = x.length;
  let rotation = x[0].map((_, i) => x[0].map((__, j) => (i === j ? 1 : 0)));
  let d = 0;
  for (let step = 0; step < 1000; step++) {
    const z = multiply(x, rotation);
    const means = columns(z).map((col) => total(col.map((v) => v * v)) / p);
    const b = multiply(columns(x), z.map((row) => row.map((v, j) => v ** 3 - v * means[j])));
    const next = polar(b);
    rotation = next.rotation;
    const past = d;
    d = next.spread;
    if (d < past * (1 + eps)) break;
  }
  return multiply(x, rotation).map((row, i) => row.map((v) => v * lengths[i]));
}

function arrange(loadings) {
  const sizes = columns(loadings).map((col) => total(col.map((x) => x * x)));
  const order = sizes.map((_, j) => j).sort((i, j) => sizes[j] - sizes[i]);
  return signed(loadings.map((row) => order.map((j) => row[j])));
}

export const cutoff = (statements, z = 1.96) => z / Math.sqrt(statements);

function flags(loadings, cut) {
  return loadings.map((row) => {
    const squares = row.map((x) => x * x);
    const all = total(squares);
    return row.map((x, f) => squares[f] > all - squares[f] && Math.abs(x) > cut);
  });
}

function rank(values) {
  const order = values.map((_, i) => i).sort((i, j) => values[i] - values[j]);
  const ranks = new Array(values.length);
  for (let start = 0; start < order.length; ) {
    let end = start;
    while (end + 1 < order.length && values[order[end + 1]] === values[order[start]]) end++;
    for (let i = start; i <= end; i++) ranks[order[i]] = (start + end) / 2 + 1;
    start = end + 1;
  }
  return ranks;
}

function place(z, grid) {
  const slots = [...grid].sort((a, b) => a - b);
  const placed = rank(z).map((r) => slots[Math.floor(r) - 1]);
  z.forEach((value, i) => {
    z.forEach((other, j) => {
      if (other === value && placed[j] < placed[i]) placed[i] = placed[j];
    });
  });
  return placed;
}

function scores(sorts, loadings, flagged) {
  const statements = sorts[0].length;
  return loadings[0].map((_, f) => {
    const weights = loadings.map((row, s) => (flagged[s][f] ? row[f] / (1 - row[f] * row[f]) : 0));
    if (weights.every((w) => w === 0)) return null;
    const sums = Array.from({ length: statements }, (__, i) => total(sorts.map((sort, s) => sort[i] * weights[s])));
    const m = average(sums);
    const spread = sd(sums);
    return { weights, z: sums.map((x) => (x - m) / spread) };
  });
}

function errors(flagged, factors, reliability = 0.8) {
  return factors.map((factor, f) => {
    const defining = flagged.filter((row) => row[f]).length;
    const composite = (reliability * defining) / (1 + (defining - 1) * reliability);
    return factor ? sd(factor.z) * Math.sqrt(1 - composite) : NaN;
  });
}

function mark(difference, error) {
  let found = '';
  for (const level of LEVELS) if (Math.abs(difference) > error * level.z) found = level.mark;
  return found;
}

function compare(factors, se) {
  const used = factors.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const pairs = [];
  used.forEach((a, x) => used.slice(x + 1).forEach((b) => pairs.push([a, b])));
  return factors[used[0]].z.map((_, i) => {
    const tests = pairs.map(([a, b]) => {
      const difference = factors[a].z[i] - factors[b].z[i];
      const needed = Math.sqrt(se[a] ** 2 + se[b] ** 2);
      return { pair: [a, b], difference, needed, mark: mark(difference, needed) };
    });
    const hit = tests.map((t) => t.mark !== '');
    let label = '';
    if (hit.every((h) => !h)) label = 'Consensus';
    else if (used.length === 2) label = 'Distinguishing';
    else {
      used.forEach((f) => {
        const inside = tests.filter((t) => t.pair.includes(f)).map((t) => t.mark !== '');
        const outside = tests.filter((t) => !t.pair.includes(f)).map((t) => t.mark !== '');
        const allIn = inside.every(Boolean);
        const anyOut = outside.some(Boolean);
        if (allIn && !anyOut) label = `Distinguishes f${f + 1} only`;
        else if (hit.every(Boolean)) label = 'Distinguishes all';
        else if (allIn && anyOut) label = `${label}Distinguishes f${f + 1} `;
      });
    }
    return { tests, label };
  });
}

export function summarize(sorts, loadings, cut) {
  const flagged = flags(loadings, cut);
  const factors = scores(sorts, loadings, flagged);
  const arrays = factors.map((f) => (f ? place(f.z, sorts[0]) : null));
  const se = errors(flagged, factors);
  const used = factors.filter(Boolean).length;
  return { loadings, flagged, factors, arrays, se, statements: used > 1 ? compare(factors, se) : [] };
}

export const correlations = (sorts) => sorts.map((a) => sorts.map((b) => correlation(a, b)));

export function analyze(sorts, k, cut = cutoff(sorts[0].length)) {
  return summarize(sorts, arrange(varimax(components(correlations(sorts), k))), cut);
}
