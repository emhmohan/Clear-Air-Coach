'use strict';

const { SEVERITY } = require('../constants');

const sameRoomNote = (indoor) => `~${indoor.closed} → ${indoor.purified} µg/m³`;

/** Keep windows shut in smog and air out briefly at the cleanest hour. */
function windowsAction({ severity, window, indoor }) {
  if (severity < SEVERITY.sensitive) return null;
  const when = window ? ` around ${window.best.start}` : ' when outdoor air is relatively cleanest,';
  const lead = window ? 'Open windows for 5-10 minutes' : 'Open windows only 5-10 minutes';
  const detail = window
    ? `${lead}${when} for fresh air, then close. Seal gaps with weatherstrip tape or a rolled towel.`
    : `${lead}${when} then close. Seal gaps with weatherstrip tape or a rolled towel.`;
  return {
    id: 'windows',
    category: 'indoor',
    priority: 85,
    title: 'Keep windows shut in smog; air out briefly at the cleanest hour',
    detail,
    why: 'Closed, sealed rooms keep out roughly half or more of outdoor particles; open windows let nearly all of them in.',
    impact: {
      label: 'Indoor PM2.5',
      value: `~${indoor.open} → ${indoor.closed} µg/m³`,
      note: 'windows open vs. closed (estimate)',
    },
    cost: 'Free to ~$5',
  };
}

/** Use an existing purifier well, or suggest a DIY/HEPA one. */
function purifierAction({ severity, profile, indoor }) {
  if (severity < SEVERITY.moderate) return null;
  if (profile.purifier) {
    return {
      id: 'purifier',
      category: 'indoor',
      priority: 80,
      title: 'Run your purifier on high in the bedroom and main room',
      detail:
        'Keep doors closed, place it away from walls with 30+ cm clearance, and check the filter (replace every 6-12 months or when the indicator says). Check that its CADR suits the room size.',
      why: 'A HEPA purifier sized for the room removes the particles that leak in, and you spend about a third of your life asleep in that room.',
      impact: {
        label: 'Indoor PM2.5',
        value: sameRoomNote(indoor),
        note: 'closed room with vs. without purifier (estimate)',
      },
      cost: 'Electricity ~$0.5-1/week',
    };
  }
  return {
    id: 'diy-purifier',
    category: 'indoor',
    priority: 82,
    title:
      profile.budget === 'low'
        ? 'Build a Corsi-Rosenthal box (DIY air cleaner)'
        : 'Get a HEPA purifier, or build a Corsi-Rosenthal box',
    detail:
      'A Corsi-Rosenthal box is a 20-inch box fan with four MERV-13 furnace filters taped into a cube (filter arrows pointing in). Run it in the bedroom or living area, on low-medium for noise.',
    why: 'Independent tests show these cubes match commercial HEPA units on clean-air delivery for a fraction of the price.',
    impact: { label: 'Indoor PM2.5', value: sameRoomNote(indoor), note: 'closed room with a purifier (estimate)' },
    cost: 'DIY ~$50-70 · HEPA unit ~$100-250',
  };
}

/** Reduce cooking smoke for gas and wood stoves. */
function cookingAction({ profile }) {
  if (profile.cooking === 'electric' || profile.cooking === 'induction') return null;
  const wood = profile.cooking === 'wood';
  return {
    id: 'cooking',
    category: 'indoor',
    priority: 60,
    title: wood
      ? 'Use a vented or improved stove; cook in a ventilated spot'
      : 'Run the range hood (vented outdoors) while cooking',
    detail: `${wood ? 'Dry, seasoned fuel burns cleaner; ' : 'Use the back burners, '}use lids, avoid high-heat frying, and leave the hood or a small window cracked at the cleanest hour for 15 minutes after cooking.`,
    why: 'Cooking can push indoor PM2.5 above outdoor levels, and gas also adds NO₂, which irritates airways.',
    impact: { label: 'Indoor PM2.5 spike', value: '~50-70% lower', note: 'with an outdoor-vented hood during cooking' },
    cost: wood ? 'Free to ~$40' : 'Free',
  };
}

/** Always-relevant advice: cut smoke sources inside the home. */
function indoorSourcesAction() {
  return {
    id: 'indoor-sources',
    category: 'indoor',
    priority: 50,
    title: 'Cut indoor smoke sources',
    detail:
      'No smoking, incense, candles or aerosol sprays indoors; skip "ozone" or ionizer gadgets. Damp-mop and vacuum with a HEPA vacuum instead of sweeping.',
    why: 'In winter you spend ~90% of your time indoors, so indoor sources can outweigh outdoor smog.',
    impact: { label: 'Indoor PM2.5', value: 'Avoids spikes of 20-100+ µg/m³', note: 'during burning or smoking' },
    cost: 'Free',
  };
}

module.exports = { windowsAction, purifierAction, cookingAction, indoorSourcesAction };
