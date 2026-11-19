import { state, simulatedDone, isSimulating } from './state.js';
import { store, today } from './lib/storage.js';

const doneKey = () => `cac.done.${today()}`;

/** @returns {Set<string>} ids of the actions ticked today (in memory only while simulating) */
export const doneSet = () => (isSimulating() ? simulatedDone : new Set(store.get(doneKey(), [])));

/** Flip an action's done state; persists unless simulating. @returns {boolean} true when now done */
export function toggleDone(id) {
  const done = doneSet();
  if (done.has(id)) done.delete(id);
  else done.add(id);
  if (!isSimulating()) store.set(doneKey(), [...done]);
  return done.has(id);
}

/**
 * Every action to show: the engine's, in the chosen language when translated, plus AI tips.
 * @returns {object[]}
 */
export function allActions() {
  const { facts, ai } = state.data;
  const translated = ai?.translated || {};
  const engineActions = facts.actions.map((action) => {
    const t = translated[action.id];
    return t
      ? { ...action, title: t.title || action.title, detail: t.detail || action.detail, why: t.why || action.why }
      : action;
  });
  const aiTips = (ai?.extra_tips || []).map((tip, i) => ({
    id: `ai${i}`,
    category: 'routine',
    title: tip.title,
    detail: tip.detail,
    why: tip.why,
    impact: { label: 'Impact', value: tip.impact, note: '' },
    extra: true,
  }));
  return [...engineActions, ...aiTips];
}
