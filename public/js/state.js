import { store } from './lib/storage.js';

/**
 * The single shared application state.
 * - profile/place/manual/lang are remembered between visits
 * - data is the latest /api/plan response
 * - scenario is a what-if PM2.5 (null means live data)
 */
export const state = {
  profile: store.get('cac.profile', null),
  place: store.get('cac.place', null),
  manual: store.get('cac.manual', ''),
  lang: store.get('cac.lang', 'en'),
  data: null,
  category: 'all',
  history: [],
  scenario: null,
};

/** Plan ticks made while simulating live only in memory and never reach the real tracker. */
export const simulatedDone = new Set();

export const isSimulating = () => state.scenario != null;
