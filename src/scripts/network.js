import { CARD, STAGE, RING, SLOTS, LINKS, home, place, pin, fiber, routes } from '../lib/network.js';

const network = document.querySelector('[data-network]');

if (network) {
  const cards = [...network.querySelectorAll('[data-card]')];
  const groups = [...network.querySelectorAll('[data-link]')];
  const paths = groups.map((group) => [...group.querySelectorAll('path')]);
  const putBack = network.querySelector('.put-back');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const offsets = cards.map(() => [0, 0]);
  const zIndexes = cards.map((card) => card.style.zIndex);
  let ready = false;
  let hovered = null;
  let grabbed = null;
  let touring = -1;
  let moved = false;
  let held = 0;
  let tween = 0;

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const progress = (value) => clamp(value, 0, 1);
  const easeOut = (value) => 1 - (1 - value) ** 3;
  const easeInOut = (value) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);
  const easeSine = (value) => (1 - Math.cos(Math.PI * value)) / 2;

  const bounds = () => {
    const box = network.getBoundingClientRect();
    const side = CARD.width / 2 + 12;
    return {
      left: side - box.left,
      right: document.documentElement.clientWidth - box.left - side,
      top: CARD.height / 2 + 10,
      bottom: STAGE.height - CARD.height / 2 - 10,
    };
  };

  const within = (i, x, y, edges) => {
    const [hx] = home(i);
    return [clamp(x, Math.min(edges.left, hx), Math.max(edges.right, hx)), clamp(y, edges.top, edges.bottom)];
  };

  const highlight = (index) => {
    const route = index === null ? null : routes[index];
    groups.forEach((group, k) => group.classList.toggle('on', Boolean(route && route.links.has(k))));
    cards.forEach((card, i) => {
      card.classList.toggle('lit', Boolean(route && route.cards.has(i)));
      card.classList.toggle('active', i === index);
    });
  };

  const refresh = () => {
    if (grabbed && grabbed.live) highlight(grabbed.index);
    else if (hovered !== null) highlight(hovered);
    else highlight(touring >= 0 ? touring : null);
  };

  const render = () => {
    const at = cards.map((_, i) => {
      const [x, y] = home(i);
      return [x + offsets[i][0], y + offsets[i][1]];
    });
    cards.forEach((card, i) => {
      const lifted = grabbed && grabbed.live && grabbed.index === i;
      card.style.transform = place(at[i], SLOTS[i].tilt, lifted ? 1.03 : 1);
    });
    LINKS.forEach(([from, to], k) => {
      const d = fiber(pin(from, at[from], 'out'), pin(to, at[to], 'in'));
      for (const path of paths[k]) path.setAttribute('d', d);
    });
    putBack.hidden = offsets.every(([x, y]) => x === 0 && y === 0);
  };

  const tour = () => {
    touring = 0;
    refresh();
    setInterval(() => {
      if (document.hidden || hovered !== null || grabbed) return;
      touring = (touring + 1) % cards.length;
      refresh();
    }, 2400);
  };

  const remember = () => {
    try {
      sessionStorage.setItem('network-opened', '1');
      return true;
    } catch {
      return false;
    }
  };

  const finish = () => {
    network.classList.remove('opening', 'moving', 'wiring');
    remember();
    ready = true;
    render();
    if (!reduceMotion) tour();
  };

  const open = () => {
    network.classList.replace('opening', 'moving');
    const start = performance.now();
    const frame = (now) => {
      const t = (now - start) / 1000;
      const spread = easeOut(progress((t - 0.8) / 1.8));
      const turn = 90 * easeSine(progress((t - 0.8) / 3.6));
      cards.forEach((card, i) => {
        const angle = ((180 + 45 * i + turn) * Math.PI) / 180;
        const [px, py, pr] = SLOTS[i].pile;
        const rx = RING.x + px * (1 - spread) + RING.r * spread * Math.cos(angle);
        const ry = RING.y + py * (1 - spread) + RING.r * spread * Math.sin(angle);
        const settle = easeInOut(progress((t - 4.4 - 0.1 * SLOTS[i].row) / 1.5));
        const [hx, hy] = home(i);
        card.style.transform = place([rx + (hx - rx) * settle, ry + (hy - ry) * settle], pr + (SLOTS[i].tilt - pr) * spread);
      });
      if (t >= 6.3 && network.classList.contains('moving')) network.classList.replace('moving', 'wiring');
      if (t < 7.9) requestAnimationFrame(frame);
      else finish();
    };
    requestAnimationFrame(frame);
  };

  const lift = (grab) => {
    if (grabbed !== grab) return;
    grab.live = true;
    const card = cards[grab.index];
    card.setPointerCapture(grab.id);
    card.classList.add('lift');
    card.style.zIndex = '30';
    render();
    refresh();
  };

  const drop = () => {
    const card = cards[grabbed.index];
    card.classList.remove('lift');
    card.style.zIndex = zIndexes[grabbed.index];
    grabbed = null;
    render();
    refresh();
  };

  cards.forEach((card, i) => {
    card.addEventListener('pointerenter', (event) => {
      if (!ready || event.pointerType !== 'mouse') return;
      hovered = i;
      refresh();
    });

    card.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (hovered === i) hovered = null;
      refresh();
    });

    card.addEventListener('pointerdown', (event) => {
      if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
      cancelAnimationFrame(tween);
      clearTimeout(held);
      const scale = network.getBoundingClientRect().width / network.offsetWidth;
      grabbed = { index: i, id: event.pointerId, x: event.clientX, y: event.clientY, from: [...offsets[i]], scale, edges: bounds(), live: false };
      moved = false;
      const grab = grabbed;
      if (event.pointerType === 'touch') held = setTimeout(() => lift(grab), 350);
      else lift(grab);
    });

    card.addEventListener('pointermove', (event) => {
      if (!grabbed || grabbed.index !== i || event.pointerId !== grabbed.id) return;
      const dx = (event.clientX - grabbed.x) / grabbed.scale;
      const dy = (event.clientY - grabbed.y) / grabbed.scale;
      if (!grabbed.live) {
        if (Math.hypot(dx, dy) > 10) {
          clearTimeout(held);
          grabbed = null;
        }
        return;
      }
      if (Math.hypot(dx, dy) > 4) moved = true;
      const [hx, hy] = home(i);
      const [x, y] = within(i, hx + grabbed.from[0] + dx, hy + grabbed.from[1] + dy, grabbed.edges);
      offsets[i] = [x - hx, y - hy];
      render();
    });

    const release = (event) => {
      clearTimeout(held);
      if (!grabbed || grabbed.index !== i || event.pointerId !== grabbed.id) return;
      if (grabbed.live) drop();
      else grabbed = null;
    };

    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);

    card.addEventListener('click', (event) => {
      if (moved) event.preventDefault();
      moved = false;
    });

    card.addEventListener('contextmenu', (event) => {
      if (grabbed) event.preventDefault();
    });
  });

  document.addEventListener(
    'touchmove',
    (event) => {
      if (grabbed && grabbed.live) event.preventDefault();
    },
    { passive: false },
  );

  putBack.addEventListener('click', () => {
    const from = offsets.map((offset) => [...offset]);
    const start = performance.now();
    cancelAnimationFrame(tween);
    const step = (now) => {
      const q = progress((now - start) / 450);
      const k = 1 - easeOut(q);
      from.forEach(([x, y], i) => {
        offsets[i] = [x * k, y * k];
      });
      render();
      if (q < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  });

  window.addEventListener('resize', () => {
    if (!ready || offsets.every(([x, y]) => x === 0 && y === 0)) return;
    const edges = bounds();
    offsets.forEach(([dx, dy], i) => {
      if (dx === 0 && dy === 0) return;
      const [hx, hy] = home(i);
      const [x, y] = within(i, hx + dx, hy + dy, edges);
      offsets[i] = [x - hx, y - hy];
    });
    render();
  });

  if (network.classList.contains('opening')) open();
  else finish();
}
