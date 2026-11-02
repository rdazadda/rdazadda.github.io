import { chiSquare } from './distributions.js';

export const START = { model: 'three', path: 'none', test: null };

const MINUS = '−';
const INK = '#30394f';
const TEXT = '#1f2933';
const MUTED = '#46505c';
const FREE = '#d55e00';
const FREE_TEXT = '#b04a00';
const LINES = ['#1f5a88', '#c99400', '#2e8b74'];
const TONES = ['#1f5a88', '#7d5c00', '#1f6b58'];
const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
const multiply = (a, b) => a.map((row) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
const transpose = (a) => a[0].map((_, j) => a.map((row) => row[j]));
const trace = (a, b) => a.reduce((sum, row, i) => sum + row.reduce((s, v, j) => s + v * b[i][j], 0), 0);

function cholesky(a) {
  const n = a.length;
  const l = zeros(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = a[i][j];
      for (let k = 0; k < j; k++) sum -= l[i][k] * l[j][k];
      if (i === j) {
        if (sum <= 0) return null;
        l[i][i] = Math.sqrt(sum);
      } else l[i][j] = sum / l[j][j];
    }
  }
  return l;
}

function inverse(a) {
  const l = cholesky(a);
  if (!l) return null;
  const n = a.length;
  const inv = zeros(n, n);
  for (let col = 0; col < n; col++) {
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = i === col ? 1 : 0;
      for (let k = 0; k < i; k++) sum -= l[i][k] * y[k];
      y[i] = sum / l[i][i];
    }
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let k = i + 1; k < n; k++) sum -= l[k][i] * inv[k][col];
      inv[i][col] = sum / l[i][i];
    }
  }
  return { inv, logDet: 2 * l.reduce((sum, row, i) => sum + Math.log(row[i]), 0) };
}

function specify({ factors, loadings, covariances = [] }, p) {
  const params = [
    ...loadings.map(([i, f]) => ({ kind: 'loading', i, f })),
    ...Array.from({ length: factors }, (_, f) => Array.from({ length: factors - f - 1 }, (__, k) => ({ kind: 'correlation', f, g: f + 1 + k }))).flat(),
    ...Array.from({ length: p }, (_, i) => ({ kind: 'variance', i })),
    ...covariances.map(([i, j]) => ({ kind: 'covariance', i, j })),
  ];
  return { params, p, m: factors };
}

function matrices({ p, m, params }, theta) {
  const lambda = zeros(p, m);
  const phi = zeros(m, m);
  const residual = zeros(p, p);
  for (let f = 0; f < m; f++) phi[f][f] = 1;
  params.forEach((param, k) => {
    const v = theta[k];
    if (param.kind === 'loading') lambda[param.i][param.f] = v;
    else if (param.kind === 'correlation') phi[param.f][param.g] = phi[param.g][param.f] = v;
    else if (param.kind === 'variance') residual[param.i][param.i] = v;
    else residual[param.i][param.j] = residual[param.j][param.i] = v;
  });
  return { lambda, phi, residual };
}

function implied(model, theta) {
  const { lambda, phi, residual } = matrices(model, theta);
  return multiply(multiply(lambda, phi), transpose(lambda)).map((row, i) => row.map((v, j) => v + residual[i][j]));
}

function derivative(param, lambda, phi, p) {
  const d = zeros(p, p);
  if (param.kind === 'loading') {
    const v = lambda.map((row) => row.reduce((sum, l, g) => sum + l * phi[g][param.f], 0));
    for (let a = 0; a < p; a++) {
      d[param.i][a] += v[a];
      d[a][param.i] += v[a];
    }
  } else if (param.kind === 'correlation') {
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) d[a][b] = lambda[a][param.f] * lambda[b][param.g] + lambda[a][param.g] * lambda[b][param.f];
    }
  } else if (param.kind === 'variance') d[param.i][param.i] = 1;
  else d[param.i][param.j] = d[param.j][param.i] = 1;
  return d;
}

function discrepancy(s, sigma, logDetS) {
  const result = inverse(sigma);
  return result ? result.logDet + trace(s, result.inv) - logDetS - s.length : Infinity;
}

function scoring(model, s, theta) {
  const sigma = implied(model, theta);
  const { inv } = inverse(sigma);
  const { lambda, phi } = matrices(model, theta);
  const w = multiply(multiply(inv, sigma.map((row, i) => row.map((v, j) => v - s[i][j]))), inv);
  const derivatives = model.params.map((param) => derivative(param, lambda, phi, model.p));
  const weighted = derivatives.map((d) => multiply(multiply(inv, d), inv));
  return {
    inv,
    lambda,
    phi,
    w,
    derivatives,
    gradient: derivatives.map((d) => trace(w, d)),
    information: weighted.map((a) => derivatives.map((d) => trace(a, d))),
  };
}

function estimate(model, s) {
  const logDetS = inverse(s).logDet;
  let theta = model.params.map((param) => (param.kind === 'loading' ? 0.2 : param.kind === 'variance' ? 0.9 * s[param.i][param.i] : 0));
  let current = discrepancy(s, implied(model, theta), logDetS);
  for (let iteration = 0; iteration < 500; iteration++) {
    const { gradient, information } = scoring(model, s, theta);
    const { inv } = inverse(information);
    const step = inv.map((row) => row.reduce((sum, v, k) => sum + v * gradient[k], 0));
    let size = 1;
    let next;
    let value;
    for (let tries = 0; tries < 40; tries++) {
      next = theta.map((v, k) => v - size * step[k]);
      value = discrepancy(s, implied(model, next), logDetS);
      if (value <= current + 1e-14) break;
      size /= 2;
    }
    const change = Math.max(...next.map((v, k) => Math.abs(v - theta[k])));
    theta = next;
    const done = Math.abs(current - value) < 1e-15 && change < 1e-12;
    current = value;
    if (done) break;
  }
  return { theta, f: current };
}

function fit(model, s, n, candidates = []) {
  const { theta, f } = estimate(model, s);
  const { p, m, params } = model;
  const sigma = implied(model, theta);
  const { lambda, phi, residual } = matrices(model, theta);
  const df = (p * (p + 1)) / 2 - params.length;
  const chisq = n * f;
  const logDetS = inverse(s).logDet;
  const baseChisq = n * (s.reduce((sum, row, i) => sum + Math.log(row[i]), 0) - logDetS);
  const baseDf = (p * (p - 1)) / 2;
  const sd = sigma.map((row, i) => Math.sqrt(row[i]));
  const observed = s.map((row, i) => row.map((v, j) => v / Math.sqrt(s[i][i] * s[j][j])));
  const residualCor = observed.map((row, i) => row.map((v, j) => (i === j ? 0 : v - sigma[i][j] / (sd[i] * sd[j]))));
  let squares = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) squares += ((s[i][j] - sigma[i][j]) / Math.sqrt(s[i][i] * s[j][j])) ** 2;
  const chi = chiSquare(df);
  const noncentrality = (target) => {
    if (chi.cdf(chisq) < target) return 0;
    let lo = 0;
    let hi = Math.max(1, chisq);
    while (chiSquare(df, hi).cdf(chisq) > target) hi *= 2;
    for (let k = 0; k < 60; k++) {
      const mid = (lo + hi) / 2;
      if (chiSquare(df, mid).cdf(chisq) > target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  let largest = { a: 1, b: 0, r: 0 };
  let over = 0;
  for (let a = 1; a < p; a++) {
    for (let b = 0; b < a; b++) {
      const r = residualCor[a][b];
      if (Math.abs(r) > 0.1) over += 1;
      if (Math.abs(r) > Math.abs(largest.r)) largest = { a: b, b: a, r };
    }
  }
  const u = residual.map((row, i) => row[i] / sigma[i][i]);
  const covariance = params.find((param) => param.kind === 'covariance');
  const result = {
    chisq,
    df,
    p: 1 - chi.cdf(chisq),
    cfi: 1 - Math.max(chisq - df, 0) / Math.max(baseChisq - baseDf, chisq - df, 0),
    tli: (baseChisq / baseDf - chisq / df) / (baseChisq / baseDf - 1),
    rmsea: Math.sqrt(Math.max(chisq - df, 0) / (df * n)),
    lower: Math.sqrt(noncentrality(0.95) / (df * n)),
    upper: Math.sqrt(noncentrality(0.05) / (df * n)),
    srmr: Math.sqrt(squares / ((p * (p + 1)) / 2)),
    loadings: lambda.map((row, i) => row.map((v) => v / sd[i])),
    phi,
    err: covariance ? residual[covariance.i][covariance.j] / Math.sqrt(residual[covariance.i][covariance.i] * residual[covariance.j][covariance.j]) : null,
    u,
    r2: u.map((v) => 1 - v),
    residual: residualCor,
    over,
    largest,
  };
  if (candidates.length) {
    const { inv, w, derivatives, information } = scoring(model, s, theta);
    const infoInv = inverse(information).inv;
    result.mi = candidates.map((c) => {
      const d = derivative(c, lambda, phi, p);
      const weighted = multiply(multiply(inv, d), inv);
      const g = trace(w, d);
      const cross = derivatives.map((dk) => trace(weighted, dk));
      const rest = trace(weighted, d) - cross.reduce((sum, v, k) => sum + v * infoInv[k].reduce((t, x, l) => t + x * cross[l], 0), 0);
      return ((n / 2) * g * g) / rest;
    });
  }
  return result;
}

export function analyze(r, n, home) {
  const p = r.length;
  const own = home.map((f, i) => [i, f]);
  const cov = { kind: 'covariance', i: 6, j: 7 };
  const cross = { kind: 'loading', i: 8, f: 0 };
  const one = fit(specify({ factors: 1, loadings: home.map((_, i) => [i, 0]) }, p), r, n);
  const three = fit(specify({ factors: 3, loadings: own }, p), r, n, [cov, cross]);
  const x7x8 = fit(specify({ factors: 3, loadings: own, covariances: [[cov.i, cov.j]] }, p), r, n);
  const x9 = fit(specify({ factors: 3, loadings: [...own, [cross.i, cross.f]] }, p), r, n);
  return {
    n,
    pairs: (p * (p - 1)) / 2,
    one,
    three: { ...three, mi: { x7x8: three.mi[0], x9: three.mi[1] } },
    x7x8: { ...x7x8, drop: three.chisq - x7x8.chisq },
    x9: { ...x9, drop: three.chisq - x9.chisq },
  };
}

export function shrink(result, digits = 6) {
  const round = (x) => (typeof x === 'number' && !Number.isInteger(x) ? Number(x.toFixed(digits)) : Array.isArray(x) ? x.map(round) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)])) : x);
  return round(result);
}

const bounded = (v) => {
  const k = Math.round(Number(Math.abs(v).toFixed(2)) * 100);
  return (v < 0 && k > 0 ? MINUS : '') + (k / 100).toFixed(2).replace(/^0/, '');
};
const fixed = (v) => (Math.round(v * 100) / 100).toFixed(2);
const residualText = (v) => (Math.abs(v) > 0.1 && bounded(Math.abs(v)) === '.10' ? (v < 0 ? MINUS : '') + Math.abs(v).toFixed(3).replace(/^0/, '') : bounded(v));

const keyOf = ({ model, path }) => (model === 'one' ? 'one' : path);
const modelOf = (state, result) => result[keyOf(state) === 'none' ? 'three' : keyOf(state)];

export const WIDE = {
  W: 1240, H: 556, X0: 16, BW: 120, g1: 12, g2: 28, BH: 52, BT: 326, OC: 176, rx: 64, ry: 27, OC1: 84, rx1: 76, ry1: 28,
  spread: 0.2576, spread1: 0.1, foot: 14, aIn: 26, aOut: 12, ahl: 9, ahh: 4, kIn: 48, kOut: 104, rbS: 40, rbTop: 28, rbR: 48, rbLeg: 40,
  cr: 21, cGap: 24, ecAng: 60, ecL: 30, NW: 40, ng: 8, nUp: 30, nLH: 18, lg: 7, tagW: 260, tLH: 20, tg: 6, tg2: 6, uTop: 450, resTop: 506, resGap: 22,
  num: 15, tag: 14, tagValue: 15, circle: 14, oval: 16, label: 14, labelLH: 18,
};

export const NARROW = {
  W: 940, H: 582, X0: 2, BW: 94, g1: 6, g2: 16, BH: 62, BT: 334, OC: 184, rx: 52, ry: 25, OC1: 88, rx1: 66, ry1: 27,
  spread: 0.3, spread1: 0.1, foot: 12, aIn: 22, aOut: 10, ahl: 9, ahh: 4, kIn: 48, kOut: 106, rbS: 36, rbTop: 32, rbR: 44, rbLeg: 34,
  cr: 22, cGap: 24, ecAng: 60, ecL: 30, NW: 44, ng: 8, nUp: 32, nLH: 20, lg: 7, tagW: 240, tLH: 22, tg: 6, tg2: 6, uTop: 470, resTop: 528, resGap: 24,
  num: 16, tag: 15, tagValue: 16, circle: 15, oval: 17, label: 15, labelLH: 20,
};

const r1 = (v) => Math.round(v * 10) / 10;
const pt = (x, y) => `${r1(x)} ${r1(y)}`;
const centers = (G) => Array.from({ length: 9 }, (_, i) => G.X0 + G.BW / 2 + i * (G.BW + G.g1) + Math.floor(i / 3) * (G.g2 - G.g1));
const percent = (v, total) => `${Math.round((v / total) * 1000000) / 10000}%`;

export function boxes(G) {
  return centers(G).map((x) => ({
    left: percent(x - G.BW / 2, G.W),
    top: percent(G.BT, G.H),
    width: percent(G.BW, G.W),
    height: percent(G.BH, G.H),
  }));
}

function arrow(sx, sy, tx, ty, w) {
  const len = Math.hypot(tx - sx, ty - sy);
  const ux = (tx - sx) / len;
  const uy = (ty - sy) / len;
  const hl = 10 + w;
  const hh = 3 + 0.7 * w;
  const bx = tx - ux * hl;
  const by = ty - uy * hl;
  const h = w / 2;
  return {
    d: `M${pt(sx - uy * h, sy + ux * h)}L${pt(bx - uy * h, by + ux * h)}L${pt(bx - uy * hh, by + ux * hh)}L${pt(tx, ty)}L${pt(bx + uy * hh, by - ux * hh)}L${pt(bx + uy * h, by - ux * h)}L${pt(sx + uy * h, sy - ux * h)}Z`,
    left: Math.max(0, tx - Math.min(bx - uy * hh, bx + uy * hh)),
    right: Math.max(0, Math.max(bx - uy * hh, bx + uy * hh) - tx),
  };
}

function head(tx, ty, ux, uy, hl, hh) {
  const bx = tx - ux * hl;
  const by = ty - uy * hl;
  return `M${pt(tx, ty)}L${pt(bx - uy * hh, by + ux * hh)}L${pt(bx + uy * hh, by - ux * hh)}Z`;
}

export function tree(G, state, result, factors, labels) {
  const key = keyOf(state);
  const M = modelOf(state, result);
  const one = key === 'one';
  const base = key === 'none';
  const cx = centers(G);
  const width = (v) => 1 + 5 * Math.abs(v);
  const ovals = one
    ? [{ cx: cx[4], cy: G.OC1, rx: G.rx1, ry: G.ry1, line: INK, tone: INK, name: 'General' }]
    : factors.map((factor, j) => ({ cx: cx[1 + 3 * j], cy: G.OC, rx: G.rx, ry: G.ry, line: LINES[j], tone: TONES[j], name: factor.name }));
  const edge = (o, dx, side) => o.cy + side * o.ry * Math.sqrt(1 - (dx / o.rx) * (dx / o.rx));
  const circle = G.BT + G.BH + G.cGap + G.cr;
  const fills = one ? [''] : ['', '', ''];
  const paths = { arcs: '', arcHeads: '', dash: '', dashHeads: '', free: '', freeHeads: '', freeWidth: 1.5, resid: '', residHeads: '' };
  const texts = [];
  const numberTop = G.BT - G.nUp;
  const number = (x, top, align, text, color = TEXT) => texts.push({ x, y: top + G.nLH / 2, align, text, size: G.num, color });

  for (let i = 0; i < 9; i++) {
    const js = one ? [0] : [0, 1, 2].filter((j) => M.loadings[i][j] !== 0);
    for (const j of js) {
      if (key === 'x9' && i === 8 && j === 0) continue;
      const o = ovals[one ? 0 : j];
      const v = M.loadings[i][j];
      const side = Math.sign(cx[i] - o.cx);
      const d = Math.max(-0.8 * o.rx, Math.min(0.8 * o.rx, (cx[i] - o.cx) * (one ? G.spread1 : G.spread)));
      const foot = cx[i] - side * G.foot;
      const a = arrow(o.cx + d, edge(o, d, 1) - 4, foot, G.BT, width(v));
      fills[one ? 0 : j] += a.d;
      if (side < 0) number(foot - a.left - G.ng, numberTop, 'end', bounded(v));
      else number(foot + a.right + G.ng, numberTop, 'start', bounded(v));
    }
  }

  if (!one) {
    const [ov, ob, os] = ovals;
    const arc = (x1, x2, dx, k, v) => {
      const tip = edge(ov, dx, -1);
      const yb = tip - G.ahl;
      paths.arcs += `M${pt(x1, yb)}C${pt(x1, yb - k)} ${pt(x2, yb - k)} ${pt(x2, yb)}`;
      paths.arcHeads += head(x1, tip, 0, 1, G.ahl, G.ahh) + head(x2, tip, 0, 1, G.ahl, G.ahh);
      number((x1 + x2) / 2, yb - 0.75 * k - G.lg - G.nLH, 'middle', bounded(v));
    };
    arc(ov.cx + G.aIn, ob.cx - G.aIn, G.aIn, G.kIn, M.phi[0][1]);
    arc(ob.cx + G.aIn, os.cx - G.aIn, G.aIn, G.kIn, M.phi[1][2]);
    arc(ov.cx - G.aOut, os.cx + G.aOut, G.aOut, G.kOut, M.phi[0][2]);
  }

  for (let i = 0; i < 9; i++) {
    paths.resid += `M${pt(cx[i], circle - G.cr + 3)}L${pt(cx[i], G.BT + G.BH + G.ahl)}`;
    paths.residHeads += head(cx[i], G.BT + G.BH, 0, -1, G.ahl, G.ahh);
  }

  const tags = [];
  if (base || key === 'x9') {
    const ov = ovals[0];
    const xs = ov.cx - G.rbS;
    const ys = edge(ov, G.rbS, -1) + 4;
    const xe = cx[8] + G.rbLeg;
    const yt = G.rbTop;
    const w = base ? 1.5 : width(M.loadings[8][0]);
    const hl = base ? G.ahl : 10 + w;
    const hh = base ? G.ahh : 3 + 0.7 * w;
    const d = `M${pt(xs, ys)}L${pt(xs, yt + G.rbR)}Q${pt(xs, yt)} ${pt(xs + G.rbR, yt)}L${pt(xe - G.rbR, yt)}Q${pt(xe, yt)} ${pt(xe, yt + G.rbR)}L${pt(xe, G.BT - hl)}`;
    if (base) {
      paths.dash += d;
      paths.dashHeads += head(xe, G.BT, 0, 1, hl, hh);
      tags.push({ x: xe, y: yt - G.tg - G.tLH / 2, align: 'end', value: fixed(M.mi.x9) });
    } else {
      paths.free += d;
      paths.freeWidth = r1(w);
      paths.freeHeads += head(xe, G.BT, 0, 1, hl, hh);
      number(xe + hh + G.ng, numberTop, 'start', bounded(M.loadings[8][0]), FREE_TEXT);
    }
  }

  if (base || key === 'x7x8') {
    const w = base ? 1.5 : width(M.err);
    const hl = base ? G.ahl : 10 + w;
    const hh = base ? G.ahh : 3 + 0.7 * w;
    const ca = Math.cos((G.ecAng * Math.PI) / 180);
    const sa = Math.sin((G.ecAng * Math.PI) / 180);
    const t0 = [cx[6] + G.cr * ca, circle + G.cr * sa];
    const t3 = [cx[7] - G.cr * ca, circle + G.cr * sa];
    const b0 = [t0[0] + hl * ca, t0[1] + hl * sa];
    const b3 = [t3[0] - hl * ca, t3[1] + hl * sa];
    const c1 = [b0[0] + G.ecL * ca, b0[1] + G.ecL * sa];
    const c2 = [b3[0] - G.ecL * ca, b3[1] + G.ecL * sa];
    const d = `M${pt(b0[0], b0[1])}C${pt(c1[0], c1[1])} ${pt(c2[0], c2[1])} ${pt(b3[0], b3[1])}`;
    const heads = head(t0[0], t0[1], -ca, -sa, hl, hh) + head(t3[0], t3[1], ca, -sa, hl, hh);
    const dip = b0[1] + 0.75 * (c1[1] - b0[1]) + w / 2;
    const mid = (cx[6] + cx[7]) / 2;
    if (base) {
      paths.dash += d;
      paths.dashHeads += heads;
      tags.push({ x: mid, y: dip + G.tg2 + G.tLH / 2, align: 'middle', value: fixed(M.mi.x7x8) });
    } else {
      paths.free += d;
      paths.freeWidth = r1(w);
      paths.freeHeads += heads;
      number(mid, dip + G.tg2, 'middle', bounded(M.err), FREE_TEXT);
    }
  }

  const picked = state.test;
  const rows = [];
  if (picked !== null) {
    rows.push({ x: G.X0, y: G.resTop + G.labelLH / 2, align: 'start', text: `Residual correlations with ${labels[picked]}`, size: G.label });
    for (let j = 0; j < 9; j++) {
      if (j === picked) continue;
      const v = M.residual[picked][j];
      rows.push({ x: cx[j], y: G.resTop + G.resGap + G.nLH / 2, align: 'middle', text: residualText(v), size: G.num, bold: Math.abs(v) > 0.1 });
    }
  }

  return {
    paths,
    fills: one ? [{ d: fills[0], color: INK }] : fills.map((d, j) => ({ d, color: LINES[j] })),
    ovals,
    circles: cx.map((x, i) => ({ cx: x, cy: circle, text: bounded(M.u[i]) })),
    texts: [...texts, ...rows, { x: G.X0, y: G.uTop + G.labelLH / 2, align: 'start', text: 'unique variance', size: G.label, color: MUTED }],
    tags,
  };
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function markup(G, d) {
  const path = (value, attrs) => (value ? `<path d="${value}" ${attrs}></path>` : '');
  const anchor = (align) => `text-anchor="${align}"`;
  return [
    path(d.paths.arcs, `fill="none" stroke="${INK}" stroke-width="1.5"`),
    path(d.paths.arcHeads, `fill="${INK}"`),
    path(d.paths.dash, `fill="none" stroke="${INK}" stroke-width="1.5" stroke-dasharray="6 5"`),
    path(d.paths.dashHeads, `fill="${INK}"`),
    path(d.paths.free, `fill="none" stroke="${FREE}" stroke-width="${d.paths.freeWidth}"`),
    path(d.paths.freeHeads, `fill="${FREE}"`),
    ...d.fills.map((f) => path(f.d, `fill="${f.color}"`)),
    path(d.paths.resid, `fill="none" stroke="${INK}" stroke-width="1.25"`),
    path(d.paths.residHeads, `fill="${INK}"`),
    ...d.ovals.map((o) => `<ellipse cx="${r1(o.cx)}" cy="${r1(o.cy)}" rx="${o.rx - 1}" ry="${o.ry - 1}" fill="#ffffff" stroke="${o.line}" stroke-width="2"></ellipse><text x="${r1(o.cx)}" y="${r1(o.cy)}" text-anchor="middle" dominant-baseline="central" font-size="${G.oval}" font-weight="700" fill="${o.tone}">${escape(o.name)}</text>`),
    ...d.circles.map((c) => `<circle cx="${r1(c.cx)}" cy="${r1(c.cy)}" r="${G.cr - 0.75}" fill="#ffffff" stroke="${INK}" stroke-width="1.5"></circle><text x="${r1(c.cx)}" y="${r1(c.cy)}" text-anchor="middle" dominant-baseline="central" font-size="${G.circle}" fill="${TEXT}">${c.text}</text>`),
    ...d.texts.map((t) => `<text x="${r1(t.x)}" y="${r1(t.y)}" ${anchor(t.align)} dominant-baseline="central" font-size="${t.size}"${t.bold ? ' font-weight="700"' : ''} fill="${t.color ?? TEXT}">${escape(t.text)}</text>`),
    ...d.tags.map((t) => `<text x="${r1(t.x)}" y="${r1(t.y)}" ${anchor(t.align)} dominant-baseline="central" font-size="${G.tag}" fill="${TEXT}"><tspan font-size="${G.tagValue}" font-weight="700">${t.value}</tspan> modification index</text>`),
  ].join('');
}

export function fitText(state, result) {
  const M = modelOf(state, result);
  return {
    chi: fixed(M.chisq),
    df: String(M.df),
    p: M.p < 0.001 ? '< .001' : `= ${bounded(M.p)}`,
    cfi: bounded(M.cfi),
    tli: bounded(M.tli),
    rmsea: bounded(M.rmsea),
    ci: `90% CI ${bounded(M.lower)} to ${bounded(M.upper)}`,
    srmr: bounded(M.srmr),
    over: `${M.over} of ${result.pairs}`,
    largest: `largest ${bounded(M.largest.r)}`,
  };
}

export const hint = (state) => {
  if (state.test !== null) return 'Pick the same test again to clear it.';
  if (state.model === 'three' && state.path !== 'none') return 'The two paths fit about equally well, so the choice rests on meaning. Pick a test to see its numbers.';
  return 'Thicker arrows carry larger loadings. Pick a test to see its numbers.';
};

export const status = (state) => (state.model === 'one' ? 'A rival, stated in advance' : state.path === 'none' ? 'The hypothesis, stated in advance' : 'Exploratory now, needs new data');

const loadsOf = (M, i, one, names) => {
  if (one) return `loads ${bounded(M.loadings[i][0])} on the single factor`;
  return `loads ${[0, 1, 2]
    .filter((j) => M.loadings[i][j] !== 0)
    .map((j) => `${bounded(M.loadings[i][j])} on ${names[j]}`)
    .join(' and ')}`;
};

export function boxLabel(state, result, labels, factors, i) {
  const M = modelOf(state, result);
  return `${labels[i]}, ${loadsOf(M, i, state.model === 'one', factors.map((f) => f.name))}, unique variance ${bounded(M.u[i])}`;
}

export function diagramLabel(state, result, labels, factors) {
  const key = keyOf(state);
  const M = modelOf(state, result);
  const names = factors.map((f) => f.name);
  if (key === 'one') return `Path diagram of the one-factor model. A single factor points to all nine tests, with loadings ${labels.map((t, i) => `${t} ${bounded(M.loadings[i][0])}`).join(', ')}. Each test has its own unique variance.`;
  const parts = [0, 1, 2].map((j) => `${names[j]} points to ${labels.map((t, i) => ({ t, i })).filter((q) => M.loadings[q.i][j] !== 0).map((q) => `${q.t} ${bounded(M.loadings[q.i][j])}`).join(', ')}.`);
  const extra =
    key === 'x7x8'
      ? `The freed error correlation of Addition with Counting dots is ${bounded(M.err)}.`
      : key === 'x9'
        ? `The freed loading of Straight and curved capitals on Visual is ${bounded(M.loadings[8][0])}.`
        : `Dashed paths mark the two largest modification indices, Addition with Counting dots ${fixed(M.mi.x7x8)} and Straight and curved capitals on Visual ${fixed(M.mi.x9)}.`;
  return `Path diagram of the three-factor model. ${parts.join(' ')} Factor correlations are Visual with Verbal ${bounded(M.phi[0][1])}, Visual with Speed ${bounded(M.phi[0][2])} and Verbal with Speed ${bounded(M.phi[1][2])}. Every other loading is fixed at zero. ${extra}`;
}

export function narrate(state, result, labels, factors) {
  const key = keyOf(state);
  const M = modelOf(state, result);
  const names = factors.map((f) => f.name);
  const one = key === 'one';
  const test = state.test;
  if (test === null) {
    const L = M.largest;
    if (one) return `One factor puts all nine tests on a single ability, a simpler rival to three factors. It fits far worse, with chi-square ${fixed(M.chisq)} on ${M.df} df and RMSEA ${bounded(M.rmsea)}. It leaves ${M.over} of the ${result.pairs} residual correlations over .10, the largest ${bounded(L.r)} for ${labels[L.a]} with ${labels[L.b]}.`;
    if (key === 'none') return `Each test has an arrow from one factor only, and the 18 missing arrows are fixed at zero. Chi-square is ${fixed(M.chisq)} on ${M.df} df, p < .001, and Jöreskog (1969) rejected the same model. The two dashed paths nearly tie, with modification indices of ${fixed(M.mi.x7x8)} and ${fixed(M.mi.x9)}.`;
    if (key === 'x7x8') return `${labels[6]} and ${labels[7]} now share an error correlation of ${bounded(M.err)}, and chi-square drops by ${fixed(M.drop)} to ${fixed(M.chisq)}. ${names[2]} rests almost entirely on ${labels[8]}, which loads ${bounded(M.loadings[8][2])}. This path came from the data, so the model is now exploratory and needs new data.`;
    return `${labels[8]} now loads ${bounded(M.loadings[8][0])} on ${names[0]} and ${bounded(M.loadings[8][2])} on ${names[2]}, and chi-square drops by ${fixed(M.drop)} to ${fixed(M.chisq)}. Jöreskog (1969) chose this kind of path because the test asks children to break letters into straight and curved lines. This path came from the data, so the model is now exploratory and needs new data.`;
  }
  const i = test;
  const js = one ? [0] : [0, 1, 2].filter((j) => M.loadings[i][j] !== 0);
  const home = js.length === 1 && !one ? js[0] : null;
  let a;
  if (one) a = `${labels[i]} loads ${bounded(M.loadings[i][0])} on the single factor.`;
  else if (key === 'x7x8' && (i === 6 || i === 7)) a = `${labels[i]} loads ${bounded(M.loadings[i][2])} on ${names[2]}, and its error correlation with ${labels[13 - i]} is ${bounded(M.err)}.`;
  else if (js.length === 2) a = `${labels[i]} loads ${bounded(M.loadings[i][js[0]])} on ${names[js[0]]} and ${bounded(M.loadings[i][js[1]])} on ${names[js[1]]}, and its arrow from ${names[[0, 1, 2].find((j) => !js.includes(j))]} is fixed at zero.`;
  else {
    const rest = [0, 1, 2].filter((j) => j !== home);
    a = `${labels[i]} loads ${bounded(M.loadings[i][home])} on ${names[home]}, and its arrows from ${names[rest[0]]} and ${names[rest[1]]} are fixed at zero.`;
  }
  const who = one ? 'The factor explains' : js.length === 2 ? 'The two factors explain' : `${names[home]} explains`;
  const b = `${who} ${bounded(M.r2[i])} of its variance, and ${bounded(M.u[i])} is its own.`;
  const pairs = M.residual[i].map((r, j) => ({ r, j })).filter((q) => q.j !== i).sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const over = pairs.filter((q) => Math.abs(q.r) > 0.1);
  let c;
  if (over.length === 0 && bounded(Math.abs(pairs[0].r)) === '.10') c = `None of its eight residual correlations is over .10, though ${bounded(pairs[0].r)} with ${labels[pairs[0].j]} comes close.`;
  else if (over.length === 0) c = `None of its eight residual correlations is over .10, and the largest is ${bounded(pairs[0].r)} with ${labels[pairs[0].j]}.`;
  else if (over.length === 1 && bounded(Math.abs(over[0].r)) === '.10') c = `One of its eight residual correlations, with ${labels[over[0].j]}, is just over .10.`;
  else if (over.length === 1) c = `One of its eight residual correlations is over .10, ${bounded(over[0].r)} with ${labels[over[0].j]}.`;
  else c = `${WORDS[over.length]} of its eight residual correlations are over .10, the largest ${bounded(over[0].r)} with ${labels[over[0].j]}.`;
  return `${a} ${b} ${c}`;
}
