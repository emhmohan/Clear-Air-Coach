'use strict';

const { LANGS, LIMITS } = require('../config');
const { sendJson } = require('../http/respond');
const { clip } = require('../validation');
const llm = require('../services/llm');
const { geocode } = require('../services/openMeteo');

/** GET /api/status: AI availability and supported languages (also the health check). */
function handleStatus(req, res) {
  const info = llm.info();
  sendJson(res, 200, { ai: Boolean(info.provider), ...info, langs: LANGS });
}

/** GET /api/geocode?q=...: place search. */
async function handleGeocode(req, res, url) {
  const query = clip(url.searchParams.get('q'), LIMITS.placeQueryChars);
  sendJson(res, 200, await geocode(query));
}

module.exports = { handleStatus, handleGeocode };
