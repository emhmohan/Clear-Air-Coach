// Unit tests for the server's small, pure modules (no network needed).
const test = require('node:test');
const assert = require('node:assert');

const { TtlCache } = require('../src/lib/ttlCache');
const { RateLimiter } = require('../src/lib/rateLimiter');
const { sanitizeProfile, isValidCoordinate, isValidPm25, clip, isImageDataUrl } = require('../src/validation');
const { deltaFromSseLine } = require('../src/services/llm');
const { summariseWeather, summariseDays } = require('../src/services/openMeteo');
const { extractJson } = require('../src/ai/coach');
const { resolvePublicPath } = require('../src/http/static');
const { buildFacts, LEVELS } = require('../src/engine');
const { winterCo2Saved } = require('../src/engine/actions/sustainable');
const { stagnationFrom, whoRatios, bestWindow, indoorEstimate } = require('../src/engine/measures');
const { normaliseProfile } = require('../src/engine/profile');

test('TtlCache serves fresh values, reloads stale ones and evicts beyond its size', async () => {
  const cache = new TtlCache(2);
  let loads = 0;
  const load = async () => ++loads;
  assert.equal(await cache.getOrLoad('a', 1000, load), 1);
  assert.equal(await cache.getOrLoad('a', 1000, load), 1, 'fresh entry reused');
  assert.equal(await cache.getOrLoad('a', 0, load), 2, 'zero TTL always reloads');
  await cache.getOrLoad('b', 1000, load);
  await cache.getOrLoad('c', 1000, load);
  assert.ok(cache.size <= 2, 'size is capped');
});

test('RateLimiter blocks after the limit, forgets old hits and prunes idle keys', () => {
  const limiter = new RateLimiter({ max: 3, windowMs: 1000 });
  const t0 = 1_000_000;
  assert.deepEqual(
    [1, 2, 3, 4].map((i) => limiter.isLimited('ip', t0 + i)),
    [false, false, false, true],
  );
  assert.equal(limiter.isLimited('other', t0), false, 'keys are independent');
  assert.equal(limiter.isLimited('ip', t0 + 5000), false, 'window slides');
  limiter.prune(t0 + 60_000);
  assert.equal(limiter.hits.size, 0);
});

test('sanitizeProfile keeps only whitelisted, bounded values', () => {
  const clean = sanitizeProfile({
    heating: '<x>',
    commute: 'rocket',
    commuteKm: 1e9,
    kids: 'yes',
    asthma: true,
    hack: 1,
  });
  assert.equal(clean.heating, 'electric');
  assert.equal(clean.commute, 'car');
  assert.equal(clean.commuteKm, 300);
  assert.equal(clean.kids, false);
  assert.equal(clean.asthma, true);
  assert.ok(!('hack' in clean));
  assert.equal(sanitizeProfile(undefined).budget, 'low');
});

test('validators', () => {
  assert.ok(isValidCoordinate(28.6, 77.2));
  assert.ok(!isValidCoordinate(91, 0) && !isValidCoordinate(0, 181) && !isValidCoordinate(NaN, 0));
  assert.ok(isValidPm25(0) && isValidPm25(1500) && !isValidPm25(-1) && !isValidPm25(1501) && !isValidPm25(NaN));
  assert.equal(clip('abcdef', 3), 'abc');
  assert.equal(clip(null, 3), '');
  assert.ok(
    isImageDataUrl('data:image/png;base64,AAAA') &&
      !isImageDataUrl('data:text/html;base64,AAAA') &&
      !isImageDataUrl(undefined),
  );
});

test('static path resolution blocks traversal', () => {
  assert.equal(resolvePublicPath('/').name, 'index.html');
  assert.equal(resolvePublicPath('/js/main.js').name.replace(/\\/g, '/'), 'js/main.js');
  assert.equal(
    resolvePublicPath('/../server.js').file.includes('server.js') &&
      resolvePublicPath('/../server.js').file.includes('public'),
    true,
  );
  assert.throws(() => resolvePublicPath('/%E0%A4%A'), URIError);
});

test('Groq SSE parsing handles deltas, DONE, noise and partial JSON', () => {
  assert.equal(deltaFromSseLine('data: {"choices":[{"delta":{"content":"hi"}}]}'), 'hi');
  assert.equal(deltaFromSseLine('data: [DONE]'), null);
  assert.equal(deltaFromSseLine(': keep-alive'), null);
  assert.equal(deltaFromSseLine('data: {"choices":[{"delta":'), null);
  assert.equal(deltaFromSseLine('data: {"choices":[{"delta":{}}]}'), null);
});

test('Open-Meteo summaries', () => {
  assert.equal(summariseWeather(null), null);
  const weather = summariseWeather({
    current: { temperature_2m: 8, relative_humidity_2m: 70, wind_speed_10m: 4 },
    hourly: { boundary_layer_height: [100, null, 480.4] },
  });
  assert.deepEqual(weather, { temp: 8, humidity: 70, wind: 4, maxMixingHeight: 480 });
  const days = summariseDays([
    { time: '2026-11-19T01:00', pm25: 10 },
    { time: '2026-11-19T02:00', pm25: 30 },
    { time: '2026-11-20T01:00', pm25: 50 },
  ]);
  assert.deepEqual(days, [
    { date: '2026-11-19', max: 30, mean: 20, min: 10 },
    { date: '2026-11-20', max: 50, mean: 50, min: 50 },
  ]);
});

test('extractJson finds JSON inside prose and returns null when absent', () => {
  assert.deepEqual(extractJson('Sure! {"a": 1} hope that helps'), { a: 1 });
  assert.equal(extractJson('no json here'), null);
});

test('engine: inversion detection thresholds', () => {
  assert.equal(stagnationFrom(null), null);
  assert.equal(stagnationFrom({ maxMixingHeight: null, wind: 3 }), null);
  assert.equal(stagnationFrom({ maxMixingHeight: 300, wind: 3 }).level, 'high');
  assert.equal(stagnationFrom({ maxMixingHeight: 700, wind: 12 }).level, 'moderate');
  assert.equal(stagnationFrom({ maxMixingHeight: 2000, wind: 20 }).level, 'low');
});

test('engine: WHO ratios, cleanest window and indoor estimates', () => {
  assert.deepEqual(whoRatios({ pm25: 30, pm10: 90, no2: null, so2: 40 }), { pm25: 2, pm10: 2, no2: null, so2: 1 });
  const hourly = Array.from({ length: 14 }, (_, i) => ({
    time: `2026-11-19T${String(i + 7).padStart(2, '0')}:00`,
    pm25: i === 5 ? 5 : 50,
  }));
  const window = bestWindow(hourly);
  assert.ok(window.best.avg < window.worst.avg);
  assert.equal(bestWindow([{ time: '2026-11-19T08:00', pm25: 1 }]), null);
  const indoor = indoorEstimate(100, { purifier: true });
  assert.ok(indoor.purified < indoor.closed && indoor.closed < indoor.open);
  assert.equal(indoor.now, indoor.purified);
});

test('engine: transit CO2 saving only applies to drivers', () => {
  const driver = normaliseProfile({ commute: 'car', commuteKm: 10 });
  assert.ok(winterCo2Saved(driver, 1) > 0);
  assert.ok(winterCo2Saved(driver, 4) > winterCo2Saved(driver, 1), 'metro saves more than bus');
  assert.equal(winterCo2Saved(normaliseProfile({ commute: 'bike', commuteKm: 10 }), 3), 0);
  assert.equal(winterCo2Saved(normaliseProfile({ commute: 'car', commuteKm: 0 }), 3), 0);
});

test('engine: facts are JSON-safe, sorted, and expose the shared level bands', () => {
  const facts = buildFacts({ pm25: 80 }, { kids: true });
  const json = JSON.parse(JSON.stringify(facts));
  assert.equal(json.levels.length, LEVELS.length);
  assert.equal(json.levels.at(-1).max, null, 'Infinity becomes null for JSON');
  const priorities = facts.actions.map((a) => a.priority);
  assert.deepEqual(
    priorities,
    [...priorities].sort((a, b) => b - a),
  );
  for (const action of facts.actions) assert.ok(action.id && action.title && action.why && action.impact.value);
});
