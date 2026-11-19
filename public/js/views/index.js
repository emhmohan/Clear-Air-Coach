import { state, isSimulating } from '../state.js';
import { renderToday } from './today.js';
import { renderPlan } from './plan.js';
import { renderIndoor } from './indoor.js';
import { renderCommunity } from './community.js';
import { renderChat } from './chat.js';
import { renderOutlook } from './outlook.js';
import { renderPollutants } from './pollutants.js';
import { renderImpact, logDay } from './impact.js';
import { renderSimulator } from './simulator.js';
import { drawScenarios, showSimulationBanner } from '../features/scenarios.js';
import { updateAlertButton, checkAlert } from '../features/alerts.js';

/** Redraw every page from `state.data`. */
export function renderAll() {
  renderToday();
  renderPlan();
  renderIndoor();
  renderCommunity();
  renderChat();
  drawScenarios();
  renderOutlook();
  renderPollutants();
  renderImpact();
  renderSimulator();
  updateAlertButton();
  if (!isSimulating() && state.data) {
    checkAlert();
    logDay();
  }
  showSimulationBanner();
}
