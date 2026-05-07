# Weather App

A simple web application that displays real-time weather data for five major US cities using the [National Weather Service API](https://www.weather.gov/documentation/services-web-api).

## Features

- Live weather data for Miami, New York, Chicago, Los Angeles, and Dallas
- Current temperature, forecast, wind speed and direction
- Skeleton loading states and per-city error handling
- Refresh button to re-fetch live data
- Request and error logging via Winston

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Backend  | Node.js + Express                 |
| Frontend | Vanilla HTML / CSS / JavaScript   |
| HTTP     | node-fetch (NWS API calls)        |
| Logging  | Winston                           |
| Testing  | Jest                              |

## Directory Structure

```
weatherApp/
├── backend/
│   ├── server.js           # Express entry point
│   ├── routes/
│   │   └── weather.js      # /api/weather endpoints
│   └── utils/
│       ├── nwsClient.js    # NWS API two-hop wrapper
│       └── logger.js       # Winston logger config
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── tests/
│   └── nwsClient.test.js
├── logs/                   # Auto-created, gitignored
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
git clone <repo-url>
cd weatherApp
npm install
```

### Running the App

```bash
npm start
```

The app will be available at **http://localhost:3000**

For development with auto-reload:

```bash
npm run dev
```

### Running Tests

```bash
npm test
```

## API Endpoints

| Method | Endpoint             | Description                          |
|--------|----------------------|--------------------------------------|
| GET    | `/api/weather`       | Returns weather for all 5 cities     |
| GET    | `/api/weather/:city` | Returns weather for a single city    |

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "name": "Miami",
      "state": "FL",
      "lat": 25.7743,
      "lon": -80.1937,
      "temperature": 85,
      "temperatureUnit": "F",
      "windSpeed": "10 mph",
      "windDirection": "SE",
      "shortForecast": "Mostly Sunny",
      "detailedForecast": "Mostly sunny, with a high near 85.",
      "isDaytime": true,
      "error": null
    }
  ]
}
```

## Cities

| City         | State | Latitude  | Longitude  |
|--------------|-------|-----------|------------|
| Miami        | FL    | 25.7743   | -80.1937   |
| New York     | NY    | 40.7128   | -74.0060   |
| Chicago      | IL    | 41.8781   | -87.6298   |
| Los Angeles  | CA    | 34.0522   | -118.2437  |
| Dallas       | TX    | 32.7767   | -96.7970   |

## How the NWS API Works

The NWS API requires two requests per location:

1. `GET https://api.weather.gov/points/{lat},{lon}` — resolves coordinates to a forecast grid URL
2. `GET {forecastUrl}` — returns the actual forecast periods

Grid metadata is cached in memory per city to reduce redundant API calls.

## Logs

Logs are written to the `logs/` directory (gitignored):

- `logs/combined.log` — all log levels
- `logs/error.log` — errors only

## Future Improvements

- Port frontend to React for component reuse and maintainability
- Add hourly forecast view
- Add a map with city pins
- Persist grid cache to Redis for multi-instance deployments
