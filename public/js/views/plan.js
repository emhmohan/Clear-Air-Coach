import { $, setHtml } from '../lib/dom.js';
import { esc } from '../lib/format.js';
import { state } from '../state.js';
import { allActions, doneSet, toggleDone } from '../actions.js';
import { logDay } from './impact.js';
import { toast } from '../ui/toast.js';

const CATEGORIES = [
  ['all', 'All'],
  ['routine', 'Daily routine'],
  ['indoor', 'Indoor air'],
  ['sustainable', 'Sustainable'],
];

function actionHtml(action, ai, done) {
  const isDone = done.has(action.id);
  const personal = ai?.personalized?.[action.id];
  const impactNote = action.impact.note ? ` <span class="note">(${esc(action.impact.note)})</span>` : '';
  const cost = action.cost ? ` · <b>Cost:</b> ${esc(action.cost)}` : '';
  return `<div class="plan-item ${isDone ? 'done' : ''}" data-id="${esc(action.id)}">
    <button class="check" aria-label="Mark as done: ${esc(action.title)}" aria-pressed="${isDone}">✓</button>
    <div><h3>${esc(action.title)}<span class="tag">${esc(action.category)}</span>${action.extra ? '<span class="tag">AI tip</span>' : ''}</h3>
    <div>${esc(action.detail)}</div>${personal ? `<div class="ai-line">${esc(personal)}</div>` : ''}
    <div class="impact"><b>${esc(action.impact.label)}:</b> ${esc(action.impact.value)}${impactNote}</div>
    <div class="why"><b>Why it works:</b> ${esc(action.why)}${cost}</div></div></div>`;
}

/** Render the plan page: category chips, progress ring and the action list. */
export function renderPlan() {
  const chips = CATEGORIES.map(
    ([key, label]) =>
      `<button class="chip ${state.category === key ? 'on' : ''}" data-c="${key}" aria-pressed="${state.category === key}">${label}</button>`,
  );
  $('catChips').innerHTML = chips.join('');

  const actions = allActions();
  const done = doneSet();
  const percent = actions.length
    ? Math.round((actions.filter((a) => done.has(a.id)).length / actions.length) * 100)
    : 0;
  $('ringArc').setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
  $('ringTxt').textContent = `${percent}%`;

  const visible = actions.filter((a) => state.category === 'all' || a.category === state.category);
  setHtml($('planList'), visible.map((a) => actionHtml(a, state.data.ai, done)).join(''));
}

export function initPlan() {
  $('catChips').addEventListener('click', (event) => {
    const key = event.target.dataset.c;
    if (!key) return;
    state.category = key;
    renderPlan();
  });

  $('planList').addEventListener('click', (event) => {
    const item = event.target.closest('.plan-item');
    if (!item || !event.target.closest('.check')) return;
    const nowDone = toggleDone(item.dataset.id);
    renderPlan();
    logDay();
    if (nowDone) toast('Nice. One more step toward cleaner air.');
  });
}
