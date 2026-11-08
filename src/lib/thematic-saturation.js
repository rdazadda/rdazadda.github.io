const DRAWS = 10000;

const PUBLISHED = {
  men: { '2|5': [6, 4, 9], '3|5': [7, 4, 12], '2|0': [11, 5, 17], '3|0': [14, 7, 23] },
  pregnancy: { '2|5': [6, 4, 10], '3|5': [8, 4, 13], '2|0': [11, 6, 17], '3|0': [14, 8, 22] },
  hiv: { '2|5': [9, 4, 16], '3|5': [12, 6, 22], '2|0': [12, 6, 19], '3|0': [16, 8, 26] },
};

export function published(study, { base, run, allow, times }) {
  if (base !== 4 || times !== 1) return null;
  return PUBLISHED[study.id][`${run}|${allow}`] ?? null;
}

function count(bits) {
  let x = bits - ((bits >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function prepare(study) {
  const codes = study.codes.length;
  const words = Math.ceil(codes / 32);
  const masks = Array.from({ length: study.interviews }, () => new Uint32Array(words));
  study.rows.forEach((row, r) => {
    for (let i = 0; i < study.interviews; i += 1) {
      if (row[i] === '1') masks[i][r >>> 5] |= 1 << (r & 31);
    }
  });
  return { codes, words, masks, interviews: study.interviews };
}

function newCounter(words) {
  return { one: new Uint32Array(words), two: new Uint32Array(words), three: new Uint32Array(words) };
}

function step(counter, mask, times, words) {
  const { one, two, three } = counter;
  let fresh = 0;
  for (let w = 0; w < words; w += 1) {
    const m = mask[w];
    let bits;
    if (times === 1) bits = m & ~one[w];
    else if (times === 2) bits = m & one[w] & ~two[w];
    else bits = m & two[w] & ~three[w];
    fresh += count(bits >>> 0);
    three[w] |= m & two[w];
    two[w] |= m & one[w];
    one[w] |= m;
  }
  return fresh;
}

export function freshCodes(prepared, order, times) {
  const counter = newCounter(prepared.words);
  return order.map((i) => step(counter, prepared.masks[i], times, prepared.words));
}

export function applyRule(fresh, { base, run, allow }) {
  let baseCodes = 0;
  for (let i = 0; i < base && i < fresh.length; i += 1) baseCodes += fresh[i];
  for (let i = base; i + run <= fresh.length; i += 1) {
    let inRun = 0;
    for (let k = i; k < i + run; k += 1) inRun += fresh[k];
    if (baseCodes > 0 && inRun * 100 <= allow * baseCodes) return { stop: i, baseCodes, inRun, ratio: inRun / baseCodes };
  }
  return { stop: null, baseCodes, inRun: null, ratio: null };
}

export function random(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(length, seed) {
  const next = random(seed);
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function resample(prepared, { base, run, allow, times }, draws = DRAWS, seed = 20200505) {
  const next = random(seed);
  const n = prepared.interviews;
  const tally = new Array(n + 1).fill(0);
  let notMet = 0;
  for (let d = 0; d < draws; d += 1) {
    const counter = newCounter(prepared.words);
    const fresh = new Array(n);
    let baseCodes = 0;
    let found = null;
    let inRun = 0;
    for (let i = 0; i < n; i += 1) {
      fresh[i] = step(counter, prepared.masks[Math.floor(next() * n)], times, prepared.words);
      if (i < base) baseCodes += fresh[i];
      else {
        inRun += fresh[i];
        if (i >= base + run) inRun -= fresh[i - run];
        if (i >= base + run - 1 && baseCodes > 0 && inRun * 100 <= allow * baseCodes) {
          found = i - run + 1;
          break;
        }
      }
    }
    if (found === null) {
      notMet += 1;
      tally[n] += 1;
    } else tally[found] += 1;
  }
  const at = (share) => {
    const target = Math.ceil(share * draws);
    let seen = 0;
    for (let s = 0; s <= n; s += 1) {
      seen += tally[s];
      if (seen >= target) return s;
    }
    return n;
  };
  return { tally, notMet, draws, median: at(0.5), low: at(0.05), high: at(0.95) };
}

export function firstSeen(study, order, times) {
  return study.rows.map((row) => {
    let seen = 0;
    for (let position = 0; position < order.length; position += 1) {
      if (row[order[position]] === '1') {
        seen += 1;
        if (seen === times) return position;
      }
    }
    return null;
  });
}
