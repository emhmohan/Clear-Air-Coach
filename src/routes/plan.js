'use strict';

const { buildFacts } = require('../engine');
const { LANGS, LIMITS } = require('../config');
const { HttpError, sendJson } = require('../http/respond');
const { readJsonBody } = require('../http/body');
const { sanitizeProfile, isValidCoordinate, isValidPm25, clip } = require('../validation');
const { liveAir } = require('../services/openMeteo');
const llm = require('../services/llm');
const coach = require('../ai/coach');

const hasManualReading = (body) => body.manualPm25 != null && body.manualPm25 !== '';

/** Resolve the air reading: a manual PM2.5 value, or live data for the given coordinates. */
async function resolveAir(body) {
  if (hasManualReading(body)) return { pm25: Number(body.manualPm25), source: 'manual' };
  if (body.lat == null || body.lon == null || !isValidCoordinate(+body.lat, +body.lon)) {
    throw new HttpError(400, 'Choose a location or enter a PM2.5 value.');
  }
  try {
    return { ...(await liveAir(+body.lat, +body.lon)) };
  } catch (error) {
    throw new HttpError(502, `Could not fetch live air data. Enter PM2.5 manually. (${error.message})`);
  }
}

/** Personalise (and, for non-English, translate) the plan; failure never blocks the built-in plan. */
async function addAi(facts, profile, body, lang) {
  if (!llm.info().provider) return { ai: null, note: null };
  try {
    const translate = lang !== 'en' ? coach.translateActions(facts, lang).catch(() => null) : null;
    const [personalised, translated] = await Promise.all([
      coach.personalise(facts, profile, body.note, lang),
      translate,
    ]);
    return { ai: translated ? { ...personalised, translated } : personalised, note: null };
  } catch (error) {
    return { ai: null, note: `AI personalisation unavailable (${error.message}). Showing the built-in plan.` };
  }
}

/** POST /api/plan: air data + household profile -> grounded facts, optionally AI-personalised. */
async function handlePlan(req, res) {
  const body = await readJsonBody(req, LIMITS.jsonBodyBytes);
  const air = await resolveAir(body);
  if (!isValidPm25(air.pm25)) throw new HttpError(400, 'PM2.5 must be a number between 0 and 1500.');
  air.place = clip(body.place, LIMITS.placeQueryChars) || null;

  const profile = sanitizeProfile(body.profile);
  const lang = LANGS[body.lang] ? body.lang : 'en';
  const facts = buildFacts(air, profile);
  const { ai, note } = await addAi(facts, profile, body, lang);
  sendJson(res, 200, { facts, ai, note, aiEnabled: Boolean(llm.info().provider), lang });
}

module.exports = { handlePlan };
