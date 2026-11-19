/** Small DOM helpers. */

export const $ = (id) => document.getElementById(id);

/**
 * Apply dynamic colours and widths that were declared with data attributes. Setting styles through
 * the CSSOM keeps the page compatible with a strict Content-Security-Policy (no inline style
 * attributes, no 'unsafe-inline').
 * @param {ParentNode} root
 */
export function applyDynamicStyles(root = document) {
  for (const el of root.querySelectorAll('[data-bg]')) el.style.background = el.dataset.bg;
  for (const el of root.querySelectorAll('[data-bt]')) el.style.borderTopColor = el.dataset.bt;
  for (const el of root.querySelectorAll('[data-w]')) el.style.width = `${el.dataset.w}%`;
}

/** Replace an element's HTML (from escaped templates) and apply its data-attribute styles. */
export function setHtml(el, html) {
  el.innerHTML = html;
  applyDynamicStyles(el);
}
