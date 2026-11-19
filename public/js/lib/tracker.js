/** Pure helpers for the impact tracker (daily log -> streak, totals, badges). */

const MS_PER_DAY = 86_400_000;
const STREAK_MIN_COMPLETION = 0.3;
const STREAK_LOOKBACK_DAYS = 60;
const BADGE_REPEAT_DAYS = 3;

export const isoDay = (date) => date.toISOString().slice(0, 10);

/** Share of the day's plan completed (0..1). */
const completion = (entry) => entry.done / Math.max(entry.total, 1);

/**
 * Consecutive days (ending today) with at least 30% of the plan done. Today may still be empty
 * without breaking the streak.
 * @param {Record<string, {done: number, total: number}>} log
 */
export function streak(log, now = new Date()) {
  let count = 0;
  const day = new Date(now);
  for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
    const entry = log[isoDay(day)];
    if (entry && completion(entry) >= STREAK_MIN_COMPLETION) count++;
    else if (i > 0) break;
    day.setTime(day.getTime() - MS_PER_DAY);
  }
  return count;
}

/** @returns {string[]} the last `n` dates ending today, oldest first */
export function lastDays(n, now = new Date()) {
  return Array.from({ length: n }, (_, i) => isoDay(new Date(now.getTime() - (n - 1 - i) * MS_PER_DAY)));
}

/** Totals across the whole log. */
export function totals(log) {
  const days = Object.keys(log);
  return {
    days: days.length,
    actions: days.reduce((sum, d) => sum + log[d].done, 0),
    co2: days.reduce((sum, d) => sum + (log[d].co2 || 0), 0),
  };
}

/** Number of logged days on which any of `ids` was completed. */
const daysWithAny = (log, ids) =>
  Object.values(log).filter((entry) => (entry.ids || []).some((id) => ids.includes(id))).length;

/**
 * @param {object} log daily log
 * @param {Record<string, number>} flags one-off achievements (letter, lens, share)
 * @param {number} currentStreak
 */
export function badges(log, flags, currentStreak) {
  const { actions } = totals(log);
  const repeated = (ids) => daysWithAny(log, ids) >= BADGE_REPEAT_DAYS;
  return [
    { icon: '🌱', name: 'First step', desc: 'Complete any action', earned: actions >= 1 },
    { icon: '🔥', name: 'On a roll', desc: '3-day streak', earned: currentStreak >= 3 },
    { icon: '😷', name: 'Mask pro', desc: 'Mask action on 3 days', earned: repeated(['mask']) },
    { icon: '🚌', name: 'Clean commuter', desc: 'Transit swap on 3 days', earned: repeated(['transit']) },
    {
      icon: '🌀',
      name: 'Indoor guardian',
      desc: 'Purifier or windows on 3 days',
      earned: repeated(['purifier', 'diy-purifier', 'windows']),
    },
    { icon: '✉️', name: 'Voice for change', desc: 'Write a letter', earned: Boolean(flags.letter) },
    { icon: '📷', name: 'Sharp eye', desc: 'Use Smog Lens', earned: Boolean(flags.lens) },
    { icon: '🤝', name: 'Community hero', desc: 'Share an air alert', earned: Boolean(flags.share) },
  ];
}
