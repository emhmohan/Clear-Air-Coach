import { $, setHtml } from '../lib/dom.js';
import { state } from '../state.js';
import { LEVER_NAMES, NO_PRECAUTIONS, dose, reductionPercent, singleLevers } from '../lib/doseModel.js';

const MIN_BAR_PERCENT = 3;
const options = { ...NO_PRECAUTIONS };
const CHIPS = [
  ['sMask', 'mask'],
  ['sShut', 'shut'],
  ['sPur', 'pur'],
  ['sTime', 'time'],
];

const readInputs = () => ({
  pm: Number($('sPm').value) || 0,
  outHours: Number($('sOut').value),
  commuteHours: Number($('sCom').value),
  mode: $('sMode').value,
});

const barRow = (label, value, baseline, background) =>
  `<div class="bar-row"><div class="lab"><span>${label}</span><b>${Math.round(value)} dose units</b></div><div class="bar"><i data-w="${baseline ? Math.max(MIN_BAR_PERCENT, (value / baseline) * 100) : MIN_BAR_PERCENT}" data-bg="${background}"></i></div></div>`;

/** Recompute and draw the what-if comparison. */
export function renderSimulator() {
  $('sOutV').textContent = $('sOut').value;
  $('sComV').textContent = $('sCom').value;
  const inputs = readInputs();
  const window = state.data?.facts.window || null;
  const baseline = dose(inputs, NO_PRECAUTIONS, window);
  const scenario = dose(inputs, options, window);
  const levers = singleLevers(inputs, window)
    .map(([lever, percent]) => `<li>${LEVER_NAMES[lever]}: <b>~${percent}% less</b></li>`)
    .join('');

  setHtml(
    $('simOut'),
    `<div class="bars">${barRow('No precautions', baseline, baseline, 'var(--avoid)')}${barRow('Your scenario', scenario, baseline, 'var(--go)')}</div>
    <div class="result-box">You'd breathe in about <b>${reductionPercent(baseline, scenario)}% fewer</b> particles per day.</div>
    <h4 class="sub-heading">Biggest single levers</h4><ol class="list">${levers}</ol>
    <p class="note">Model: dose = concentration × hours × breathing rate. Indoor air is 80% of outdoor with windows open, 45% shut, 15% with purifier. Masks cut intake ~70% when fitted. Illustrative, not medical.</p>`,
  );
}

export function initSimulator() {
  for (const id of ['sPm', 'sOut', 'sCom', 'sMode']) $(id).addEventListener('input', renderSimulator);
  for (const [id, key] of CHIPS) {
    $(id).addEventListener('click', () => {
      options[key] = !options[key];
      $(id).classList.toggle('on', options[key]);
      $(id).setAttribute('aria-pressed', options[key]);
      renderSimulator();
    });
  }
}
