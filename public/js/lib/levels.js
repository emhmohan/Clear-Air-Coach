/**
 * Air-quality bands come from the server with every plan (single source of truth in the engine),
 * so colours are never duplicated here.
 */

const NEUTRAL = 'var(--surface2)';
let bands = [];

/** @param {{max: number|null, name: string, short: string, color: string}[]} levels */
export function setLevels(levels) {
  bands = (levels || []).map((level) => ({ ...level, max: level.max ?? Infinity }));
}

/** @returns {string} the band colour for a PM2.5 value, or a neutral colour before data arrives */
export function levelColor(pm) {
  const band = bands.find((level) => pm <= level.max);
  return band ? band.color : NEUTRAL;
}

/** @returns {{short: string, color: string}[]} all bands, for chart legends */
export const legendBands = () => bands.map(({ short, color }) => ({ short, color }));
