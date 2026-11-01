import { formatEffect } from './narration.js';

export const START = { tab: 'items', item: { masc: 2, arsq: 0 }, subscale: 0 };

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

const near = (x) => Math.round(100 * x) / 100;
const decimal = (x) => formatEffect(x).replace('0.', '.');
const percent = (x) => (x >= 0.995 ? 'over 99%' : x < 0.005 ? 'under 1%' : `${Math.round(100 * x)}%`);
const capital = (text) => text[0].toUpperCase() + text.slice(1);
const list = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

export const passes = ({ fd, h }) => near(fd) >= 0.9 && near(h) >= 0.7;

function itemStory(scale, result, item) {
  const general = scale.general.toLowerCase();
  const d = scale.items[item];
  const p = result.items[item];
  const own = scale.subscales.find(({ key }) => key === d.subscale).name.toLowerCase();
  return [
    `${d.number ? `The item “${d.label}”` : d.label} loads ${decimal(d.general)} on ${general} and ${decimal(d.group)} on ${own}.`,
    `${capital(general)} explains ${percent(p.general)} of its variance and ${own} ${percent(p.group)}, leaving ${percent(p.unique)} unique.`,
    `Of what it shares with the other items, ${percent(p.iecv)} is ${general}.`,
  ];
}

function totalStory(scale, result) {
  const general = scale.general.toLowerCase();
  const t = result.total;
  const lines = [
    `${capital(general)} accounts for ${t.general.toFixed(2)} of the total score’s variance of ${t.variance.toFixed(2)}, so ω<sub>H</sub> is ${decimal(t.omegaH)}.`,
    `Counting the subscales as well, omega is ${decimal(t.omega)}.`,
  ];
  if (t.omegaH >= 0.8) lines.push('With ω<sub>H</sub> above .80, the total score can be read as one trait.');
  else lines.push(`With ω<sub>H</sub> below .80, the subscales supply ${percent(1 - t.omegaH / t.omega)} of the reliable variance, so the total score mixes ${general} with them.`);
  return lines;
}

function subscaleStory(scale, result, k) {
  const general = scale.general.toLowerCase();
  const sub = result.subscales[k];
  const own = scale.subscales[k].name.toLowerCase();
  const part = sub.group / (sub.general + sub.group);
  const first = `The ${own} factor accounts for ${decimal(sub.omegaHS)} of the subscale score’s variance, and ${general} for ${decimal(sub.general / sub.variance)}.`;
  if (part < 0.4) return [first, `So the score mostly tracks ${general}, and its omega of ${decimal(sub.omega)} says little about ${own} itself.`];
  return [first, `${part < 0.5 ? 'Nearly half' : 'Most'} of its reliable variance belongs to ${own} itself, and its ω<sub>HS</sub> ${sub.omegaHS >= 0.5 ? 'passes' : 'falls below'} the suggested .50.`];
}

function oneStory(scale, result, drift) {
  const general = scale.general.toLowerCase();
  const { ecv, puc } = result;
  const short = [ecv.value < 0.7 && 'ECV', puc.value < 0.7 && 'PUC'].filter(Boolean);
  return [
    `${capital(general)} explains ${percent(ecv.value)} of the common variance, so ECV is ${decimal(ecv.value)}.`,
    `Of the ${puc.pairs} item pairs, ${percent(puc.value)} cross subscales and share only ${general}, so PUC is ${decimal(puc.value)}.`,
    short.length === 0
      ? `Both pass .70, so a one-factor model raises the loadings by only about ${percent(drift)}.`
      : `${short.length === 2 ? 'Both fall' : `${short[0]} falls`} below .70, and a one-factor model raises the loadings by about ${percent(drift)}.`,
  ];
}

function scoresStory(scale, result) {
  const named = ({ key }) => (key === 'G' ? scale.general : scale.subscales.find((s) => s.key === key).name).toLowerCase();
  const failing = result.factors.filter((f) => !passes(f));
  const groups = [
    [failing.filter((f) => near(f.fd) < 0.9 && near(f.h) < 0.7), 'falls short on both', 'fall short on both'],
    [failing.filter((f) => near(f.fd) < 0.9 && near(f.h) >= 0.7), 'reaches the H line but not the FD line', 'reach the H line but not the FD line'],
    [failing.filter((f) => near(f.fd) >= 0.9 && near(f.h) < 0.7), 'reaches the FD line but not the H line', 'reach the FD line but not the H line'],
  ];
  const trusted = result.factors.filter(passes).map(named);
  const lowest = result.factors.reduce((a, b) => (b.fd < a.fd ? b : a));
  return [
    trusted.length ? `Factor scores can be trusted for ${list(trusted)}, with FD of .90 or more and H of .70 or more.` : 'No factor reaches both FD .90 and H .70.',
    ...groups.filter(([fs]) => fs.length).map(([fs, one, many]) => `${capital(list(fs.map(named)))} ${fs.length === 1 ? one : many}.`),
    `At FD ${decimal(lowest.fd)}, two equally valid sets of ${named(lowest)} scores could correlate as little as ${decimal(2 * lowest.fd ** 2 - 1)}.`,
  ];
}

export function narrate(scale, result, drift, { tab, item, subscale }) {
  const stories = {
    items: () => itemStory(scale, result, item),
    total: () => totalStory(scale, result),
    subscales: () => subscaleStory(scale, result, subscale),
    one: () => oneStory(scale, result, drift),
    scores: () => scoresStory(scale, result),
  };
  return stories[tab]().join(' ');
}
