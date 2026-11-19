import { $, setHtml } from '../lib/dom.js';
import { esc, clockOf } from '../lib/format.js';
import { levelColor, legendBands } from '../lib/levels.js';

const SIZE = { width: 720, height: 190 };
const PAD = { left: 34, right: 6, top: 10, bottom: 24 };
const HEADROOM = 1.1;
const MIN_SCALE_MAX = 50;
const LABEL_EVERY_HOURS = 3;
const MIN_POINTS = 3;

/** Gridlines at 0, 50% and 100% of the scale, with value labels. */
function gridLines(max, y) {
  return [0, 0.5, 1]
    .map((fraction) => {
      const value = max * fraction;
      const yy = y(value);
      return `<line x1="${PAD.left}" x2="${SIZE.width - PAD.right}" y1="${yy}" y2="${yy}" stroke="var(--line)"/><text x="4" y="${yy + 4}" font-size="10" fill="var(--mute)">${Math.round(value)}</text>`;
    })
    .join('');
}

/** One coloured bar per forecast hour; the cleanest window is outlined. */
function bars(forecast, window, max, y) {
  const barWidth = (SIZE.width - PAD.left - PAD.right) / forecast.length;
  const today = forecast[0].time.slice(0, 10);
  const inBestWindow = (hour) =>
    window &&
    clockOf(hour.time) >= window.best.start &&
    clockOf(hour.time) < window.best.end &&
    hour.time.slice(0, 10) === today;

  return forecast
    .map((hour, i) => {
      const x = PAD.left + i * barWidth;
      const top = y(hour.pm25);
      const outline = inBestWindow(hour) ? 'stroke="var(--ink)" stroke-width="2"' : '';
      const label =
        i % LABEL_EVERY_HOURS === 0
          ? `<text x="${x + barWidth / 2}" y="${SIZE.height - 7}" font-size="10" text-anchor="middle" fill="var(--mute)">${hour.time.slice(11, 13)}h</text>`
          : '';
      return `<rect x="${x + 1.5}" y="${top}" width="${barWidth - 3}" height="${SIZE.height - PAD.bottom - top}" rx="3" fill="${levelColor(hour.pm25)}" opacity="${i === 0 ? 1 : 0.82}" ${outline}><title>${clockOf(hour.time)}: ${hour.pm25} µg/m³</title></rect>${label}`;
    })
    .join('');
}

/** Spoken summary of the chart for screen readers. */
function describe(forecast) {
  const lowest = forecast.reduce((a, b) => (b.pm25 < a.pm25 ? b : a));
  const highest = forecast.reduce((a, b) => (b.pm25 > a.pm25 ? b : a));
  return `Hourly PM2.5 forecast for the next ${forecast.length} hours. Lowest ${lowest.pm25} at ${clockOf(lowest.time)}, highest ${highest.pm25} at ${clockOf(highest.time)} micrograms per cubic metre.`;
}

/**
 * Draw the 24-hour forecast chart.
 * @param {{time: string, pm25: number}[]} forecast
 * @param {{best: object, worst: object}|null} window cleanest/dirtiest windows
 */
export function drawChart(forecast, window) {
  const svg = $('chart');
  if (forecast.length < MIN_POINTS) {
    svg.innerHTML = '';
    svg.style.height = '0';
    $('legend').innerHTML = '';
    $('chartLead').textContent = 'Hourly forecast is unavailable for a manual reading. Enter a city to see it.';
    return;
  }

  svg.style.height = '';
  $('chartLead').textContent = window
    ? `Cleanest around ${window.best.start} (~${window.best.avg} µg/m³). Dirtiest around ${window.worst.start} (~${window.worst.avg} µg/m³).`
    : 'Plan outdoor time around the cleaner hours.';

  const max = Math.max(MIN_SCALE_MAX, ...forecast.map((h) => h.pm25)) * HEADROOM;
  const y = (value) => PAD.top + (SIZE.height - PAD.top - PAD.bottom) * (1 - value / max);

  svg.setAttribute('viewBox', `0 0 ${SIZE.width} ${SIZE.height}`);
  svg.innerHTML = gridLines(max, y) + bars(forecast, window, max, y);
  svg.setAttribute('aria-label', describe(forecast));

  const legend = legendBands().map(({ short, color }) => `<span><i data-bg="${esc(color)}"></i>${esc(short)}</span>`);
  setHtml($('legend'), `${legend.join('')}<span>▭ outlined = best window</span>`);
}
