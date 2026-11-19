'use strict';

const routine = require('./routine');
const indoor = require('./indoor');
const sustainable = require('./sustainable');

/** Every action rule, in no particular order; each returns an action or null. */
const RULES = [
  routine.timingAction,
  routine.exerciseAction,
  routine.maskAction,
  routine.stagnationAction,
  indoor.windowsAction,
  indoor.purifierAction,
  indoor.cookingAction,
  indoor.indoorSourcesAction,
  sustainable.heatingAction,
  sustainable.commuteAction,
  sustainable.communityAction,
];

/**
 * Evaluate all rules for a situation and return the applicable actions, highest priority first.
 * @param {object} context {severity, profile, window, indoor, stagnation}
 */
function buildActions(context) {
  return RULES.map((rule) => rule(context))
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

module.exports = { buildActions };
