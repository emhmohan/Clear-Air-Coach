import { $ } from '../lib/dom.js';
import { emit } from '../lib/bus.js';
import { state, isSimulating } from '../state.js';
import { banner } from '../ui/banner.js';

/** What-if PM2.5 values (µg/m³) for simulating smog; `null` means live data. */
const SCENARIOS = [null, 20, 60, 150, 320];

export function drawScenarios() {
  $('scenarios').innerHTML = SCENARIOS.map((value) => {
    const selected = state.scenario === value;
    const label = value == null ? 'Live data' : `PM2.5 ${value}`;
    return `<button class="chip ${selected ? 'on' : ''}" data-s="${value}" aria-pressed="${selected}">${label}</button>`;
  }).join('');
}

/** Make it unmistakable that numbers on screen are a simulation, not live data. */
export function showSimulationBanner() {
  if (!isSimulating()) return;
  banner(
    `<b>Simulation:</b> showing a what-if PM2.5 of ${state.scenario} µg/m³, not live data. Nothing is saved to your tracker. <button class="btn soft" id="liveBtn">Back to live data</button>`,
  );
  $('liveBtn').addEventListener('click', () => {
    state.scenario = null;
    emit('reload');
  });
}

export function initScenarios() {
  $('scenarios').addEventListener('click', (event) => {
    const raw = event.target.dataset.s;
    if (raw === undefined) return;
    state.scenario = raw === 'null' ? null : Number(raw);
    drawScenarios();
    emit('reload');
  });
}
