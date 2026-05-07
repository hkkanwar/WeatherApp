'use strict';

const express = require('express');
const router = express.Router();
const { getWeatherForAllCities, getCurrentConditions, getHourlyForecast, getSevenDayForecast, CITIES } = require('../utils/nwsClient');
const logger = require('../utils/logger');

// GET /api/weather — returns weather for all 5 cities
router.get('/', async (req, res) => {
  logger.info('GET /api/weather — fetching all cities');
  try {
    const data = await getWeatherForAllCities();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`GET /api/weather error: ${err.message}`);
    res.status(500).json({ success: false, error: 'Failed to fetch weather data' });
  }
});

// GET /api/weather/:city — returns weather for a single city by name
router.get('/:city', async (req, res) => {
  const cityName = req.params.city.toLowerCase();
  const city = CITIES.find((c) => c.name.toLowerCase() === cityName);

  if (!city) {
    return res.status(404).json({
      success: false,
      error: `City "${req.params.city}" not found. Available cities: ${CITIES.map((c) => c.name).join(', ')}`,
    });
  }

  logger.info(`GET /api/weather/${city.name} — fetching single city`);
  try {
    const conditions = await getCurrentConditions(city.lat, city.lon);
    res.json({ success: true, data: { ...city, ...conditions } });
  } catch (err) {
    logger.error(`GET /api/weather/${city.name} error: ${err.message}`);
    res.status(500).json({ success: false, error: `Failed to fetch weather for ${city.name}` });
  }
});

// GET /api/weather/:city/hourly — next 24 hours for a city
router.get('/:city/hourly', async (req, res) => {
  const cityName = req.params.city.toLowerCase();
  const city = CITIES.find((c) => c.name.toLowerCase() === cityName);

  if (!city) {
    return res.status(404).json({ success: false, error: `City "${req.params.city}" not found.` });
  }

  logger.info(`GET /api/weather/${city.name}/hourly`);
  try {
    const data = await getHourlyForecast(city.lat, city.lon);
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`GET /api/weather/${city.name}/hourly error: ${err.message}`);
    res.status(500).json({ success: false, error: `Failed to fetch hourly forecast for ${city.name}` });
  }
});

// GET /api/weather/:city/7day — 7-day forecast for a city
router.get('/:city/7day', async (req, res) => {
  const cityName = req.params.city.toLowerCase();
  const city = CITIES.find((c) => c.name.toLowerCase() === cityName);

  if (!city) {
    return res.status(404).json({ success: false, error: `City "${req.params.city}" not found.` });
  }

  logger.info(`GET /api/weather/${city.name}/7day`);
  try {
    const data = await getSevenDayForecast(city.lat, city.lon);
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`GET /api/weather/${city.name}/7day error: ${err.message}`);
    res.status(500).json({ success: false, error: `Failed to fetch 7-day forecast for ${city.name}` });
  }
});

module.exports = router;
