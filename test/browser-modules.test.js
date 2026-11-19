// Unit tests for the browser's pure ES modules, imported directly in Node (no DOM needed).
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = (file) => import(pathToFileURL(path.join(__dirname, '..', 'public', 'js', file)).href);

test('esc neutralises HTML', async () => {
  const { esc } = await load('lib/format.js');
  assert.equal(esc('<img src=x onerror="a()">&\'"'), '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;&quot;');
  assert.equal(esc(null), '');
  assert.equal(esc(5), '5');
});

test('md renders a safe subset of markdown and never passes raw HTML through', async () => {
  const { md } = await load('lib/format.js');
  assert.equal(md('**Bold** and `code`'), '<b>Bold</b> and <code>code</code>');
  assert.equal(md('- one\n- two'), '&bull; one<br>&bull; two');
  assert.equal(md('## Title'), '<b>Title</b>');
  const hostile = md('<script>alert(1)</script> **x**');
  assert.ok(!hostile.includes('<script>'));
  assert.ok(hostile.includes('&lt;script&gt;'));
});

test('clockOf extracts HH:MM', async () => {
  const { clockOf } = await load('lib/format.js');
  assert.equal(clockOf('2026-11-19T08:30'), '08:30');
});

test('levels come from the server bands and fall back to a neutral colour', async () => {
  const { setLevels, levelColor, legendBands } = await load('lib/levels.js');
  assert.equal(levelColor(10), 'var(--surface2)', 'neutral before data');
  setLevels([
    { max: 10, short: 'Low', name: 'Low', color: '#0f0' },
    { max: null, short: 'High', name: 'High', color: '#f00' },
  ]);
  assert.equal(levelColor(5), '#0f0');
  assert.equal(levelColor(99999), '#f00', 'null max means unbounded');
  assert.deepEqual(legendBands(), [
    { short: 'Low', color: '#0f0' },
    { short: 'High', color: '#f00' },
  ]);
});

test('dose model: precautions lower the dose and the biggest lever is ranked first', async () => {
  const { dose, NO_PRECAUTIONS, reductionPercent, singleLevers } = await load('lib/doseModel.js');
  const inputs = { pm: 100, outHours: 3, commuteHours: 1, mode: 'open' };
  const base = dose(inputs, NO_PRECAUTIONS);
  assert.ok(base > 0);
  for (const lever of ['mask', 'shut', 'pur', 'time'])
    assert.ok(dose(inputs, { ...NO_PRECAUTIONS, [lever]: true }) < base, lever);
  const everything = dose(inputs, { mask: true, shut: true, pur: true, time: true });
  assert.ok(reductionPercent(base, everything) > 60);
  const levers = singleLevers(inputs);
  assert.deepEqual(
    levers.map((l) => l[1]),
    levers.map((l) => l[1]).sort((a, b) => b - a),
  );
  assert.equal(reductionPercent(0, 5), 0);
  assert.equal(dose({ pm: 0, outHours: 3, commuteHours: 1, mode: 'open' }, NO_PRECAUTIONS), 0);
});

test('dose model: a mask adds nothing inside a closed car, and real forecast data drives timing', async () => {
  const { dose, NO_PRECAUTIONS } = await load('lib/doseModel.js');
  const car = { pm: 100, outHours: 0, commuteHours: 2, mode: 'closed' };
  assert.equal(dose(car, { ...NO_PRECAUTIONS, mask: true }), dose(car, NO_PRECAUTIONS));
  const open = { pm: 100, outHours: 3, commuteHours: 0, mode: 'open' };
  const cleanDay = { best: { avg: 10 }, mean: 100 }; // best window is 10x cleaner than average, clamped to 0.3
  assert.ok(
    dose(open, { ...NO_PRECAUTIONS, time: true }, cleanDay) < dose(open, { ...NO_PRECAUTIONS, time: true }, null),
  );
});

test('tracker: streak, windows, totals and badges', async () => {
  const { streak, lastDays, totals, badges, isoDay } = await load('lib/tracker.js');
  const now = new Date('2026-11-19T12:00:00Z');
  const day = (n) => isoDay(new Date(now.getTime() - n * 86_400_000));
  const log = {
    [day(0)]: { done: 3, total: 7, co2: 1.5, ids: ['mask', 'transit'] },
    [day(1)]: { done: 4, total: 7, co2: 1.5, ids: ['mask', 'transit'] },
    [day(2)]: { done: 5, total: 7, co2: 1.5, ids: ['mask', 'transit'] },
    [day(4)]: { done: 7, total: 7, co2: 0, ids: [] },
  };
  assert.equal(streak(log, now), 3, 'gap on day 3 ends the streak');
  assert.equal(streak({}, now), 0);
  assert.equal(streak({ [day(1)]: { done: 5, total: 7 } }, now), 1, 'an empty today does not break the streak');
  assert.equal(lastDays(7, now).length, 7);
  assert.equal(lastDays(7, now).at(-1), day(0));
  assert.deepEqual(totals(log), { days: 4, actions: 19, co2: 4.5 });
  const earned = badges(log, { letter: 1 }, 3)
    .filter((b) => b.earned)
    .map((b) => b.name);
  assert.ok(
    ['First step', 'On a roll', 'Mask pro', 'Clean commuter', 'Voice for change'].every((n) => earned.includes(n)),
    earned.join(),
  );
  assert.ok(!earned.includes('Sharp eye'));
});
