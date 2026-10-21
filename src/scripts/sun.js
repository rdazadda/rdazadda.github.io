export const FAIRBANKS = { lat: 64.8378, lon: -147.7164, timeZone: 'America/Anchorage' };

const RAD = Math.PI / 180;
const MINUTE = 60 * 1000;
const sin = (degrees) => Math.sin(degrees * RAD);
const cos = (degrees) => Math.cos(degrees * RAD);

export const HORIZON = -0.833;

export function sunPosition(time) {
  const t = (time / 86400000 + 2440587.5 - 2451545) / 36525;

  const meanLongitude = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const center =
    sin(meanAnomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin(2 * meanAnomaly) * (0.019993 - 0.000101 * t) +
    sin(3 * meanAnomaly) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const apparentLongitude = meanLongitude + center - 0.00569 - 0.00478 * sin(omega);
  const meanObliquity = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cos(omega);
  const declination = Math.asin(sin(obliquity) * sin(apparentLongitude)) / RAD;

  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const eqTime =
    (4 / RAD) *
    (y * sin(2 * meanLongitude) -
      2 * eccentricity * sin(meanAnomaly) +
      4 * eccentricity * y * sin(meanAnomaly) * cos(2 * meanLongitude) -
      0.5 * y * y * sin(4 * meanLongitude) -
      1.25 * eccentricity * eccentricity * sin(2 * meanAnomaly));

  return { longitude: apparentLongitude, declination, eqTime };
}

export function sunAltitude(time) {
  const { declination, eqTime } = sunPosition(time);

  const utcMinutes = (((time % 86400000) + 86400000) % 86400000) / MINUTE;
  const solarMinutes = (((utcMinutes + eqTime + 4 * FAIRBANKS.lon) % 1440) + 1440) % 1440;
  const hourAngle = solarMinutes / 4 - 180;
  const cosZenith =
    sin(FAIRBANKS.lat) * sin(declination) + cos(FAIRBANKS.lat) * cos(declination) * cos(hourAngle);
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
}

function crossing(start, minutes, rising) {
  let previousAltitude = sunAltitude(start);
  for (let m = 1; m <= minutes; m++) {
    const time = start + m * MINUTE;
    const altitude = sunAltitude(time);
    if (rising ? previousAltitude < HORIZON && altitude >= HORIZON : previousAltitude >= HORIZON && altitude < HORIZON) {
      return time - MINUTE + ((HORIZON - previousAltitude) / (altitude - previousAltitude)) * MINUTE;
    }
    previousAltitude = altitude;
  }
  return null;
}

export function sunTimes(midnight) {
  const sunrise = crossing(midnight, 1440, true);
  const sunset = crossing(sunrise, 1440, false);
  return { sunrise, sunset, daylight: Math.round((sunset - sunrise) / MINUTE) };
}

export function fairbanksDay(now) {
  const parts = {};
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone: FAIRBANKS.timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  for (const { type, value } of format.formatToParts(now)) parts[type] = Number(value);
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const offset = wallClock - Math.floor(now / MINUTE) * MINUTE;
  return { minutes: parts.hour * 60 + parts.minute, midnight: Date.UTC(parts.year, parts.month - 1, parts.day) - offset };
}
