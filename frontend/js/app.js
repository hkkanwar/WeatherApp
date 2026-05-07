'use strict';

const CITIES = [
  { name: 'Miami',       state: 'FL' },
  { name: 'New York',    state: 'NY' },
  { name: 'Chicago',     state: 'IL' },
  { name: 'Los Angeles', state: 'CA' },
  { name: 'Dallas',      state: 'TX' },
];

const grid = document.getElementById('city-grid');
const refreshBtn = document.getElementById('refresh-btn');
const lastUpdated = document.getElementById('last-updated');
const errorBanner = document.getElementById('error-banner');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const modalCityName = document.getElementById('modal-city-name');
const modalCityState = document.getElementById('modal-city-state');
const modalClose = document.getElementById('modal-close');
const modalLoading = document.getElementById('modal-loading');
const modalError = document.getElementById('modal-error');
const tabHourly = document.getElementById('tab-hourly');
const tab7day = document.getElementById('tab-7day');

let hourlyChart = null;
let sevenDayChart = null;
let activeCity = null;

// ─── Error banner ────────────────────────────────────────────────────────────

function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function clearError() {
  errorBanner.classList.add('hidden');
  errorBanner.textContent = '';
}

// ─── Card templates ───────────────────────────────────────────────────────────

function skeletonCard(city) {
  return `
    <div class="city-card loading" id="card-${city.name.replace(/\s+/g, '-').toLowerCase()}">
      <div class="card-header">
        <div>
          <div class="city-name">${city.name}</div>
          <div class="city-state">${city.state}</div>
        </div>
      </div>
      <div class="skeleton" style="width:80px;height:3rem;"></div>
      <div class="skeleton" style="width:60%;"></div>
      <div class="skeleton" style="width:90%;"></div>
    </div>
  `;
}

function weatherCard(city) {
  if (city.error) {
    return `
      <div class="city-card error" id="card-${city.name.replace(/\s+/g, '-').toLowerCase()}">
        <div class="card-header">
          <div>
            <div class="city-name">${city.name}</div>
            <div class="city-state">${city.state}</div>
          </div>
        </div>
        <div class="forecast-label" style="color:var(--error)">Unable to load weather data</div>
        <div class="forecast-detail">${city.error}</div>
      </div>
    `;
  }

  const badgeClass = city.isDaytime ? '' : 'night';
  const badgeLabel = city.isDaytime ? 'Day' : 'Night';

  return `
    <div class="city-card" id="card-${city.name.replace(/\s+/g, '-').toLowerCase()}" data-city="${city.name}" data-state="${city.state}">
      <div class="card-header">
        <div>
          <div class="city-name">${city.name}</div>
          <div class="city-state">${city.state}</div>
        </div>
        ${city.icon ? `<img class="weather-icon" src="${city.icon}" alt="${city.shortForecast}" />` : ''}
      </div>

      <div class="temperature">
        ${city.temperature}<span>°${city.temperatureUnit}</span>
      </div>

      <span class="period-badge ${badgeClass}">${badgeLabel}</span>

      <div class="forecast-label">${city.shortForecast}</div>
      <div class="forecast-detail">${city.detailedForecast}</div>

      <div class="card-meta">
        <div class="meta-item">
          <span class="meta-label">Wind</span>
          <span class="meta-value">${city.windSpeed}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Direction</span>
          <span class="meta-value">${city.windDirection}</span>
        </div>
      </div>
    </div>
  `;
}

// ─── Main weather load ────────────────────────────────────────────────────────

function renderSkeletons() {
  grid.innerHTML = CITIES.map(skeletonCard).join('');
}

async function loadWeather() {
  clearError();
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Loading...';
  renderSkeletons();

  try {
    const res = await fetch('/api/weather');
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const { data } = await res.json();

    grid.innerHTML = data.map(weatherCard).join('');
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Attach click handlers to cards
    grid.querySelectorAll('.city-card[data-city]').forEach((card) => {
      card.addEventListener('click', () => openModal(card.dataset.city, card.dataset.state));
    });
  } catch (err) {
    showError(`Failed to load weather data: ${err.message}`);
    grid.innerHTML = CITIES.map((c) => weatherCard({ ...c, error: 'Data unavailable' })).join('');
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(cityName, state) {
  destroyCharts();
  activeCity = cityName;
  modalCityName.textContent = cityName;
  modalCityState.textContent = state;
  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Reset to hourly tab
  switchTab('hourly');
  loadHourlyChart(cityName);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
  activeCity = null;
  destroyCharts();
}

function destroyCharts() {
  if (hourlyChart) { hourlyChart.destroy(); hourlyChart = null; }
  if (sevenDayChart) { sevenDayChart.destroy(); sevenDayChart = null; }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  tabHourly.classList.toggle('hidden', tab !== 'hourly');
  tab7day.classList.toggle('hidden', tab !== '7day');
}

function setModalLoading(on) {
  modalLoading.classList.toggle('hidden', !on);
  modalError.classList.add('hidden');
}

function setModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.remove('hidden');
  modalLoading.classList.add('hidden');
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const CHART_DEFAULTS = {
  color: '#94a3b8',
  borderColor: '#334155',
  font: { family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", size: 12 },
};

async function loadHourlyChart(cityName) {
  setModalLoading(true);
  destroyCharts();

  try {
    const res = await fetch(`/api/weather/${encodeURIComponent(cityName.toLowerCase())}/hourly`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const { data } = await res.json();

    setModalLoading(false);

    const labels = data.map((p) => {
      const d = new Date(p.time);
      return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    });
    const temps = data.map((p) => p.temperature);

    const ctx = document.getElementById('chart-hourly').getContext('2d');
    hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `Temperature (°F)`,
          data: temps,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#38bdf8',
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color, font: CHART_DEFAULTS.font } },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              afterBody: (items) => {
                const i = items[0].dataIndex;
                return `${data[i].shortForecast}  💨 ${data[i].windSpeed} ${data[i].windDirection}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color, font: CHART_DEFAULTS.font, maxTicksLimit: 12 },
            grid: { color: CHART_DEFAULTS.borderColor },
          },
          y: {
            ticks: {
              color: CHART_DEFAULTS.color,
              font: CHART_DEFAULTS.font,
              callback: (v) => `${v}°F`,
            },
            grid: { color: CHART_DEFAULTS.borderColor },
          },
        },
      },
    });
  } catch (err) {
    setModalError(`Failed to load hourly forecast: ${err.message}`);
  }
}

async function load7DayChart(cityName) {
  setModalLoading(true);
  destroyCharts();

  try {
    const res = await fetch(`/api/weather/${encodeURIComponent(cityName.toLowerCase())}/7day`);
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const { data } = await res.json();

    setModalLoading(false);

    // Keep only daytime periods for a clean one-bar-per-day view
    const daytime = data.filter((p) => p.isDaytime);

    const labels = daytime.map((p) => p.periodName);
    const temps = daytime.map((p) => p.temperature);
    const colors = daytime.map(() => 'rgba(56, 189, 248, 0.8)');

    const ctx = document.getElementById('chart-7day').getContext('2d');
    sevenDayChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Temperature (°F)',
          data: temps,
          backgroundColor: colors,
          borderColor: colors.map((c) => c.replace('0.8', '1')),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: CHART_DEFAULTS.color, font: CHART_DEFAULTS.font } },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              afterBody: (items) => {
                const i = items[0].dataIndex;
                return `${daytime[i].shortForecast}  💨 ${daytime[i].windSpeed}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: CHART_DEFAULTS.color, font: CHART_DEFAULTS.font },
            grid: { color: CHART_DEFAULTS.borderColor },
          },
          y: {
            ticks: {
              color: CHART_DEFAULTS.color,
              font: CHART_DEFAULTS.font,
              callback: (v) => `${v}°F`,
            },
            grid: { color: CHART_DEFAULTS.borderColor },
          },
        },
      },
    });
  } catch (err) {
    setModalError(`Failed to load 7-day forecast: ${err.message}`);
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

modalClose.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    switchTab(tab);
    if (tab === 'hourly' && !hourlyChart && activeCity) loadHourlyChart(activeCity);
    if (tab === '7day' && !sevenDayChart && activeCity) load7DayChart(activeCity);
  });
});

refreshBtn.addEventListener('click', loadWeather);

// Load on page init
loadWeather();
