/** Pure text helpers (no DOM access, so they are unit-testable in Node). */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for safe insertion into HTML. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/**
 * Tiny safe markdown for AI replies: escape everything first, then allow only bold, inline code,
 * bullets, headings and line breaks.
 */
export const md = (text) =>
  esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\s*[-•*]\s+(.*)$/gm, '&bull; $1')
    .replace(/^#{1,4}\s*(.*)$/gm, '<b>$1</b>')
    .replace(/\n/g, '<br>');

/** "HH:MM" part of an ISO local timestamp such as 2026-11-19T08:00. */
export const clockOf = (isoTime) => isoTime.slice(11, 16);

/** Short weekday label (and day number) for a YYYY-MM-DD date. */
export const dayLabel = (isoDate, options = { weekday: 'short', day: 'numeric' }) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, options);
