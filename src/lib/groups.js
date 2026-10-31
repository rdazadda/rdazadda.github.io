import { formatAlpha, formatPercent, formatPower } from './narration.js';
import { N_LIMIT, count, firstPassing } from './planning.js';
import { incompleteBeta, lnGamma, tCritical } from './sampling.js';
import { power } from './t-test.js';

export const DESIGNS = [
  { id: 'three', label: 'Three groups' },
  { id: 'four', label: 'Four groups' },
  { id: 'factorial', label: 'Two by two' },
];

export const MEANS = {
  three: [2, 1.5, 1],
  four: [2, 1.5, 1.5, 1],
  factorial: [2, 1, 1, 1],
};

const PLANS = { three: ['overall'], four: ['overall'], factorial: ['ab'] };

export const START = {
  design: 'three',
  means: MEANS.three,
  sd: 2,
  target: 0.8,
  alpha: 0.05,
  correct: false,
  dropout: 0.1,
  plan: PLANS.three,
  n: 79,
  fixed: false,
};

export const planFor = (design) => PLANS[design];
export const isFactorial = (s) => s.design === 'factorial';
export const names = (s) => (isFactorial(s) ? ['A1 B1', 'A1 B2', 'A2 B1', 'A2 B2'] : s.means.map((_, i) => `Group ${i + 1}`));

const tCriticals = new Map();
const fCriticals = new Map();

function tCut(alpha, df) {
  const key = `${alpha} ${df}`;
  if (!tCriticals.has(key)) tCriticals.set(key, tCritical(alpha / 2, df));
  return tCriticals.get(key);
}

function fCut(alpha, d1, d2) {
  const key = `${alpha} ${d1} ${d2}`;
  if (!fCriticals.has(key)) {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (incompleteBeta(mid, d1 / 2, d2 / 2) < 1 - alpha) lo = mid;
      else hi = mid;
    }
    fCriticals.set(key, (lo + hi) / 2);
  }
  return fCriticals.get(key);
}

function fPower(lambda, d1, d2, alpha) {
  const y = fCut(alpha, d1, d2);
  const m = lambda / 2;
  if (m < 1e-12) return alpha;
  const spread = 12 * Math.sqrt(m) + 10;
  let total = 0;
  for (let j = Math.max(0, Math.floor(m - spread)); j <= Math.ceil(m + spread); j++) {
    const weight = Math.exp(-m + j * Math.log(m) - lnGamma(j + 1));
    total += weight * (1 - incompleteBeta(y, d1 / 2 + j, d2 / 2));
  }
  return total;
}

function cellEffects(means) {
  const [a1b1, a1b2, a2b1, a2b2] = means;
  const grand = (a1b1 + a1b2 + a2b1 + a2b2) / 4;
  const a = [(a1b1 + a1b2) / 2 - grand, (a2b1 + a2b2) / 2 - grand];
  const b = [(a1b1 + a2b1) / 2 - grand, (a1b2 + a2b2) / 2 - grand];
  const ab = [a1b1, a1b2, a2b1, a2b2].map((m, i) => m - grand - a[i >> 1] - b[i & 1]);
  return { a: [a[0], a[0], a[1], a[1]], b: [b[0], b[1], b[0], b[1]], ab };
}

const squares = (values) => values.reduce((sum, v) => sum + v * v, 0);

export function tests(s) {
  const label = names(s);
  const k = s.means.length;
  const ftest = (id, name, phrase, effects, d1) => ({ id, name, phrase, kind: 'F', size: squares(effects) / (s.sd * s.sd), d1 });
  const contrast = (id, name, phrase, diff) => ({ id, name, phrase, kind: 't', size: Math.abs(diff) / s.sd });
  if (isFactorial(s)) {
    const { a, b, ab } = cellEffects(s.means);
    return [
      ftest('a', 'Main effect of A', 'the main effect of A', a, 1),
      ftest('b', 'Main effect of B', 'the main effect of B', b, 1),
      ftest('ab', 'Interaction', 'the interaction', ab, 1),
      contrast('b1', 'B at A1', 'B at A1', s.means[1] - s.means[0]),
      contrast('b2', 'B at A2', 'B at A2', s.means[3] - s.means[2]),
    ];
  }
  const grand = s.means.reduce((sum, v) => sum + v, 0) / k;
  const list = [ftest('overall', 'Overall test', 'the overall test', s.means.map((v) => v - grand), k - 1)];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) list.push(contrast(`p${i}${j}`, `${label[i]} vs ${label[j]}`, `${label[i]} vs ${label[j]}`, s.means[i] - s.means[j]));
  }
  return list;
}

const comparisons = (s, list) => list.filter((test) => test.kind === 't').length;

export function powerOf(s, test, n, list = tests(s)) {
  const cells = s.means.length;
  if (test.kind === 'F') return fPower(n * test.size, test.d1, cells * (n - 1), s.alpha);
  const alpha = s.correct ? s.alpha / comparisons(s, list) : s.alpha;
  const df = 2 * n - 2;
  return power({ df, t: tCut(alpha, df), shift: test.size / Math.sqrt(2 / n) });
}

export function neededFor(s, test, list = tests(s)) {
  if (test.size < 1e-9) return Infinity;
  const start = test.kind === 't' ? 16 / (test.size * test.size) : 8 / test.size;
  return firstPassing((n) => powerOf(s, test, n, list) >= s.target, start, 2);
}

export function fit(s) {
  const list = tests(s);
  const needs = list.filter((test) => s.plan.includes(test.id) && test.size >= 1e-9).map((test) => neededFor(s, test, list));
  if (!needs.length) return s.n;
  const most = Math.max(...needs);
  return most === Infinity ? N_LIMIT : most;
}

export const snap = (n) => Math.min(N_LIMIT, Math.max(2, Math.round(n)));


export function narrate(s) {
  const list = tests(s);
  const unit = isFactorial(s) ? 'cell' : 'group';
  const planned = list.filter((test) => s.plan.includes(test.id) && test.size >= 1e-9);
  if (!planned.length) return 'The ticked tests have no difference to find. Move the means apart, or tick another test.';
  const parts = planned.map((test, i) => `${test.phrase} has ${formatPower(powerOf(s, test, s.n, list), s.target)}${i ? '' : ' power'}`);
  const first = `With ${count(s.n)} people in each ${unit}, ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]}.`;
  const others = list.filter((test) => !s.plan.includes(test.id) && test.size >= 1e-9);
  if (!others.length) return first;
  const weakest = others.reduce((a, b) => (powerOf(s, b, s.n, list) < powerOf(s, a, s.n, list) ? b : a));
  const weak = powerOf(s, weakest, s.n, list);
  if (weak >= s.target) return `${first} Every other test also reaches ${formatPercent(s.target)}.`;
  const need = neededFor(s, weakest, list);
  const rest = need === Infinity ? 'no practical size is enough' : `it would need ${count(need)} in each ${unit}`;
  return `${first} The weakest other test, ${weakest.phrase}, has only ${formatPower(weak, s.target)}, and ${rest}.`;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const whole = (p) => `${Math.round(100 * p)}%`;
const share = (p, target) => (p >= 0.995 ? 'over 99%' : formatPower(p, target));
const trim = (v) => `${Number(v.toFixed(2))}`;
const corrected = (a) => `${Number(a.toPrecision(2))}`.replace(/^0/, '');
const listed = (parts) => (parts.length > 2 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join(' and '));
const pair = (test) => `group ${Number(test.id[1]) + 1} with group ${Number(test.id[2]) + 1}`;
function sizeText(v) {
  const text = `${Number(v.toPrecision(4))}`;
  return (text.split('.')[1] ?? '').length >= 2 ? text : Number(text).toFixed(2);
}

function called(test) {
  if (test.id === 'overall') return 'the overall <i>F</i> test';
  if (test.id === 'ab') return 'the A × B interaction';
  if (test.id === 'a' || test.id === 'b') return `the main effect of ${test.id.toUpperCase()}`;
  if (test.kind === 't' && test.id[0] === 'b') return `the simple effect of B at A${test.id[1]}`;
  return `the comparison of ${pair(test)}`;
}

function grouped(chosen) {
  const pairs = chosen.filter((test) => test.id[0] === 'p');
  const simple = chosen.filter((test) => test.kind === 't' && test.id[0] === 'b');
  const parts = chosen.filter((test) => !pairs.includes(test) && !simple.includes(test)).map(called);
  if (simple.length === 2) parts.push('the simple effects of B at A1 and at A2');
  else parts.push(...simple.map(called));
  if (pairs.length > 2 || (pairs.length === 2 && parts.length)) parts.push(`${WORDS[pairs.length]} comparisons between pairs of groups`);
  else if (pairs.length === 2) parts.push(`the comparisons of ${pair(pairs[0])} and of ${pair(pairs[1])}`);
  else parts.push(...pairs.map(called));
  return listed(parts);
}

export function report(s) {
  const list = tests(s);
  const k = s.means.length;
  const unit = isFactorial(s) ? 'cell' : 'group';
  const people = (n) => `${count(n)} participants in each ${unit} (${count(k * n)} in total)`;
  const sized = (test) => (test.kind === 'F' ? `<i>f</i> = ${sizeText(Math.sqrt(test.size / k))}` : `<i>d</i> = ${sizeText(test.size)}`);
  const powerAt = (test) => powerOf(s, test, s.n, list);
  const chosen = list.filter((test) => s.plan.includes(test.id));
  const planned = chosen.filter((test) => test.size >= 1e-9);
  const empty = chosen.filter((test) => test.size < 1e-9);
  const means = isFactorial(s)
    ? `cell means of ${listed(s.means.map((v, i) => `${trim(v)} for ${names(s)[i]}`))}`
    : `means of ${listed(s.means.map(trim))} in groups 1 to ${k}`;
  const sentences = [
    `We planned the sample size for ${isFactorial(s) ? 'a 2 × 2 between-participants ANOVA' : `a one-way ANOVA of ${WORDS[k]} independent groups`}, with α = ${formatAlpha(s.alpha)} and ${whole(s.target)} power.`,
    `We expect ${means}, based on [the source of these means], with a standard deviation of ${trim(s.sd)} in each ${unit}.`,
  ];
  if (!chosen.length) sentences.push('The sample size is based on [the tests our conclusions rest on].');
  else if (planned.length === 1) sentences.push(`The sample size is based on ${called(planned[0])}, with ${sized(planned[0])}.`);
  else if (planned.length) sentences.push(`The sample size is based on ${listed(planned.map((test) => `${called(test)} (${sized(test)})`))}, each of which must reach ${whole(s.target)} power.`);
  if (empty.length) {
    const many = empty.length > 1;
    sentences.push(`With these means, ${listed(empty.map(called))} ${many ? 'have' : 'has'} no effect to find, so no sample size gives ${many ? 'them' : 'it'} power.`);
  }
  if (s.correct) {
    const pairs = list.filter((test) => test.kind === 't').length;
    sentences.push(isFactorial(s)
      ? `The two simple effects of B use a Bonferroni correction, so each is tested at α = ${corrected(s.alpha / pairs)}.`
      : `Comparisons between pairs of groups use a Bonferroni correction across all ${WORDS[pairs]} pairs, so each is tested at α = ${corrected(s.alpha / pairs)}.`);
  }
  if (!s.fixed && !planned.length) return [...sentences, `Power was computed with ${method([])}, using [the software and its version].`].join(' ');
  if (s.fixed) {
    sentences.push(`The analyzed sample is fixed by [the reason, such as the budget or the people available] at ${people(s.n)}.`);
    if (planned.length) sentences.push(`At this size, ${listed(planned.map((test, i) => `${called(test)} has ${share(powerAt(test), s.target)}${i ? '' : ' power'}`))}.`);
  } else {
    sentences.push(`This requires ${people(s.n)}.`);
  }
  if (s.dropout > 0) sentences.push(`Allowing for ${whole(s.dropout)} dropout, we will recruit ${people(Math.ceil(s.n / (1 - s.dropout) - 1e-9))}.`);
  const weak = list.filter((test) => !s.plan.includes(test.id) && test.size >= 1e-9 && powerAt(test) < s.target);
  if (weak.length) {
    const many = weak.length > 1;
    const powers = weak.map(powerAt);
    const [lo, hi] = [Math.min(...powers), Math.max(...powers)];
    const [low, high] = [share(lo, s.target), share(hi, s.target)];
    const range = low === high ? `only ${low}` : `between ${low} and ${high}`;
    sentences.push(`With this sample, ${grouped(weak)} ${many ? 'have' : 'has'} ${range} power, so we will treat ${many ? 'them' : 'it'} as exploratory.`);
  }
  sentences.push(`Power was computed with ${method([...planned, ...weak])}, using [the software and its version].`);
  return sentences.join(' ');
}

function method(used) {
  const f = used.filter((test) => test.kind === 'F').length;
  const t = used.length - f;
  const ts = `the two-sided <i>t</i> ${t > 1 ? 'tests' : 'test'}`;
  if (f && t) return `the noncentral <i>F</i> distribution for the <i>F</i> ${f > 1 ? 'tests' : 'test'} and the noncentral <i>t</i> distribution for ${ts}`;
  if (f) return 'the noncentral <i>F</i> distribution';
  if (t) return `the noncentral <i>t</i> distribution for ${ts}`;
  return 'the noncentral <i>F</i> and <i>t</i> distributions';
}
