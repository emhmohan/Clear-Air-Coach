import { $ } from '../lib/dom.js';
import { store } from '../lib/storage.js';

const root = document.documentElement;

function applyTheme(theme) {
  root.dataset.theme = theme;
  store.set('cac.theme', theme);
}

/** Restore the saved theme (or follow the OS preference) and wire the toggle button. */
export function initTheme() {
  const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(store.get('cac.theme', systemDark ? 'dark' : 'light'));
  $('theme').addEventListener('click', () => applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
}
