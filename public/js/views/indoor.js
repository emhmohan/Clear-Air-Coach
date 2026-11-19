import { $, setHtml } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { levelColor } from '../lib/levels.js';
import { state } from '../state.js';

const AIR_CHANGES_PER_HOUR = 4.8;
const M3H_PER_CFM = 1.7;
const MIN_BAR_PERCENT = 3;

const barRow = (label, value, max) =>
  `<div class="bar-row"><div class="lab"><span>${label}</span><b>${value} µg/m³</b></div><div class="bar"><i data-w="${Math.max(MIN_BAR_PERCENT, (value / max) * 100)}" data-bg="${esc(levelColor(value))}"></i></div></div>`;

/** Purifier sizing: room volume x ~4.8 air changes per hour gives the CADR to look for. */
function updatePurifierCalculator() {
  const area = Number($('rArea').value) || 0;
  const height = Number($('rH').value) || 0;
  const volume = area * height;
  const cadr = Math.round(volume * AIR_CHANGES_PER_HOUR);
  $('cadr').innerHTML =
    `Room volume <b>${volume.toFixed(0)} m³</b><br>Look for a CADR of at least <b>${cadr} m³/h</b> (~${Math.round(cadr / M3H_PER_CFM)} CFM)<div class="note">Rule of thumb: about 4-5 full air changes per hour. A DIY Corsi-Rosenthal box delivers roughly 400-600 m³/h.</div>`;
}

function roomGuide(window) {
  const airing = window ? ` (about ${window.best.start} today)` : '';
  return [
    [
      '🛏 Bedroom',
      'Top priority: you spend ~8 hours here. Keep the door and window shut, run the purifier all night, and wash bedding weekly.',
    ],
    [
      '🍳 Kitchen',
      'Use the hood vented outdoors, cook with lids, and avoid high-heat frying. Gas stoves add NO₂, so ventilate after cooking.',
    ],
    [
      '🛋 Living room',
      'Use the DIY or HEPA purifier here by day. Skip candles and incense, and damp-dust instead of sweeping.',
    ],
    [
      '🚪 Doors & windows',
      `Seal gaps with weatherstrip tape. Air out for 5-10 minutes only at the cleanest hour${airing}.`,
    ],
  ];
}

/** Render the Indoor page: inside-vs-outside bars, purifier calculator, room guide and myths. */
export function renderIndoor() {
  const { facts } = state.data;
  const outdoor = facts.air.pm25;
  const max = Math.max(outdoor, 1);
  setHtml(
    $('indoorBars'),
    [
      barRow('Outdoors', outdoor, max),
      barRow('Indoors, windows open', facts.indoor.open, max),
      barRow('Indoors, windows shut', facts.indoor.closed, max),
      barRow('Shut + purifier', facts.indoor.purified, max),
    ].join(''),
  );
  updatePurifierCalculator();
  $('rooms').innerHTML = roomGuide(facts.window)
    .map(([title, text]) => `<div class="room"><h4>${title}</h4><div>${esc(text)}</div></div>`)
    .join('');
  $('myths').innerHTML = facts.myths.map((m) => `<li>${esc(m)}</li>`).join('');
}

export function initIndoor() {
  $('rArea').addEventListener('input', updatePurifierCalculator);
  $('rH').addEventListener('input', updatePurifierCalculator);
}
