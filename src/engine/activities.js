'use strict';

const { isSensitive } = require('./profile');

/** Traffic-light status from severity: 'go' up to `go`, 'caution' up to `caution`, else 'avoid'. */
const trafficLight = (severity, go, caution) => (severity <= go ? 'go' : severity <= caution ? 'caution' : 'avoid');

/**
 * Plain-language guide to everyday activities for today's air.
 * @param {{severity: number, profile: object, window: object|null}} context
 */
function buildActivities({ severity: L, profile, window }) {
  const sensitive = isSensitive(profile);
  const light = (go, caution) => trafficLight(L, go, caution);
  return [
    {
      id: 'walk',
      label: 'Walk outside',
      status: sensitive ? light(1, 1) : light(2, 3),
      note:
        L >= 3
          ? 'Short trips only, with a fitted respirator.'
          : L >= 2
            ? 'Keep it short; pick quiet streets.'
            : 'Fine today.',
    },
    {
      id: 'run',
      label: 'Outdoor exercise',
      status: sensitive ? light(0, 1) : light(1, 2),
      note: L >= 2 ? 'Move the workout indoors.' : 'Choose parks over main roads.',
    },
    {
      id: 'play',
      label: 'Kids’ outdoor play',
      status: light(0, 1),
      note: L >= 2 ? 'Indoor games today; skip PE and playground.' : 'Short sessions are fine.',
    },
    {
      id: 'air',
      label: 'Open windows to air out',
      status: light(1, 2),
      note: window ? `If needed, 5-10 min around ${window.best.start}.` : 'Only briefly at the cleanest hour.',
    },
    {
      id: 'laundry',
      label: 'Dry laundry outside',
      status: light(1, 2),
      note: L >= 2 ? 'Dry indoors; particles cling to fabric.' : 'Fine today.',
    },
    {
      id: 'trip',
      label: 'Non-essential trips',
      status: light(1, 3),
      note:
        L >= 4
          ? 'Postpone if you can; order in.'
          : L >= 2
            ? 'Wear an N95/FFP2 and combine errands.'
            : 'No restriction.',
    },
  ];
}

module.exports = { buildActivities };
