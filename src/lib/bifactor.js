const total = (xs) => xs.reduce((a, b) => a + b, 0);
const average = (xs) => total(xs) / xs.length;
const keysOf = (items) => [...new Set(items.map((d) => d.subscale))];
const within = (items, key) => items.filter((d) => d.subscale === key);

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

function parts(item) {
  const general = item.general ** 2;
  const group = item.group ** 2;
  return { general, group, unique: 1 - general - group, iecv: general / (general + group) };
}

function composite(items) {
  const k = items.length;
  const keys = keysOf(items);
  const generalSum = total(items.map((d) => d.general));
  const groupSums = keys.map((key) => total(within(items, key).map((d) => d.group)));
  const general = generalSum ** 2;
  const group = total(groupSums.map((x) => x * x));
  const unique = total(items.map((d) => parts(d).unique));
  const variance = general + group + unique;
  return {
    generalSum,
    groupSums: Object.fromEntries(keys.map((key, i) => [key, groupSums[i]])),
    general,
    group,
    unique,
    variance,
    alpha: (k / (k - 1)) * (1 - k / variance),
    omega: (general + group) / variance,
    omegaH: general / variance,
  };
}

function explained(items) {
  const general = total(items.map((d) => d.general ** 2));
  const groups = Object.fromEntries(keysOf(items).map((key) => [key, total(within(items, key).map((d) => d.group ** 2))]));
  return { general, groups, value: general / (general + total(Object.values(groups))) };
}

function uncontaminated(items) {
  const k = items.length;
  const pairs = (k * (k - 1)) / 2;
  const inside = total(keysOf(items).map((key) => within(items, key).length).map((n) => (n * (n - 1)) / 2));
  return { pairs, within: inside, between: pairs - inside, value: (pairs - inside) / pairs };
}

function replicability(loadings) {
  const sum = total(loadings.filter((x) => x !== 0).map((x) => (x * x) / (1 - x * x)));
  return 1 / (1 + 1 / sum);
}

function determinacy(items) {
  const factors = ['G', ...keysOf(items)];
  const lambda = items.map((d) => factors.map((f) => (f === 'G' ? d.general : d.subscale === f ? d.group : 0)));
  const psi = items.map((d) => parts(d).unique);
  const m = factors.map((_, a) => factors.map((__, b) => total(lambda.map((row, i) => (row[a] * row[b]) / psi[i]))));
  const shifted = inverse(m.map((row, a) => row.map((x, b) => x + (a === b ? 1 : 0))));
  const product = m.map((row) => shifted[0].map((_, j) => total(row.map((x, k) => x * shifted[k][j]))));
  return factors.map((key, f) => ({ key, fd: Math.sqrt(product[f][f]), h: replicability(lambda.map((row) => row[f])) }));
}

function correlations(items) {
  return items.map((a, i) =>
    items.map((b, j) => {
      if (i === j) return 1;
      return a.general * b.general + (a.subscale === b.subscale ? a.group * b.group : 0);
    }),
  );
}

function oneFactor(r) {
  const k = r.length;
  let psi = r.map((row, i) => 1 - Math.max(...row.filter((_, j) => j !== i).map(Math.abs)));
  let loadings = new Array(k).fill(0);
  for (let step = 0; step < 5000; step++) {
    const root = psi.map((x) => Math.sqrt(x));
    const scaled = r.map((row, i) => row.map((x, j) => x / (root[i] * root[j])));
    let v = new Array(k).fill(1 / Math.sqrt(k));
    let value = 0;
    for (let n = 0; n < 500; n++) {
      const w = scaled.map((row) => total(row.map((x, j) => x * v[j])));
      const norm = Math.sqrt(total(w.map((x) => x * x)));
      const next = w.map((x) => x / norm);
      const change = Math.max(...next.map((x, i) => Math.abs(x - v[i])));
      v = next;
      value = norm;
      if (change < 1e-13) break;
    }
    const next = v.map((x, i) => root[i] * x * Math.sqrt(Math.max(value - 1, 0)));
    const change = Math.max(...next.map((x, i) => Math.abs(x - loadings[i])));
    loadings = next;
    psi = loadings.map((x) => Math.max(1 - x * x, 0.005));
    if (change < 1e-12) break;
  }
  return total(loadings) < 0 ? loadings.map((x) => -x) : loadings;
}

export function bias(items) {
  const single = oneFactor(correlations(items));
  return average(items.map((d, i) => (single[i] - d.general) / d.general));
}

export function analyze(items) {
  return {
    items: items.map(parts),
    total: composite(items),
    subscales: keysOf(items).map((key) => {
      const c = composite(within(items, key));
      return { key, ...c, omegaHS: c.group / c.variance };
    }),
    ecv: explained(items),
    puc: uncontaminated(items),
    factors: determinacy(items),
  };
}
