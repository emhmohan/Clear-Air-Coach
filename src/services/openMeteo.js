'use strict';

/** Open-Meteo clients: place search, air quality (CAMS model) and weather. No API key required. */

const { TtlCache } = require('../lib/ttlCache');
const { LIMITS, TTL_MS, TIMEOUT_MS } = require('../config');

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const FORECAST_HOURS = 24;
const OUTLOOK_DAYS = 5;

const cache = new TtlCache(LIMITS.cacheEntries);

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS.upstream) });
  if (!response.ok) throw new Error(`Upstream ${response.status}`);
  return response.json();
}

/**
 * Search for places by name.
 * @param {string} query
 * @returns {Promise<{name: string, admin?: string, country?: string, lat: number, lon: number}[]>}
 */
function geocode(query) {
  return cache.getOrLoad(`geo:${query.toLowerCase()}`, TTL_MS.geocode, async () => {
    const data = await getJson(`${GEOCODING_URL}?name=${encodeURIComponent(query)}&count=5&language=en`);
    return (data.results || []).map((r) => ({
      name: r.name,
      admin: r.admin1,
      country: r.country,
      lat: r.latitude,
      lon: r.longitude,
    }));
  });
}

/** Current weather plus today's peak boundary-layer (mixing) height; null if weather is unavailable. */
function summariseWeather(forecast) {
  if (!forecast?.current) return null;
  const heights = (forecast.hourly?.boundary_layer_height || []).filter((v) => v != null);
  return {
    temp: forecast.current.temperature_2m,
    humidity: forecast.current.relative_humidity_2m,
    wind: forecast.current.wind_speed_10m,
    maxMixingHeight: heights.length ? Math.round(Math.max(...heights)) : null,
  };
}

/** Daily min/mean/max PM2.5 over the whole forecast. */
function summariseDays(rows) {
  const byDay = {};
  for (const row of rows) (byDay[row.time.slice(0, 10)] ||= []).push(row.pm25);
  return Object.entries(byDay).map(([date, values]) => ({
    date,
    max: Math.round(Math.max(...values)),
    mean: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
    min: Math.round(Math.min(...values)),
  }));
}

const fetchAirQuality = (lat, lon) =>
  getJson(
    `${AIR_QUALITY_URL}?latitude=${lat}&longitude=${lon}` +
      '&current=pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide,us_aqi' +
      `&hourly=pm2_5&forecast_days=${OUTLOOK_DAYS}&timezone=auto`,
  );

const fetchWeather = (lat, lon) =>
  getJson(
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=boundary_layer_height&forecast_days=1&timezone=auto',
  ).catch(() => null); // weather is a bonus; air quality still works without it

/**
 * Live air quality, hourly forecast, 5-day outlook and weather for a location.
 * @param {number} lat
 * @param {number} lon
 */
function liveAir(lat, lon) {
  return cache.getOrLoad(`air:${lat.toFixed(2)},${lon.toFixed(2)}`, TTL_MS.airQuality, async () => {
    const [air, weather] = await Promise.all([fetchAirQuality(lat, lon), fetchWeather(lat, lon)]);
    const now = air.current.time;
    const rows = air.hourly.time.map((time, i) => ({ time, pm25: air.hourly.pm2_5[i] })).filter((r) => r.pm25 != null);
    const fromNow = rows.filter((r) => r.time >= now.slice(0, 13));
    return {
      pm25: air.current.pm2_5,
      pm10: air.current.pm10,
      no2: air.current.nitrogen_dioxide,
      o3: air.current.ozone,
      so2: air.current.sulphur_dioxide,
      co: air.current.carbon_monoxide,
      aqi: air.current.us_aqi,
      time: now,
      source: 'live',
      weather: summariseWeather(weather),
      hourly: fromNow.filter((r) => r.time.slice(0, 10) === now.slice(0, 10)),
      forecast: fromNow.slice(0, FORECAST_HOURS),
      week: summariseDays(rows),
    };
  });
}

module.exports = { geocode, liveAir, summariseWeather, summariseDays };
