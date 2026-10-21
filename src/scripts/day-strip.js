import { FAIRBANKS, HORIZON, sunAltitude, sunTimes, fairbanksDay } from './sun.js';
import { moonUp, moonTimes, moonPhase } from './moon.js';
import { fetchWeather, fetchAurora, conditions } from './sky-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const TEMPERATURE_COLORS = [
  '#906acd', '#886dd0', '#7f6fd2', '#7771d5', '#6d73d7', '#6376d5', '#5879d3',
  '#4c7bd1', '#3d7ecf', '#3c81c3', '#3b83b8', '#3a85ac', '#4085a3', '#468599',
  '#4b8590', '#498785', '#418a79', '#398c6c', '#4e8a5d', '#5e884b', '#6c8537',
  '#828038', '#967a39', '#ac7029', '#c0640d', '#c75e25', '#ce5834', '#d55140',
];
const temperatureColor = (f) =>
  TEMPERATURE_COLORS[Math.min(TEMPERATURE_COLORS.length - 1, Math.max(0, Math.round((f + 40) / 5)))];

const SNOW = new Set([71, 73, 75, 77, 85, 86]);

const clock = new Intl.DateTimeFormat('en-US', { timeZone: FAIRBANKS.timeZone, hour: 'numeric', minute: '2-digit' });
const at = (time) => clock.format(Math.round(time / MINUTE) * MINUTE);
const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
const temperature = (f) => `${Math.round(f)}°F (${Math.round(((f - 32) * 5) / 9)}°C)`;

const sky = { weather: null, aurora: null };
let barsShown = false;

function skyLight(time) {
  const light = Math.min(1, Math.max(0, (sunAltitude(time) + 12) / 12));
  return light * light * (3 - 2 * light);
}

function kpAt(time) {
  return sky.aurora?.find((row) => time >= row.start && time < row.start + 3 * HOUR)?.kp ?? null;
}

function hourAt(time, midnight) {
  return sky.weather?.hours[Math.floor((time - midnight) / HOUR)] ?? null;
}

function auroraGlow(time, midnight) {
  const kp = kpAt(time);
  const hour = hourAt(time, midnight);
  if (kp === null || hour === null) return 0;
  const strength = Math.min(1, Math.max(0, (kp - 1) / 4));
  return strength * (1 - hour.cloud / 100) * (1 - skyLight(time)) ** 2;
}

function tonight(now, midnight) {
  let kp = 0;
  let cloud = 0;
  let dark = 0;
  for (let time = now; time < midnight + 24 * HOUR; time += 30 * MINUTE) {
    if (skyLight(time) > 0.2) continue;
    kp = Math.max(kp, kpAt(time) ?? 0);
    cloud += hourAt(time, midnight)?.cloud ?? 0;
    dark++;
  }
  return dark ? { kp: Math.round(kp), cloudy: cloud / dark > 70 } : null;
}

function moonIcon({ fraction, waxing }) {
  const rx = (6 * Math.abs(1 - 2 * fraction)).toFixed(2);
  const edge = waxing ? 1 : 0;
  const shadow = fraction < 0.5 === waxing ? 0 : 1;
  return `<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.5" fill="#13334f"/><circle cx="8" cy="8" r="6" fill="#3d5168"/><path d="M8 2 A6 6 0 0 ${edge} 8 14 A${rx} 6 0 0 ${shadow} 8 2 Z" fill="#f4f7fb"/></svg>`;
}

const SUN_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.5" fill="#13334f"/><circle cx="8" cy="8" r="5.5" fill="#ffcd00"/></svg>';

function moonWords(midnight, now) {
  const phase = moonPhase(now);
  const { moonrise, moonset } = moonTimes(midnight);
  let when;
  if (moonrise !== null && moonset !== null) {
    when = moonrise < moonset ? `up ${at(moonrise)} to ${at(moonset)}` : `sets ${at(moonset)}, rises ${at(moonrise)}`;
  } else if (moonrise !== null) {
    when = `rises ${at(moonrise)}`;
  } else if (moonset !== null) {
    when = `sets ${at(moonset)}`;
  } else {
    when = moonUp(midnight) ? 'up all day' : 'not up today';
  }
  return `Moon: ${phase.name}, ${Math.round(phase.fraction * 100)}% lit, ${when}.`;
}

function draw(figure, id) {
  const now = Date.now();
  const { minutes, midnight } = fairbanksDay(now);
  const svg = figure.querySelector('svg');
  const make = (tag, attrs, parent = svg) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
    parent.append(element);
    return element;
  };
  svg.classList.add('intro');
  svg.replaceChildren();
  const defs = make('defs', {});

  const daylight = make('linearGradient', { id: `${id}-day` }, defs);
  const auroraAcross = make('linearGradient', { id: `${id}-aurora-across` }, defs);
  let anyAurora = false;
  for (let m = 0; m <= 1440; m += 10) {
    const time = midnight + m * MINUTE;
    const offset = (m / 1440).toFixed(4);
    const glow = auroraGlow(time, midnight);
    if (glow > 0.02) anyAurora = true;
    make('stop', { class: 'day-stop', offset, 'stop-opacity': skyLight(time).toFixed(3) }, daylight);
    make('stop', { offset, 'stop-color': 'white', 'stop-opacity': glow.toFixed(3) }, auroraAcross);
  }

  const auroraDown = make('linearGradient', { id: `${id}-aurora-down`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  make('stop', { class: 'aurora-stop', offset: 0, 'stop-opacity': 0.9 }, auroraDown);
  make('stop', { class: 'aurora-stop', offset: 0.75, 'stop-opacity': 0 }, auroraDown);
  const mask = make('mask', { id: `${id}-aurora-mask` }, defs);
  make('rect', { x: 0, y: 0, width: 1440, height: 60, fill: `url(#${id}-aurora-across)` }, mask);

  make('rect', { class: 'night', x: 0, y: 0, width: 1440, height: 60 });
  make('rect', { x: 0, y: 0, width: 1440, height: 60, fill: `url(#${id}-day)` });
  if (anyAurora) {
    make('rect', { x: 0, y: 0, width: 1440, height: 60, fill: `url(#${id}-aurora-down)`, mask: `url(#${id}-aurora-mask)` });
  }

  let start = null;
  for (let m = 0; m <= 1440; m += 10) {
    const up = m < 1440 && moonUp(midnight + (m + 5) * MINUTE);
    if (up && start === null) start = m;
    if (!up && start !== null) {
      make('rect', { class: 'moon-edge', x: start, y: 0, width: m - start, height: 5 });
      make('rect', { class: 'moon-up', x: start, y: 0, width: m - start, height: 3 });
      start = null;
    }
  }

  if (sky.weather) {
    const temps = sky.weather.hours.map((h) => h.temp);
    const low = Math.min(...temps);
    const high = Math.max(...temps);
    for (let slot = 0; slot < 96; slot++) {
      const position = Math.min(slot / 4, temps.length - 1);
      const before = Math.floor(position);
      const after = Math.min(before + 1, temps.length - 1);
      const temp = temps[before] + (temps[after] - temps[before]) * (position - before);
      const height = 10 + 40 * (high > low ? (temp - low) / (high - low) : 0.5);
      const classes = ['temp', slot * 15 > minutes && 'forecast', !barsShown && 'grow'].filter(Boolean).join(' ');
      make('rect', { class: classes, fill: temperatureColor(temp), x: slot * 15 + 2, y: 60 - height, width: 11, height, style: `--i: ${slot}` });
    }
    barsShown = true;
  }

  make('rect', { class: 'now-edge', x: minutes - 2.5, y: 0, width: 5, height: 60 });
  make('rect', { class: 'now', x: minutes - 1.25, y: 0, width: 2.5, height: 60 });

  const icon = figure.querySelector('.now-icon');
  icon.innerHTML = sunAltitude(now) >= HORIZON ? SUN_ICON : moonUp(now) ? moonIcon(moonPhase(now)) : '';
  icon.style.left = `${(minutes / 1440) * 100}%`;

  const snowyHours = sky.weather ? sky.weather.hours.filter((h) => SNOW.has(h.code)).map((h) => h.hour) : [];
  const snow = figure.querySelector('.snow');
  if (snow.dataset.hours !== snowyHours.join(',')) {
    snow.dataset.hours = snowyHours.join(',');
    snow.replaceChildren();
    for (const hour of snowyHours) {
      for (let k = 0; k < 5; k++) {
        const r = (n) => ((Math.sin(hour * 97.13 + k * 31.7 + n * 13.1) + 1) / 2) % 1;
        const flake = document.createElement('i');
        flake.style.left = `${((hour * 60 + r(1) * 60) / 1440) * 100}%`;
        flake.style.animationDuration = `${3 + r(2) * 2.5}s`;
        flake.style.animationDelay = `${-r(3) * 5}s`;
        flake.style.setProperty('--rest', `${10 + r(4) * 70}%`);
        snow.append(flake);
      }
    }
  }

  const { sunrise, sunset, daylight: daylightMinutes } = sunTimes(midnight);
  const sun = `sunrise ${at(sunrise)}, sunset ${at(sunset)}, ${Math.floor(daylightMinutes / 60)} h ${daylightMinutes % 60} min of daylight`;
  let second = `Now ${clock.format(now)}`;
  if (sky.weather) second += `, ${temperature(sky.weather.now.temp)}, ${conditions(sky.weather.now.code)}`;
  second += `. ${moonWords(midnight, now)}`;
  const lights = sky.aurora && sky.weather ? tonight(now, midnight) : null;
  if (lights && lights.kp >= 3) second += ` Northern lights tonight: Kp ${lights.kp}${lights.cloudy ? ', but cloudy' : ''}.`;
  const [line1, line2] = figure.querySelectorAll('figcaption .line');
  line1.textContent = `Today in Fairbanks, Alaska: ${sun}.`;
  line2.textContent = second;
}

function describeHour(hour) {
  const { midnight } = fairbanksDay(Date.now());
  const time = midnight + (hour + 0.5) * HOUR;
  const weather = sky.weather?.hours[hour];
  const light = skyLight(time);
  const parts = [hourLabel(hour)];
  if (weather) parts.push(temperature(weather.temp), conditions(weather.code));
  else parts.push(light > 0.8 ? 'daylight' : light > 0.05 ? 'twilight' : 'dark');
  if (moonUp(time)) parts.push('moon up');
  if (auroraGlow(time, midnight) > 0.05) parts.push(`northern lights (Kp ${Math.round(kpAt(time))})`);
  return parts.join(' · ');
}

function showHour(figure, hour, x) {
  const tip = figure.querySelector('.tip');
  const width = figure.querySelector('svg').getBoundingClientRect().width;
  tip.textContent = describeHour(hour);
  tip.hidden = false;
  tip.style.left = `${Math.min(Math.max(x, tip.offsetWidth / 2), width - tip.offsetWidth / 2)}px`;
}

const strips = [...document.querySelectorAll('[data-day-strip]')];
const drawAll = () => strips.forEach((figure, i) => draw(figure, `sky-${i}`));

async function load() {
  const [weather, aurora] = await Promise.allSettled([fetchWeather(), fetchAurora()]);
  if (weather.status === 'fulfilled') sky.weather = weather.value;
  if (aurora.status === 'fulfilled') sky.aurora = aurora.value;
  drawAll();
}

for (const figure of strips) {
  const svg = figure.querySelector('svg');
  const tip = figure.querySelector('.tip');
  const live = figure.querySelector('[data-live]');

  const fromPointer = (event) => {
    const box = svg.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - box.left, 0), box.width - 1);
    showHour(figure, Math.floor((x / box.width) * 24), x);
  };
  svg.addEventListener('pointermove', fromPointer);
  svg.addEventListener('pointerdown', fromPointer);
  svg.addEventListener('pointerleave', () => {
    if (document.activeElement !== figure) tip.hidden = true;
  });

  let hour = 0;
  const showKeyboardHour = () => {
    const width = svg.getBoundingClientRect().width;
    showHour(figure, hour, ((hour + 0.5) / 24) * width);
    live.textContent = describeHour(hour);
  };
  figure.addEventListener('focus', () => {
    hour = Math.floor(fairbanksDay(Date.now()).minutes / 60);
    showKeyboardHour();
  });
  figure.addEventListener('blur', () => {
    tip.hidden = true;
  });
  figure.addEventListener('keydown', (event) => {
    const moves = { ArrowRight: hour + 1, ArrowLeft: hour - 1, Home: 0, End: 23 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    hour = Math.min(23, Math.max(0, moves[event.key]));
    showKeyboardHour();
  });
}

drawAll();
load();
setInterval(drawAll, MINUTE);
setInterval(load, 30 * MINUTE);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') load();
});
