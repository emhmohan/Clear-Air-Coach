'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/**
 * Load KEY=value pairs from a .env file into process.env without overriding real variables.
 * Deliberately dependency-free. Missing files are fine (production sets real env vars).
 * @param {string} file absolute path to the .env file
 */
function loadDotEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

loadDotEnv(path.join(ROOT, '.env'));

/** Languages the AI can answer and translate in (code -> English name used in prompts). */
const LANGS = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ur: 'Urdu',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  ar: 'Arabic',
  zh: 'Simplified Chinese',
  pl: 'Polish',
  de: 'German',
};

module.exports = {
  ROOT,
  PUBLIC_DIR: path.join(ROOT, 'public'),
  PORT: Number(process.env.PORT) || 3000,
  /** True behind a reverse proxy/load balancer, so client IPs come from X-Forwarded-For. */
  TRUST_PROXY: Boolean(process.env.TRUST_PROXY),
  LANGS,
  LIMITS: {
    jsonBodyBytes: 100_000,
    imageBodyBytes: 6_000_000,
    requestsPerMinute: 40,
    cacheEntries: 500,
    placeQueryChars: 80,
  },
  TTL_MS: { geocode: 3_600_000, airQuality: 600_000 },
  TIMEOUT_MS: { upstream: 10_000, llm: 60_000 },
};
