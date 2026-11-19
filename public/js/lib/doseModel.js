/**
 * Illustrative "what-if" inhaled-dose model: dose = concentration x hours x breathing rate.
 * Not a measurement; the UI says so.
 */

/** Indoor air as a fraction of outdoor air, by home set-up. */
const INDOOR_FACTOR = { open: 0.8, shut: 0.45, purifierShut: 0.15, purifierOpen: 0.5 };
/** Commute exposure relative to open air. */
const COMMUTE_FACTOR = { open: 1, closed: 0.5, transit: 0.7 };
const MASK_FACTOR = 0.3;
const DEFAULT_TIMING_FACTOR = 0.7;
const TIMING_BOUNDS = { min: 0.3, max: 1 };
/** Breathing-rate multipliers relative to rest. */
const BREATHING = { outdoor: 2, commute: 1.3, indoor: 1 };
const HOURS_PER_DAY = 24;

export const NO_PRECAUTIONS = Object.freeze({ mask: false, shut: false, pur: false, time: false });

export const LEVER_NAMES = {
  mask: 'Wear an N95 outdoors',
  shut: 'Keep windows shut',
  pur: 'Run a purifier (with windows shut)',
  time: 'Go out at the cleaner hour',
};

/** Exposure factor for going out at the cleanest hour, from the real forecast when available. */
function timingFactor(window) {
  if (!window) return DEFAULT_TIMING_FACTOR;
  return Math.min(TIMING_BOUNDS.max, Math.max(TIMING_BOUNDS.min, window.best.avg / Math.max(window.mean, 1)));
}

function indoorFactor({ pur, shut }) {
  if (pur) return shut ? INDOOR_FACTOR.purifierShut : INDOOR_FACTOR.purifierOpen;
  return shut ? INDOOR_FACTOR.shut : INDOOR_FACTOR.open;
}

/**
 * @param {{pm: number, outHours: number, commuteHours: number, mode: 'open'|'closed'|'transit'}} inputs
 * @param {{mask: boolean, shut: boolean, pur: boolean, time: boolean}} options precautions taken
 * @param {{best: {avg: number}, mean: number}|null} [window] cleanest-window data from the plan
 * @returns {number} relative daily dose in arbitrary units
 */
export function dose({ pm, outHours, commuteHours, mode }, options, window = null) {
  const timing = options.time ? timingFactor(window) : 1;
  const mask = options.mask ? MASK_FACTOR : 1;
  const commuteMask = mode === 'closed' ? 1 : mask; // a mask adds little inside a closed car
  const indoorHours = Math.max(0, HOURS_PER_DAY - outHours - commuteHours);
  const outdoor = outHours * BREATHING.outdoor * timing * mask;
  const commute = commuteHours * BREATHING.commute * COMMUTE_FACTOR[mode] * timing * commuteMask;
  const indoor = indoorHours * BREATHING.indoor * indoorFactor(options);
  return pm * (outdoor + commute + indoor);
}

/** @returns {number} percent reduction from `baseline` to `scenario` (0 when there is no baseline) */
export const reductionPercent = (baseline, scenario) => (baseline ? Math.round((1 - scenario / baseline) * 100) : 0);

/** Each single precaution's effect on its own, biggest first: [[lever, percentLower], ...]. */
export function singleLevers(inputs, window = null) {
  const baseline = dose(inputs, NO_PRECAUTIONS, window);
  return Object.keys(LEVER_NAMES)
    .map((lever) => {
      const options = { ...NO_PRECAUTIONS, [lever]: true, ...(lever === 'pur' ? { shut: true } : {}) };
      return [lever, reductionPercent(baseline, dose(inputs, options, window))];
    })
    .sort((a, b) => b[1] - a[1]);
}
