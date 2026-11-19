'use strict';

const { LEVELS, INDOOR_FACTOR, WHO_GUIDELINE, STAGNATION, DAYTIME, PM25_PER_CIGARETTE } = require('./constants');

const round1 = (n) => Math.round(n * 10) / 10;
const round0 = (n) => Math.round(n);

/** @param {number} pm PM2.5 in µg/m³ @returns {typeof LEVELS[number]} the matching air-quality band */
function levelFor(pm) {
  return LEVELS.find((level) => pm <= level.max);
}

const hourOf = (time) => Number(time.slice(11, 13));
const clockOf = (time) => time.slice(11, 16);

/**
 * Find the cleanest and dirtiest 2-hour windows during daytime.
 * @param {{time: string, pm25: number}[]} [hourly] hourly forecast with ISO local times
 * @returns {{best: object, worst: object, mean: number} | null}
 */
function bestWindow(hourly) {
  if (!hourly || hourly.length < 3) return null;
  const day = hourly.filter((h) => hourOf(h.time) >= DAYTIME.fromHour && hourOf(h.time) <= DAYTIME.toHour);
  if (day.length < 3) return null;

  let best = null;
  let worst = null;
  for (let i = 0; i < day.length - 1; i++) {
    const avg = (day[i].pm25 + day[i + 1].pm25) / 2;
    const endHour = String(hourOf(day[i + 1].time) + 1).padStart(2, '0');
    const window = { start: clockOf(day[i].time), end: `${endHour}:00`, avg: round1(avg) };
    if (!best || avg < best.avg) best = window;
    if (!worst || avg > worst.avg) worst = window;
  }
  const mean = day.reduce((sum, h) => sum + h.pm25, 0) / day.length;
  return { best, worst, mean: round1(mean) };
}

/**
 * Estimate indoor PM2.5 for different home set-ups.
 * @param {number} pm outdoor PM2.5
 * @param {{purifier: boolean}} profile
 */
function indoorEstimate(pm, profile) {
  const open = pm * INDOOR_FACTOR.windowsOpen;
  const closed = pm * INDOOR_FACTOR.windowsShut;
  const purified = pm * INDOOR_FACTOR.purifier;
  return {
    open: round1(open),
    closed: round1(closed),
    purified: round1(purified),
    now: round1(profile.purifier ? purified : closed),
  };
}

/** @returns {Record<string, number|null>} pollutant concentration as a multiple of the WHO guideline */
function whoRatios({ pm25, pm10, no2, so2 }) {
  const ratio = (value, guideline) => (value == null ? null : round1(value / guideline));
  return {
    pm25: ratio(pm25, WHO_GUIDELINE.pm25),
    pm10: ratio(pm10, WHO_GUIDELINE.pm10),
    no2: ratio(no2, WHO_GUIDELINE.no2),
    so2: ratio(so2, WHO_GUIDELINE.so2),
  };
}

const STAGNATION_NOTES = {
  high: 'Shallow mixing layer and calm wind: pollution is trapped near the ground and likely to persist or build up.',
  moderate: 'Limited mixing and light wind: pollution may linger.',
  low: 'Good mixing or wind: pollution should disperse.',
};

/**
 * Judge whether weather is trapping pollution (a winter inversion).
 * @param {{maxMixingHeight: number|null, wind: number|null}} [weather]
 * @returns {{level: string, mixingHeight: number, wind: number, note: string} | null}
 */
function stagnationFrom(weather) {
  if (!weather || weather.maxMixingHeight == null || weather.wind == null) return null;
  const { maxMixingHeight: height, wind } = weather;
  const within = (limit) => height < limit.maxMixingHeightM && wind < limit.maxWindKmh;
  const level = within(STAGNATION.high) ? 'high' : within(STAGNATION.moderate) ? 'moderate' : 'low';
  return { level, mixingHeight: height, wind, note: STAGNATION_NOTES[level] };
}

/** @returns {number} rough cigarette equivalents for a day outdoors at this PM2.5 */
const cigaretteEquivalent = (pm) => round1(pm / PM25_PER_CIGARETTE);

module.exports = {
  round0,
  round1,
  levelFor,
  bestWindow,
  indoorEstimate,
  whoRatios,
  stagnationFrom,
  cigaretteEquivalent,
  clockOf,
};
