const test = require('node:test');
const assert = require('node:assert');
const { buildFacts, levelFor } = require('./engine');

test('AQI bands', () => {
  assert.equal(levelFor(5).name, 'Good');
  assert.equal(levelFor(40).key, 2);
  assert.equal(levelFor(400).name, 'Hazardous');
});

test('severe smog with kids and a car commute yields mask, purifier, windows, transit', () => {
  const f = buildFacts({ pm25: 180 }, { kids: true, commute: 'car', commuteKm: 10, purifier: false });
  const ids = f.actions.map((a) => a.id);
  for (const id of ['mask', 'windows', 'diy-purifier', 'transit', 'indoor-play']) assert.ok(ids.includes(id), id);
  assert.ok(f.activities.find((a) => a.id === 'play').status === 'avoid');
  assert.ok(f.actions[0].priority >= f.actions.at(-1).priority);
});

test('clean air gives no mask advice and outdoor play is fine', () => {
  const f = buildFacts({ pm25: 4 }, { kids: true });
  assert.ok(!f.actions.some((a) => a.id === 'mask'));
  assert.equal(f.activities.find((a) => a.id === 'play').status, 'go');
});

test('coal heating triggers the heating swap; indoor estimates shrink with a purifier', () => {
  const f = buildFacts({ pm25: 100 }, { heating: 'coal', purifier: true });
  assert.ok(f.actions.some((a) => a.id === 'heating'));
  assert.ok(f.indoor.purified < f.indoor.closed && f.indoor.closed < f.indoor.open);
});

test('best window uses hourly data', () => {
  const hourly = Array.from({ length: 14 }, (_, i) => ({ time: `2026-11-19T${String(i + 7).padStart(2, '0')}:00`, pm25: i === 5 ? 10 : 80 }));
  const f = buildFacts({ pm25: 80, hourly }, {});
  assert.ok(f.window.best.avg < f.window.worst.avg);
});
