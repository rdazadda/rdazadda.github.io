import { fixed, percent } from '../lib/thematic-agreement.js';
import { FOREST_NARROW, FOREST_WIDE, RASTER_NARROW, RASTER_WIDE, TRACE_NARROW, TRACE_WIDE, esc, forestFigure, histFigure, linesFigure, matrixFigure, quotesFor, rasterFigure, rowAt, rowBand, traceFigure } from '../lib/thematic-figures.js';
import { random } from '../lib/thematic-saturation.js';
import { CODES, EXAMPLE_PILES, EXAMPLE_TRAY, MULTI_NARRATION, PASSAGES, QUOTES, QUOTE_ORDER, THEMES, THEMES_NARRATION, agreementView, codeById, exampleCodes, multiView, narratePower, narrateSaturation, numberWord, pileFlag, quoteById, readsHtml, rowNote, sampleNote, saturationView, speakerLine, themeById, transcriptHtml, wordsOf } from '../lib/thematic-views.js';

const root = document.querySelector('.thematic');
const find = (selector) => root.querySelector(selector);
const all = (selector) => [...root.querySelectorAll(selector)];
const showing = (node) => node.getClientRects().length > 0;
const PIN = { preventScroll: true };
const plural = (count, one, many) => (count === 1 ? one : many);

let view = 'coding';
let usingKeys = false;

function show(svg, figure, capped) {
  svg.setAttribute('viewBox', `0 0 ${figure.width} ${figure.height}`);
  if (capped) svg.style.maxWidth = `${figure.width}px`;
  svg.innerHTML = figure.markup;
}

function press(name, test) {
  for (const button of all(`[data-${name}]`)) button.setAttribute('aria-pressed', String(test(button.getAttribute(`data-${name}`))));
}

const coding = { index: 0, paper: 'with', codes: exampleCodes(), pending: null, hot: null, dragging: false, viaKeys: false, made: 0 };
const work = find('[data-work]');
const transcript = find('[data-transcript]');
const lanes = all('[data-lane]');
const namers = { says: find('#name-says'), means: find('#name-means') };
const namings = { says: namers.says.closest('.naming'), means: namers.means.closest('.naming') };
const keyFirst = find('#code-first');
const keyLast = find('#code-last');
const LAYERS = ['says', 'means', 'pending', 'hot'];
let words = [];
let wordText = [];

const currentCodes = () => coding.codes[coding.index];

function paintWords() {
  const spans = { says: [], means: [], pending: coding.pending ? [coding.pending] : [], hot: coding.hot ? [coding.hot] : [] };
  for (const code of currentCodes()) spans[code.lane].push(code);
  words.forEach((word, i) => {
    for (const layer of LAYERS) {
      word.classList.toggle(layer, spans[layer].some((span) => span.from <= i && i <= span.to));
      word.classList.toggle(`${layer}-on`, spans[layer].some((span) => span.from <= i && i < span.to));
    }
  });
}

function extent(from, to) {
  const first = words[from].firstChild.getClientRects()[0];
  const rects = words[to].firstChild.getClientRects();
  return { top: first.top, bottom: rects[rects.length - 1].bottom };
}

function layoutCoding() {
  if (view !== 'coding' || !words.length) return;
  work.style.minHeight = '';
  let tallest = 0;
  for (const lane of lanes) {
    if (!showing(lane)) continue;
    const laneTop = lane.getBoundingClientRect().top;
    const nodes = [...lane.querySelectorAll('.mark, .naming:not([hidden])')];
    const placed = nodes.map((node) => {
      const box = extent(Number(node.dataset.from), Number(node.dataset.to));
      return { node, from: Number(node.dataset.from), to: Number(node.dataset.to), top: box.top - laneTop, bottom: box.bottom - laneTop };
    }).sort((a, b) => a.top - b.top || a.from - b.from || a.to - b.to);
    const tracks = [];
    for (const item of placed) {
      let track = tracks.findIndex((bottom) => bottom <= item.top);
      if (track < 0) {
        track = tracks.length;
        tracks.push(0);
      }
      tracks[track] = item.bottom + 1;
      item.track = track;
    }
    const columns = Math.min(3, Math.max(1, tracks.length));
    let floor = 54;
    for (const item of placed) {
      const bracket = item.node.querySelector('.bracket');
      bracket.style.left = `${10 + (item.track % 3) * 11}px`;
      bracket.style.top = `${item.top}px`;
      bracket.style.height = `${item.bottom - item.top}px`;
      const label = item.node.querySelector('.label');
      const labelTop = Math.max(item.top, floor);
      label.style.left = `${10 + columns * 11 + 3}px`;
      label.style.top = `${labelTop}px`;
      floor = labelTop + label.offsetHeight + 8;
      tallest = Math.max(tallest, floor, item.bottom);
    }
  }
  work.style.minHeight = `${Math.ceil(tallest + 14)}px`;
}

function markHtml({ id, from, to, name, theme, removable }) {
  const themeLine = theme ? `<span class="theme">Theme: ${esc(themeById.get(theme).name)}</span>` : '';
  const drop = removable ? `<button type="button" class="drop" data-remove="${id}" aria-label="${esc(`Remove the code ${name}`)}">×</button>` : '';
  return `<div class="mark" data-from="${from}" data-to="${to}"><span class="bracket"></span><span class="label"><span${removable ? ' class="named"' : ''}>${esc(name)}</span>${drop}${themeLine}</span></div>`;
}

function drawMarks() {
  const passage = PASSAGES[coding.index];
  for (const lane of lanes) {
    const name = lane.dataset.lane;
    const items = name === 'paper'
      ? passage.marks.map((mark) => ({ id: mark.quote, from: mark.from, to: mark.to, name: codeById.get(mark.code).name, theme: mark.theme }))
      : currentCodes().filter((code) => code.lane === name).map((code) => ({ ...code, removable: true }));
    lane.querySelector('.marks').innerHTML = items.map(markHtml).join('');
  }
  layoutCoding();
}

function drawStatus() {
  const list = currentCodes();
  const covered = new Set();
  for (const code of list) for (let i = code.from; i <= code.to; i += 1) covered.add(i);
  const examples = list.filter((code) => code.example).length;
  let out = list.length ? `This passage has ${list.length} ${plural(list.length, 'code', 'codes')} on ${covered.size} of its ${words.length} words.` : 'This passage has no codes yet.';
  const count = numberWord(examples);
  if (examples === 1 && list.length === 1) out += ' It is an example written for this page.';
  else if (examples === 2 && list.length === 2) out += ' Both are examples written for this page.';
  else if (examples === list.length && examples) out += ' All of them are examples written for this page.';
  else if (examples === 1) out += ' One of them is an example written for this page.';
  else if (examples) out += ` ${count[0].toUpperCase()}${count.slice(1)} of them are examples written for this page.`;
  if (coding.pending) out += ' One stretch is being named.';
  find('[data-coding-status]').textContent = out;
}

function drawCoding() {
  press('passage', (value) => Number(value) === coding.index);
  press('paper', (value) => value === coding.paper);
  work.classList.toggle('no-paper', coding.paper === 'without');
  find('[data-reads]').hidden = coding.paper === 'without';
  paintWords();
  drawMarks();
  drawStatus();
}

function fillNames() {
  const names = [...new Set(coding.codes.flat().map((code) => code.name))];
  find('#code-names').innerHTML = names.map((name) => `<option value="${esc(name)}"></option>`).join('');
}

function beginNaming(span, focus) {
  coding.pending = span;
  for (const lane of ['says', 'means']) {
    namings[lane].hidden = false;
    namings[lane].dataset.from = span.from;
    namings[lane].dataset.to = span.to;
  }
  paintWords();
  layoutCoding();
  drawStatus();
  if (focus) namers.says.focus(PIN);
}

function commitLane(lane) {
  const name = namers[lane].value.trim();
  namers[lane].value = '';
  if (!name || !coding.pending) return;
  coding.made += 1;
  currentCodes().push({ id: `m${coding.made}`, lane, name, from: coding.pending.from, to: coding.pending.to, example: false });
  namings[lane].hidden = true;
  fillNames();
}

function endNaming() {
  coding.pending = null;
  for (const lane of ['says', 'means']) {
    namers[lane].value = '';
    namings[lane].hidden = true;
  }
  const selection = getSelection();
  if (selection && !selection.isCollapsed && transcript.contains(selection.anchorNode)) selection.removeAllRanges();
  drawCoding();
}

function finishNaming() {
  commitLane('says');
  commitLane('means');
  endNaming();
}

function afterKeys() {
  if (!coding.viaKeys) return;
  coding.viaKeys = false;
  keyFirst.focus(PIN);
}

function wordsInSelection() {
  const selection = getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount || !transcript.contains(selection.anchorNode)) return null;
  const range = selection.getRangeAt(0);
  const probe = document.createRange();
  let from = null;
  let to = null;
  words.forEach((word, i) => {
    probe.selectNodeContents(word.firstChild);
    if (range.compareBoundaryPoints(Range.END_TO_START, probe) < 0 && range.compareBoundaryPoints(Range.START_TO_END, probe) > 0) {
      if (from === null) from = i;
      to = i;
    }
  });
  return from === null ? null : { from, to };
}

function speakKeys() {
  keyFirst.setAttribute('aria-valuetext', `Word ${Number(keyFirst.value) + 1} of ${words.length}, ${wordText[Number(keyFirst.value)]}`);
  keyLast.setAttribute('aria-valuetext', `Word ${Number(keyLast.value) + 1} of ${words.length}, ${wordText[Number(keyLast.value)]}`);
}

function loadPassage(index) {
  coding.index = index;
  coding.pending = null;
  coding.hot = null;
  for (const lane of ['says', 'means']) {
    namers[lane].value = '';
    namings[lane].hidden = true;
  }
  const passage = PASSAGES[index];
  transcript.innerHTML = transcriptHtml(passage);
  words = [...transcript.querySelectorAll('.w')];
  wordText = wordsOf(passage).map((item) => item.word);
  find('[data-speaker]').textContent = speakerLine(passage);
  find('[data-reads]').innerHTML = readsHtml(passage);
  for (const input of [keyFirst, keyLast]) {
    input.max = String(words.length - 1);
    input.value = '0';
  }
  speakKeys();
  drawCoding();
}

function setHot(mark) {
  for (const node of work.querySelectorAll('.mark.hot')) node.classList.remove('hot');
  coding.hot = mark ? { from: Number(mark.dataset.from), to: Number(mark.dataset.to) } : null;
  if (mark) mark.classList.add('hot');
  paintWords();
}

function onKeys(event) {
  let first = Number(keyFirst.value);
  let last = Number(keyLast.value);
  if (event.target === keyFirst && first > last) last = first;
  if (event.target === keyLast && last < first) first = last;
  keyFirst.value = String(first);
  keyLast.value = String(last);
  speakKeys();
  coding.viaKeys = true;
  beginNaming({ from: first, to: last }, false);
}

const sortStart = () => ({ piles: EXAMPLE_PILES.map((pile) => ({ ...pile, codes: [...pile.codes] })), tray: [...EXAMPLE_TRAY], open: 'p2', picked: null, made: EXAMPLE_PILES.length });
const FIRST_PICK = { type: 'person', id: 'Male, 75 years, good health, insufficiently active' };

const themes = { sub: 'sort', ...sortStart(), pick: FIRST_PICK };

function readerCodes() {
  const made = new Map();
  coding.codes.forEach((list, passage) => {
    for (const code of list) {
      if (code.example) continue;
      const name = code.name.trim();
      const id = `r:${name.toLowerCase()}`;
      if (!made.has(id)) made.set(id, { id, name, places: [] });
      made.get(id).places.push({ passage, from: code.from, to: code.to });
    }
  });
  return made;
}

function codeHtml(id, made) {
  const own = id.startsWith('r:');
  const name = own ? made.get(id).name : codeById.get(id).name;
  return `<button type="button" class="code" data-code="${esc(id)}" aria-pressed="${themes.picked === id}">${own ? `<span class="made">${esc(name)}</span>` : esc(name)}</button>`;
}

function flagHtml(pile) {
  const flag = pileFlag(pile);
  return flag ? `<b>${flag[0]}</b> ${flag[1]}` : '';
}

function pileHtml(pile, made) {
  const holds = themes.picked && pile.codes.includes(themes.picked);
  const list = pile.codes.length ? pile.codes.map((id) => codeHtml(id, made)).join('') : '<span class="empty">No codes yet.</span>';
  const put = themes.picked && !holds ? `<button type="button" class="put" data-put="${pile.id}" aria-label="${esc(`Put here, in ${pile.name.trim() || 'the pile with no name'}`)}"><span>Put here</span></button>` : '';
  const remove = pile.codes.length ? '' : `<button type="button" class="again" data-pile-remove="${pile.id}"><span>Remove this pile</span></button>`;
  return `<div class="pile${pile.id === themes.open ? ' open' : ''}" data-drop="${pile.id}">
    <input class="pile-name" type="text" value="${esc(pile.name)}" data-pile-name="${pile.id}" aria-label="Name of this pile" placeholder="Name this pile" maxlength="80" autocomplete="off" />
    <div class="code-list">${list}</div>
    ${put}
    <p class="flag" data-flag="${pile.id}">${flagHtml(pile)}</p>
    <div class="pile-actions"><button type="button" class="again" data-read="${pile.id}"><span>Read its quotes</span></button>${remove}</div>
  </div>`;
}

function drawLines(made) {
  const svg = find('[data-lines]');
  show(svg, linesFigure(themes.piles, themes.open), true);
  const left = themes.tray.length;
  const lined = themes.piles.some((pile) => pile.codes.some((id) => !id.startsWith('r:')));
  const notes = [];
  if (lined) notes.push('Each line is one code.');
  if (left) notes.push(`The ${numberWord(left)} ${plural(left, 'code', 'codes')} not sorted yet ${plural(left, 'is', 'are')} left out.`);
  if (made.size) notes.push('Codes made in the Coding tab have no line, since they are not in the paper.');
  find('[data-lines-note]').textContent = notes.join(' ');
  const count = themes.piles.length;
  find('[data-count]').innerHTML = `<b>${count} ${plural(count, 'pile', 'piles')}.</b> Braun and Clarke (2022) advise two to six themes in one report.`;
}

function drawReading(made) {
  const title = find('[data-reading-title]');
  const pile = themes.piles.find((item) => item.id === themes.open);
  if (!pile) {
    title.textContent = 'Reading a pile';
    find('[data-reading]').innerHTML = '<div>No pile is open. Each pile has a link to read its quotes.</div>';
    return;
  }
  title.textContent = pile.name.trim() ? `Reading the pile called ${pile.name.trim()}` : 'Reading a pile with no name yet';
  const rows = [];
  for (const id of pile.codes) {
    if (id.startsWith('r:')) {
      const code = made.get(id);
      for (const place of code.places) {
        const text = wordsOf(PASSAGES[place.passage]).slice(place.from, place.to + 1).map((item) => item.word).join(' ');
        rows.push(`<div>“${esc(text)}”<span class="who-line">Marked in passage ${place.passage + 1}. Code: ${esc(code.name)}.</span></div>`);
      }
      continue;
    }
    const code = codeById.get(id);
    const quotes = QUOTES.filter((quote) => quote.code === id);
    if (!quotes.length) rows.push(`<div>The paper prints no quote for the code “${esc(code.name)}”.</div>`);
    for (const quote of quotes) rows.push(`<div>“${esc(quote.text)}”<span class="who-line">${esc(quote.label)}. Code: ${esc(code.name)}.</span></div>`);
  }
  find('[data-reading]').innerHTML = rows.length ? rows.join('') : '<div>This pile has no codes yet.</div>';
}

function drawBoard() {
  const active = document.activeElement;
  const focusCode = active?.dataset?.code;
  const focusPut = active?.dataset?.put;
  const made = readerCodes();
  for (const pile of themes.piles) pile.codes = pile.codes.filter((id) => !id.startsWith('r:') || made.has(id));
  const inPiles = new Set(themes.piles.flatMap((pile) => pile.codes));
  const tray = [...themes.tray, ...[...made.keys()].filter((id) => !inPiles.has(id))];
  find('[data-tray]').innerHTML = tray.length ? tray.map((id) => codeHtml(id, made)).join('') : '<span class="empty">Every code is in a pile.</span>';
  find('[data-piles]').innerHTML = themes.piles.map((pile) => pileHtml(pile, made)).join('');
  find('[data-put="tray"]').hidden = !themes.picked || tray.includes(themes.picked);
  drawLines(made);
  drawReading(made);
  if (!usingKeys) return;
  if (focusCode) all('.code').find((node) => node.dataset.code === focusCode)?.focus(PIN);
  else if (focusPut && themes.picked) all('.put').find((node) => node.dataset.put === focusPut)?.focus(PIN);
}

function moveCode(id, target) {
  for (const pile of themes.piles) pile.codes = pile.codes.filter((code) => code !== id);
  themes.tray = themes.tray.filter((code) => code !== id);
  if (target === 'tray') {
    if (!id.startsWith('r:')) themes.tray.push(id);
  } else themes.piles.find((pile) => pile.id === target).codes.push(id);
  themes.picked = null;
  drawBoard();
  if (usingKeys) all('.code').find((node) => node.dataset.code === id)?.focus(PIN);
}

const traceSvgs = [[find('[data-trace="wide"]'), TRACE_WIDE], [find('[data-trace="narrow"]'), TRACE_NARROW]];
const shortPerson = (label) => label.replace(' years', '').replace(/, (sufficiently|insufficiently) active/, '');

function pickWords(pick, count) {
  const first = count === 1 ? 'One quote' : `The ${count} quotes`;
  if (pick.type === 'person') return { key: `The person picked here, ${shortPerson(pick.id)}`, head: `${first} from ${shortPerson(pick.id)}` };
  if (pick.type === 'code') return { key: `The code picked here, ${codeById.get(pick.id).name}`, head: `${first} linked to this code` };
  if (pick.type === 'theme') return { key: `The theme picked here, ${themeById.get(pick.id).short}`, head: `${first} under this theme` };
  return { key: 'The quote picked here', head: 'One quote' };
}

function drawTrace() {
  const focusPick = document.activeElement?.dataset?.pick;
  for (const [svg, G] of traceSvgs) show(svg, traceFigure(G, themes.pick));
  const list = quotesFor(themes.pick);
  const wording = pickWords(themes.pick, list.length);
  find('[data-trace-key]').textContent = wording.key;
  const head = `<div class="head-row"><span>${esc(wording.head)}</span><span>Code</span><span>Theme</span></div>`;
  const rows = list.map((quote) => `<div><span>“${esc(quote.text)}”<span class="who-line">${esc(quote.label)}</span></span><span>${esc(codeById.get(quote.code).name)}</span><span>${esc(themeById.get(quote.theme).name)}</span></div>`).join('');
  find('[data-trace-rows]').innerHTML = list.length ? head + rows : '<div>The paper prints no quote for this code.</div>';
  if (usingKeys && focusPick) all('[data-pick]').find((node) => node.dataset.pick === focusPick && showing(node))?.focus(PIN);
}

function drawThemes() {
  press('sub-themes', (value) => value === themes.sub);
  find('[data-themes-narration]').textContent = THEMES_NARRATION[themes.sub];
  find('[data-subpage="sort"]').hidden = themes.sub !== 'sort';
  find('[data-subpage="trace"]').hidden = themes.sub !== 'trace';
  if (themes.sub === 'sort') drawBoard();
  else drawTrace();
}

let drag = null;
let skipClick = false;

function endDrag(drop) {
  if (!drag) return;
  const { id, over, ghost } = drag;
  ghost?.remove();
  over?.classList.remove('over');
  drag = null;
  if (ghost) skipClick = true;
  if (drop && over) moveCode(id, over.dataset.drop);
}

function startDrag(event) {
  skipClick = false;
  const button = event.target.closest('.code');
  if (!button || event.pointerType !== 'mouse' || event.button !== 0) return;
  drag = { id: button.dataset.code, node: button, pointer: event.pointerId, x: event.clientX, y: event.clientY, ghost: null, over: null };
}

function moveDrag(event) {
  if (!drag) return;
  if (!drag.ghost) {
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
    drag.ghost = document.createElement('div');
    drag.ghost.className = 'drag-ghost';
    drag.ghost.textContent = drag.node.textContent;
    root.append(drag.ghost);
    drag.node.setPointerCapture(drag.pointer);
    if (themes.picked) {
      themes.picked = null;
      for (const node of all('.put')) node.hidden = true;
      for (const node of all('.code[aria-pressed="true"]')) node.setAttribute('aria-pressed', 'false');
    }
  }
  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 8}px`;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]') ?? null;
  if (target !== drag.over) {
    drag.over?.classList.remove('over');
    target?.classList.add('over');
    drag.over = target;
  }
}

const agreeStart = () => ({ source: 'coding', mode: 'one', answers: {}, log: [], multi: {}, multiLog: [], draft: [], selected: null, chance: 0 });
const agree = agreeStart();

function leftPanel() {
  if (agree.source !== 'coding') {
    const { quote, source } = agreementView(agree).preset;
    return `<p class="quote-text">${esc(quote)}</p><span class="who-line">${esc(source)}</span>`;
  }
  const total = QUOTE_ORDER.length;
  if (agree.mode === 'one') {
    const next = QUOTE_ORDER.find((id) => !agree.answers[id]);
    if (!next) return `<p>All ${total} quotes are coded.</p>`;
    const quote = quoteById.get(next);
    const buttons = THEMES.map((theme) => `<button type="button" class="pick" data-answer="${theme.id}" aria-describedby="quote-now">${esc(theme.name)}</button>`).join('');
    return `<span class="choice-name">Quote ${agree.log.length + 1} of ${total}</span><p class="quote-text" id="quote-now">“${esc(quote.text)}”</p><span class="who-line">${esc(quote.label)}</span><div class="pick-list">${buttons}</div><p class="note small">A printed quote sits under one heading, which does not mean it fits only there.</p>`;
  }
  const next = QUOTE_ORDER.find((id) => !agree.multi[id]);
  if (!next) return `<p>All ${total} quotes are coded.</p>`;
  const quote = quoteById.get(next);
  const buttons = THEMES.map((theme) => `<button type="button" class="pick" data-toggle="${theme.id}" aria-describedby="quote-now" aria-pressed="${agree.draft.includes(theme.id)}">${esc(theme.name)}</button>`).join('');
  return `<span class="choice-name">Quote ${agree.multiLog.length + 1} of ${total}</span><p class="quote-text" id="quote-now">“${esc(quote.text)}”</p><span class="who-line">${esc(quote.label)}</span><div class="pick-list">${buttons}</div><button type="button" class="again" data-action="next-quote"><span>Next quote</span></button>`;
}

function readoutsHtml({ stats, alpha }) {
  const read = (name, value, big) => `<div class="read${big ? ' big' : ''}"><span class="t">${name}</span><span class="n${value === 'Not yet' ? ' words' : ''}">${value}</span></div>`;
  const shown = (value, format) => (value === null ? 'Not yet' : format(value));
  return read('Cohen’s kappa', shown(stats.kappa, fixed), true)
    + read('Percent agreement', shown(stats.po, percent))
    + read('Expected by chance', shown(stats.pc, percent))
    + read('Largest kappa these margins allow', shown(stats.kappaMax, fixed))
    + read('Krippendorff’s alpha', shown(alpha, fixed));
}

function binaryHtml(rows) {
  const body = rows.map(({ name, table, stats }) => `<tr><th scope="row">${esc(name)}</th><td>${table[0][0]}</td><td>${table[0][1]}</td><td>${table[1][0]}</td><td>${table[1][1]}</td><td>${stats.kappa === null ? 'Not yet' : fixed(stats.kappa)}</td></tr>`).join('');
  return `<table><thead><tr><th scope="col">Theme</th><th scope="col">Both yes</th><th scope="col">Paper only</th><th scope="col">Second coder only</th><th scope="col">Neither</th><th scope="col">Kappa</th></tr></thead><tbody>${body}</tbody></table>`;
}

function talkHtml(stats) {
  if (agree.source !== 'coding' || agree.mode !== 'one' || !stats.N) return '';
  if (!agree.selected) return '<p class="note">Choose a cell in the table to read its quotes and talk them over.</p>';
  const { r, c } = agree.selected;
  const paper = THEMES[r];
  const chosen = THEMES[c];
  const ids = agree.log.filter((id) => quoteById.get(id).theme === paper.id && agree.answers[id].first === chosen.id);
  const count = ids.length;
  const lead = `${count === 1 ? 'This quote is' : `These ${count} quotes are`} printed under ${paper.short}, and the second coder chose ${r === c ? 'the same theme' : chosen.short}.`;
  const rows = ids.map((id) => {
    const quote = quoteById.get(id);
    const changed = agree.answers[id].now !== agree.answers[id].first;
    const change = `Change to ${esc(paper.short)}`;
    const keep = r === c ? '' : `<span class="keep"><button type="button" data-talk="${id}|keep" data-text="Keep" aria-pressed="${!changed}">Keep</button><button type="button" data-talk="${id}|change" data-text="${change}" aria-pressed="${changed}">${change}</button></span>`;
    return `<div><span>“${esc(quote.text)}”<span class="who-line">${esc(quote.label)}</span></span>${keep}</div>`;
  }).join('');
  return `<h3>Talking over the marked cell</h3><p class="lead">${esc(lead)}</p><div class="rows">${rows}</div>`;
}

const forestSvgs = [[find('[data-forest="wide"]'), FOREST_WIDE], [find('[data-forest="narrow"]'), FOREST_NARROW]];

function drawAgreement() {
  const active = document.activeElement;
  const focusCell = active?.dataset?.cell;
  const focusTalk = active?.dataset?.talk;
  const focusIndex = active?.dataset?.answer || active?.dataset?.toggle ? THEMES.findIndex((theme) => theme.id === (active.dataset.answer ?? active.dataset.toggle)) : -1;
  const coded = agree.source === 'coding';
  const many = coded && agree.mode === 'many';
  agree.chance = Object.values(agree.answers).filter((answer) => answer.byChance).length;
  press('source', (value) => value === agree.source);
  press('mode', (value) => value === agree.mode);
  find('[data-mode-choice]').hidden = !coded;
  const undo = find('[data-action="undo"]');
  const fill = find('[data-action="fill"]');
  undo.hidden = !coded;
  undo.disabled = many ? !agree.multiLog.length : !agree.log.length;
  fill.hidden = !coded || many;
  fill.disabled = agree.log.length === QUOTE_ORDER.length;
  find('[data-agree-left]').innerHTML = leftPanel();
  const matrixWrap = find('[data-matrix-wrap]');
  const binary = find('[data-binary]');
  const readouts = find('[data-readouts]');
  matrixWrap.hidden = many;
  binary.hidden = !many;
  readouts.hidden = many;
  find('[data-matrix-note]').hidden = many;
  find('[data-campbell]').hidden = !coded || many;
  let rows;
  if (many) {
    const list = multiView(agree.multi);
    binary.innerHTML = binaryHtml(list);
    find('[data-agreement-narration]').textContent = MULTI_NARRATION;
    rows = list.map(({ name, stats }) => ({ name, stats }));
    find('[data-talk-area]').innerHTML = '';
  } else {
    const data = agreementView(agree);
    if (agree.selected && !data.table[agree.selected.r][agree.selected.c]) agree.selected = null;
    show(find('[data-matrix]'), matrixFigure({ table: data.table, stats: data.stats, labels: data.labels, columnLines: data.columnLines, rowHead: data.rowHead, columnHead: data.columnHead, selected: coded ? agree.selected : null, clickable: coded }), true);
    readouts.innerHTML = readoutsHtml(data);
    find('[data-agreement-narration]').textContent = data.narration;
    rows = data.forest;
    find('[data-talk-area]').innerHTML = talkHtml(data.stats);
  }
  const spoken = rows.map(({ name, stats }) => {
    if (stats.kappa === null) return `${name}, not yet.`;
    return stats.se > 0 ? `${name}, ${fixed(stats.kappa)}, limits ${fixed(stats.lo)} to ${fixed(stats.hi)}.` : `${name}, ${fixed(stats.kappa)}, no limits.`;
  });
  for (const [svg, G] of forestSvgs) {
    show(svg, forestFigure(G, rows));
    svg.setAttribute('aria-label', ['Kappa with 95% limits.', ...spoken].join(' '));
  }
  if (!usingKeys) return;
  if (focusCell) all('[data-cell]').find((node) => node.dataset.cell === focusCell)?.focus(PIN);
  else if (focusTalk) all('[data-talk]').find((node) => node.dataset.talk === focusTalk)?.focus(PIN);
  else if (focusIndex >= 0) (all('.pick')[focusIndex] ?? undo).focus(PIN);
}

const SAT_START = { study: 0, shuffle: 0, seed: 0, row: null, base: 4, run: 2, allow: 5, times: 1 };
const PLANNED_START = [50, 50, 50, 50, 50];
const RULES = {
  base: { from: 4, shown: (value) => String(value), spoken: (value) => `The first ${value} interviews` },
  run: { from: 2, shown: (value) => String(value), spoken: (value) => `The next ${value} interviews` },
  allow: { from: 0, shown: (value) => `${value}%`, spoken: (value) => `${value}% new information` },
  times: { from: 1, shown: (value) => String(value), spoken: (value) => `${value} ${plural(value, 'time', 'times')}` },
};
const sat = { ...SAT_START, sub: 'saturation', planned: [...PLANNED_START] };
const rasterSvgs = [[find('[data-raster="wide"]'), RASTER_WIDE], [find('[data-raster="narrow"]'), RASTER_NARROW]];
const keyRow = find('#sat-row');
let satView = null;

function moveBand() {
  for (const [svg, G] of rasterSvgs) {
    const band = svg.querySelector('[data-band]');
    if (!band) continue;
    if (sat.row === null) {
      band.setAttribute('visibility', 'hidden');
      continue;
    }
    const box = rowBand(G, satView, sat.row);
    band.setAttribute('x', box.x);
    band.setAttribute('y', box.y);
    band.setAttribute('width', box.width);
    band.setAttribute('height', box.height);
    band.setAttribute('visibility', 'visible');
  }
  find('[data-row-note]').textContent = rowNote(satView, sat.row);
}

function drawSaturation() {
  satView = saturationView(sat);
  find('[data-interviews-narration]').textContent = narrateSaturation(satView);
  press('study', (value) => Number(value) === sat.study);
  for (const input of all('[data-rule]')) {
    const name = input.dataset.rule;
    const rule = RULES[name];
    const position = sat[name] - rule.from;
    input.value = String(position);
    input.style.setProperty('--fill', `${(100 * position) / Number(input.max)}%`);
    input.setAttribute('aria-valuetext', rule.spoken(sat[name]));
    input.closest('.ruler').querySelector('.value').textContent = rule.shown(sat[name]);
  }
  const fileOrder = find('[data-action="file-order"]');
  fileOrder.classList.toggle('on', !sat.shuffle);
  fileOrder.setAttribute('aria-pressed', String(!sat.shuffle));
  for (const [svg, G] of rasterSvgs) {
    show(svg, rasterFigure(G, satView));
    svg.setAttribute('aria-label', `${satView.study.codes.length} codes across ${satView.study.interviews} interviews`);
  }
  keyRow.max = String(satView.study.codes.length);
  const { rule, study, settings, found } = satView;
  const verdict = find('[data-verdict]');
  find('[data-verdict-name]').textContent = rule.stop === null ? 'Saturation' : 'Saturation indicated at';
  verdict.textContent = rule.stop === null ? 'Not indicated' : `${rule.stop}+${settings.run}`;
  verdict.classList.toggle('words', rule.stop === null);
  const total = study.codes.length;
  const rows = [['Codes in the base', rule.baseCodes]];
  if (rule.stop !== null) rows.push(['New codes in the run', rule.inRun], ['New information', `${(rule.ratio * 100).toFixed(1)}%`]);
  rows.push([`Of all ${total} codes, ${settings.times === 1 ? 'found' : 'counted'} by interview ${rule.stop ?? study.interviews}`, `${found} (${percent(found / total)})`]);
  find('[data-sums]').innerHTML = rows.map(([name, value]) => `<div><span>${esc(name)}</span><b>${esc(value)}</b></div>`).join('');
  show(find('[data-hist]'), histFigure(satView), true);
  find('[data-sample-note]').textContent = sampleNote(satView);
  moveBand();
}

function drawPower() {
  find('[data-interviews-narration]').textContent = narratePower(sat.planned);
  for (const input of all('[data-power]')) input.value = String(sat.planned[Number(input.dataset.power)]);
}

function drawInterviews() {
  press('sub-interviews', (value) => value === sat.sub);
  find('[data-subpage="saturation"]').hidden = sat.sub !== 'saturation';
  find('[data-subpage="power"]').hidden = sat.sub !== 'power';
  if (sat.sub === 'saturation') drawSaturation();
  else drawPower();
}

function rowFrom(event, svg, G) {
  const box = svg.getBoundingClientRect();
  const scale = G.W / box.width;
  return rowAt(G, satView, (event.clientX - box.left) * scale, (event.clientY - box.top) * scale);
}

const DRAW = {
  coding: drawCoding,
  themes: drawThemes,
  agreement: drawAgreement,
  interviews: drawInterviews,
};

function showView(name) {
  view = name;
  press('page', (value) => value === name);
  for (const section of all('[data-section]')) section.hidden = section.dataset.section !== name;
  DRAW[name]();
}

const ACTIONS = {
  restart: () => {
    if (view === 'coding') {
      coding.codes = exampleCodes();
      coding.paper = 'with';
      fillNames();
      loadPassage(0);
    } else if (view === 'themes') {
      if (themes.sub === 'trace') themes.pick = FIRST_PICK;
      else Object.assign(themes, sortStart());
      drawThemes();
    } else if (view === 'agreement') {
      Object.assign(agree, agreeStart());
      drawAgreement();
    } else if (sat.sub === 'power') {
      sat.planned = [...PLANNED_START];
      drawInterviews();
    } else {
      Object.assign(sat, SAT_START);
      drawInterviews();
    }
  },
  'clear-codes': () => {
    coding.codes[coding.index] = [];
    fillNames();
    endNaming();
  },
  'new-pile': () => {
    themes.made += 1;
    const id = `p${themes.made}`;
    themes.piles.push({ id, name: '', codes: [] });
    drawBoard();
    find(`[data-pile-name="${id}"]`).focus();
  },
  'paper-piles': () => {
    themes.piles = THEMES.map((theme) => ({ id: `paper-${theme.id}`, name: theme.name, codes: CODES.filter((code) => code.theme === theme.id).map((code) => code.id) }));
    themes.tray = [];
    themes.picked = null;
    themes.open = themes.piles[0].id;
    drawBoard();
  },
  'clear-piles': () => {
    themes.made += 1;
    themes.piles = [{ id: `p${themes.made}`, name: '', codes: [] }];
    themes.tray = CODES.map((code) => code.id);
    themes.picked = null;
    themes.open = null;
    drawBoard();
  },
  undo: () => {
    if (agree.mode === 'many') {
      const id = agree.multiLog.pop();
      if (id) {
        agree.draft = agree.multi[id];
        delete agree.multi[id];
      }
    } else {
      const id = agree.log.pop();
      if (id) delete agree.answers[id];
    }
    drawAgreement();
  },
  fill: () => {
    const next = random(20110 + agree.log.length);
    for (const id of QUOTE_ORDER) {
      if (agree.answers[id]) continue;
      const theme = THEMES[Math.floor(next() * THEMES.length)].id;
      agree.answers[id] = { first: theme, now: theme, byChance: true };
      agree.log.push(id);
    }
    drawAgreement();
  },
  'next-quote': () => {
    const id = QUOTE_ORDER.find((item) => !agree.multi[item]);
    if (id) {
      agree.multi[id] = agree.draft;
      agree.multiLog.push(id);
      agree.draft = [];
    }
    drawAgreement();
    if (usingKeys) find('.pick')?.focus(PIN);
  },
  'file-order': () => {
    sat.shuffle = 0;
    drawSaturation();
  },
  shuffle: () => {
    sat.seed += 1;
    sat.shuffle = sat.seed;
    drawSaturation();
  },
};

function pickFrom(node) {
  if (node.dataset.pick) {
    const at = node.dataset.pick.indexOf(':');
    themes.pick = { type: node.dataset.pick.slice(0, at), id: node.dataset.pick.slice(at + 1) };
    drawTrace();
  } else {
    const [r, c] = node.dataset.cell.split(',').map(Number);
    agree.selected = { r, c };
    drawAgreement();
  }
}

const CLICKS = {
  page: (value) => showView(value),
  passage: (value) => loadPassage(Number(value)),
  paper: (value) => {
    coding.paper = value;
    drawCoding();
  },
  remove: (value, event) => {
    coding.codes[coding.index] = currentCodes().filter((code) => code.id !== value);
    fillNames();
    setHot(null);
    drawCoding();
    if (event.detail === 0) (work.querySelector('.drop') ?? keyFirst).focus(PIN);
  },
  'sub-themes': (value) => {
    themes.sub = value;
    drawThemes();
  },
  code: (value, event) => {
    const afterDrag = skipClick && event.detail > 0;
    skipClick = false;
    if (afterDrag) return;
    themes.picked = themes.picked === value ? null : value;
    drawBoard();
  },
  put: (value) => moveCode(themes.picked, value),
  read: (value) => {
    themes.open = value;
    drawBoard();
    find('[data-reading-title]').scrollIntoView({ block: 'start' });
  },
  'pile-remove': (value) => {
    themes.piles = themes.piles.filter((pile) => pile.id !== value);
    if (themes.open === value) themes.open = null;
    drawBoard();
  },
  source: (value) => {
    agree.source = value;
    agree.selected = null;
    drawAgreement();
  },
  mode: (value) => {
    agree.mode = value;
    agree.selected = null;
    drawAgreement();
  },
  answer: (value) => {
    const id = QUOTE_ORDER.find((item) => !agree.answers[item]);
    agree.answers[id] = { first: value, now: value, byChance: false };
    agree.log.push(id);
    drawAgreement();
  },
  toggle: (value) => {
    agree.draft = agree.draft.includes(value) ? agree.draft.filter((item) => item !== value) : [...agree.draft, value];
    drawAgreement();
  },
  talk: (value) => {
    const [id, to] = value.split('|');
    const answer = agree.answers[id];
    answer.now = to === 'keep' ? answer.first : quoteById.get(id).theme;
    drawAgreement();
  },
  'sub-interviews': (value) => {
    sat.sub = value;
    drawInterviews();
  },
  study: (value) => {
    sat.study = Number(value);
    sat.row = null;
    drawSaturation();
  },
  action: (value) => ACTIONS[value](),
};

window.addEventListener('keydown', () => {
  usingKeys = true;
}, true);
window.addEventListener('pointerdown', () => {
  usingKeys = false;
}, true);

root.addEventListener('click', (event) => {
  const mark = event.target.closest('[data-pick], [data-cell]');
  if (mark) {
    pickFrom(mark);
    return;
  }
  for (const [name, act] of Object.entries(CLICKS)) {
    const node = event.target.closest(`[data-${name}]`);
    if (node) {
      if (!node.disabled) act(node.getAttribute(`data-${name}`), event);
      return;
    }
  }
});

root.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-pick], [data-cell]')) {
    event.preventDefault();
    pickFrom(event.target);
  }
  if (event.key === 'Escape') {
    if (drag) endDrag(false);
    else if (themes.picked) {
      themes.picked = null;
      drawBoard();
    }
  }
});

root.addEventListener('input', (event) => {
  const { target } = event;
  if (target.dataset.pileName) {
    const pile = themes.piles.find((item) => item.id === target.dataset.pileName);
    pile.name = target.value;
    find(`[data-flag="${pile.id}"]`).innerHTML = flagHtml(pile);
    const made = readerCodes();
    drawLines(made);
    if (pile.id === themes.open) drawReading(made);
  } else if (target.dataset.rule) {
    const name = target.dataset.rule;
    sat[name] = Number(target.value) + RULES[name].from;
    drawSaturation();
  } else if (target.dataset.power) {
    sat.planned[Number(target.dataset.power)] = Number(target.value);
    find('[data-interviews-narration]').textContent = narratePower(sat.planned);
  }
});

transcript.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button === 0) coding.dragging = true;
});

window.addEventListener('pointerup', () => {
  if (!coding.dragging) return;
  coding.dragging = false;
  const span = wordsInSelection();
  if (span) {
    getSelection().removeAllRanges();
    coding.viaKeys = false;
    beginNaming(span, true);
  } else if (coding.pending && document.activeElement !== namers.says && document.activeElement !== namers.means) {
    finishNaming();
  }
});

let selectionTimer = 0;
document.addEventListener('selectionchange', () => {
  if (view !== 'coding' || coding.dragging) return;
  clearTimeout(selectionTimer);
  selectionTimer = setTimeout(() => {
    const span = wordsInSelection();
    if (span) beginNaming(span, false);
  }, 350);
});

for (const lane of ['says', 'means']) {
  const input = namers[lane];
  const other = lane === 'says' ? 'means' : 'says';
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishNaming();
      afterKeys();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      endNaming();
      afterKeys();
    } else if (event.key === 'Tab' && event.shiftKey === (lane === 'means') && !namings[other].hidden) {
      event.preventDefault();
      namers[other].focus(PIN);
    }
  });
  input.addEventListener('blur', (event) => {
    if (document.activeElement === input || !coding.pending) return;
    if (event.relatedTarget === namers[other] && !namings[other].hidden) {
      commitLane(lane);
      paintWords();
      drawMarks();
      drawStatus();
    } else finishNaming();
  });
}

keyFirst.addEventListener('input', onKeys);
keyLast.addEventListener('input', onKeys);

work.addEventListener('pointerover', (event) => {
  const label = event.target.closest('.mark .label');
  setHot(label ? label.closest('.mark') : null);
});
work.addEventListener('pointerleave', () => setHot(null));
work.addEventListener('focusin', (event) => {
  const mark = event.target.closest('.mark');
  if (mark) setHot(mark);
});
work.addEventListener('focusout', () => setHot(null));

find('.board').addEventListener('pointerdown', startDrag);
window.addEventListener('pointermove', moveDrag);
window.addEventListener('pointerup', () => endDrag(true));
window.addEventListener('pointercancel', () => endDrag(false));

for (const [svg, G] of rasterSvgs) {
  const figure = svg.closest('.figure');
  const update = (event) => {
    const row = rowFrom(event, svg, G);
    if (row !== sat.row) {
      sat.row = row;
      moveBand();
    }
  };
  figure.addEventListener('pointermove', update);
  figure.addEventListener('pointerdown', update);
  figure.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch' && sat.row !== null) {
      sat.row = null;
      moveBand();
    }
  });
}

keyRow.addEventListener('input', () => {
  sat.row = satView.rowOrder[Number(keyRow.value) - 1];
  keyRow.setAttribute('aria-valuetext', rowNote(satView, sat.row));
  moveBand();
});

let lastWidth = 0;
new ResizeObserver((entries) => {
  const { width } = entries[0].contentRect;
  if (width !== lastWidth) {
    lastWidth = width;
    layoutCoding();
  }
}).observe(transcript);

document.fonts?.ready.then(layoutCoding);

fillNames();
loadPassage(0);
