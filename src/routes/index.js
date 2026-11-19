'use strict';

const { LIMITS, TRUST_PROXY } = require('../config');
const { RateLimiter } = require('../lib/rateLimiter');
const { HttpError, sendError } = require('../http/respond');
const { handlePlan } = require('./plan');
const { handleChat, handleVision, handleLetter } = require('./ai');
const { handleStatus, handleGeocode } = require('./meta');

/** API route table: "METHOD /path" -> handler(req, res, url). */
const ROUTES = {
  'GET /api/status': handleStatus,
  'GET /api/geocode': handleGeocode,
  'POST /api/plan': handlePlan,
  'POST /api/chat': handleChat,
  'POST /api/vision': handleVision,
  'POST /api/letter': handleLetter,
};
const KNOWN_PATHS = new Set(Object.keys(ROUTES).map((key) => key.split(' ')[1]));

const limiter = new RateLimiter({ max: LIMITS.requestsPerMinute });

/** Identify the caller; behind a trusted proxy the real client IP is the first X-Forwarded-For entry. */
function clientKey(req) {
  const forwarded = TRUST_PROXY
    ? String(req.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim()
    : '';
  return forwarded || req.socket.remoteAddress || 'unknown';
}

/**
 * Route an /api request. All errors become JSON responses.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} url
 */
async function handleApi(req, res, url) {
  try {
    const handler = ROUTES[`${req.method} ${url.pathname}`];
    if (!handler)
      throw new HttpError(
        KNOWN_PATHS.has(url.pathname) ? 405 : 404,
        KNOWN_PATHS.has(url.pathname) ? 'Method not allowed' : 'Not found',
      );
    if (req.method === 'POST' && limiter.isLimited(clientKey(req)))
      throw new HttpError(429, 'Too many requests. Please wait a minute.');
    await handler(req, res, url);
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { handleApi, limiter };
