import { $, setHtml } from '../lib/dom.js';
import { esc, dayLabel } from '../lib/format.js';
import { levelColor } from '../lib/levels.js';
import { store, today } from '../lib/storage.js';
import { badges, lastDays, streak, totals } from '../lib/tracker.js';
import { state, isSimulating } from '../state.js';
import { allActions, doneSet } from '../actions.js';
import { toast } from '../ui/toast.js';

const LOG_KEY = 'cac.log';
const FLAGS_KEY = 'cac.flags';
const TREND_DAYS = 7;
const TREND = { width: 720, height: 190, margin: 20, baseline: 160, maxBar: 140, minBar: 4 };

const readLog = () => store.get(LOG_KEY, {});

/** Record today's progress. Skipped for simulations and manual readings, which are not real days. */
export function logDay() {
  if (!state.data || isSimulating() || state.data.facts.air.source === 'manual') return;
  const actions = allActions();
  const valid = new Set(actions.map((a) => a.id));
  const done = [...doneSet()].filter((id) => valid.has(id));
  const transit = actions.find((a) => a.id === 'transit');
  const log = readLog();
  log[today()] = {
    done: done.length,
    total: actions.length,
    pm: state.data.facts.air.pm25,
    ids: done,
    co2: done.includes('transit') && transit?.co2PerDay ? transit.co2PerDay : 0,
  };
  store.set(LOG_KEY, log);
  renderImpact();
}

/** Unlock a one-off badge (letter, lens, share) the first time it happens. */
export function unlockBadge(flag) {
  const flags = store.get(FLAGS_KEY, {});
  if (flags[flag]) return;
  flags[flag] = 1;
  store.set(FLAGS_KEY, flags);
  renderImpact();
  toast('🏅 Badge unlocked!');
}

const stat = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;

function trendBars(log) {
  const { width, margin, baseline, maxBar, minBar } = TREND;
  const slot = (width - 2 * margin) / TREND_DAYS;
  return lastDays(TREND_DAYS)
    .map((day, i) => {
      const entry = log[day];
      const share = entry ? entry.done / Math.max(entry.total, 1) : 0;
      const height = Math.max(minBar, share * maxBar);
      const x = margin + i * slot;
      const fill = entry ? levelColor(entry.pm) : 'var(--surface2)';
      const title = entry ? `${Math.round(share * 100)}% done, PM2.5 ${entry.pm}` : 'no data';
      return `<rect x="${x + 8}" y="${baseline - height}" width="${slot - 16}" height="${height}" rx="6" fill="${esc(fill)}"><title>${day}: ${title}</title></rect><text x="${x + slot / 2}" y="180" font-size="11" text-anchor="middle" fill="var(--mute)">${dayLabel(day, { weekday: 'short' })}</text>`;
    })
    .join('');
}

const badgeTile = (b) =>
  `<div class="act-tile ${b.earned ? 'go' : 'locked'}"><b>${b.icon} ${b.name}<span class="st ${b.earned ? 'go' : ''}">${b.earned ? 'Earned' : 'Locked'}</span></b><small>${b.desc}</small></div>`;

/** Render the Impact page: stats, 7-day trend and badges. */
export function renderImpact() {
  const log = readLog();
  const flags = store.get(FLAGS_KEY, {});
  const current = streak(log);
  const sum = totals(log);
  $('impactStats').innerHTML = [
    stat(`${current} 🔥`, 'day streak (30%+ of plan)'),
    stat(sum.actions, 'clean-air actions completed'),
    stat(`${sum.co2.toFixed(1)} kg`, 'CO₂ avoided via transport swaps (est.)'),
    stat(sum.days, 'days tracked'),
  ].join('');
  $('trend').setAttribute('viewBox', `0 0 ${TREND.width} ${TREND.height}`);
  $('trend').innerHTML = trendBars(log);
  setHtml($('badges'), badges(log, flags, current).map(badgeTile).join(''));
}
