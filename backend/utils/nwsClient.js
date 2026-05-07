'use strict';

const fetch = require('node-fetch');
const logger = require('./logger');

const NWS_BASE = 'https://api.weather.gov';
const REQUEST_HEADERS = {
  'User-Agent': 'weatherApp/1.0 (contact@weatherapp.local)',
  'Accept': 'application/geo+json',
};

const CITIES = [
  { name: 'Miami',        state: 'FL', lat: 25.7743,  lon: -80.1937 },
  { name: 'New York',     state: 'NY', lat: 40.7128,  lon: -74.0060 },
  { name: 'Chicago',      state: 'IL', lat: 41.8781,  lon: -87.6298 },
  { name: 'Los Angeles',  state: 'CA', lat: 34.0522,  lon: -118.2437 },
  { name: 'Dallas',       state: 'TX', lat: 32.7767,  lon: -96.7970 },
];

// Cache grid metadata per city to avoid redundant /points calls
const gridCache = {};

async function fetchJson(url) {
  const res = await fetch(url, { headers: REQUEST_HEADERS });
  if (!res.ok) {
    throw new Error(`NWS request failed: ${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

async function getGridMeta(lat, lon) {
  const key = `${lat},${lon}`;
  if (gridCache[key]) return gridCache[key];

  const data = await fetchJson(`${NWS_BASE}/points/${lat},${lon}`);
  const meta = {
    forecastUrl: data.properties.forecast,
    forecastHourlyUrl: data.properties.forecastHourly,
    city: data.properties.relativeLocation.properties.city,
    state: data.properties.relativeLocation.properties.state,
    timezone: data.properties.timeZone,
  };

  gridCache[key] = meta;
  return meta;
}

async function getCurrentConditions(lat, lon) {
  const meta = await getGridMeta(lat, lon);
  const forecast = await fetchJson(meta.forecastUrl);
  const periods = forecast.properties.periods;

  // First period is the current/nearest forecast window
  const current = periods[0];

  return {
    temperature: current.temperature,
    temperatureUnit: current.temperatureUnit,
    windSpeed: current.windSpeed,
    windDirection: current.windDirection,
    shortForecast: current.shortForecast,
    detailedForecast: current.detailedForecast,
    isDaytime: current.isDaytime,
    icon: current.icon,
    periodName: current.name,
    timezone: meta.timezone,
  };
}

async function getHourlyForecast(lat, lon) {
  const meta = await getGridMeta(lat, lon);
  const data = await fetchJson(meta.forecastHourlyUrl);
  return data.properties.periods.slice(0, 24).map((p) => ({
    time: p.startTime,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    windSpeed: p.windSpeed,
    windDirection: p.windDirection,
    shortForecast: p.shortForecast,
    isDaytime: p.isDaytime,
    icon: p.icon,
  }));
}

async function getSevenDayForecast(lat, lon) {
  const meta = await getGridMeta(lat, lon);
  const data = await fetchJson(meta.forecastUrl);
  return data.properties.periods.map((p) => ({
    periodName: p.name,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    windSpeed: p.windSpeed,
    windDirection: p.windDirection,
    shortForecast: p.shortForecast,
    detailedForecast: p.detailedForecast,
    isDaytime: p.isDaytime,
    icon: p.icon,
  }));
}

async function getWeatherForAllCities() {
  const results = await Promise.allSettled(
    CITIES.map(async (city) => {
      try {
        const conditions = await getCurrentConditions(city.lat, city.lon);
        return { ...city, ...conditions, error: null };
      } catch (err) {
        logger.error(`Failed to fetch weather for ${city.name}: ${err.message}`);
        return { ...city, error: err.message };
      }
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : r.reason));
}

module.exports = { CITIES, getWeatherForAllCities, getCurrentConditions, getHourlyForecast, getSevenDayForecast };
