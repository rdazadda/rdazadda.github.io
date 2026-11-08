import { STUDIES } from '../data/thematic-guest.js';
import { CODES, PASSAGES, QUOTES, QUOTE_ORDER, THEMES } from '../data/thematic-harris.js';
import { alphaFromTable, binaryTable, fixed, percent, tableStats } from './thematic-agreement.js';
import { esc } from './thematic-figures.js';
import { applyRule, firstSeen, freshCodes, prepare, published, resample, shuffled } from './thematic-saturation.js';

export const codeById = new Map(CODES.map((code) => [code.id, code]));
export const themeById = new Map(THEMES.map((theme) => [theme.id, theme]));
export const quoteById = new Map(QUOTES.map((quote) => [quote.id, quote]));
const THEME_IDS = THEMES.map((theme) => theme.id);
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function numberWord(n) {
  return NUMBER_WORDS[n] ?? String(n);
}

export function wordsOf(passage) {
  return passage.turns.flatMap((turn, t) => turn.text.split(' ').map((word) => ({ word, turn: t })));
}

export function transcriptHtml(passage) {
  return passage.turns.map((turn) => {
    const list = turn.text.split(' ');
    const words = list.map((word, k) => `<span class="w"><span class="t">${esc(word)}</span>${k < list.length - 1 ? '<span class="sp"> </span>' : ''}</span>`).join('');
    return `<p class="turn"><span class="who">${turn.who}</span><span class="said">${words}</span></p>`;
  }).join('');
}

export function speakerLine(passage) {
  return `Transcript ${passage.transcript}. R is the participant (${passage.speaker}). I is the interviewer.`;
}

export function readsHtml(passage) {
  const rows = passage.rows.map(([name, value]) => `<div><span>${esc(name)}</span><span>${esc(value)}</span></div>`).join('');
  const note = passage.note ? `<p class="reads-note">${esc(passage.note)}</p>` : '';
  return `<h3>${esc(passage.title)}</h3><div class="rows">${rows}</div>${note}`;
}

export function exampleCodes() {
  return PASSAGES.map((passage) => passage.examples.map((item, i) => ({ id: `e${passage.id}-${i}`, lane: item.lane, name: item.name, from: item.from, to: item.to, example: true })));
}

export const EXAMPLE_PILES = [
  { id: 'p1', name: 'The pandemic woke people up', codes: ['c01', 'c02', 'c03', 'c04'] },
  { id: 'p2', name: 'It has to be fun', codes: ['c06', 'c07', 'c08', 'c18', 'c22'] },
  { id: 'p3', name: 'Barriers', codes: ['c10', 'c14', 'c15', 'c19'] },
  { id: 'p4', name: 'Bodies change and people adapt', codes: ['c09', 'c11'] },
  { id: 'p5', name: 'Nobody is talking to me', codes: ['c25', 'c26', 'c17'] },
  { id: 'p6', name: 'Other people keep me going', codes: ['c21', 'c23'] },
];
export const EXAMPLE_TRAY = ['c05', 'c12', 'c13', 'c16', 'c20', 'c24', 'c27'];

const TOPIC = /^(barriers? to|experiences? of|influences? on|types? of|benefits? of|drawbacks? of)\b/i;

export function pileFlag(pile) {
  const name = pile.name.trim();
  if (name && (TOPIC.test(name) || name.split(/\s+/).length === 1)) return ['May name a topic.', 'Could this heading have been written before the analysis?'];
  if (pile.codes.length === 1) return ['One code.', 'This may still be a code rather than a theme.'];
  return null;
}

export const THEMES_NARRATION = {
  sort: 'Drag the 27 codes from the paper into piles and name each pile. A theme holds one idea that its codes share. The lines then show where each code sits in the paper. Piles can differ from the paper, since Braun and Clarke (2022) hold that many analyses of one data set are possible.',
  trace: 'Each printed quote is joined to the person who said it, to its closest code in Table 2, and to its theme. Pick a person, a code, or a theme to follow the path. “Physical health limitations” has only orange lines, and “Access to green space” has only blue ones. The authors chose these quotes, so the lines do not count who said what.',
};

const COLUMN_LINES = [['Teachable', 'moment'], ['Purpose or', 'pleasure'], ['What you', 'can do'], ['Opportunities'], ['Social', 'environment'], ['Messaging']];
const SHORT_NAMES = THEMES.map((theme) => theme.short);

const COHEN = {
  one: {
    table: [[50, 26, 24], [24, 4, 32], [6, 30, 4]],
    narration: 'Cohen’s first table holds 200 units, an assumed size, in 3 categories. The two judges match on 29% of the units. Chance alone would give 35%, so kappa is negative at −.09. A chi-square test on the same table is highly significant, at 64.59. That test responds to any association, and here the judges disagree more than chance would.',
    quote: '“When applied to a contingency table, χ² tests the null hypothesis with regard to association, not agreement.”',
    source: 'Cohen (1960), page 39.',
  },
  two: {
    table: [[88, 14, 18], [10, 40, 10], [2, 6, 12]],
    narration: 'Cohen’s worked example holds 200 units in 3 categories. The two judges match on 70% of the units. Chance alone would give 41%, so kappa is .49, with 95% limits from .38 to .60. The margins allow a kappa of at most .83, so part of the disagreement comes from the judges using the categories at different rates.',
    quote: '“The coefficient κ is simply the proportion of chance-expected disagreements which do not occur.”',
    source: 'Cohen (1960), page 40.',
  },
};

function agreementTable(answers, key) {
  const table = THEMES.map(() => THEMES.map(() => 0));
  for (const [id, answer] of Object.entries(answers)) {
    table[THEME_IDS.indexOf(quoteById.get(id).theme)][THEME_IDS.indexOf(answer[key])] += 1;
  }
  return table;
}

function perCategory(table, names) {
  return table.map((_, i) => {
    const pairs = [];
    table.forEach((row, r) => row.forEach((count, c) => {
      for (let n = 0; n < count; n += 1) pairs.push([r === i, c === i]);
    }));
    return { name: names[i], stats: tableStats(binaryTable(pairs)) };
  });
}

export function agreementView(agree) {
  if (agree.source !== 'coding') {
    const preset = COHEN[agree.source];
    const names = ['Category 1', 'Category 2', 'Category 3'];
    const stats = tableStats(preset.table);
    return {
      preset,
      table: preset.table,
      stats,
      alpha: alphaFromTable(preset.table),
      labels: names,
      columnLines: names.map((name) => [name]),
      rowHead: ['Judge B'],
      columnHead: 'Judge A',
      forest: [{ name: 'All categories', stats, strong: true, rule: true }, ...perCategory(preset.table, names)],
      narration: preset.narration,
    };
  }
  const table = agreementTable(agree.answers, 'first');
  const talked = agreementTable(agree.answers, 'now');
  const stats = tableStats(table);
  const after = tableStats(talked);
  const changed = Object.values(agree.answers).filter((answer) => answer.first !== answer.now).length;
  const forest = [
    { name: 'All themes, coding alone', stats, strong: true, rule: !changed },
    ...(changed ? [{ name: 'All themes, after talking it over', stats: after, strong: true, after: true, rule: true }] : []),
    ...perCategory(table, SHORT_NAMES),
  ];
  return {
    table,
    stats,
    after,
    changed,
    alpha: alphaFromTable(table),
    labels: SHORT_NAMES,
    columnLines: COLUMN_LINES,
    rowHead: ['Paper prints', 'it under'],
    columnHead: 'Second coder chose',
    forest,
    narration: narrateCoding(stats, after, changed, agree.chance),
  };
}

function narrateCoding(stats, after, changed, chance) {
  const open = 'Read a quote and choose a theme for it. The paper’s authors chose first, so the reader is the second coder.';
  if (!stats.N) return `${open} The numbers begin with the first answer.`;
  const match = Math.round(stats.po * stats.N);
  let out = `${open} So far the two match on ${match} of ${stats.N} ${stats.N === 1 ? 'quote' : 'quotes'}, which is ${percent(stats.po)}.`;
  if (stats.kappa === null) out += ' Kappa needs more than one theme in the answers, so it has no value yet.';
  else {
    out += ` Coders choosing at random at these same rates would match ${percent(stats.pc)} of the time.`;
    if (stats.kappa < 0) out += ' The two match less often than that, so kappa is negative.';
    else out += ` Chance leaves ${percent(1 - stats.pc)} to agree on, and the two reach ${percent(stats.kappa)} of that, so kappa is ${fixed(stats.kappa)}.`;
  }
  if (chance) out += ` Chance filled in ${chance} of these answers.`;
  if (changed) out += ` Talking over ${changed} ${changed === 1 ? 'quote' : 'quotes'} brings the match to ${Math.round(after.po * after.N)} of ${after.N}.`;
  return out;
}

export function multiView(multi) {
  const ids = Object.keys(multi);
  return THEMES.map((theme) => {
    const pairs = ids.map((id) => [quoteById.get(id).theme === theme.id, multi[id].includes(theme.id)]);
    const table = binaryTable(pairs);
    return { id: theme.id, name: theme.short, table, stats: tableStats(table) };
  });
}

export const MULTI_NARRATION = 'Mark every theme that fits a quote, then go to the next one. Each quote now gives six yes or no answers, one for each theme. The paper prints each quote under one heading, so it gives one yes. Kappa is worked out for each theme, since one pooled figure can hide weak codes (O’Connor & Joffe, 2020). Here the themes act as codes.';

const CACHE = new Map();

function preparedFor(index) {
  if (!CACHE.has(index)) CACHE.set(index, prepare(STUDIES[index]));
  return CACHE.get(index);
}

function list(numbers) {
  if (numbers.length === 2) return `${numbers[0]} and ${numbers[1]}`;
  return `${numbers.slice(0, -1).join(', ')}, and ${numbers[numbers.length - 1]}`;
}

export function saturationView(s) {
  const study = STUDIES[s.study];
  const prepared = preparedFor(s.study);
  const n = study.interviews;
  const order = s.shuffle ? shuffled(n, s.shuffle) : Array.from({ length: n }, (_, i) => i);
  const settings = { base: s.base, run: s.run, allow: s.allow, times: s.times };
  const fresh = freshCodes(prepared, order, s.times);
  const rule = applyRule(fresh, settings);
  const firstAt = firstSeen(study, order, s.times);
  const uses = study.rows.map((row) => [...row].filter((value) => value === '1').length);
  const rowOrder = study.codes.map((_, r) => r).sort((a, b) => (firstAt[a] ?? Infinity) - (firstAt[b] ?? Infinity) || uses[b] - uses[a] || a - b);
  const reached = firstAt.filter((position) => position !== null);
  const found = reached.filter((position) => position < (rule.stop ?? n)).length;
  const result = resample(prepared, settings);
  const paper = published(study, settings);
  const axisLabel = s.shuffle ? 'Interviews, in a shuffled order' : study.order === 'done' ? 'Interviews, in the order they were done' : 'Interviews, in the order of the file';

  const labels = [];
  const rowOf = new Map(rowOrder.map((r, row) => [r, row]));
  const placed = rowOrder.filter((r) => firstAt[r] !== null);
  for (let i = placed.length - 1; i >= 0 && labels.length < 2; i -= 1) {
    const r = placed[i];
    const row = rowOf.get(r);
    if (labels.length && labels[labels.length - 1].row - row < 4) continue;
    if (firstAt[r] < Math.max(8, (rule.stop ?? 0) + 3)) break;
    let edge = firstAt[r];
    for (let near = Math.max(0, row - 2); near <= Math.min(rowOrder.length - 1, row + 2); near += 1) {
      const value = firstAt[rowOrder[near]];
      if (value !== null) edge = Math.min(edge, value);
    }
    const needed = (study.codes[r].length + 30) * 6.3;
    if ((edge - 0.4) * (790 / n) < needed) continue;
    labels.push({ r, row, end: edge - 0.4 });
  }
  return { study, order, settings, fresh, rule, firstAt, uses, rowOrder, found, result, median: result.median, paper, axisLabel, labels };
}

export function narrateSaturation(view) {
  const { study, rule, settings } = view;
  const n = study.interviews;
  const first = settings.times === 1 ? 'A dark mark shows the first time a code appears.' : `A dark mark shows when a code reaches ${settings.times} interviews, and only then does it count.`;
  const where = view.axisLabel.includes('shuffled') ? 'In this shuffled order' : study.order === 'done' ? `In the order these ${n} interviews were done` : 'In the order of this file, which runs by site and vignette';
  const open = `Each row is one code and each column is one interview. ${first}`;
  if (rule.stop === null) return `${open} ${where}, no run of ${settings.run} interviews meets the ${settings.allow}% rule. Shuffling the interviews can change the answer.`;
  const run = Array.from({ length: settings.run }, (_, i) => rule.stop + i + 1);
  const added = rule.inRun === 0 ? 'add no new codes' : `add ${rule.inRun} new ${rule.inRun === 1 ? 'code' : 'codes'}`;
  const share = rule.inRun === 0 ? `That meets the ${settings.allow}% rule at interview ${rule.stop}.` : `That is ${(rule.ratio * 100).toFixed(1)}% of the ${rule.baseCodes} codes in the first ${settings.base} interviews, so the ${settings.allow}% rule is met at interview ${rule.stop}.`;
  return `${open} ${where}, interviews ${list(run)} ${added}. ${share} Guest et al. (2020) write this as ${rule.stop}+${settings.run}. Shuffling the interviews can change the answer.`;
}

export function sampleNote(view) {
  const { result, paper, study } = view;
  let out = result.median < study.interviews ? `About half meet the rule by interview ${result.median}.` : 'More than half never meet the rule.';
  out += ` About nine in ten fall between interviews ${result.low} and ${result.high}.`;
  if (result.notMet) out += ` In ${result.notMet.toLocaleString('en-US')} samples the rule is never met, and they are counted at the last interview.`;
  if (paper) out += ` Guest et al. (2020) report ${paper[0]}, with limits of ${paper[1]} and ${paper[2]}, at these settings.`;
  return out;
}

export function rowNote(view, r) {
  const { study, firstAt, uses, settings } = view;
  if (r === null || r === undefined) return 'Point at a row to read its code.';
  let when;
  if (firstAt[r] === null) when = settings.times === 1 ? 'Never seen in these interviews' : `Seen fewer than ${settings.times} times here`;
  else when = settings.times === 1 ? `First seen in interview ${firstAt[r] + 1}` : `Seen ${settings.times} times by interview ${firstAt[r] + 1}`;
  return `${study.codes[r]}. ${when}. Used in ${uses[r]} of ${study.interviews} interviews.`;
}

export const POWER_ROWS = [
  { name: 'Study aim', left: 'Narrow', right: 'Broad', harris: 12, malterud: 50, note: '“a narrow study aim”' },
  { name: 'Sample specificity', left: 'Dense', right: 'Sparse', harris: 25, malterud: 19, note: '“purposive sampling strategy targeting recruitment in specific areas”' },
  { name: 'Established theory', left: 'Applied', right: 'None', harris: 82, malterud: 20, note: '“driven by the data” rather than “the lens of pre-existing theories”' },
  { name: 'Quality of dialogue', left: 'Strong', right: 'Weak', harris: 15, malterud: 58, note: '“the strong quality of the dialogue in the interviews”' },
  { name: 'Analysis strategy', left: 'Case', right: 'Cross-case', harris: 88, malterud: 80, note: 'Themes built across all 16 interviews' },
];

export function narratePower(planned) {
  const open = 'Malterud et al. (2016) offer no formula, so the five lines give no total. Marks toward the left point to fewer people, and marks toward the right point to more. The two sets of marks are this page’s reading of each report.';
  const fewer = planned.filter((value) => value < 50).length;
  const more = planned.filter((value) => value > 50).length;
  const lines = (n) => `${numberWord(n)} ${n === 1 ? 'line' : 'lines'}`;
  if (!fewer && !more) return `${open} The sliders place a planned study on each line.`;
  if (!more) return `${open} The planned study sits toward fewer people on ${lines(fewer)}.`;
  if (!fewer) return `${open} The planned study sits toward more people on ${lines(more)}.`;
  return `${open} The planned study sits toward fewer people on ${lines(fewer)} and toward more on ${numberWord(more)}.`;
}

export { CODES, PASSAGES, QUOTES, QUOTE_ORDER, STUDIES, THEMES };
