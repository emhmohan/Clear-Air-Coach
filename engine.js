// Deterministic "facts" engine: turns air data + household profile into grounded actions with
// quantified impact. The GenAI layer personalises and explains these; it never invents the numbers.

const LEVELS = [
  { max: 9, key: 0, name: 'Good', color: '#2e9e5b', headline: 'Air is clean. Enjoy the outdoors.' },
  { max: 35.4, key: 1, name: 'Moderate', color: '#c9a400', headline: 'Fine for most; sensitive people take care.' },
  { max: 55.4, key: 2, name: 'Unhealthy for sensitive groups', color: '#e67e22', headline: 'Children, elders and asthmatics should limit time outside.' },
  { max: 125.4, key: 3, name: 'Unhealthy', color: '#d93a3a', headline: 'Everyone should cut outdoor exposure today.' },
  { max: 225.4, key: 4, name: 'Very unhealthy', color: '#8e3fa8', headline: 'Stay in clean indoor air; mask up for essential trips.' },
  { max: Infinity, key: 5, name: 'Hazardous', color: '#7a1f3d', headline: 'Emergency-level smog. Stay indoors with filtered air.' },
];

const CO2_PER_KM = { car: 0.17, motorbike: 0.10, bus: 0.09, metro: 0.04, bike: 0, walk: 0, none: 0 };
const SPEED_KMH = { car: 25, motorbike: 25, bus: 18, metro: 28, bike: 14, walk: 5, none: 1 };
const WINTER_DAYS = 90;

const r1 = (n) => Math.round(n * 10) / 10;
const r0 = (n) => Math.round(n);

function levelFor(pm) {
  return LEVELS.find((l) => pm <= l.max);
}

// Pick the cleanest 2-hour window between 07:00 and 21:00 from an hourly forecast.
function bestWindow(hourly) {
  if (!hourly || hourly.length < 3) return null;
  const day = hourly.filter((h) => {
    const hr = Number(h.time.slice(11, 13));
    return hr >= 7 && hr <= 20;
  });
  if (day.length < 3) return null;
  let best = null;
  let worst = null;
  for (let i = 0; i < day.length - 1; i++) {
    const avg = (day[i].pm25 + day[i + 1].pm25) / 2;
    const w = { start: day[i].time.slice(11, 16), end: `${String(Number(day[i + 1].time.slice(11, 13)) + 1).padStart(2, '0')}:00`, avg: r1(avg) };
    if (!best || avg < best.avg) best = w;
    if (!worst || avg > worst.avg) worst = w;
  }
  const mean = day.reduce((s, h) => s + h.pm25, 0) / day.length;
  return { best, worst, mean: r1(mean) };
}

function indoorEstimate(pm, profile) {
  const open = pm * 0.8;
  const closed = pm * 0.45;
  const purified = pm * 0.15;
  const now = profile.purifier ? purified : closed;
  return { open: r1(open), closed: r1(closed), purified: r1(purified), now: r1(now) };
}

function buildFacts(air, profile) {
  const pm = Number(air.pm25);
  const level = levelFor(pm);
  const L = level.key;
  const p = {
    kids: !!profile.kids, elders: !!profile.elders, asthma: !!profile.asthma, pregnant: !!profile.pregnant,
    purifier: !!profile.purifier, cooking: profile.cooking || 'electric', heating: profile.heating || 'electric',
    commute: profile.commute || 'car', commuteKm: Math.max(0, Number(profile.commuteKm) || 0),
    exercise: !!profile.exercise, budget: profile.budget || 'medium',
  };
  const sensitive = p.kids || p.elders || p.asthma || p.pregnant;
  const win = bestWindow(air.hourly);
  const indoor = indoorEstimate(pm, p);
  const cig = r1(pm / 22);
  const actions = [];
  const add = (a) => actions.push(a);

  // --- Routine ---
  if (win && L >= 1) {
    const cut = Math.max(0, Math.round((1 - win.best.avg / Math.max(win.worst.avg, 1)) * 100));
    add({
      id: 'timing', category: 'routine', priority: 90,
      title: `Do outdoor errands ${win.best.start}-${win.best.end}`,
      detail: `Forecast shows today's cleanest stretch around ${win.best.start} (~${win.best.avg} µg/m³) and the dirtiest around ${win.worst.start} (~${win.worst.avg} µg/m³). Schedule school runs, shopping and walks in the cleaner window.`,
      why: 'Winter smog is trapped under temperature inversions and swings a lot through the day; timing matters as much as masks.',
      impact: { label: 'Particle exposure', value: `~${cut}% lower`, note: 'vs. going out in the dirtiest window' },
      cost: 'Free',
    });
  }
  if (L >= 2 && (p.kids || p.elders || p.asthma || p.pregnant || L >= 3)) {
    add({
      id: 'indoor-play', category: 'routine', priority: 95,
      title: p.kids ? 'Move kids’ play and PE indoors' : 'Swap outdoor workouts for indoor ones',
      detail: 'Skip running, cycling and playground time. Try stairs circuits, yoga, skipping, dance videos, or a community hall/indoor gym with filtered air.',
      why: 'Hard exercise raises breathing rate 3-4x, so you pull in several times more particles per minute than at rest.',
      impact: { label: 'Inhaled dose', value: `up to ~70% lower`, note: 'one hour of outdoor exercise vs. the same hour indoors in filtered air' },
      cost: 'Free',
    });
  } else if (p.exercise && L <= 1) {
    add({ id: 'exercise-ok', category: 'routine', priority: 40, title: 'Good day for outdoor exercise', detail: 'Air is acceptable. Prefer parks and side streets away from main roads, where traffic pollution can be 2-3x higher.', why: 'Exercise benefits outweigh risks when PM2.5 is low.', impact: { label: 'Benefit', value: 'Full', note: 'no restriction needed' }, cost: 'Free' });
  }
  if (L >= 2) {
    const mins = p.commuteKm > 0 ? Math.round((p.commuteKm / (SPEED_KMH[p.commute] || 20)) * 60 * 2) : 40;
    const open = ['bike', 'walk', 'motorbike', 'bus'].includes(p.commute) || p.commute === 'none';
    add({
      id: 'mask', category: 'routine', priority: L >= 3 ? 92 : 70,
      title: 'Wear a well-fitted N95 / FFP2 / KN95 for essential trips',
      detail: `Cloth and surgical masks barely stop PM2.5. Choose a respirator with a tight seal (no gaps at nose/cheeks), and replace when damp or deformed.${open ? ' You travel exposed, so this matters most for you.' : ' Even in a car, keep windows shut and set ventilation to recirculate.'}`,
      why: 'Fitted respirators filter ≥94-95% of fine particles; loose masks leak around the edges.',
      impact: { label: 'Inhaled particles', value: '~60-90% lower', note: `over ~${mins} min of daily travel, depending on fit` },
      cost: '~$1-3 per mask',
    });
  }

  // --- Indoor ---
  if (L >= 2) {
    add({
      id: 'windows', category: 'indoor', priority: 85,
      title: 'Keep windows shut in smog; air out briefly at the cleanest hour',
      detail: win ? `Open windows for 5-10 minutes around ${win.best.start} for fresh air, then close. Seal gaps with weatherstrip tape or a rolled towel.` : 'Open windows only 5-10 minutes when outdoor air is relatively cleanest, then close. Seal gaps with weatherstrip tape or a rolled towel.',
      why: 'Closed, sealed rooms keep out roughly half or more of outdoor particles; open windows let nearly all of them in.',
      impact: { label: 'Indoor PM2.5', value: `~${indoor.open} → ${indoor.closed} µg/m³`, note: 'windows open vs. closed (estimate)' },
      cost: 'Free to ~$5',
    });
  }
  if (L >= 1) {
    if (p.purifier) {
      add({
        id: 'purifier', category: 'indoor', priority: 80,
        title: 'Run your purifier on high in the bedroom and main room',
        detail: 'Keep doors closed, place it away from walls with 30+ cm clearance, and check the filter (replace every 6-12 months or when the indicator says). Check that its CADR suits the room size.',
        why: 'A HEPA purifier sized for the room removes the particles that leak in, and you spend about a third of your life asleep in that room.',
        impact: { label: 'Indoor PM2.5', value: `~${indoor.closed} → ${indoor.purified} µg/m³`, note: 'closed room with vs. without purifier (estimate)' },
        cost: 'Electricity ~$0.5-1/week',
      });
    } else {
      const free = p.budget === 'low';
      add({
        id: 'diy-purifier', category: 'indoor', priority: 82,
        title: free ? 'Build a Corsi-Rosenthal box (DIY air cleaner)' : 'Get a HEPA purifier, or build a Corsi-Rosenthal box',
        detail: 'A Corsi-Rosenthal box is a 20-inch box fan with four MERV-13 furnace filters taped into a cube (filter arrows pointing in). Run it in the bedroom or living area, on low-medium for noise.',
        why: 'Independent tests show these cubes match commercial HEPA units on clean-air delivery for a fraction of the price.',
        impact: { label: 'Indoor PM2.5', value: `~${indoor.closed} → ${indoor.purified} µg/m³`, note: 'closed room with a purifier (estimate)' },
        cost: 'DIY ~$50-70 · HEPA unit ~$100-250',
      });
    }
  }
  if (p.cooking !== 'electric' && p.cooking !== 'induction') {
    add({
      id: 'cooking', category: 'indoor', priority: 60,
      title: p.cooking === 'wood' ? 'Use a vented or improved stove; cook in a ventilated spot' : 'Run the range hood (vented outdoors) while cooking',
      detail: `${p.cooking === 'wood' ? 'Dry, seasoned fuel burns cleaner; ' : 'Use the back burners, '}use lids, avoid high-heat frying, and leave the hood or a small window cracked at the cleanest hour for 15 minutes after cooking.`,
      why: 'Cooking can push indoor PM2.5 above outdoor levels, and gas also adds NO₂, which irritates airways.',
      impact: { label: 'Indoor PM2.5 spike', value: '~50-70% lower', note: 'with an outdoor-vented hood during cooking' },
      cost: p.cooking === 'wood' ? 'Free to ~$40' : 'Free',
    });
  }
  add({
    id: 'indoor-sources', category: 'indoor', priority: 50,
    title: 'Cut indoor smoke sources',
    detail: 'No smoking, incense, candles or aerosol sprays indoors; skip "ozone" or ionizer gadgets. Damp-mop and vacuum with a HEPA vacuum instead of sweeping.',
    why: 'In winter you spend ~90% of your time indoors, so indoor sources can outweigh outdoor smog.',
    impact: { label: 'Indoor PM2.5', value: 'Avoids spikes of 20-100+ µg/m³', note: 'during burning or smoking' },
    cost: 'Free',
  });

  // --- Sustainable ---
  if (['wood', 'coal', 'kerosene'].includes(p.heating)) {
    add({
      id: 'heating', category: 'sustainable', priority: 88,
      title: `Move away from ${p.heating} heating, starting with better practice`,
      detail: 'Short term: burn only dry seasoned wood (never trash), use a certified clean-burn stove, and insulate and draught-proof to burn less. Long term: an electric heat pump or community district heating.',
      why: 'Residential wood and coal burning is one of the biggest sources of winter PM2.5 in many cities, and it pollutes your own home first.',
      impact: { label: 'Heating energy & emissions', value: '~50-70% less', note: 'heat pump (3-4x efficient) vs. direct burning or resistive electric' },
      cost: 'Insulation tape ~$20 · heat pump upgrade subsidised in many areas',
    });
  } else {
    add({
      id: 'heating-eff', category: 'sustainable', priority: 45,
      title: 'Heat smarter: 1°C lower and draught-proof',
      detail: 'Lower the thermostat 1°C, close curtains at dusk, seal door gaps, and heat only the rooms you use.',
      why: 'Less energy drawn means fewer power-plant and boiler emissions, and lower bills.',
      impact: { label: 'Heating energy', value: '~6-10% less', note: 'per °C reduction (typical)' },
      cost: 'Saves money',
    });
  }
  if (['car', 'motorbike'].includes(p.commute) && p.commuteKm > 0) {
    const alt = L >= 3 ? 'metro' : 'bus';
    const perDay = p.commuteKm * 2 * (CO2_PER_KM[p.commute] - CO2_PER_KM[alt]);
    const season = r0(perDay * WINTER_DAYS * 0.8);
    add({
      id: 'transit', category: 'sustainable', priority: 75, co2PerDay: r1(perDay * 0.8),
      title: `Take the ${alt === 'metro' ? 'metro/train' : 'bus'} or carpool 3 days a week`,
      detail: `Your ${p.commuteKm} km each way adds up. Carpool with neighbours or colleagues, or switch to public transport, and never idle the engine while waiting (turn off after 30 seconds).`,
      why: 'Traffic is a major source of NO₂ and fine particles at street level, and public transport emits far less per person.',
      impact: { label: 'CO₂ saved', value: `~${r1(perDay)} kg/day · ~${season} kg this winter`, note: `${alt} instead of ${p.commute}, 3 days/week for ${WINTER_DAYS} days (estimate)` },
      cost: 'Usually cheaper than driving',
    });
  } else if (['bike', 'walk'].includes(p.commute) && L >= 3) {
    add({
      id: 'active-commute', category: 'sustainable', priority: 72,
      title: 'Bike/walk on side streets, or switch to transit on the worst days',
      detail: 'Avoid main roads and rush-hour corridors, and wear a respirator if you must be outside. Return to active travel on days PM2.5 drops below ~35.',
      why: 'Active travel is the cleanest option, but heavy breathing in smog raises your dose. Pick the day and route carefully.',
      impact: { label: 'Dose vs. route', value: '~30-50% lower', note: 'quiet side streets vs. main roads (typical range)' },
      cost: 'Free',
    });
  }
  add({
    id: 'community', category: 'sustainable', priority: 35,
    title: 'Share clean air with your community',
    detail: 'Check on elderly neighbours, open a school or community room with a purifier, organise a carpool or "no idling" pledge at school gates, and report open burning to your local authority.',
    why: 'Smog is a shared problem. Neighbourhood-scale actions reduce emissions and protect people who cannot protect themselves.',
    impact: { label: 'Collective effect', value: 'Cuts idling and burning locally', note: 'no-idling zones commonly cut school-gate pollution noticeably' },
    cost: 'Free',
  });

  actions.sort((a, b) => b.priority - a.priority);

  const schedule = [];
  schedule.push({ time: 'Morning', text: L >= 2 ? 'Check the forecast, keep windows shut, run the purifier. Delay school or work walks if you can.' : 'Short airing of rooms, then close the windows.' });
  schedule.push({ time: win ? win.best.start : 'Midday', text: win ? 'Cleanest window: errands, school pick-up, outdoor time, and airing the home.' : 'Do errands and outdoor time around midday when the air is usually mixing better.' });
  schedule.push({ time: 'Evening', text: L >= 2 ? 'Cook with the hood on, keep burning to a minimum, and tidy with a damp cloth. Keep the bedroom closed with the purifier running.' : 'Normal routine; keep an eye on the evening rise as temperatures drop.' });
  schedule.push({ time: 'Night', text: 'Sleep with the purifier on and the door closed. This is when your lungs get their longest clean-air stretch.' });

  const myths = [
    'House plants do not measurably clean room air at normal densities; a purifier does far more.',
    'Wet cloths or surgical masks are not a substitute for an N95/FFP2 respirator.',
    'Ozone generators and "ionizers" can add irritant gases, so avoid them.',
  ];

  const health = (sensitive || L >= 3)
    ? 'Seek medical help for chest tightness, wheezing, severe cough, dizziness or breathlessness at rest. Keep rescue inhalers close at hand if prescribed.'
    : 'Watch for eye, throat or breathing irritation and rest indoors if it appears.';

  const co2Winter = ['car', 'motorbike'].includes(p.commute) && p.commuteKm > 0
    ? r0(p.commuteKm * 2 * (CO2_PER_KM[p.commute] - CO2_PER_KM[L >= 3 ? 'metro' : 'bus']) * WINTER_DAYS * 0.8) : 0;

  // WHO 2021 24-hour guideline values (µg/m³): PM2.5 15, PM10 45, NO2 25, SO2 40
  const ratio = (v, g) => (v == null ? null : r1(v / g));
  const who = { pm25: ratio(pm, 15), pm10: ratio(air.pm10, 45), no2: ratio(air.no2, 25), so2: ratio(air.so2, 40) };
  // Stagnation heuristic from real weather: shallow mixing layer + light wind traps pollution (winter inversion)
  let stagnation = null;
  const wx = air.weather;
  if (wx && wx.maxMixingHeight != null && wx.wind != null) {
    const level_ = wx.maxMixingHeight < 500 && wx.wind < 10 ? 'high' : wx.maxMixingHeight < 900 && wx.wind < 15 ? 'moderate' : 'low';
    stagnation = { level: level_, mixingHeight: wx.maxMixingHeight, wind: wx.wind, note: level_ === 'high' ? 'Shallow mixing layer and calm wind: pollution is trapped near the ground and likely to persist or build up.' : level_ === 'moderate' ? 'Limited mixing and light wind: pollution may linger.' : 'Good mixing or wind: pollution should disperse.' };
  }
  if (stagnation && stagnation.level !== 'low' && L >= 1) {
    actions.push({
      id: 'stagnation', category: 'routine', priority: 93,
      title: 'Expect this smog to linger: prepare for several bad days',
      detail: `Today's weather (peak mixing height ${stagnation.mixingHeight} m, wind ${stagnation.wind} km/h) ${stagnation.level === 'high' ? 'is trapping pollution near the ground' : 'limits dispersal'}. Stock masks, spare purifier filters and groceries so you can limit trips, and plan school and work around the 5-day outlook.`,
      why: 'Winter smog builds under temperature inversions: cold air near the ground is capped by warmer air above, with little wind to clear it.',
      impact: { label: 'Dispersal outlook', value: stagnation.level === 'high' ? 'Poor' : 'Limited', note: 'from live mixing height and wind (heuristic)' },
      cost: 'Free',
    });
    actions.sort((a, b) => b.priority - a.priority);
  }
  const st = (go, caution) => (L <= go ? 'go' : L <= caution ? 'caution' : 'avoid');
  const activities = [
    { id: 'walk', label: 'Walk outside', status: sensitive ? st(1, 1) : st(2, 3), note: L >= 3 ? 'Short trips only, with a fitted respirator.' : L >= 2 ? 'Keep it short; pick quiet streets.' : 'Fine today.' },
    { id: 'run', label: 'Outdoor exercise', status: sensitive ? st(0, 1) : st(1, 2), note: L >= 2 ? 'Move the workout indoors.' : 'Choose parks over main roads.' },
    { id: 'play', label: 'Kids’ outdoor play', status: st(0, 1), note: L >= 2 ? 'Indoor games today; skip PE and playground.' : 'Short sessions are fine.' },
    { id: 'air', label: 'Open windows to air out', status: st(1, 2), note: win ? `If needed, 5-10 min around ${win.best.start}.` : 'Only briefly at the cleanest hour.' },
    { id: 'laundry', label: 'Dry laundry outside', status: st(1, 2), note: L >= 2 ? 'Dry indoors; particles cling to fabric.' : 'Fine today.' },
    { id: 'trip', label: 'Non-essential trips', status: st(1, 3), note: L >= 4 ? 'Postpone if you can; order in.' : L >= 2 ? 'Wear an N95/FFP2 and combine errands.' : 'No restriction.' },
  ];

  return {
    activities,
    air: { pm25: r1(pm), aqi: air.aqi ?? null, no2: air.no2 ?? null, pm10: air.pm10 ?? null, o3: air.o3 ?? null, so2: air.so2 ?? null, co: air.co ?? null, weather: air.weather || null, stagnation, who, level: level.name, levelIndex: L, color: level.color, headline: level.headline, source: air.source || 'manual', place: air.place || null, time: air.time || null, forecast: (air.forecast || []).map((h) => ({ time: h.time, pm25: r1(h.pm25) })), week: air.week || [] },
    indoor, cigarettes: cig, window: win, sensitive,
    summary: { co2Winter, indoorNow: indoor.now },
    actions, schedule, myths, health,
  };
}

module.exports = { buildFacts, levelFor, LEVELS };
