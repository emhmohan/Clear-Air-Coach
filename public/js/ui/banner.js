import { $ } from '../lib/dom.js';

/**
 * Show a notice at the top of the page. `html` must already be escaped/trusted.
 * @returns {HTMLElement} the banner element, so callers can attach button handlers
 */
export function banner(html) {
  const el = $('banner');
  el.innerHTML = `<span>${html}</span>`;
  el.classList.remove('hidden');
  return el;
}

export const hideBanner = () => $('banner').classList.add('hidden');
