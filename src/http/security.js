'use strict';

const { TRUST_PROXY } = require('../config');

/** Content-Security-Policy: everything is same-origin; no inline scripts or styles are allowed. */
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

/** Headers added to every response. HSTS is only sent behind an HTTPS-terminating proxy. */
const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'geolocation=(self), microphone=(self), camera=(), payment=()',
  'Content-Security-Policy': CSP,
  ...(TRUST_PROXY ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}),
});

/** @returns {boolean} true when the request accepts gzip responses */
const wantsGzip = (req) => String(req?.headers?.['accept-encoding'] || '').includes('gzip');

module.exports = { SECURITY_HEADERS, wantsGzip };
