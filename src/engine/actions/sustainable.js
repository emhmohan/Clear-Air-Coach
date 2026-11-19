'use strict';

const { SEVERITY, CO2_PER_KM, TRANSIT } = require('../constants');
const { round0, round1 } = require('../measures');

const DIRTY_FUELS = ['wood', 'coal', 'kerosene'];
const MOTORISED = ['car', 'motorbike'];

/**
 * Which public-transport mode to suggest, and the CO2 it would save.
 * Metro on very smoggy days, bus otherwise.
 */
function transitSwap(profile, severity) {
  const alternative = severity >= SEVERITY.unhealthy ? 'metro' : 'bus';
  const perDay = profile.commuteKm * 2 * (CO2_PER_KM[profile.commute] - CO2_PER_KM[alternative]);
  return { alternative, perDay };
}

/** Yearly-winter CO2 saved by the transit swap, in kg (0 when the household does not drive). */
function winterCo2Saved(profile, severity) {
  if (!MOTORISED.includes(profile.commute) || profile.commuteKm <= 0) return 0;
  const { perDay } = transitSwap(profile, severity);
  return round0(perDay * TRANSIT.winterDays * TRANSIT.daysPerWeekShare);
}

/** Cleaner heating: a swap away from burning, or efficiency tips for everyone else. */
function heatingAction({ profile }) {
  if (DIRTY_FUELS.includes(profile.heating)) {
    return {
      id: 'heating',
      category: 'sustainable',
      priority: 88,
      title: `Move away from ${profile.heating} heating, starting with better practice`,
      detail:
        'Short term: burn only dry seasoned wood (never trash), use a certified clean-burn stove, and insulate and draught-proof to burn less. Long term: an electric heat pump or community district heating.',
      why: 'Residential wood and coal burning is one of the biggest sources of winter PM2.5 in many cities, and it pollutes your own home first.',
      impact: {
        label: 'Heating energy & emissions',
        value: '~50-70% less',
        note: 'heat pump (3-4x efficient) vs. direct burning or resistive electric',
      },
      cost: 'Insulation tape ~$20 · heat pump upgrade subsidised in many areas',
    };
  }
  return {
    id: 'heating-eff',
    category: 'sustainable',
    priority: 45,
    title: 'Heat smarter: 1°C lower and draught-proof',
    detail: 'Lower the thermostat 1°C, close curtains at dusk, seal door gaps, and heat only the rooms you use.',
    why: 'Less energy drawn means fewer power-plant and boiler emissions, and lower bills.',
    impact: { label: 'Heating energy', value: '~6-10% less', note: 'per °C reduction (typical)' },
    cost: 'Saves money',
  };
}

/** Switch driving to transit (with CO2 saved), or protect active commuters on bad days. */
function commuteAction({ profile, severity }) {
  if (MOTORISED.includes(profile.commute) && profile.commuteKm > 0) {
    const { alternative, perDay } = transitSwap(profile, severity);
    const season = winterCo2Saved(profile, severity);
    return {
      id: 'transit',
      category: 'sustainable',
      priority: 75,
      co2PerDay: round1(perDay * TRANSIT.daysPerWeekShare),
      title: `Take the ${alternative === 'metro' ? 'metro/train' : 'bus'} or carpool 3 days a week`,
      detail: `Your ${profile.commuteKm} km each way adds up. Carpool with neighbours or colleagues, or switch to public transport, and never idle the engine while waiting (turn off after 30 seconds).`,
      why: 'Traffic is a major source of NO₂ and fine particles at street level, and public transport emits far less per person.',
      impact: {
        label: 'CO₂ saved',
        value: `~${round1(perDay)} kg/day · ~${season} kg this winter`,
        note: `${alternative} instead of ${profile.commute}, 3 days/week for ${TRANSIT.winterDays} days (estimate)`,
      },
      cost: 'Usually cheaper than driving',
    };
  }
  if (['bike', 'walk'].includes(profile.commute) && severity >= SEVERITY.unhealthy) {
    return {
      id: 'active-commute',
      category: 'sustainable',
      priority: 72,
      title: 'Bike/walk on side streets, or switch to transit on the worst days',
      detail:
        'Avoid main roads and rush-hour corridors, and wear a respirator if you must be outside. Return to active travel on days PM2.5 drops below ~35.',
      why: 'Active travel is the cleanest option, but heavy breathing in smog raises your dose. Pick the day and route carefully.',
      impact: {
        label: 'Dose vs. route',
        value: '~30-50% lower',
        note: 'quiet side streets vs. main roads (typical range)',
      },
      cost: 'Free',
    };
  }
  return null;
}

/** Always-relevant community action. */
function communityAction() {
  return {
    id: 'community',
    category: 'sustainable',
    priority: 35,
    title: 'Share clean air with your community',
    detail:
      'Check on elderly neighbours, open a school or community room with a purifier, organise a carpool or "no idling" pledge at school gates, and report open burning to your local authority.',
    why: 'Smog is a shared problem. Neighbourhood-scale actions reduce emissions and protect people who cannot protect themselves.',
    impact: {
      label: 'Collective effect',
      value: 'Cuts idling and burning locally',
      note: 'no-idling zones commonly cut school-gate pollution noticeably',
    },
    cost: 'Free',
  };
}

module.exports = { heatingAction, commuteAction, communityAction, winterCo2Saved };
