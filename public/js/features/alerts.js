import { $ } from '../lib/dom.js';
import { store, today } from '../lib/storage.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';

const NOTIFY_KEY = 'cac.notify';
const ALERTED_KEY = 'cac.alerted';
const MIN_ALERT_SEVERITY = 2; // unhealthy for sensitive groups and worse

const isEnabled = () => store.get(NOTIFY_KEY, false);

export function updateAlertButton() {
  $('notify').textContent = isEnabled() ? '🔔 Alerts on' : '🔔 Alerts';
}

/** Notify once per day when the real air quality is unhealthy. */
export function checkAlert() {
  const facts = state.data?.facts;
  if (!facts || !isEnabled() || Notification.permission !== 'granted') return;
  if (facts.air.levelIndex < MIN_ALERT_SEVERITY || store.get(ALERTED_KEY, '') === today()) return;
  store.set(ALERTED_KEY, today());
  const cleanest = facts.window ? ` Cleanest hours ${facts.window.best.start}-${facts.window.best.end}.` : '';
  new Notification(`Air alert: PM2.5 ${facts.air.pm25} (${facts.air.level})`, {
    body: facts.air.headline + cleanest,
    icon: '/icon.svg',
  });
}

async function toggleAlerts() {
  if (!('Notification' in window)) return toast('Notifications are not supported here');
  if (isEnabled()) {
    store.set(NOTIFY_KEY, false);
    updateAlertButton();
    return toast('Alerts off');
  }
  if ((await Notification.requestPermission()) !== 'granted') return toast('Permission denied');
  store.set(NOTIFY_KEY, true);
  updateAlertButton();
  toast('Alerts on: we will warn you on smoggy days');
  return checkAlert();
}

export function initAlerts() {
  $('notify').addEventListener('click', toggleAlerts);
}
