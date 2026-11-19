/** localStorage wrapper that never throws (private windows and blocked storage just return defaults). */
export const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked: the app still works, it just will not remember */
    }
  },
};

/** Today's date as YYYY-MM-DD (UTC), used to key daily progress. */
export const today = () => new Date().toISOString().slice(0, 10);
