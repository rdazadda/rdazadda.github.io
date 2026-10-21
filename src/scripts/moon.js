import { FAIRBANKS, sunPosition } from './sun.js';

const RAD = Math.PI / 180;
const MINUTE = 60 * 1000;
const sin = (degrees) => Math.sin(degrees * RAD);
const cos = (degrees) => Math.cos(degrees * RAD);

const julianDay = (time) => time / 86400000 + 2440587.5;
const centuries = (jd) => (jd - 2451545) / 36525;

const LONGITUDE_DISTANCE = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
];

const LATITUDE = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
];

function moonPosition(time) {
  const t = centuries(julianDay(time));

  const meanLongitude = 218.3164477 + 481267.88123421 * t - 0.0015786 * t * t + (t * t * t) / 538841;
  const elongation = 297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + (t * t * t) / 545868;
  const sunAnomaly = 357.5291092 + 35999.0502909 * t - 0.0001536 * t * t;
  const moonAnomaly = 134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + (t * t * t) / 69699;
  const latitudeArgument = 93.272095 + 483202.0175233 * t - 0.0036539 * t * t;
  const a1 = 119.75 + 131.849 * t;
  const a2 = 53.09 + 479264.29 * t;
  const a3 = 313.45 + 481266.484 * t;
  const e = 1 - 0.002516 * t - 0.0000074 * t * t;

  const angle = (d, m, mp, f) => d * elongation + m * sunAnomaly + mp * moonAnomaly + f * latitudeArgument;
  const eccentricityFactor = (m) => (Math.abs(m) === 1 ? e : Math.abs(m) === 2 ? e * e : 1);

  let sumL = 3958 * sin(a1) + 1962 * sin(meanLongitude - latitudeArgument) + 318 * sin(a2);
  let sumR = 0;
  for (const [d, m, mp, f, l, r] of LONGITUDE_DISTANCE) {
    const factor = eccentricityFactor(m);
    sumL += l * factor * sin(angle(d, m, mp, f));
    sumR += r * factor * cos(angle(d, m, mp, f));
  }

  let sumB =
    -2235 * sin(meanLongitude) +
    382 * sin(a3) +
    175 * sin(a1 - latitudeArgument) +
    175 * sin(a1 + latitudeArgument) +
    127 * sin(meanLongitude - moonAnomaly) -
    115 * sin(meanLongitude + moonAnomaly);
  for (const [d, m, mp, f, b] of LATITUDE) {
    sumB += b * eccentricityFactor(m) * sin(angle(d, m, mp, f));
  }

  return {
    longitude: (((meanLongitude + sumL / 1e6) % 360) + 360) % 360,
    latitude: sumB / 1e6,
    distance: 385000.56 + sumR / 1000,
  };
}

function moonAltitude(time) {
  const jd = julianDay(time);
  const t = centuries(jd);
  const { longitude, latitude, distance } = moonPosition(time);

  const obliquity = 23.4392911 - 0.0130042 * t;
  const rightAscension =
    Math.atan2(sin(longitude) * cos(obliquity) - Math.tan(latitude * RAD) * sin(obliquity), cos(longitude)) / RAD;
  const declination = Math.asin(sin(latitude) * cos(obliquity) + cos(latitude) * sin(obliquity) * sin(longitude)) / RAD;

  const siderealTime = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * t * t + FAIRBANKS.lon;
  const hourAngle = siderealTime - rightAscension;

  const altitude =
    Math.asin(sin(FAIRBANKS.lat) * sin(declination) + cos(FAIRBANKS.lat) * cos(declination) * cos(hourAngle)) / RAD;
  const parallax = Math.asin(6378.14 / distance) / RAD;
  return { altitude, horizon: 0.7275 * parallax - 0.5667 };
}

export const moonUp = (time) => {
  const { altitude, horizon } = moonAltitude(time);
  return altitude >= horizon;
};

export function moonTimes(midnight) {
  let moonrise = null;
  let moonset = null;
  let previous = moonAltitude(midnight);
  for (let m = 1; m <= 1440; m++) {
    const time = midnight + m * MINUTE;
    const current = moonAltitude(time);
    const before = previous.altitude - previous.horizon;
    const after = current.altitude - current.horizon;
    if (before < 0 !== after < 0) {
      const crossing = time - MINUTE + (-before / (after - before)) * MINUTE;
      if (after >= 0) moonrise ??= crossing;
      else moonset ??= crossing;
    }
    previous = current;
  }
  return { moonrise, moonset };
}

export function moonPhase(time) {
  const moon = moonPosition(time);
  const sun = sunPosition(time);
  const apart = (((moon.longitude - sun.longitude) % 360) + 360) % 360;
  const elongation = Math.acos(cos(moon.latitude) * cos(apart)) / RAD;
  const fraction = (1 - cos(elongation)) / 2;
  const waxing = apart < 180;

  let name;
  if (fraction < 0.03) name = 'new moon';
  else if (fraction > 0.97) name = 'full moon';
  else if (Math.abs(fraction - 0.5) < 0.04) name = waxing ? 'first quarter' : 'last quarter';
  else name = `${waxing ? 'waxing' : 'waning'} ${fraction < 0.5 ? 'crescent' : 'gibbous'}`;
  return { fraction, waxing, name };
}
