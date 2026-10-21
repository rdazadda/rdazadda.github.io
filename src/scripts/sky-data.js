import { FAIRBANKS } from './sun.js';

const KEEP = 30 * 60 * 1000;

async function cached(key, url, stillGood = () => true) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && Date.now() - saved.at < KEEP && stillGood(saved.data)) return saved.data;
  } catch {}
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  const data = await response.json();
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {}
  return data;
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: FAIRBANKS.timeZone }).format(new Date());

export async function fetchWeather() {
  const url =
    'https://api.open-meteo.com/v1/forecast?' +
    new URLSearchParams({
      latitude: String(FAIRBANKS.lat),
      longitude: String(FAIRBANKS.lon),
      hourly: 'temperature_2m,weather_code,cloud_cover',
      current: 'temperature_2m,weather_code',
      temperature_unit: 'fahrenheit',
      timezone: FAIRBANKS.timeZone,
      forecast_days: '1',
    });
  const data = await cached('sky-weather', url, (saved) => saved.hourly.time[0].startsWith(today()));
  return {
    hours: data.hourly.time.map((time, i) => ({
      hour: Number(time.slice(11, 13)),
      temp: data.hourly.temperature_2m[i],
      code: data.hourly.weather_code[i],
      cloud: data.hourly.cloud_cover[i],
    })),
    now: { temp: data.current.temperature_2m, code: data.current.weather_code },
  };
}

export async function fetchAurora() {
  const rows = await cached('sky-kp', 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json');
  return rows
    .filter((row) => row && row.time_tag)
    .map((row) => ({ start: Date.parse(`${row.time_tag}Z`), kp: Number(row.kp) }));
}

export function conditions(code) {
  if (code === 0) return 'clear';
  if (code === 1) return 'mostly clear';
  if (code === 2) return 'partly cloudy';
  if (code === 3) return 'cloudy';
  if (code <= 48) return 'fog';
  if (code <= 57) return 'drizzle';
  if (code <= 67) return 'rain';
  if (code <= 77) return 'snow';
  if (code <= 82) return 'rain showers';
  if (code <= 86) return 'snow showers';
  return 'thunderstorms';
}
