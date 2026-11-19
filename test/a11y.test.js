// Static accessibility and markup checks on the shipped HTML (no browser needed).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'styles.css'), 'utf8');
const tags = (name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
const attr = (tag, a) => (tag.match(new RegExp(`\\s${a}="([^"]*)"`, 'i')) || [])[1];

test('document language, title, viewport and landmarks', () => {
  assert.match(html, /<html lang="[a-z-]+"/);
  assert.match(html, /<title>[^<]{3,}<\/title>/);
  assert.match(html, /name="viewport"/);
  assert.ok(html.includes('<main'), 'main landmark');
  assert.ok(html.includes('<nav'), 'nav landmark');
  assert.ok(html.includes('<aside'), 'aside landmark');
  assert.match(html, /class="skip" href="#main"/, 'skip link');
  assert.ok(html.includes('<noscript>'), 'noscript fallback');
});

test('every image has alt text', () => {
  for (const img of tags('img')) assert.notEqual(attr(img, 'alt'), undefined, img);
});

test('every form control has an accessible name', () => {
  const labelFor = new Set([...html.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
  for (const t of [...tags('input'), ...tags('select'), ...tags('textarea')]) {
    if (/type="(hidden)"/.test(t)) continue;
    const id = attr(t, 'id');
    assert.ok(attr(t, 'aria-label') || (id && labelFor.has(id)), 'unlabelled control: ' + t);
  }
});

test('icon-only buttons have accessible names', () => {
  for (const b of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const text = b[2]
      .replace(/<svg[\s\S]*?<\/svg>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    assert.ok(text || /aria-label=|title=/.test(b[1]), 'unnamed button: ' + b[0].slice(0, 80));
  }
});

test('ids are unique', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids: ' + ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
});

test('modal is a labelled dialog and status regions are live', () => {
  assert.match(html, /role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="dlgTitle"/);
  assert.match(html, /id="banner"[^>]*role="status"/);
  assert.match(html, /id="chatlog" role="log"/);
});

test('css honours reduced motion, visible focus and forced colours', () => {
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(css.includes(':focus-visible'));
  assert.ok(css.includes('forced-colors'));
});

test('no inline event handlers (CSP-safe)', () => {
  assert.ok(!/\son[a-z]+="/i.test(html), 'inline handler found');
});

test('page loads one ES module entry point and has exactly one h1', () => {
  assert.match(html, /<script type="module" src="\/js\/main\.js"><\/script>/);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
});

test('no inline styles or inline scripts anywhere (strict CSP)', () => {
  assert.ok(!/\sstyle="/i.test(html), 'inline style attribute in HTML');
  assert.ok(!/<style[\s>]/i.test(html), 'inline <style> block');
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'inline script');
  const walk = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk(path.join(__dirname, '..', 'public', 'js')).filter((f) => f.endsWith('.js'))) {
    const source = fs.readFileSync(file, 'utf8');
    assert.ok(!/\sstyle="/.test(source), 'inline style attribute in a template: ' + file);
    assert.ok(!/setAttribute\(\s*['"]style['"]/.test(source), 'setAttribute style in ' + file);
  }
});
