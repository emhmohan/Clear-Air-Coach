'use strict';

/** Sliding-window rate limiter keyed by client identifier (normally the client IP). */
class RateLimiter {
  /**
   * @param {{max: number, windowMs?: number}} options requests allowed per window
   */
  constructor({ max, windowMs = 60_000 }) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  /**
   * Record a request and report whether the caller is over the limit.
   * @param {string} key
   * @param {number} [now] injectable clock for tests
   * @returns {boolean} true when the request should be rejected
   */
  isLimited(key, now = Date.now()) {
    const recent = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    recent.push(now);
    this.hits.set(key, recent);
    return recent.length > this.max;
  }

  /** Drop keys with no recent activity so the map cannot grow forever. */
  prune(now = Date.now()) {
    for (const [key, times] of this.hits) {
      if (!times.some((t) => now - t < this.windowMs)) this.hits.delete(key);
    }
  }
}

module.exports = { RateLimiter };
