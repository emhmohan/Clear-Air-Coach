'use strict';

/** Allowed values for each enumerated profile field; the first entry is the default. */
const PROFILE_ENUMS = {
  heating: ['electric', 'gas', 'wood', 'coal', 'kerosene', 'district'],
  cooking: ['gas', 'electric', 'induction', 'wood'],
  commute: ['car', 'motorbike', 'bus', 'metro', 'bike', 'walk', 'none'],
  budget: ['low', 'medium', 'high'],
};
const PROFILE_FLAGS = ['kids', 'elders', 'asthma', 'pregnant', 'purifier', 'exercise'];
const MAX_COMMUTE_KM = 300;
const MAX_PM25 = 1500;

/**
 * Reduce a client-supplied profile to known, bounded fields so nothing unexpected can reach the
 * rules engine or an LLM prompt.
 * @param {object} [raw]
 * @returns {object}
 */
function sanitizeProfile(raw = {}) {
  const profile = {};
  for (const flag of PROFILE_FLAGS) profile[flag] = raw[flag] === true;
  for (const [field, allowed] of Object.entries(PROFILE_ENUMS)) {
    profile[field] = allowed.includes(raw[field]) ? raw[field] : allowed[0];
  }
  profile.commuteKm = Math.min(MAX_COMMUTE_KM, Math.max(0, Number(raw.commuteKm) || 0));
  return profile;
}

/** @returns {boolean} true for a finite latitude/longitude pair within valid ranges */
const isValidCoordinate = (lat, lon) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

/** @returns {boolean} true for a plausible PM2.5 concentration in µg/m³ */
const isValidPm25 = (value) => Number.isFinite(value) && value >= 0 && value <= MAX_PM25;

/** Coerce to string and cap length (free text is never trusted for size). */
const clip = (value, maxChars) => String(value ?? '').slice(0, maxChars);

/** @returns {boolean} true for a JPEG, PNG or WebP base64 data URL */
const isImageDataUrl = (value) => /^data:image\/(jpeg|png|webp);base64,/.test(value || '');

module.exports = { sanitizeProfile, isValidCoordinate, isValidPm25, clip, isImageDataUrl, MAX_PM25 };
