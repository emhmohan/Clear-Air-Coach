import { $ } from './lib/dom.js';
import { api } from './lib/api.js';
import { esc } from './lib/format.js';
import { setLevels } from './lib/levels.js';
import { store } from './lib/storage.js';
import { state } from './state.js';
import { banner, hideBanner } from './ui/banner.js';
import { openOnboarding } from './onboarding.js';
import { renderAll } from './views/index.js';

const LAST_PLAN_KEY = 'cac.last';
const NO_KEY_NOTICE =
  'Running in built-in mode. Add a <code>GROQ_API_KEY</code> on the server to unlock AI personalisation and chat.';

const setBusy = (busy) => {
  $('loading').classList.toggle('hidden', !busy);
  $('main').setAttribute('aria-busy', String(busy));
};

/** The request body for /api/plan, from the saved profile, place and any simulation. */
function planRequest() {
  const body = {
    profile: state.profile,
    note: state.profile.note,
    manualPm25: state.scenario ?? state.manual,
    lang: state.lang,
  };
  if (state.place) Object.assign(body, { lat: state.place.lat, lon: state.place.lon, place: state.place.short });
  return body;
}

function show(data) {
  state.data = data;
  setLevels(data.facts.levels);
  renderAll();
}

/** Fall back to the last good plan when the network or data source is unavailable. */
function showOfflineFallback(error) {
  const cached = store.get(LAST_PLAN_KEY, null);
  if (cached) {
    show(cached.data);
    banner(
      `Offline or data unavailable (${esc(error.message)}). Showing your last plan from ${new Date(cached.at).toLocaleString()}.`,
    );
    return;
  }
  banner(`${esc(error.message)} <button class="btn soft" id="retry">Edit location</button>`);
  $('retry').addEventListener('click', openOnboarding);
}

/** Fetch a fresh plan and draw it (opens setup first if there is no saved profile). */
export async function load() {
  if (!state.profile) return openOnboarding();
  setBusy(true);
  hideBanner();
  try {
    const data = await api('/api/plan', planRequest());
    store.set(LAST_PLAN_KEY, { at: Date.now(), data });
    show(data);
    if (data.note) banner(data.note);
    else if (!data.aiEnabled) banner(NO_KEY_NOTICE);
  } catch (error) {
    showOfflineFallback(error);
  }
  setBusy(false);
  return undefined;
}
