'use strict';

const { SEVERITY } = require('./constants');
const { isSensitive } = require('./profile');

/** A four-part daily rhythm tuned to how bad the air is. */
function buildSchedule({ severity, window }) {
  const smoggy = severity >= SEVERITY.sensitive;
  return [
    {
      time: 'Morning',
      text: smoggy
        ? 'Check the forecast, keep windows shut, run the purifier. Delay school or work walks if you can.'
        : 'Short airing of rooms, then close the windows.',
    },
    {
      time: window ? window.best.start : 'Midday',
      text: window
        ? 'Cleanest window: errands, school pick-up, outdoor time, and airing the home.'
        : 'Do errands and outdoor time around midday when the air is usually mixing better.',
    },
    {
      time: 'Evening',
      text: smoggy
        ? 'Cook with the hood on, keep burning to a minimum, and tidy with a damp cloth. Keep the bedroom closed with the purifier running.'
        : 'Normal routine; keep an eye on the evening rise as temperatures drop.',
    },
    {
      time: 'Night',
      text: 'Sleep with the purifier on and the door closed. This is when your lungs get their longest clean-air stretch.',
    },
  ];
}

const MYTHS = [
  'House plants do not measurably clean room air at normal densities; a purifier does far more.',
  'Wet cloths or surgical masks are not a substitute for an N95/FFP2 respirator.',
  'Ozone generators and "ionizers" can add irritant gases, so avoid them.',
];

/** Guidance on when to seek medical help; more cautious for vulnerable households or bad air. */
function healthAdvice({ severity, profile }) {
  return isSensitive(profile) || severity >= SEVERITY.unhealthy
    ? 'Seek medical help for chest tightness, wheezing, severe cough, dizziness or breathlessness at rest. Keep rescue inhalers close at hand if prescribed.'
    : 'Watch for eye, throat or breathing irritation and rest indoors if it appears.';
}

module.exports = { buildSchedule, MYTHS, healthAdvice };
