'use strict';

/**
 * Deterministic "facts" engine.
 *
 * Turns an air reading plus a household profile into grounded, quantified advice. Every number
 * shown to users comes from here; the GenAI layer only explains and personalises these facts and
 * never invents figures.
 */

const { LEVELS } = require('./constants');
const {
  levelFor,
  bestWindow,
  indoorEstimate,
  whoRatios,
  stagnationFrom,
  cigaretteEquivalent,
  round1,
} = require('./measures');
const { normaliseProfile, isSensitive } = require('./profile');
const { buildActions } = require('./actions');
const { winterCo2Saved } = require('./actions/sustainable');
const { buildActivities } = require('./activities');
const { buildSchedule, MYTHS, healthAdvice } = require('./content');

/** Bands as sent to the browser (Infinity is not valid JSON, so the top band has `max: null`). */
const publicLevels = () =>
  LEVELS.map(({ max, name, short, color }) => ({ max: Number.isFinite(max) ? max : null, name, short, color }));

/** Pollutant readings, with null for any the data source did not provide. */
const pollutants = (air) => ({
  aqi: air.aqi ?? null,
  no2: air.no2 ?? null,
  pm10: air.pm10 ?? null,
  o3: air.o3 ?? null,
  so2: air.so2 ?? null,
  co: air.co ?? null,
});

/** Shape the air section of the response, rounding values and filling gaps with null. */
function describeAir(air, pm, level, stagnation) {
  return {
    pm25: round1(pm),
    ...pollutants(air),
    weather: air.weather || null,
    stagnation,
    who: whoRatios({ pm25: pm, pm10: air.pm10, no2: air.no2, so2: air.so2 }),
    level: level.name,
    levelIndex: level.index,
    color: level.color,
    headline: level.headline,
    source: air.source || 'manual',
    place: air.place || null,
    time: air.time || null,
    forecast: (air.forecast || []).map((h) => ({ time: h.time, pm25: round1(h.pm25) })),
    week: air.week || [],
  };
}

/**
 * @param {object} air {pm25, pm10?, no2?, ..., hourly?, forecast?, week?, weather?, source?, place?, time?}
 * @param {object} profile household profile (see normaliseProfile)
 * @returns {object} facts: air, indoor, activities, actions, schedule, myths, health, levels, ...
 */
function buildFacts(air, profile) {
  const pm = Number(air.pm25);
  const level = levelFor(pm);
  const p = normaliseProfile(profile);
  const window = bestWindow(air.hourly);
  const indoor = indoorEstimate(pm, p);
  const stagnation = stagnationFrom(air.weather);
  const situation = { pm, severity: level.index, profile: p, window, indoor, stagnation };

  return {
    air: describeAir(air, pm, level, stagnation),
    levels: publicLevels(),
    indoor,
    cigarettes: cigaretteEquivalent(pm),
    window,
    sensitive: isSensitive(p),
    summary: { co2Winter: winterCo2Saved(p, level.index), indoorNow: indoor.now },
    activities: buildActivities(situation),
    actions: buildActions(situation),
    schedule: buildSchedule(situation),
    myths: MYTHS,
    health: healthAdvice(situation),
  };
}

module.exports = { buildFacts, levelFor, LEVELS };
