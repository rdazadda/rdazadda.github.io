import { CODES, QUOTES, THEMES } from '../data/thematic-harris.js';
import { expectedCount, fixed } from './thematic-agreement.js';

const INK = '#1f2933';
const DEEP = '#143d5e';
const BLUE = '#1f5a88';
const ORANGE = '#b04a00';
const WARM = '#d55e00';
const MUTED = '#46505c';
const AXIS = '#8a94a0';
const RULE = '#d3dae2';
const FAINT = '#e3e7ec';
const LIGHT = '#c5d6e6';
const MID = '#8fa6bb';
const SLATE = '#30394f';
const STEEL = '#7f9ab3';
const WHITE = '#ffffff';

export const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (value) => Number(value.toFixed(1));

const curve = (x1, y1, x2, y2) => {
  const mid = num((x1 + x2) / 2);
  return `M${num(x1)} ${num(y1)}C${mid} ${num(y1)} ${mid} ${num(y2)} ${num(x2)} ${num(y2)}`;
};

const wrap = (text, width) => {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

const text = (x, y, value, { size = 13.5, weight = 400, anchor = 'start', fill = INK, style = '' } = {}) => `<text x="${num(x)}" y="${num(y)}" font-size="${size}"${weight === 400 ? '' : ` font-weight="${weight}"`}${anchor === 'start' ? '' : ` text-anchor="${anchor}"`} fill="${fill}"${style ? ` font-style="${style}"` : ''}>${esc(value)}</text>`;

export const TRACE_WIDE = { W: 1160, peopleText: 186, peopleEnd: 194, tick: 446, tickEnd: 458, code: 466, brace: 884, themeText: 906, themeWrap: 30, codeWrap: 80 };
export const TRACE_NARROW = { W: 940, peopleText: 184, peopleEnd: 192, tick: 356, tickEnd: 368, code: 376, brace: 712, themeText: 732, themeWrap: 26, codeWrap: 52 };

const PEOPLE = (() => {
  const people = new Map();
  for (const quote of QUOTES) {
    if (!people.has(quote.label)) people.set(quote.label, { label: quote.label, active: quote.active, quotes: 0 });
    people.get(quote.label).quotes += 1;
  }
  return [...people.values()].sort((a, b) => (a.active === b.active ? b.quotes - a.quotes : a.active === 'sufficiently' ? -1 : 1));
})();

const activeColor = (active) => (active === 'sufficiently' ? BLUE : WARM);

export function quotesFor(pick) {
  if (!pick) return [];
  if (pick.type === 'person') return QUOTES.filter((quote) => quote.label === pick.id);
  if (pick.type === 'code') return QUOTES.filter((quote) => quote.code === pick.id);
  if (pick.type === 'theme') return QUOTES.filter((quote) => quote.theme === pick.id);
  return QUOTES.filter((quote) => quote.id === pick.id);
}

export function traceFigure(G, pick) {
  const unit = 11;
  const rowHeight = (count) => Math.max(17, count * unit);
  const top = 30;
  const themeGap = 14;
  let y = top;
  const codeBox = new Map();
  const quoteBox = new Map();
  const themeBox = new Map();
  for (const theme of THEMES) {
    const start = y;
    for (const code of CODES.filter((item) => item.theme === theme.id)) {
      const list = QUOTES.filter((quote) => quote.code === code.id).sort((a, b) => (a.active === b.active ? 0 : a.active === 'sufficiently' ? -1 : 1));
      const lines = wrap(code.name, G.codeWrap);
      const height = Math.max(rowHeight(list.length), lines.length * 16 + 1);
      codeBox.set(code.id, { y, height, count: list.length, lines });
      const offset = y + (height - list.length * unit) / 2;
      list.forEach((quote, i) => quoteBox.set(quote.id, { y: offset + i * unit, height: unit - 2 }));
      y += height;
    }
    themeBox.set(theme.id, { y: start, height: y - start });
    y += themeGap;
  }
  const bottom = y - themeGap;

  const personBox = new Map();
  const heads = [];
  const total = PEOPLE.reduce((sum, person) => sum + Math.max(20, person.quotes * unit), 0);
  const extra = Math.max(0, (bottom - top - total - 68) / PEOPLE.length);
  let py = top + 2;
  for (const group of ['sufficiently', 'insufficiently']) {
    heads.push({ group, y: py + 12 });
    py += 24;
    for (const person of PEOPLE.filter((item) => item.active === group)) {
      const height = Math.max(20, person.quotes * unit);
      personBox.set(person.label, { y: py, height });
      py += height + extra;
    }
    py += 20;
  }

  const chosen = new Set(quotesFor(pick).map((quote) => quote.id));
  const used = new Map();
  let under = '';
  let over = '';
  for (const quote of QUOTES) {
    const box = personBox.get(quote.label);
    const person = PEOPLE.find((item) => item.label === quote.label);
    const index = used.get(quote.label) ?? 0;
    used.set(quote.label, index + 1);
    const target = quoteBox.get(quote.id);
    const path = curve(G.peopleEnd, box.y + (box.height * (index + 0.5)) / person.quotes, G.tick, target.y + target.height / 2);
    if (chosen.has(quote.id)) over += `<path d="${path}" fill="none" stroke="${DEEP}" stroke-width="2.6"/>`;
    else under += `<path d="${path}" fill="none" stroke="${activeColor(quote.active)}" stroke-width="1.1" stroke-opacity="${chosen.size ? 0.32 : 0.6}"/>`;
  }

  let marks = `<g aria-hidden="true">${under}${over}</g>`;
  for (const person of PEOPLE) {
    const box = personBox.get(person.label);
    const on = pick?.type === 'person' && pick.id === person.label;
    const short = person.label.replace(' years', '').replace(/, (sufficiently|insufficiently) active/, '');
    marks += `<g class="hit" data-pick="person:${esc(person.label)}" tabindex="0" role="button" aria-label="${esc(person.label)}"><rect x="0" y="${num(box.y)}" width="${G.peopleEnd + 2}" height="${box.height}" fill="transparent"/><rect x="${G.peopleEnd - 4}" y="${num(box.y)}" width="4" height="${box.height - 2}" fill="${on ? DEEP : activeColor(person.active)}"/>${text(G.peopleText, box.y + box.height / 2 + 3.5, short, { weight: on ? 700 : 400, anchor: 'end' })}</g>`;
  }
  for (const quote of QUOTES) {
    const box = quoteBox.get(quote.id);
    const on = chosen.has(quote.id);
    const opening = quote.text.split(' ').slice(0, 5).join(' ');
    marks += `<g class="hit" data-pick="quote:${quote.id}" tabindex="0" role="button" aria-label="${esc(`Quote from ${quote.label}, beginning “${opening}”`)}"><rect x="${G.tick - 3}" y="${num(box.y - 1)}" width="${G.tickEnd - G.tick + 6}" height="${unit}" fill="transparent"/><rect x="${G.tick}" y="${num(box.y)}" width="${G.tickEnd - G.tick}" height="${box.height}" fill="${on ? DEEP : activeColor(quote.active)}"/></g>`;
  }
  for (const code of CODES) {
    const box = codeBox.get(code.id);
    const on = pick?.type === 'code' && pick.id === code.id;
    if (box.count === 0) marks += `<rect x="${G.tick + 0.5}" y="${num(box.y + box.height / 2 - 4)}" width="${G.tickEnd - G.tick - 1}" height="8" fill="${WHITE}" stroke="${MUTED}"/>`;
    const startY = box.y + box.height / 2 + 4.6 - ((box.lines.length - 1) * 16) / 2;
    marks += `<g class="hit" data-pick="code:${code.id}" tabindex="0" role="button" aria-label="${esc(`Code: ${code.name}`)}"><rect x="${G.code - 4}" y="${num(box.y)}" width="${G.brace - G.code - 44}" height="${num(box.height)}" fill="transparent"/>${box.lines.map((line, i) => text(G.code, startY + i * 16, line, { weight: on ? 700 : 400 })).join('')}</g>`;
  }
  for (const theme of THEMES) {
    const box = themeBox.get(theme.id);
    const on = pick?.type === 'theme' && pick.id === theme.id;
    const lines = wrap(theme.name, G.themeWrap);
    const startY = box.y + box.height / 2 - ((lines.length - 1) * 18) / 2 + 5;
    marks += `<path d="M${G.brace} ${num(box.y + 1)}H${G.brace + 8}V${num(box.y + box.height - 1)}H${G.brace}" fill="none" stroke="${INK}" stroke-width="${on ? 2.4 : 1.3}"/>`;
    marks += `<g class="hit" data-pick="theme:${theme.id}" tabindex="0" role="button" aria-label="${esc(`Theme: ${theme.name}`)}"><rect x="${G.themeText - 6}" y="${num(box.y)}" width="${G.W - G.themeText + 6}" height="${num(box.height)}" fill="transparent"/>${lines.map((line, i) => text(G.themeText, startY + i * 18, line, { size: 14.5, weight: 700 })).join('')}</g>`;
  }
  const span = (sub) => {
    const list = CODES.filter((code) => code.sub === sub).map((code) => codeBox.get(code.id));
    return (list[0].y + list[list.length - 1].y + list[list.length - 1].height) / 2 + 4;
  };
  marks += text(G.brace - 6, span('Place'), 'Place', { size: 13, anchor: 'end', style: 'italic' });
  marks += text(G.brace - 6, span('Time'), 'Time', { size: 13, anchor: 'end', style: 'italic' });
  for (const head of heads) marks += text(G.peopleText, head.y, head.group === 'sufficiently' ? 'Sufficiently active' : 'Insufficiently active', { weight: 700, anchor: 'end' });
  marks += text(G.peopleText, 14, 'Who said it', { size: 14.5, weight: 700, anchor: 'end' });
  marks += text(G.tick + 6, 14, 'Quote', { size: 14.5, weight: 700, anchor: 'middle' });
  marks += text(G.code + 26, 14, 'Code', { size: 14.5, weight: 700 });
  marks += text(G.themeText, 14, 'Theme', { size: 14.5, weight: 700 });
  return { width: G.W, height: num(Math.max(bottom, py) + 6), markup: marks };
}

export function linesFigure(piles, openId) {
  const W = 410;
  const leftEdge = 128;
  const rightEdge = W - 118;
  const stepHeight = 20;
  const pileGap = 20;
  const pileRows = piles.map((pile) => ({ ...pile, papers: pile.codes.filter((id) => CODES.some((code) => code.id === id)), lines: wrap(pile.name.trim() || 'No name yet', 16) }));
  const left = [];
  let y = 34;
  for (const pile of pileRows) {
    const height = (Math.max(1, pile.papers.length) - 1) * stepHeight + 8;
    const block = Math.max(height, pile.lines.length * 15);
    left.push({ y: y + (block - height) / 2, height });
    y += block + pileGap;
  }
  const leftBottom = y - pileGap;
  const inTheme = Object.fromEntries(THEMES.map((theme) => [theme.id, pileRows.flatMap((pile) => pile.papers).filter((id) => CODES.find((code) => code.id === id).theme === theme.id).length]));
  const rightHeight = THEMES.reduce((sum, theme) => sum + (Math.max(1, inTheme[theme.id]) - 1) * stepHeight + 8, 0);
  const span = Math.max(leftBottom - 34, rightHeight + 5 * 24);
  const gap = (span - rightHeight) / 5;
  const right = {};
  let ry = 34;
  for (const theme of THEMES) {
    const height = (Math.max(1, inTheme[theme.id]) - 1) * stepHeight + 8;
    right[theme.id] = { y: ry, height };
    ry += height + gap;
  }
  const count = Object.fromEntries(THEMES.map((theme) => [theme.id, 0]));
  let under = '';
  let over = '';
  pileRows.forEach((pile, i) => {
    pile.papers.forEach((id, k) => {
      const themeId = CODES.find((code) => code.id === id).theme;
      const y1 = left[i].y + 4 + k * stepHeight;
      const y2 = right[themeId].y + 4 + count[themeId] * stepHeight;
      count[themeId] += 1;
      const path = curve(leftEdge + 6, y1, rightEdge - 6, y2);
      if (pile.id === openId) over += `<path d="${path}" fill="none" stroke="${ORANGE}" stroke-width="2.2"/>`;
      else under += `<path d="${path}" fill="none" stroke="${STEEL}" stroke-width="1.5"/>`;
    });
  });
  let marks = under + over;
  pileRows.forEach((pile, i) => {
    const box = left[i];
    marks += `<path d="M${leftEdge - 2} ${num(box.y)}H${leftEdge + 2}V${num(box.y + box.height)}H${leftEdge - 2}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
    const startY = box.y + box.height / 2 - ((pile.lines.length - 1) * 15) / 2 + 4;
    pile.lines.forEach((line, k) => {
      marks += text(leftEdge - 7, startY + k * 15, line, { size: 13.4, weight: pile.id === openId ? 700 : 400, anchor: 'end' });
    });
  });
  for (const theme of THEMES) {
    const box = right[theme.id];
    marks += `<path d="M${rightEdge + 2} ${num(box.y)}H${rightEdge - 2}V${num(box.y + box.height)}H${rightEdge + 2}" fill="none" stroke="${INK}" stroke-width="1.3"/>`;
    const lines = wrap(theme.short, 14);
    const startY = box.y + box.height / 2 - ((lines.length - 1) * 15) / 2 + 4;
    lines.forEach((line, k) => {
      marks += text(rightEdge + 7, startY + k * 15, line, { size: 13.4 });
    });
  }
  marks += text(leftEdge - 7, 15, 'These piles', { size: 14.5, weight: 700, anchor: 'end' });
  marks += text(rightEdge + 7, 15, 'In the paper', { size: 14.5, weight: 700 });
  return { width: W, height: num(Math.max(leftBottom, ry - gap) + 6), markup: marks };
}

const shade = (value, top) => {
  const share = top ? Math.min(1, value / top) : 0;
  const mix = (a, b) => Math.round(a + (b - a) * share);
  return `rgb(${mix(255, 31)},${mix(255, 90)},${mix(255, 136)})`;
};

export function matrixFigure({ table, stats, labels, columnLines, rowHead, columnHead, selected, clickable }) {
  const k = table.length;
  const cell = k === 6 ? 88 : 110;
  const ml = 150;
  const mt = 66;
  const width = ml + k * cell + 40;
  const height = mt + k * cell + 28;
  const top = Math.max(6, ...table.flat());
  let marks = '';
  table.forEach((row, r) => {
    row.forEach((value, c) => {
      const x = ml + c * cell;
      const y = mt + r * cell;
      const expected = expectedCount(stats, r, c);
      const dark = value / top >= 0.62;
      if (value) marks += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${shade(value, top)}"/>`;
      marks += text(x + cell / 2, y + cell / 2 - 2, value, { size: 21, weight: r === c ? 700 : 400, anchor: 'middle', fill: dark ? WHITE : INK });
      if (stats.N) marks += text(x + cell / 2, y + cell / 2 + 18, `(${expected.toFixed(1)})`, { size: 13, anchor: 'middle', fill: dark ? WHITE : MUTED });
    });
    marks += text(ml + k * cell + 14, mt + r * cell + cell / 2 + 5, stats.rows[r], { size: 15.5 });
    marks += text(ml - 12, mt + r * cell + cell / 2 + 5, labels[r], { size: 14.5, anchor: 'end' });
  });
  for (let i = 0; i <= k; i += 1) {
    marks += `<line x1="${ml}" x2="${ml + k * cell}" y1="${mt + i * cell + 0.5}" y2="${mt + i * cell + 0.5}" stroke="${RULE}"/>`;
    marks += `<line x1="${ml + i * cell + 0.5}" x2="${ml + i * cell + 0.5}" y1="${mt}" y2="${mt + k * cell}" stroke="${RULE}"/>`;
  }
  columnLines.forEach((lines, c) => {
    const x = ml + c * cell + cell / 2;
    lines.forEach((line, i) => {
      marks += text(x, mt - 10 - (lines.length - 1 - i) * 15, line, { size: 12.8, anchor: 'middle' });
    });
    marks += text(x, mt + k * cell + 20, stats.cols[c], { size: 15.5, anchor: 'middle' });
  });
  marks += text(ml + (k * cell) / 2, 14, columnHead, { size: 15.5, weight: 700, anchor: 'middle' });
  rowHead.forEach((line, i) => {
    marks += text(ml - 12, mt - 25 + i * 17, line, { size: 15.5, weight: 700, anchor: 'end' });
  });
  if (selected) marks += `<rect x="${ml + selected.c * cell + 1}" y="${mt + selected.r * cell + 1}" width="${cell - 1}" height="${cell - 1}" fill="none" stroke="${ORANGE}" stroke-width="2.5"/>`;
  if (clickable) {
    table.forEach((row, r) => {
      row.forEach((value, c) => {
        if (value) marks += `<rect class="hit" data-cell="${r},${c}" x="${ml + c * cell}" y="${mt + r * cell}" width="${cell}" height="${cell}" fill="transparent" tabindex="0" role="button" aria-label="${esc(`${value} ${value === 1 ? 'quote' : 'quotes'} printed under ${labels[r]}, chosen as ${labels[c]}`)}"/>`;
      });
    });
  }
  return { width, height, markup: marks };
}

export const FOREST_WIDE = { W: 1160, label: 300, value: 150 };
export const FOREST_NARROW = { W: 940, label: 250, value: 140 };

export function forestFigure(G, rows) {
  const left = G.label;
  const right = G.W - G.value;
  const X = (value) => left + ((value + 1) / 2) * (right - left);
  const rowHeight = 30;
  const top = 22;
  let marks = '';
  [-1, -0.5, 0, 0.5, 1].forEach((value) => {
    marks += `<line x1="${num(X(value))}" x2="${num(X(value))}" y1="${top - 4}" y2="${top + rows.length * rowHeight + 4}" stroke="${value === 0 ? AXIS : FAINT}"/>`;
    marks += text(X(value), top + rows.length * rowHeight + 20, value === 0 ? '0' : value === 1 ? '1' : value === -1 ? '−1' : fixed(value, 1), { size: 13, anchor: 'middle', fill: MUTED });
  });
  marks += text(right + 16, 14, 'Kappa', { weight: 700 });
  marks += text(G.W, 14, '95% limits', { weight: 700, anchor: 'end' });
  rows.forEach((row, i) => {
    const y = top + i * rowHeight + rowHeight / 2;
    marks += text(0, y + 5, row.name, { size: 15.5, weight: row.strong ? 700 : 400 });
    if (row.stats.kappa !== null) {
      const color = row.after ? ORANGE : row.strong ? DEEP : SLATE;
      marks += `<line x1="${num(X(row.stats.lo))}" x2="${num(X(row.stats.hi))}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="2"/>`;
      marks += `<circle cx="${num(X(row.stats.kappa))}" cy="${y}" r="${row.strong ? 6.5 : 5}" fill="${color}"/>`;
      marks += text(right + 16, y + 5, fixed(row.stats.kappa), { size: 15.5, weight: row.strong ? 700 : 400 });
      marks += text(G.W, y + 5, row.stats.se > 0 ? `${fixed(row.stats.lo)} to ${fixed(row.stats.hi)}` : 'Not available', { size: 14.5, anchor: 'end' });
    } else {
      marks += text(right + 16, y + 5, 'Not yet', { size: 14.5 });
    }
    if (row.rule) marks += `<line x1="0" x2="${G.W}" y1="${y + rowHeight / 2}" y2="${y + rowHeight / 2}" stroke="${RULE}"/>`;
  });
  return { width: G.W, height: top + rows.length * rowHeight + 30, markup: marks };
}

export const RASTER_WIDE = { W: 830, left: 40 };
export const RASTER_NARROW = { W: 900, left: 40 };
const GRID_TOP = 54;
const GRID_HEIGHT = 549;

export function rasterFigure(G, view) {
  const { study, order, firstAt, fresh, rule, settings, labels, rowOrder } = view;
  const n = order.length;
  const codes = study.codes.length;
  const width = G.W - G.left - 8;
  const cw = width / n;
  const ch = GRID_HEIGHT / codes;
  const barTop = GRID_TOP + GRID_HEIGHT + 26;
  const barHeight = 92;
  const most = Math.max(1, ...fresh);
  const stopX = rule.stop === null ? null : G.left + cw * rule.stop;
  const gapX = Math.min(1, cw * 0.06);
  const gapY = Math.min(0.9, ch * 0.16);
  let cells = '';
  rowOrder.forEach((r, y) => {
    const row = study.rows[r];
    let seen = 0;
    order.forEach((column, x) => {
      if (row[column] !== '1') return;
      seen += 1;
      const first = seen === settings.times;
      cells += `<rect x="${num(G.left + x * cw + gapX / 2)}" y="${num(GRID_TOP + y * ch + gapY / 2)}" width="${num(cw - gapX)}" height="${num(ch - gapY)}" fill="${first ? DEEP : LIGHT}"/>`;
    });
  });
  let axis = '';
  for (let x = 0; x < n; x += 1) {
    const label = x + 1;
    if (label === 1 || label % (n > 40 ? 10 : 5) === 0) axis += text(G.left + x * cw + cw / 2, GRID_TOP - 6, label, { size: 12.5, anchor: 'middle', fill: MUTED });
  }
  const bracket = (x1, x2, y, label, color) => `<path d="M${num(x1 + 1)} ${y + 6}V${y}H${num(x2 - 1)}V${y + 6}" fill="none" stroke="${color}" stroke-width="1.5"/>${text((x1 + x2) / 2, y - 5, label, { weight: 700, anchor: 'middle', fill: color })}`;
  let bars = '';
  fresh.forEach((value, x) => {
    const height = (value / most) * barHeight;
    const inRun = rule.stop !== null && x >= rule.stop && x < rule.stop + settings.run;
    const color = x < settings.base ? DEEP : inRun ? ORANGE : MID;
    if (value > 0) bars += `<rect x="${num(G.left + x * cw + Math.min(2, cw * 0.1))}" y="${num(barTop + barHeight - height)}" width="${num(cw - 2 * Math.min(2, cw * 0.1))}" height="${num(height)}" fill="${color}"/>`;
    if (x < settings.base + settings.run + 2 && (value > 0 || inRun)) bars += text(G.left + x * cw + cw / 2, barTop + barHeight - height - 4, value, { size: 12, anchor: 'middle', fill: SLATE });
  });
  const notes = labels.map(({ r, row, end }) => {
    const x = G.left + firstAt[r] * cw;
    const y = GRID_TOP + row * ch + ch / 2;
    const endX = G.left + end * cw;
    const when = settings.times === 1 ? `first seen in interview ${firstAt[r] + 1}` : `seen ${settings.times} times by interview ${firstAt[r] + 1}`;
    return `<line x1="${num(x - 3)}" x2="${num(endX)}" y1="${num(y)}" y2="${num(y)}" stroke="${AXIS}"/><text x="${num(endX - 5)}" y="${num(y + 4.2)}" font-size="13.5" text-anchor="end" fill="${INK}" paint-order="stroke" stroke="${WHITE}" stroke-width="3">${esc(study.codes[r])}, ${when}</text>`;
  }).join('');
  const marks = `${bracket(G.left, G.left + cw * settings.base, 24, 'Base', DEEP)}${rule.stop === null ? '' : bracket(stopX, stopX + cw * settings.run, 24, 'Run', ORANGE)}${cells}${axis}${stopX === null ? '' : `<line x1="${num(stopX)}" x2="${num(stopX)}" y1="30" y2="${barTop + barHeight}" stroke="${ORANGE}" stroke-width="1.5"/>`}${notes}<line x1="${G.left}" x2="${G.left + width}" y1="${barTop + barHeight + 0.5}" y2="${barTop + barHeight + 0.5}" stroke="${AXIS}"/>${bars}${text(G.left + width, barTop + 12, 'New codes in each interview', { anchor: 'end' })}${text(G.left + width, barTop + barHeight + 20, view.axisLabel, { anchor: 'end' })}${text(G.left + width, GRID_TOP + GRID_HEIGHT + 15, `${codes} codes, one in each row`, { anchor: 'end' })}<rect data-band fill="none" stroke="${ORANGE}" stroke-width="1.4" visibility="hidden"/>`;
  return { width: G.W, height: barTop + barHeight + 44, markup: marks };
}

export function rowAt(G, view, x, y) {
  const codes = view.study.codes.length;
  if (y < GRID_TOP || y > GRID_TOP + GRID_HEIGHT || x < G.left || x > G.W - 8) return null;
  return view.rowOrder[Math.min(codes - 1, Math.floor(((y - GRID_TOP) / GRID_HEIGHT) * codes))];
}

export function rowBand(G, view, r) {
  const height = GRID_HEIGHT / view.study.codes.length;
  return { x: G.left, y: num(GRID_TOP + view.rowOrder.indexOf(r) * height), width: G.W - G.left - 8, height: num(height) };
}

export function histFigure(view) {
  const { result, median } = view;
  const W = 318;
  const barsHeight = 112;
  const top = 16;
  const lastUsed = result.tally.reduce((last, value, s) => (value ? s : last), 0);
  const maxStop = Math.max(20, lastUsed);
  const X = (s) => 8 + ((s - 1) / (maxStop - 1)) * (W - 16);
  const barWidth = Math.max(2, ((W - 16) / (maxStop - 1)) * 0.86);
  const most = Math.max(...result.tally);
  let marks = '';
  result.tally.forEach((value, s) => {
    if (!value) return;
    const height = Math.max(1, (value / most) * barsHeight);
    marks += `<rect x="${num(X(s) - barWidth / 2)}" y="${num(top + barsHeight - height)}" width="${num(barWidth)}" height="${num(height)}" fill="${s === median ? DEEP : MID}"/>`;
  });
  marks += `<line x1="0" x2="${W}" y1="${top + barsHeight + 0.5}" y2="${top + barsHeight + 0.5}" stroke="${AXIS}"/>`;
  const stepSize = maxStop > 30 ? 10 : 4;
  for (let s = stepSize; s <= maxStop; s += stepSize) marks += text(X(s), top + barsHeight + 16, s, { size: 12.5, anchor: 'middle', fill: MUTED });
  marks += `<path d="M${num(X(9))} ${top + barsHeight + 25}V${top + barsHeight + 31}H${num(X(17))}V${top + barsHeight + 25}" fill="none" stroke="${SLATE}" stroke-width="1.5"/>`;
  marks += text(W / 2, top + barsHeight + 49, 'Most tests in Hennink and Kaiser (2022)', { size: 13, anchor: 'middle', fill: SLATE });
  return { width: W, height: barsHeight + 74, markup: marks };
}
