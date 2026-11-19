/**
 * Clear Air Coach: browser entry point. Wires every module together, then loads the plan.
 * Pages live in views/, optional features in features/, shared helpers in lib/.
 */
import { $ } from './lib/dom.js';
import { on } from './lib/bus.js';
import { state } from './state.js';
import { toast } from './ui/toast.js';
import { initTheme } from './ui/theme.js';
import { initNav } from './ui/nav.js';
import { initOnboarding } from './onboarding.js';
import { initPlan } from './views/plan.js';
import { initIndoor } from './views/indoor.js';
import { initCommunity } from './views/community.js';
import { initChat } from './views/chat.js';
import { initSimulator } from './views/simulator.js';
import { initLens } from './views/lens.js';
import { initLetter } from './views/letter.js';
import { initLanguage } from './features/i18n.js';
import { initScenarios } from './features/scenarios.js';
import { initVoice } from './features/voice.js';
import { initAlerts } from './features/alerts.js';
import { load } from './loader.js';

const AUTO_REFRESH_MS = 30 * 60 * 1000;

function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function init() {
  for (const setup of [
    initTheme,
    initNav,
    initOnboarding,
    initPlan,
    initIndoor,
    initCommunity,
    initChat,
    initSimulator,
    initLens,
    initLetter,
    initScenarios,
    initVoice,
    initAlerts,
  ]) {
    setup();
  }
  initLanguage();

  on('reload', load);
  $('refresh').addEventListener('click', () => {
    load();
    toast('Refreshing…');
  });
  setInterval(() => {
    if (state.data && state.place) load();
  }, AUTO_REFRESH_MS);

  registerServiceWorker();
  load();
}

init();
