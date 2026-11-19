import { $ } from '../lib/dom.js';
import { state } from '../state.js';
import { toast } from '../ui/toast.js';
import { unlockBadge } from './impact.js';

const TOP_STEPS = 3;

/** A short, accurate alert people can paste into a neighbourhood or school group. */
function shareMessage({ air, actions, activities, window }) {
  const place = air.place ? ` · ${air.place}` : '';
  const avoid = activities.filter((a) => a.status === 'avoid').map((a) => a.label.toLowerCase());
  const steps = actions
    .slice(0, TOP_STEPS)
    .map((a) => `• ${a.title}`)
    .join('\n');
  const avoidLine = avoid.length ? `Avoid today: ${avoid.join(', ')}.\n` : '';
  const cleanLine = window ? `Cleanest hours: ${window.best.start}-${window.best.end}.\n` : '';
  return `🌫️ Air alert${place}\nPM2.5 ${air.pm25} µg/m³ (${air.level}).\n${air.headline}\n${avoidLine}${cleanLine}\nTop steps:\n${steps}\n\nPlease check on elderly neighbours and anyone with breathing problems.`;
}

/** Render the Community page: the share message and the health guidance. */
export function renderCommunity() {
  const { facts } = state.data;
  $('shareText').value = shareMessage(facts);
  $('health').textContent = facts.health;
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText($('shareText').value);
    toast('Copied to clipboard');
  } catch {
    $('shareText').select();
    toast('Press Ctrl+C to copy');
  }
  unlockBadge('share');
}

async function shareMessageNatively() {
  if (!navigator.share) return copyMessage();
  try {
    await navigator.share({ text: $('shareText').value });
    unlockBadge('share');
  } catch {
    /* the user cancelled the share sheet */
  }
  return undefined;
}

export function initCommunity() {
  $('copyShare').addEventListener('click', copyMessage);
  $('nativeShare').addEventListener('click', shareMessageNatively);
  $('printBtn').addEventListener('click', () => window.print());
}
