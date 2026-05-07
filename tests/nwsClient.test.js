'use strict';

jest.mock('node-fetch');
jest.mock('../backend/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const fetch = require('node-fetch');
const { Response } = jest.requireActual('node-fetch');
const { CITIES, getWeatherForAllCities, getCurrentConditions } = require('../backend/utils/nwsClient');

const mockPointsResponse = {
  properties: {
    forecast: 'https://api.weather.gov/gridpoints/MFL/110,50/forecast',
    forecastHourly: 'https://api.weather.gov/gridpoints/MFL/110,50/forecast/hourly',
    timeZone: 'America/New_York',
    relativeLocation: {
      properties: { city: 'Miami', state: 'FL' },
    },
  },
};

const mockForecastResponse = {
  properties: {
    periods: [
      {
        number: 1,
        name: 'Today',
        isDaytime: true,
        temperature: 85,
        temperatureUnit: 'F',
        windSpeed: '10 mph',
        windDirection: 'SE',
        shortForecast: 'Mostly Sunny',
        detailedForecast: 'Mostly sunny, with a high near 85.',
        icon: 'https://api.weather.gov/icons/land/day/few?size=medium',
      },
    ],
  },
};

function mockFetch(url) {
  if (url.includes('/points/')) {
    return Promise.resolve(new Response(JSON.stringify(mockPointsResponse)));
  }
  if (url.includes('/forecast')) {
    return Promise.resolve(new Response(JSON.stringify(mockForecastResponse)));
  }
  return Promise.reject(new Error(`Unexpected URL: ${url}`));
}

describe('CITIES constant', () => {
  test('contains exactly 5 cities', () => {
    expect(CITIES).toHaveLength(5);
  });

  test('each city has name, state, lat, lon', () => {
    CITIES.forEach((city) => {
      expect(city).toHaveProperty('name');
      expect(city).toHaveProperty('state');
      expect(city).toHaveProperty('lat');
      expect(city).toHaveProperty('lon');
    });
  });

  test('Miami has the correct coordinates', () => {
    const miami = CITIES.find((c) => c.name === 'Miami');
    expect(miami.lat).toBe(25.7743);
    expect(miami.lon).toBe(-80.1937);
  });

  test('all coordinates are valid US lat/lon ranges', () => {
    CITIES.forEach((city) => {
      expect(city.lat).toBeGreaterThan(24);
      expect(city.lat).toBeLessThan(50);
      expect(city.lon).toBeGreaterThan(-125);
      expect(city.lon).toBeLessThan(-65);
    });
  });
});

describe('getCurrentConditions', () => {
  test('returns correct weather shape', async () => {
    jest.resetModules();
    const fetchMod = require('node-fetch');
    fetchMod.mockImplementation(mockFetch);
    const { getCurrentConditions: getCurrent } = require('../backend/utils/nwsClient');
    const result = await getCurrent(25.7743, -80.1937);

    expect(result).toMatchObject({
      temperature: 85,
      temperatureUnit: 'F',
      windSpeed: '10 mph',
      windDirection: 'SE',
      shortForecast: 'Mostly Sunny',
      isDaytime: true,
    });
  });

  test('throws on NWS API failure', async () => {
    jest.resetModules();
    const fetchMod = require('node-fetch');
    fetchMod.mockResolvedValue(new Response('Not Found', { status: 404, statusText: 'Not Found' }));
    const { getCurrentConditions: getCurrent } = require('../backend/utils/nwsClient');
    await expect(getCurrent(25.7743, -80.1937)).rejects.toThrow('NWS request failed');
  });
});

describe('getWeatherForAllCities', () => {
  beforeEach(() => {
    jest.resetModules();
    fetch.mockImplementation(mockFetch);
  });

  test('returns an array of 5 results', async () => {
    fetch.mockImplementation(mockFetch);
    const { getWeatherForAllCities: getAll } = require('../backend/utils/nwsClient');
    const results = await getAll();
    expect(results).toHaveLength(5);
  });

  test('each result includes city name and state', async () => {
    fetch.mockImplementation(mockFetch);
    const { getWeatherForAllCities: getAll } = require('../backend/utils/nwsClient');
    const results = await getAll();
    results.forEach((r) => {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('state');
    });
  });

  test('failed cities return error field instead of throwing', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    const { getWeatherForAllCities: getAll } = require('../backend/utils/nwsClient');
    const results = await getAll();
    results.forEach((r) => {
      expect(r).toHaveProperty('error');
    });
  });
});
