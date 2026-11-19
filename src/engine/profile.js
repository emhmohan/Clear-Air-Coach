'use strict';

/**
 * Normalise a household profile into the shape the rules expect, with safe defaults.
 * @param {object} [profile]
 */
function normaliseProfile(profile = {}) {
  return {
    kids: !!profile.kids,
    elders: !!profile.elders,
    asthma: !!profile.asthma,
    pregnant: !!profile.pregnant,
    purifier: !!profile.purifier,
    exercise: !!profile.exercise,
    cooking: profile.cooking || 'electric',
    heating: profile.heating || 'electric',
    commute: profile.commute || 'car',
    commuteKm: Math.max(0, Number(profile.commuteKm) || 0),
    budget: profile.budget || 'medium',
  };
}

/** @returns {boolean} true when anyone in the household is more vulnerable to smog */
const isSensitive = (p) => p.kids || p.elders || p.asthma || p.pregnant;

module.exports = { normaliseProfile, isSensitive };
