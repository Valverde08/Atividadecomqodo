// Weather App using Open-Meteo APIs (no API key required)
// - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}&language=pt&count=1
// - Current weather: https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=...&hourly=...

const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const statusEl = document.getElementById('status');
const weatherEl = document.getElementById('weather');

const ui = {
  location: document.getElementById('location-name'),
  obsTime: document.getElementById('observation-time'),
  temp: document.getElementById('temperature'),
  code: document.getElementById('weather-code'),
  wind: document.getElementById('wind'),
  humidity: document.getElementById('humidity'),
  apparent: document.getElementById('apparent'),
  pressure: document.getElementById('pressure'),
  precip: document.getElementById('precip'),
  cloud: document.getElementById('cloud'),
};

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg || '';
  statusEl.className = `status ${type}`;
}

function showWeatherSection(show) {
  weatherEl.classList.toggle('hidden', !show);
}

// Map Open-Meteo weather codes to PT-BR descriptions
// https://open-meteo.com/en/docs#weathervariables
const WEATHER_CODE_MAP = {
  0: 'Céu limpo',
  1: 'Principalmente limpo',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Nevoeiro',
  48: 'Nevoeiro depositante',
  51: 'Garoa leve',
  53: 'Garoa',
  55: 'Garoa intensa',
  56: 'Garoa gelada leve',
  57: 'Garoa gelada intensa',
  61: 'Chuva fraca',
  63: 'Chuva',
  65: 'Chuva forte',
  66: 'Chuva gelada fraca',
  67: 'Chuva gelada forte',
  71: 'Neve fraca',
  73: 'Neve',
  75: 'Neve forte',
  77: 'Grãos de neve',
  80: 'Aguaceiros fracos',
  81: 'Aguaceiros',
  82: 'Aguaceiros fortes',
  85: 'Aguaceiros de neve fracos',
  86: 'Aguaceiros de neve fortes',
  95: 'Trovoadas',
  96: 'Trovoadas com granizo leve',
  99: 'Trovoadas com granizo forte',
};

async function geocodeCity(name) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('language', 'pt');
  url.searchParams.set('count', '1');

  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Falha ao buscar geocodificação');
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('Cidade não encontrada');
  const r = data.results[0];
  return {
    name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ' - ' + r.country : ''}`,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}

async function getWeather(lat, lon, timezone) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('timezone', timezone || 'auto');
  // Request current weather and some useful hourly metrics for feels-like and humidity
  url.searchParams.set('current', [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'pressure_msl',
    'precipitation',
    'cloud_cover',
    'weather_code',
    'wind_speed_10m',
    'wind_direction_10m'
  ].join(','));

  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error('Falha ao buscar clima');
  const data = await res.json();
  return data;
}

function formatTimeISOToLocal(iso, tz) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function formatNumber(v, unit = '') {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${Math.round(Number(v))}${unit}`;
}

function updateUI(city, weather) {
  const { current, timezone } = weather;
  ui.location.textContent = city.name;
  ui.obsTime.textContent = `Atualizado: ${formatTimeISOToLocal(current.time, timezone)}`;
  ui.temp.textContent = formatNumber(current.temperature_2m, '°C');
  ui.code.textContent = WEATHER_CODE_MAP[current.weather_code] || `Código ${current.weather_code}`;
  ui.wind.textContent = `${formatNumber(current.wind_speed_10m, ' km/h')} (${current.wind_direction_10m || '—'}°)`;
  ui.humidity.textContent = formatNumber(current.relative_humidity_2m, '%');
  ui.apparent.textContent = formatNumber(current.apparent_temperature, '°C');
  ui.pressure.textContent = formatNumber(current.pressure_msl, ' hPa');
  ui.precip.textContent = `${current.precipitation != null ? current.precipitation : '—'} mm`;
  ui.cloud.textContent = formatNumber(current.cloud_cover, '%');
}

async function handleSearch(e) {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;

  setStatus('Buscando cidade…', 'info');
  showWeatherSection(false);

  try {
    const city = await geocodeCity(q);
    setStatus('Buscando clima…', 'info');
    const weather = await getWeather(city.latitude, city.longitude, city.timezone);
    updateUI(city, weather);
    setStatus('');
    showWeatherSection(true);
  } catch (err) {
    console.error(err);
    setStatus(err.message || 'Erro ao buscar dados', 'error');
    showWeatherSection(false);
  }
}

form.addEventListener('submit', handleSearch);

// Optional: try to load default city on first load
window.addEventListener('DOMContentLoaded', async () => {
  const defaultCity = 'São Paulo';
  if (!input.value) input.value = defaultCity;
  // Auto-search once on load to show sample data
  form.dispatchEvent(new Event('submit'));
});
