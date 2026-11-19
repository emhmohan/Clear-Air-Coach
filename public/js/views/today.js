import { $, setHtml } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { state } from '../state.js';
import { drawChart } from './chart.js';

const GAUGE_MAX_PM25 = 250;
const GAUGE_RADIUS = 80;
const STATUS_LABELS = { go: 'Good to go', caution: 'Take care', avoid: 'Avoid' };

const stat = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;

/** Semicircle gauge of today's PM2.5. */
function gaugeHtml(pm, color) {
  const length = Math.PI * GAUGE_RADIUS;
  const filled = Math.min(pm / GAUGE_MAX_PM25, 1) * length;
  const arc = 'M20 100 A80 80 0 0 1 180 100';
  return `<div class="gauge" role="img" aria-label="PM2.5 ${esc(pm)} micrograms per cubic metre"><svg viewBox="0 0 200 110" aria-hidden="true"><path d="${arc}" fill="none" stroke="var(--surface2)" stroke-width="16" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="${esc(color)}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${filled} ${length}"/></svg><div class="val"><b>${esc(pm)}</b><span>PM2.5 µg/m³</span></div></div>`;
}

function renderHero({ air }, ai) {
  const updated = air.time ? `Updated ${air.time.replace('T', ' ')} local` : 'Manual reading';
  const place = air.place ? `📍 ${esc(air.place)} · ` : '';
  const summary = ai?.summary ? `<div class="ai-box">${esc(ai.summary)}</div>` : '';
  setHtml(
    $('hero'),
    `${gaugeHtml(air.pm25, air.color)}<div><span class="pill" data-bg="${esc(air.color)}">${esc(air.level)}</span><h2 class="headline">${esc(air.headline)}</h2><div class="place">${place}${esc(updated)}</div>${summary}</div>`,
  );
}

function renderStats(facts) {
  const { air, indoor, cigarettes, summary } = facts;
  const home = state.profile.purifier ? 'purifier on' : 'windows shut';
  $('stats').innerHTML = [
    stat(cigarettes, 'cigarette-equivalents/day if outdoors all day (rough rule of thumb)'),
    stat(`~${indoor.now}`, `est. indoor PM2.5 now, ${home}`),
    stat(`~${indoor.open}`, 'est. indoor PM2.5 with windows open'),
    air.aqi != null ? stat(air.aqi, 'US AQI') : '',
    air.no2 != null ? stat(Math.round(air.no2), 'NO₂ µg/m³ (traffic &amp; gas)') : '',
    summary.co2Winter ? stat(`~${summary.co2Winter} kg`, 'CO₂ you could save this winter by switching transport') : '',
  ].join('');
}

const activityTile = (a) =>
  `<div class="act-tile ${a.status}"><b>${esc(a.label)}<span class="st ${a.status}">${STATUS_LABELS[a.status]}</span></b><small>${esc(a.note)}</small></div>`;

const routineStep = (s) => `<div role="listitem"><b>${esc(s.time)}</b><span>${esc(s.text)}</span></div>`;

/** Render the Today page: hero gauge, key numbers, activity guide, chart and routine. */
export function renderToday() {
  const { facts, ai } = state.data;
  renderHero(facts, ai);
  renderStats(facts);
  $('acts').innerHTML = facts.activities.map(activityTile).join('');
  $('timeline').innerHTML = facts.schedule.map(routineStep).join('');
  drawChart(facts.air.forecast || [], facts.window);
}
