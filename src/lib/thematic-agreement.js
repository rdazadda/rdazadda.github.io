export function tableStats(table) {
  const rows = table.map((row) => row.reduce((sum, value) => sum + value, 0));
  const cols = table[0].map((_, j) => table.reduce((sum, row) => sum + row[j], 0));
  const N = rows.reduce((sum, value) => sum + value, 0);
  const stats = { N, rows, cols, po: null, pc: null, poMax: null, kappa: null, kappaMax: null, se: null, lo: null, hi: null };
  if (!N) return stats;
  let same = 0;
  let chance = 0;
  let most = 0;
  table.forEach((_, i) => {
    same += table[i][i];
    chance += rows[i] * cols[i];
    most += Math.min(rows[i], cols[i]);
  });
  stats.po = same / N;
  stats.pc = chance / (N * N);
  stats.poMax = most / N;
  if (chance === N * N) return stats;
  stats.kappa = (stats.po - stats.pc) / (1 - stats.pc);
  stats.kappaMax = (stats.poMax - stats.pc) / (1 - stats.pc);
  stats.se = Math.sqrt((stats.po * (1 - stats.po)) / (N * (1 - stats.pc) ** 2));
  stats.lo = Math.max(-1, stats.kappa - 1.96 * stats.se);
  stats.hi = Math.min(1, stats.kappa + 1.96 * stats.se);
  return stats;
}

export function expectedCount(stats, r, c) {
  return stats.N ? (stats.rows[r] * stats.cols[c]) / stats.N : 0;
}

export function alphaFromTable(table) {
  const N = table.flat().reduce((sum, value) => sum + value, 0);
  if (!N) return null;
  const n = 2 * N;
  let matches = 0;
  let chance = 0;
  table.forEach((row, c) => {
    const values = row.reduce((sum, value) => sum + value, 0) + table.reduce((sum, other) => sum + other[c], 0);
    matches += 2 * table[c][c];
    chance += values * (values - 1);
  });
  const below = n * (n - 1) - chance;
  return below === 0 ? null : ((n - 1) * matches - chance) / below;
}

export function binaryTable(pairs) {
  const table = [[0, 0], [0, 0]];
  for (const [first, second] of pairs) table[first ? 0 : 1][second ? 0 : 1] += 1;
  return table;
}

export function fixed(value, digits = 2) {
  if (value === null || value === undefined) return '';
  const text = Math.abs(value).toFixed(digits);
  const trimmed = Math.abs(value) < 1 ? text.replace(/^0/, '') : text;
  return Number(text) === 0 ? trimmed : `${value < 0 ? '−' : ''}${trimmed}`;
}

export function percent(value) {
  return `${Math.round(value * 100)}%`;
}
