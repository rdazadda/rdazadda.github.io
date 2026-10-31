import { formatAlpha, formatEffect, formatPercent, formatPower, minus, pNumber } from './narration.js';
import { chiSquare, fisherF, normal, studentT } from './distributions.js';

export const FAMILIES = [
  { id: 'z', label: 'z test' },
  { id: 't', label: 't test' },
  { id: 'chi', label: 'χ² test' },
  { id: 'f', label: 'F test' },
];

export const LOGICS = [
  { id: 'fisher', label: 'Fisher, 1925', question: 'How strong is the evidence against H₀?' },
  { id: 'np', label: 'Neyman and Pearson, 1933', question: 'Which hypothesis should we act on?' },
  { id: 'nhst', label: 'Null hypothesis significance testing (NHST)', question: 'The mix of both that most papers use' },
];

export const TAILS = [
  { id: 'two', label: 'Two' },
  { id: 'upper', label: 'Upper' },
  { id: 'lower', label: 'Lower' },
];

export const POPULATIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'unequal', label: 'Unequal spreads' },
  { id: 'skewed', label: 'Skewed' },
];

export const STUDIES = 1000;

export const START = {
  family: 't',
  logic: 'fisher',
  step: 'plan',
  population: 'normal',
  alpha: 0.05,
  tails: 'two',
  peeked: false,
  n: 26,
  k: 3,
  df1: 2,
  df2: 27,
  statistic: { d: 0.624, chi: 9, f: 4 },
  effect: { d: 0.8, chi: 11, f: 11 },
};

const GOOD = 0.8;

export const copy = (s) => ({ ...s, statistic: { ...s.statistic }, effect: { ...s.effect } });

export const symmetric = (s) => s.family === 'z' || s.family === 't';
export const slot = (s) => (symmetric(s) ? 'd' : s.family);
export const twoTailed = (s) => symmetric(s) && s.tails === 'two';
const lower = (s) => symmetric(s) && s.tails === 'lower';
const df = (s) => 2 * s.n - 2;
export const scale = (s) => Math.sqrt(s.n / 2);
export const symbol = (s) => ({ z: 'z', t: 't', chi: 'χ²', f: 'F' })[s.family];
export const named = (s) => ({ z: 'z', t: `t(${df(s)})`, chi: `χ²(${s.k})`, f: `F(${s.df1}, ${s.df2})` })[s.family];
export const observed = (s) => (symmetric(s) ? s.statistic.d * scale(s) : s.statistic[s.family]);
export const effect = (s) => (symmetric(s) ? s.effect.d * scale(s) : s.effect[s.family]);
const planning = (s) => s.logic === 'np' && s.step === 'plan';
export const showsData = (s) => !planning(s);
export const showsRule = (s) => s.logic !== 'fisher';
export const showsAlternative = (s) => s.logic === 'np';
export const showsP = (s) => s.logic !== 'np';
export const showsInterval = (s) => symmetric(s) && showsData(s);

const cache = new Map();
function remember(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function h0(s) {
  if (s.family === 'z') return remember('z', () => normal());
  if (s.family === 't') return remember(`t ${df(s)}`, () => studentT(df(s)));
  if (s.family === 'chi') return remember(`chi ${s.k}`, () => chiSquare(s.k));
  return remember(`f ${s.df1} ${s.df2}`, () => fisherF(s.df1, s.df2));
}

export function h1(s) {
  const e = effect(s);
  if (s.family === 'z') return remember(`z ${e}`, () => normal(e));
  if (s.family === 't') return remember(`t ${df(s)} ${e}`, () => studentT(df(s), e));
  if (s.family === 'chi') return remember(`chi ${s.k} ${e}`, () => chiSquare(s.k, e));
  return remember(`f ${s.df1} ${s.df2} ${e}`, () => fisherF(s.df1, s.df2, e));
}

function reach(s, alpha) {
  const d = h0(s);
  if (!symmetric(s)) return d.quantile(1 - alpha);
  return d.quantile(s.tails === 'two' ? 1 - alpha / 2 : 1 - alpha);
}

export const critical = (s) => reach(s, s.alpha);

export function edges(s) {
  const c = critical(s);
  if (twoTailed(s)) return [-c, c];
  return [lower(s) ? -c : c];
}

export function pValue(s, x = observed(s)) {
  const d = h0(s);
  if (twoTailed(s)) return Math.min(1, 2 * (1 - d.cdf(Math.abs(x))));
  if (lower(s)) return d.cdf(x);
  return 1 - d.cdf(x);
}

export function power(s) {
  const d = h1(s);
  const c = critical(s);
  if (twoTailed(s)) return 1 - d.cdf(c) + d.cdf(-c);
  if (lower(s)) return d.cdf(-c);
  return 1 - d.cdf(c);
}

const level = (s) => (s.logic === 'fisher' ? 0.05 : s.alpha);
export const intervalName = (s) => `${Number((100 * (1 - level(s))).toFixed(1))}% confidence interval`;

function shift(s, x, target) {
  const at = (delta) => studentT(df(s), delta).cdf(x);
  let lo = x - 1;
  let hi = x + 1;
  for (let step = 2; at(lo) <= target; step *= 2) lo -= step;
  for (let step = 2; at(hi) >= target; step *= 2) hi += step;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function interval(s) {
  const x = observed(s);
  const a = level(s);
  const side = s.tails === 'two' ? a / 2 : a;
  const r = s.family === 't' ? 0 : reach(s, a);
  const low = () => (s.family === 't' ? shift(s, x, 1 - side) : x - r);
  const high = () => (s.family === 't' ? shift(s, x, side) : x + r);
  return [lower(s) ? -Infinity : low(), s.tails === 'upper' ? Infinity : high()];
}

function intervalText(s) {
  const [a, b] = interval(s).map((v) => v / scale(s));
  if (a === -Infinity) return `${formatEffect(b)} or less`;
  if (b === Infinity) return `${formatEffect(a)} or more`;
  return `${formatEffect(a)} to ${formatEffect(b)}`;
}

const rejects = (s) => pValue(s) <= s.alpha;

function verdict(s) {
  if (rejects(s)) return 'reject';
  return power(s) >= GOOD ? 'accept' : 'none';
}

export const number = (v) => minus(v.toFixed(2));
const pShort = (p) => (p > 0.999 ? '> .999' : pNumber(p));
export const pText = (p) => (p < 0.001 ? 'p < .001' : p > 0.999 ? 'p > .999' : `p = ${pNumber(p)}`);
export const powerText = (s) => formatPower(power(s), GOOD);
const cutText = (s) => (twoTailed(s) ? `±${critical(s).toFixed(2)}` : number(edges(s)[0]));
const result = (s) => `${named(s)} = ${number(observed(s))}`;
const tailName = (s) => (twoTailed(s) ? 'Both tails' : lower(s) ? 'Lower tail' : 'Upper tail');

function share(p) {
  if (p < 0.001) return 'fewer than 1 in 1,000 studies';
  if (p >= 0.995) return 'nearly all studies';
  return `${p < 0.1 ? Number((100 * p).toFixed(1)) : Math.round(100 * p)}% of studies`;
}

function extreme(s) {
  if (twoTailed(s)) return `a ${named(s)} at least ${number(Math.abs(observed(s)))} from zero`;
  return `a ${named(s)} of ${number(observed(s))} or ${lower(s) ? 'less' : 'more'}`;
}

export function narrate(s) {
  const p = pValue(s);
  if (s.logic === 'fisher') {
    return `If H₀ were true, ${extreme(s)} would turn up in ${share(p)}. That share is the p value. Fisher read it as evidence against H₀, stronger as p gets smaller.`;
  }
  if (s.logic === 'np') {
    const miss = formatPercent(1 - power(s));
    if (planning(s)) {
      return `Neyman and Pearson fix the rule before any data. Reject H₀ if ${named(s)} lands beyond ${cutText(s)}. In the long run, that wrongly rejects a true H₀ in ${formatPercent(s.alpha)} of studies and misses an effect like H₁ in ${miss}.`;
    }
    const v = verdict(s);
    if (v === 'reject') return `${result(s)} lands beyond ${cutText(s)}, so the rule says reject H₀ and act as if H₁ is true. Its error rates describe many studies, not this one.`;
    if (v === 'accept') return `${result(s)} stays inside the cut-off, so the rule says accept H₀ and act as if it is true. That is not proof, since the rule misses an effect like H₁ in ${miss} of studies.`;
    return `${result(s)} stays inside the cut-off, but power is only ${powerText(s)}. Accepting H₀ needs good power, so the rule says conclude nothing.`;
  }
  return `Most papers today would report ${result(s)}, ${pText(p)}, compare p with α = ${formatAlpha(s.alpha)}, and call the result ${rejects(s) ? 'significant' : 'not significant'}. That joins Fisher’s evidence from one study to Neyman and Pearson’s rule for many studies, a mix neither side would accept.`;
}

export function reading(s) {
  const p = pValue(s);
  if (s.logic === 'fisher') {
    return { name: 'p value', value: pShort(p), line: `If H₀ were true, results at least this extreme would turn up in ${share(p)}.` };
  }
  if (s.logic === 'np') {
    if (planning(s)) return { name: 'The rule', line: `Reject H₀ if ${named(s)} lands beyond ${cutText(s)}. The data come next, in step 2.` };
    const v = verdict(s);
    const tags = { reject: 'Reject H₀', accept: 'Accept H₀', none: 'No conclusion' };
    const lines = {
      reject: 'Act as if H₁ is true.',
      accept: 'Act as if H₀ is true. This is not proof that it is.',
      none: 'Power is below 80%, too low to accept H₀.',
    };
    return { name: 'Decision', tag: tags[v], kind: v, line: lines[v] };
  }
  return {
    name: 'p value',
    value: pShort(p),
    tag: rejects(s) ? 'Significant' : 'Not significant',
    kind: rejects(s) ? 'reject' : 'none',
    line: rejects(s) ? 'Significant does not mean H₁ is true, or that the effect is large.' : 'Not significant does not mean H₀ is true.',
  };
}

export function tailNote(s) {
  if (!s.peeked || s.logic === 'np' || !symmetric(s) || twoTailed(s)) return '';
  if (lower(s) ? observed(s) >= 0 : observed(s) <= 0) return '';
  if (s.logic === 'fisher') return 'Choosing the tail after seeing the data halves p, so the evidence looks stronger than it is.';
  return `Choosing the tail after seeing the data doubles the real α, from ${formatPercent(s.alpha)} to ${formatPercent(2 * s.alpha)}.`;
}

export function longRun(s) {
  if (s.logic !== 'np') return '';
  const wrong = Math.round(100 * s.alpha);
  const found = Math.round(100 * power(s));
  return `In 100 studies run this way, about ${wrong} would reject a true H₀ by mistake. If H₁ is true, about ${found} would find the effect and ${100 - found} would miss it.`;
}

export const piecesNote = 'The p value describes this one study. The α describes a rule over many studies.';

export function pieces(s) {
  if (s.logic !== 'nhst') return [];
  return [
    [`${result(s)}, ${pText(pValue(s))}`, 'Fisher'],
    [`α = ${formatAlpha(s.alpha)}`, 'Neyman and Pearson'],
    [rejects(s) ? 'Significant' : 'Not significant', 'Both, mixed'],
  ];
}

export function facts(s) {
  const span = showsInterval(s) ? [[intervalName(s), intervalText(s)]] : [];
  if (s.logic === 'fisher') {
    return [
      [`Observed ${named(s)}`, number(observed(s))],
      ['Tail area counted', tailName(s)],
      ...span,
    ];
  }
  if (s.logic === 'np') {
    return [
      ['α, fixed before the data', formatAlpha(s.alpha)],
      ['Critical value', cutText(s)],
      ['Power if H₁ is true', powerText(s)],
      ...span,
    ];
  }
  return [
    [`Observed ${named(s)}`, number(observed(s))],
    ['α, by convention', formatAlpha(s.alpha)],
    ['Critical value', cutText(s)],
    ...span,
  ];
}

const population = (s) => (s.family === 't' ? s.population : 'normal');
const COUNTED = 1000;

export function studyKey(s) {
  if (symmetric(s)) return `${s.family} ${population(s)} ${s.n}`;
  return s.family === 'chi' ? `chi ${s.k}` : `f ${s.df1} ${s.df2}`;
}

function groupSizes(s) {
  const small = Math.max(2, Math.round((2 * s.n) / 3));
  return [small, 2 * s.n - small];
}

function source(seed) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  return { uniform, normal };
}

function sample(draw, n) {
  let sum = 0;
  let squares = 0;
  for (let i = 0; i < n; i++) {
    const x = draw();
    sum += x;
    squares += x * x;
  }
  const mean = sum / n;
  return { n, mean, ss: Math.max(0, squares - n * mean * mean) };
}

function study(s, { uniform, normal }) {
  if (s.family === 'z') return (sample(normal, s.n).mean - sample(normal, s.n).mean) / Math.sqrt(2 / s.n);
  if (s.family === 't') {
    const draw = population(s) === 'skewed' ? () => (uniform() < 0.2 ? 0 : Math.exp(1.2 * normal())) : normal;
    const [small, large] = groupSizes(s);
    const [a, b] = population(s) === 'unequal' ? [sample(() => 2 * normal(), small), sample(normal, large)] : [sample(draw, s.n), sample(draw, s.n)];
    const pooled = (a.ss + b.ss) / (a.n + b.n - 2);
    const t = (a.mean - b.mean) / Math.sqrt(pooled * (1 / a.n + 1 / b.n));
    return Number.isFinite(t) ? t : 0;
  }
  if (s.family === 'chi') {
    const groups = s.k + 1;
    const counts = new Array(groups).fill(0);
    for (let i = 0; i < COUNTED; i++) counts[Math.floor(uniform() * groups)] += 1;
    const expected = COUNTED / groups;
    return counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
  }
  const groups = s.df1 + 1;
  const total = s.df1 + s.df2 + 1;
  const samples = Array.from({ length: groups }, (_, i) => sample(normal, Math.floor(total / groups) + (i < total % groups ? 1 : 0)));
  const grand = samples.reduce((sum, g) => sum + g.n * g.mean, 0) / total;
  const between = samples.reduce((sum, g) => sum + g.n * (g.mean - grand) ** 2, 0);
  const within = samples.reduce((sum, g) => sum + g.ss, 0);
  return between / s.df1 / (within / s.df2);
}

export function simulate(s, seed) {
  const draws = source(seed);
  return Array.from({ length: STUDIES }, () => study(s, draws));
}

export function studyText(s) {
  const n = s.n.toLocaleString('en-US');
  if (s.family === 'z') return `Each study draws two groups of ${n} from one normal population with a known spread.`;
  if (s.family === 'chi') return `Each study sorts ${COUNTED.toLocaleString('en-US')} people into ${s.k + 1} groups that are equally likely.`;
  if (s.family === 'f') return `Each study draws ${s.df1 + 1} groups, ${s.df1 + s.df2 + 1} people in all, from one normal population.`;
  const kind = population(s);
  if (kind === 'unequal') {
    const [small, large] = groupSizes(s).map((v) => v.toLocaleString('en-US'));
    return `Each study draws ${small} people with a wide spread and ${large} with a narrow one. Both groups have the same mean.`;
  }
  if (kind === 'skewed') return `Each study draws two groups of ${n} from one skewed population with a long right tail.`;
  return `Each study draws two groups of ${n} from one normal population.`;
}

export function hitTest(s) {
  const fisher = s.logic === 'fisher';
  const edge = fisher ? observed(s) : critical(s);
  if (twoTailed(s)) return (v) => Math.abs(v) >= Math.abs(edge);
  if (!lower(s)) return (v) => v >= edge;
  const cut = fisher ? edge : -edge;
  return (v) => v <= cut;
}

const percent = (r) => `${Number((100 * r).toFixed(1))}%`;

export function simulationText(s, values) {
  if (!values.length) return '';
  const hits = values.filter(hitTest(s)).length;
  const counted = `${hits.toLocaleString('en-US')} of ${values.length.toLocaleString('en-US')} studies`;
  if (s.logic === 'fisher') {
    const p = pValue(s);
    return `${counted} gave a result at least this extreme, ${percent(hits / values.length)}. The curve says ${p < 0.001 ? 'less than 0.1%' : percent(p)}.`;
  }
  return `${counted} landed beyond the cut-off, ${percent(hits / values.length)}. The curve says ${formatPercent(s.alpha)}.`;
}

const pItalic = (p) => `<i>p</i> ${p < 0.001 ? '< .001' : p > 0.999 ? '> .999' : `= ${pNumber(p)}`}`;
const statistic = (s) => ({ z: '<i>z</i>', t: `<i>t</i>(${df(s)})`, chi: `χ²(${s.k})`, f: `<i>F</i>(${s.df1}, ${s.df2})` })[s.family];

function confidence(s) {
  const [a, b] = interval(s).map((v) => v / scale(s));
  const low = a === -Infinity ? '(−∞' : `[${formatEffect(a)}`;
  const high = b === Infinity ? '∞)' : `${formatEffect(b)}]`;
  return `${Number((100 * (1 - level(s))).toFixed(1))}% CI ${low}, ${high}`;
}

export function report(s) {
  const np = s.logic === 'np';
  const people = s.n.toLocaleString('en-US');
  const found = `${statistic(s)} = ${number(observed(s))}${np ? '' : `, ${pItalic(pValue(s))}`}`;
  const sentences = [];
  if (np && symmetric(s)) sentences.push(`Before collecting data, we set α = ${formatAlpha(s.alpha)} and planned ${people} people per group, which gives ${powerText(s)} power to detect <i>d</i> = ${s.effect.d.toFixed(2)} [the reason for this effect size].`);
  else if (np) sentences.push(`Before collecting data, we set α = ${formatAlpha(s.alpha)}, which gives ${powerText(s)} power for [the effect we expect].`);
  if (symmetric(s)) {
    const tail = twoTailed(s) ? 'a two-tailed' : 'a one-tailed';
    const side = twoTailed(s) ? '' : ` of whether [group 1] scores ${lower(s) ? 'lower' : 'higher'}, chosen before the data because [the reason]`;
    sentences.push(`We compared [the outcome] between [group 1] and [group 2]${np ? '' : `, with ${people} people in each group,`} using ${tail} <i>${s.family}</i> test${side}.`);
    if (s.family === 'z') sentences.push('The SD of [the outcome] was known to be [the value].');
    sentences.push(`The difference was <i>d</i> = ${formatEffect(s.statistic.d)}, ${confidence(s)}, ${found}.`);
  } else if (s.family === 'chi') {
    sentences.push(`We compared the counts in ${s.k + 1} categories with [the expected shares], using a χ² test.`);
    sentences.push(`The result was ${found}, [an effect size, such as Cohen’s <i>w</i>, with its CI].`);
  } else {
    sentences.push(`We compared [the outcome] across ${s.df1 + 1} groups, ${s.df1 + s.df2 + 1} people in all, using a one-way ANOVA.`);
    sentences.push(`The result was ${found}, [an effect size, such as η², with its CI].`);
  }
  if (np) {
    const v = verdict(s);
    if (v === 'reject') sentences.push(`This lies beyond the critical value of ${cutText(s)}, so we reject H₀.`);
    else if (v === 'accept') sentences.push(`This lies inside the critical value of ${cutText(s)}, so with ${powerText(s)} power we accept H₀.`);
    else sentences.push(`This lies inside the critical value of ${cutText(s)}, and with only ${powerText(s)} power we draw no conclusion.`);
  }
  return sentences.join(' ');
}

export const evidence = (p) => Math.min(1, Math.max(0, Math.log10(1 / Math.max(p, 0.001)) / 3));
