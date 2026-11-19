'use strict';

/**
 * Air-quality bands, based on US EPA PM2.5 breakpoints (2024 update), in µg/m³.
 * `index` is the 0-5 severity used throughout the engine.
 */
const LEVELS = [
  { max: 9, index: 0, name: 'Good', short: 'Good', color: '#2e9e5b', headline: 'Air is clean. Enjoy the outdoors.' },
  {
    max: 35.4,
    index: 1,
    name: 'Moderate',
    short: 'Moderate',
    color: '#c9a400',
    headline: 'Fine for most; sensitive people take care.',
  },
  {
    max: 55.4,
    index: 2,
    name: 'Unhealthy for sensitive groups',
    short: 'Sensitive',
    color: '#e67e22',
    headline: 'Children, elders and asthmatics should limit time outside.',
  },
  {
    max: 125.4,
    index: 3,
    name: 'Unhealthy',
    short: 'Unhealthy',
    color: '#d93a3a',
    headline: 'Everyone should cut outdoor exposure today.',
  },
  {
    max: 225.4,
    index: 4,
    name: 'Very unhealthy',
    short: 'Very unhealthy',
    color: '#8e3fa8',
    headline: 'Stay in clean indoor air; mask up for essential trips.',
  },
  {
    max: Infinity,
    index: 5,
    name: 'Hazardous',
    short: 'Hazardous',
    color: '#7a1f3d',
    headline: 'Emergency-level smog. Stay indoors with filtered air.',
  },
];

/** Severity indices, named so rules read as sentences instead of magic numbers. */
const SEVERITY = { good: 0, moderate: 1, sensitive: 2, unhealthy: 3, veryUnhealthy: 4 };

/** Typical passenger-vehicle emission factors, kg CO2 per passenger-km. */
const CO2_PER_KM = { car: 0.17, motorbike: 0.1, bus: 0.09, metro: 0.04, bike: 0, walk: 0, none: 0 };

/** Typical urban average speeds, km/h. */
const SPEED_KMH = { car: 25, motorbike: 25, bus: 18, metro: 28, bike: 14, walk: 5, none: 1 };

/** Commute assumptions behind the "switch transport" estimate. */
const TRANSIT = { winterDays: 90, daysPerWeekShare: 0.8, defaultSpeedKmh: 20, defaultCommuteMinutes: 40 };

/** Indoor PM2.5 as a fraction of outdoor PM2.5 (typical infiltration ranges from the literature). */
const INDOOR_FACTOR = { windowsOpen: 0.8, windowsShut: 0.45, purifier: 0.15 };

/** WHO 2021 24-hour air-quality guideline values, µg/m³. */
const WHO_GUIDELINE = { pm25: 15, pm10: 45, no2: 25, so2: 40 };

/** Berkeley Earth rule of thumb: this many µg/m³ of PM2.5 over 24 h is roughly one cigarette. */
const PM25_PER_CIGARETTE = 22;

/** Winter inversion heuristic thresholds: shallow mixing layer and light wind trap pollution. */
const STAGNATION = {
  high: { maxMixingHeightM: 500, maxWindKmh: 10 },
  moderate: { maxMixingHeightM: 900, maxWindKmh: 15 },
};

/** Daytime hours (inclusive) considered when picking the cleanest outdoor window. */
const DAYTIME = { fromHour: 7, toHour: 20 };

module.exports = {
  LEVELS,
  SEVERITY,
  CO2_PER_KM,
  SPEED_KMH,
  TRANSIT,
  INDOOR_FACTOR,
  WHO_GUIDELINE,
  PM25_PER_CIGARETTE,
  STAGNATION,
  DAYTIME,
};
