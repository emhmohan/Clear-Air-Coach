'use strict';

const { SEVERITY, SPEED_KMH, TRANSIT } = require('../constants');
const { isSensitive } = require('../profile');

const EXPOSED_COMMUTES = ['bike', 'walk', 'motorbike', 'bus', 'none'];

/** Do outdoor errands in the cleanest forecast window. */
function timingAction({ severity, window }) {
  if (!window || severity < SEVERITY.moderate) return null;
  const { best, worst } = window;
  const cut = Math.max(0, Math.round((1 - best.avg / Math.max(worst.avg, 1)) * 100));
  return {
    id: 'timing',
    category: 'routine',
    priority: 90,
    title: `Do outdoor errands ${best.start}-${best.end}`,
    detail: `Forecast shows today's cleanest stretch around ${best.start} (~${best.avg} µg/m³) and the dirtiest around ${worst.start} (~${worst.avg} µg/m³). Schedule school runs, shopping and walks in the cleaner window.`,
    why: 'Winter smog is trapped under temperature inversions and swings a lot through the day; timing matters as much as masks.',
    impact: { label: 'Particle exposure', value: `~${cut}% lower`, note: 'vs. going out in the dirtiest window' },
    cost: 'Free',
  };
}

/** Move exercise indoors when smog is bad (or praise a clean day for those who exercise). */
function exerciseAction({ severity, profile }) {
  const vulnerable = isSensitive(profile) || severity >= SEVERITY.unhealthy;
  if (severity >= SEVERITY.sensitive && vulnerable) {
    return {
      id: 'indoor-play',
      category: 'routine',
      priority: 95,
      title: profile.kids ? 'Move kids’ play and PE indoors' : 'Swap outdoor workouts for indoor ones',
      detail:
        'Skip running, cycling and playground time. Try stairs circuits, yoga, skipping, dance videos, or a community hall/indoor gym with filtered air.',
      why: 'Hard exercise raises breathing rate 3-4x, so you pull in several times more particles per minute than at rest.',
      impact: {
        label: 'Inhaled dose',
        value: 'up to ~70% lower',
        note: 'one hour of outdoor exercise vs. the same hour indoors in filtered air',
      },
      cost: 'Free',
    };
  }
  if (profile.exercise && severity <= SEVERITY.moderate) {
    return {
      id: 'exercise-ok',
      category: 'routine',
      priority: 40,
      title: 'Good day for outdoor exercise',
      detail:
        'Air is acceptable. Prefer parks and side streets away from main roads, where traffic pollution can be 2-3x higher.',
      why: 'Exercise benefits outweigh risks when PM2.5 is low.',
      impact: { label: 'Benefit', value: 'Full', note: 'no restriction needed' },
      cost: 'Free',
    };
  }
  return null;
}

/** Recommend a fitted respirator for essential trips on smoggy days. */
function maskAction({ severity, profile }) {
  if (severity < SEVERITY.sensitive) return null;
  const speed = SPEED_KMH[profile.commute] || TRANSIT.defaultSpeedKmh;
  const minutes =
    profile.commuteKm > 0 ? Math.round((profile.commuteKm / speed) * 60 * 2) : TRANSIT.defaultCommuteMinutes;
  const exposed = EXPOSED_COMMUTES.includes(profile.commute);
  const travelNote = exposed
    ? ' You travel exposed, so this matters most for you.'
    : ' Even in a car, keep windows shut and set ventilation to recirculate.';
  return {
    id: 'mask',
    category: 'routine',
    priority: severity >= SEVERITY.unhealthy ? 92 : 70,
    title: 'Wear a well-fitted N95 / FFP2 / KN95 for essential trips',
    detail: `Cloth and surgical masks barely stop PM2.5. Choose a respirator with a tight seal (no gaps at nose/cheeks), and replace when damp or deformed.${travelNote}`,
    why: 'Fitted respirators filter ≥94-95% of fine particles; loose masks leak around the edges.',
    impact: {
      label: 'Inhaled particles',
      value: '~60-90% lower',
      note: `over ~${minutes} min of daily travel, depending on fit`,
    },
    cost: '~$1-3 per mask',
  };
}

/** Warn that trapped smog will persist (only when live weather shows stagnation). */
function stagnationAction({ severity, stagnation }) {
  if (!stagnation || stagnation.level === 'low' || severity < SEVERITY.moderate) return null;
  const effect = stagnation.level === 'high' ? 'is trapping pollution near the ground' : 'limits dispersal';
  return {
    id: 'stagnation',
    category: 'routine',
    priority: 93,
    title: 'Expect this smog to linger: prepare for several bad days',
    detail: `Today's weather (peak mixing height ${stagnation.mixingHeight} m, wind ${stagnation.wind} km/h) ${effect}. Stock masks, spare purifier filters and groceries so you can limit trips, and plan school and work around the 5-day outlook.`,
    why: 'Winter smog builds under temperature inversions: cold air near the ground is capped by warmer air above, with little wind to clear it.',
    impact: {
      label: 'Dispersal outlook',
      value: stagnation.level === 'high' ? 'Poor' : 'Limited',
      note: 'from live mixing height and wind (heuristic)',
    },
    cost: 'Free',
  };
}

module.exports = { timingAction, exerciseAction, maskAction, stagnationAction };
