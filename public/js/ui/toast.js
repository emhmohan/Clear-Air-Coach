const TOAST_MS = 2200;

/** Show a short, self-dismissing message (announced to screen readers via role=status). */
export function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), TOAST_MS);
}
