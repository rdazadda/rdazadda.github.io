export const STAGE = { width: 940, height: 2030 };
export const CARD = { width: 240, height: 322 };
export const RING = { x: 470, y: 551, r: 340 };

const CENTER = 470;
const ROWS = [201, 613, 1025, 1437, 1849];

export const SLOTS = [
  { row: 0, dx: 0, tilt: -2, pile: [0, 0, -3] },
  { row: 1, dx: 0, tilt: 1.5, pile: [7, -5, 5] },
  { row: 2, dx: -170, tilt: -2.5, pile: [-9, 6, -7] },
  { row: 2, dx: 170, tilt: 2, pile: [10, 8, 8] },
  { row: 3, dx: -330, tilt: -1.5, pile: [-6, -9, -4] },
  { row: 3, dx: 0, tilt: 2.5, pile: [5, 10, 3] },
  { row: 3, dx: 330, tilt: -2, pile: [-11, -3, -9] },
  { row: 4, dx: 0, tilt: 1.5, pile: [8, -8, 6] },
];

export const LINKS = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [2, 6],
  [3, 4],
  [3, 5],
  [3, 6],
  [4, 7],
  [5, 7],
  [6, 7],
];

const round = (value) => Math.round(value * 10) / 10;
const radians = (degrees) => (degrees * Math.PI) / 180;

export const home = (i) => [CENTER + SLOTS[i].dx, ROWS[SLOTS[i].row]];

export const pileAt = (i) => [RING.x + SLOTS[i].pile[0], RING.y + SLOTS[i].pile[1]];

export const place = ([x, y], tilt, scale = 1) =>
  `translate(${round(x - CARD.width / 2)}px, ${round(y - CARD.height / 2)}px) rotate(${round(tilt)}deg)${scale === 1 ? '' : ` scale(${scale})`}`;

export const pin = (i, [x, y], side) => {
  const half = CARD.height / 2;
  const sin = Math.sin(radians(SLOTS[i].tilt));
  const cos = Math.cos(radians(SLOTS[i].tilt));
  return side === 'in' ? [x + half * sin, y - half * cos] : [x - half * sin, y + half * cos];
};

export const fiber = ([x1, y1], [x2, y2]) => {
  const bend = Math.max(36, Math.abs(y2 - y1) / 2);
  return `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(y1 + bend)} ${round(x2)} ${round(y2 - bend)} ${round(x2)} ${round(y2)}`;
};

const reach = (start, forward) => {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.pop();
    for (const [from, to] of LINKS) {
      const next = forward ? (from === node ? to : null) : to === node ? from : null;
      if (next !== null && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
};

export const routes = SLOTS.map((_, i) => {
  const before = reach(i, false);
  const after = reach(i, true);
  return {
    cards: new Set([...before, ...after]),
    links: new Set(LINKS.flatMap(([from, to], k) => (before.has(to) || after.has(from) ? [k] : []))),
  };
});
