import { $ } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { state } from '../state.js';

/** WHO 2021 24-hour guideline values, µg/m³ (mirrors the engine's table for display). */
const POLLUTANTS = [
  ['pm25', 'PM2.5', 15],
  ['pm10', 'PM10', 45],
  ['no2', 'NO₂', 25],
  ['so2', 'SO₂', 40],
];
const UNIT = 'µg/m³';

function pollutantRow(air, [key, name, guideline]) {
  const value = key === 'pm25' ? air.pm25 : air[key];
  if (value == null) return '';
  const times = value / guideline;
  const tone = times > 1 ? 'over' : 'under';
  return `<tr><td>${name}</td><td><b>${Math.round(value * 10) / 10}</b> ${UNIT}</td><td>${guideline} ${UNIT}</td><td class="${tone}">${times.toFixed(1)}×</td></tr>`;
}

const weatherTiles = (w) =>
  `<div class="stats spaced"><div class="stat"><b>${w.temp}°C</b><span>temperature</span></div><div class="stat"><b>${w.humidity}%</b><span>humidity</span></div><div class="stat"><b>${w.wind} km/h</b><span>wind</span></div><div class="stat"><b>${w.maxMixingHeight ?? '–'} m</b><span>peak mixing height today</span></div></div>`;

/** Render live pollutants against WHO guidelines, plus weather and smog-trapping risk. */
export function renderPollutants() {
  const { air } = state.data.facts;
  if (air.source === 'manual') {
    $('polLead').textContent = 'Only PM2.5 is available for a manual reading.';
    $('pol').innerHTML = '';
    return;
  }
  $('polLead').textContent = 'Live model data, compared with the WHO 2021 24-hour guideline values.';

  const rows = POLLUTANTS.map((p) => pollutantRow(air, p)).join('');
  const others = [
    air.o3 != null ? `O₃ ${Math.round(air.o3)} ${UNIT}` : '',
    air.co != null ? `CO ${Math.round(air.co)} ${UNIT}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const table = `<table class="tbl"><thead><tr><th scope="col">Pollutant</th><th scope="col">Now</th><th scope="col">WHO 24h guideline</th><th scope="col">Times guideline</th></tr></thead><tbody>${rows}</tbody></table>`;
  const trapping = air.stagnation
    ? `<div class="ai-box spaced"><b>Trapping risk: ${esc(air.stagnation.level)}.</b> ${esc(air.stagnation.note)}</div>`
    : '';

  $('pol').innerHTML =
    `${table}${others ? `<p class="note">${others}</p>` : ''}${air.weather ? weatherTiles(air.weather) : ''}${trapping}`;
}
