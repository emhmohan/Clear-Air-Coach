'use strict';

/**
 * A small in-memory cache with a per-entry time-to-live and a hard size cap, so arbitrary user
 * input (for example search text) can never grow memory without limit.
 */
class TtlCache {
  /** @param {number} maxEntries oldest entries are evicted beyond this size */
  constructor(maxEntries) {
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  /**
   * Return a fresh cached value, or load, store and return it.
   * @template T
   * @param {string} key
   * @param {number} ttlMs how long a stored value stays fresh
   * @param {() => Promise<T>} loader
   * @returns {Promise<T>}
   */
  async getOrLoad(key, ttlMs, loader) {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.storedAt < ttlMs) return hit.value;
    const value = await loader();
    if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value);
    this.entries.set(key, { storedAt: Date.now(), value });
    return value;
  }

  get size() {
    return this.entries.size;
  }
}

module.exports = { TtlCache };
