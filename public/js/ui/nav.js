import { $ } from '../lib/dom.js';

/** Show one page and mark its sidebar item as current. */
export function showView(name) {
  for (const view of document.querySelectorAll('.view')) view.classList.toggle('on', view.id === `v-${name}`);
  for (const button of document.querySelectorAll('.side [data-v]')) {
    const current = button.dataset.v === name;
    button.classList.toggle('on', current);
    if (current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  window.scrollTo({ top: 0 });
  // Move focus into the new page for keyboard and screen-reader users.
  const heading = document.querySelector(`#v-${name} h2`);
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

export function initNav() {
  document.querySelector('.side').addEventListener('click', (event) => {
    const button = event.target.closest('[data-v]');
    if (button) showView(button.dataset.v);
  });
  $('aboutLink').addEventListener('click', (event) => {
    event.preventDefault();
    showView('about');
  });
}
