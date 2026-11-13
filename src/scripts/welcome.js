const ZONE = 'America/Anchorage';
const MINUTE = 60 * 1000;
const STALE = 120 * MINUTE;
const STATION = 'https://api.weather.gov/stations/PAFA/observations?limit=4';
const BACKUP = 'https://api.open-meteo.com/v1/forecast?latitude=64.8378&longitude=-147.7164&current=temperature_2m,weather_code';

const clock = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const find = (name) => document.querySelector(`[data-now="${name}"]`);
const degrees = (value) => String(Math.round(value)).replace('-', '−');

function words(code) {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mostly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorms';
}

async function read(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
}

async function measured() {
  const { features } = await read(STATION);
  const reading = features.map((feature) => feature.properties).find((item) => item.temperature.value !== null && Date.now() - Date.parse(item.timestamp) < STALE);
  if (!reading) throw new Error('no recent reading');
  return { celsius: reading.temperature.value, sky: reading.textDescription };
}

async function estimated() {
  const { current } = await read(BACKUP);
  return { celsius: current.temperature_2m, sky: words(current.weather_code) };
}

function showTime() {
  const now = new Date();
  const parts = Object.fromEntries(clock.formatToParts(now).map((part) => [part.type, part.value]));
  find('time').textContent = `${parts.hour}:${parts.minute}`;
  find('period').textContent = parts.dayPeriod;
  find('date').textContent = day.format(now);
  setTimeout(showTime, MINUTE - (now.getTime() % MINUTE) + 50);
}

async function showWeather() {
  const weather = await measured().catch(estimated).catch(() => null);
  const row = find('weather');
  row.hidden = !weather;
  if (!weather) return;
  find('fahrenheit').textContent = degrees((weather.celsius * 9) / 5 + 32);
  find('celsius').textContent = degrees(weather.celsius);
  find('sky').textContent = weather.sky;
  row.classList.remove('waiting');
}

showTime();
showWeather();
setInterval(showWeather, 10 * MINUTE);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') showWeather();
});
