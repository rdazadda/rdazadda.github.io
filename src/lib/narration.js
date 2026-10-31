import { pValue, power, tTest } from './t-test.js';

export const START = { n: 20, d: 0.5, alpha: 0.05, result: 0.67 };

export const minus = (text) => text.replace('-', '−');
export const formatEffect = (v) => minus((Math.abs(v) < 0.005 ? 0 : v).toFixed(2));
export const formatAlpha = (a) => (a >= 0.01 ? a.toFixed(2) : a.toFixed(3)).replace(/^0/, '');
export const pNumber = (p) => (p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''));
export const formatP = (p) => (p < 0.001 ? pNumber(p) : `= ${pNumber(p)}`);
export const formatPercent = (p) => (p >= 0.995 ? '>99%' : p < 0.01 ? `${(100 * p).toFixed(1)}%` : `${Math.round(100 * p)}%`);
export const formatPower = (p, target) => (p < target && Math.round(100 * p) >= Math.round(100 * target) ? `${(Math.floor(1000 * p) / 10).toFixed(1)}%` : formatPercent(p));

const percent = (p) => (p >= 0.995 ? 'over 99%' : formatPercent(p));
const pWords = (p) => (p < 0.001 ? 'less than .001' : pNumber(p));
const cutoffs = (test) => `±${test.cutoff.toFixed(2)}`;
const upper = (text) => text[0].toUpperCase() + text.slice(1);

function shift(label, from, to, many = false) {
  const a = percent(from);
  const b = percent(to);
  const verb = a === b ? 'stay' : to > from ? 'rise' : 'fall';
  return `${label} ${many ? verb : `${verb}s`} ${a === b ? `at ${b}` : `from ${a} to ${b}`}`;
}

function study(opening, now, test, real) {
  const significant = Math.abs(now.result) > test.cutoff;
  const where = significant ? 'past a cut-off, so it is significant' : 'inside the cut-offs, so it is not significant';
  let twist = '';
  if (significant && !real) twist = ', but with no true effect it is a false alarm';
  else if (significant && now.result < 0) twist = ', but it points the wrong way';
  const p = pWords(pValue(test, now.result));
  return `${opening} ${formatEffect(now.result)}. That is ${where}${twist}. Its <i>p</i> value, the striped area, is ${p}, ${significant ? 'below' : 'above'} α (${formatAlpha(now.alpha)}).`;
}

export function narrate(now, base) {
  const test = tTest(now.n, 0, now.alpha);
  const before = tTest(base.n, 0, base.alpha);
  const real = now.d > 0;
  const powerNow = real ? power(tTest(now.n, now.d, now.alpha)) : 0;
  const powerBefore = base.d > 0 ? power(tTest(base.n, base.d, base.alpha)) : 0;
  const pNow = pValue(test, now.result);
  const pBefore = pValue(before, base.result);
  const significant = Math.abs(now.result) > test.cutoff;
  const wasSignificant = Math.abs(base.result) > before.cutoff;
  const flip = significant === wasSignificant ? '' : ` So the study is ${significant ? 'now' : 'no longer'} significant.`;
  const found = `${shift('power', powerBefore, powerNow)} and ${shift('misses', 1 - powerBefore, 1 - powerNow, true)}`;
  const keeps = `the study keeps <i>p</i> ${formatP(pNow)}`;

  if (now.n !== base.n) {
    const more = now.n > base.n;
    const pLine = pNumber(pNow) === pNumber(pBefore) ? `${upper(keeps)}.` : `The study at ${formatEffect(now.result)} now has <i>p</i> ${formatP(pNow)} instead of ${pNumber(pBefore)}.`;
    return [
      more
        ? 'More people in each group make both curves narrower, because each study’s result varies less.'
        : 'Fewer people in each group make both curves wider, because each study’s result varies more.',
      `The cut-offs move ${more ? 'closer to' : 'away from'} 0, from ${cutoffs(before)} to ${cutoffs(test)}.`,
      real ? `${upper(found)}.` : '',
      `False alarms stay at ${percent(now.alpha)}, because α sets them.`,
      pLine,
    ].filter(Boolean).join(' ') + flip;
  }

  if (now.d !== base.d) {
    if (!real) {
      return `With no true effect, the Real effect curve becomes a copy of the No effect curve. There is nothing real to find, so every study past a cut-off is a false alarm. That is ${percent(now.alpha)} of studies, set by α. The cut-offs stay put, and ${keeps}.`;
    }
    if (base.d === 0) {
      return `A real effect of ${now.d.toFixed(2)} pulls the Real effect curve away from 0. Now ${percent(powerNow)} of studies pass a cut-off and find it, and ${percent(1 - powerNow)} miss it. The cut-offs and false alarms stay the same, and ${keeps}.`;
    }
    const larger = now.d > base.d;
    return `A ${larger ? 'larger' : 'smaller'} true effect moves the Real effect curve ${larger ? 'further from' : 'closer to'} 0. ${larger ? 'More' : 'Less'} of it passes the cut-offs, so ${found}. The No effect curve and the cut-offs stay put, because they do not depend on the true effect. False alarms stay at ${percent(now.alpha)}, and ${keeps}.`;
  }

  if (now.alpha !== base.alpha) {
    const larger = now.alpha > base.alpha;
    return [
      `A ${larger ? 'larger' : 'smaller'} α moves the cut-offs ${larger ? 'closer to' : 'away from'} 0, from ${cutoffs(before)} to ${cutoffs(test)}.`,
      `The orange false alarm tails ${larger ? 'grow' : 'shrink'}, so ${shift('false alarms', base.alpha, now.alpha, true)}.`,
      real ? `${larger ? 'More' : 'Less'} of the Real effect curve passes the cut-offs too, so ${found}.` : '',
      `${upper(keeps)}. Only the bar it has to get under moves, from ${formatAlpha(base.alpha)} to ${formatAlpha(now.alpha)}.`,
    ].filter(Boolean).join(' ') + flip;
  }

  if (now.result !== base.result) return study('The study now observes', now, test, real);

  const setting = real
    ? `With ${now.n.toLocaleString('en-US')} people in each group and a true effect of ${now.d.toFixed(2)}, ${percent(powerNow)} of studies pass a cut-off and find the effect, and ${percent(1 - powerNow)} miss it. If there were no effect, ${percent(now.alpha)} of studies would still pass a cut-off by chance, and those are false alarms.`
    : `With no true effect, the two curves are the same. Every study past a cut-off is a false alarm, ${percent(now.alpha)} of all studies.`;
  return `${setting} ${study('The study on the chart observes', now, test, real)}`;
}
