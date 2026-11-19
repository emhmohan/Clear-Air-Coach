import { $, setHtml } from '../lib/dom.js';
import { esc, dayLabel } from '../lib/format.js';
import { levelColor } from '../lib/levels.js';
import { state } from '../state.js';

const MIN_DAYS = 2;

const lowestMean = (days) => days.reduce((a, b) => (b.mean < a.mean ? b : a));
const highestMean = (days) => days.reduce((a, b) => (b.mean > a.mean ? b : a));

function dayCard(day, best, worst) {
  const isBest = day.date === best.date;
  const isWorst = day.date === worst.date && !isBest;
  return `<div class="wk ${isBest ? 'best' : ''}" data-bt="${esc(levelColor(day.mean))}"><b>${dayLabel(day.date)}</b><span class="big">${day.mean}</span><small>avg µg/m³</small><small>peak ${day.max}</small>${isBest ? '<em>Best day</em>' : ''}${isWorst ? '<em class="bad">Worst day</em>' : ''}</div>`;
}

/** Render the 5-day outlook with the best and worst day highlighted. */
export function renderOutlook() {
  const days = state.data.facts.air.week || [];
  if (days.length < MIN_DAYS) {
    $('week').innerHTML = '<p class="note">Outlook needs a city search (not a manual reading).</p>';
    $('weekLead').textContent = '';
    return;
  }
  const best = lowestMean(days);
  const worst = highestMean(days);
  $('weekLead').textContent =
    state.data.ai?.week_tip || `Best day for outdoor plans: ${dayLabel(best.date)}. Roughest: ${dayLabel(worst.date)}.`;
  setHtml($('week'), days.map((d) => dayCard(d, best, worst)).join(''));
}
