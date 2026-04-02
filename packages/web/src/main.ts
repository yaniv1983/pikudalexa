/**
 * PikudAlexa Settings Panel
 * Vanilla TypeScript - no framework needed for this simple UI.
 */

interface City {
  id: number;
  he: string;
  en: string;
  area: number;
  countdown: number;
}

interface Settings {
  cities: number[];
  enabledThreats: number[];
  enableDrills: boolean;
  enableSystemMessages: boolean;
  voiceMonkeyToken: string;
  voiceMonkeyDevice: string;
}

// State
let allCities: Record<string, City> = {};
let selectedCityIds: Set<number> = new Set();

// DOM Elements
const citySearch = document.getElementById('citySearch') as HTMLInputElement;
const cityList = document.getElementById('cityList') as HTMLDivElement;
const selectedCitiesEl = document.getElementById('selectedCities') as HTMLDivElement;
const statusDot = document.getElementById('statusDot') as HTMLSpanElement;
const statusText = document.getElementById('statusText') as HTMLParagraphElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
const testResult = document.getElementById('testResult') as HTMLDivElement;

// Load cities data
async function loadCities(): Promise<void> {
  try {
    const versionsRes = await fetch('https://api.tzevaadom.co.il/lists-versions');
    const versions = await versionsRes.json();

    const citiesRes = await fetch(
      `https://www.tzevaadom.co.il/static/cities.json?v=${versions.cities}`,
    );
    const data = await citiesRes.json();
    allCities = data.cities;

    statusDot.classList.add('online');
    statusText.textContent = `Connected. ${Object.keys(allCities).length} cities loaded.`;
  } catch (err) {
    statusDot.classList.add('offline');
    statusText.textContent = 'Failed to load cities data. Check your connection.';
    console.error('Failed to load cities:', err);
  }
}

// City search
citySearch.addEventListener('input', () => {
  const query = citySearch.value.trim().toLowerCase();
  if (query.length < 2) {
    cityList.classList.remove('visible');
    return;
  }

  const matches: [string, City][] = [];
  for (const [name, city] of Object.entries(allCities)) {
    if (
      name.includes(query) ||
      city.en.toLowerCase().includes(query) ||
      String(city.id) === query
    ) {
      matches.push([name, city]);
    }
    if (matches.length >= 20) break;
  }

  if (matches.length === 0) {
    cityList.innerHTML = '<div class="city-item" style="color: var(--muted)">No cities found</div>';
  } else {
    cityList.innerHTML = matches
      .map(
        ([name, city]) =>
          `<div class="city-item" data-id="${city.id}" data-name="${name}" data-en="${city.en}">
            <span>${name} (${city.en})</span>
            <span class="countdown">${city.countdown}s</span>
          </div>`,
      )
      .join('');
  }

  cityList.classList.add('visible');
});

// City selection
cityList.addEventListener('click', (e) => {
  const item = (e.target as HTMLElement).closest('.city-item') as HTMLElement | null;
  if (!item) return;

  const id = Number(item.dataset.id);
  if (selectedCityIds.has(id)) return;

  selectedCityIds.add(id);
  renderSelectedCities();
  citySearch.value = '';
  cityList.classList.remove('visible');
});

// Remove city
function removeCity(id: number): void {
  selectedCityIds.delete(id);
  renderSelectedCities();
}

function renderSelectedCities(): void {
  if (selectedCityIds.size === 0) {
    selectedCitiesEl.innerHTML =
      '<span style="font-size: 0.85rem; color: var(--muted)">No cities selected</span>';
    return;
  }

  selectedCitiesEl.innerHTML = Array.from(selectedCityIds)
    .map((id) => {
      const city = Object.values(allCities).find((c) => c.id === id);
      const label = city ? `${city.he} (${city.en})` : `City ${id}`;
      return `<span class="city-tag">${label} <span class="remove" onclick="window.removeCity(${id})">x</span></span>`;
    })
    .join('');
}

// Make removeCity accessible from inline onclick
(window as any).removeCity = removeCity;

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!(e.target as HTMLElement).closest('.card')) {
    cityList.classList.remove('visible');
  }
});

// Gather settings
function getSettings(): Settings {
  return {
    cities: Array.from(selectedCityIds),
    enabledThreats: [
      ...(getChecked('threatMissiles') ? [0] : []),
      ...(getChecked('threatTerror') ? [2] : []),
      ...(getChecked('threatAircraft') ? [5] : []),
      ...(getChecked('threatNonConv') ? [7] : []),
    ],
    enableDrills: getChecked('drills'),
    enableSystemMessages: getChecked('systemMessages'),
    voiceMonkeyToken: (document.getElementById('vmToken') as HTMLInputElement).value.trim(),
    voiceMonkeyDevice: (document.getElementById('vmDevice') as HTMLInputElement).value.trim(),
  };
}

function getChecked(id: string): boolean {
  return (document.getElementById(id) as HTMLInputElement).checked;
}

// Save settings
saveBtn.addEventListener('click', () => {
  const settings = getSettings();

  if (settings.cities.length === 0) {
    showResult('error', 'Please select at least one city to monitor.');
    return;
  }

  // Save to localStorage for now (will be replaced with API call)
  localStorage.setItem('pikudalexa-settings', JSON.stringify(settings));
  showResult('success', 'Settings saved successfully!');

  console.log('Settings saved:', settings);
});

// Test alert
testBtn.addEventListener('click', async () => {
  testBtn.disabled = true;
  testBtn.textContent = 'Sending...';

  try {
    // TODO: Call the test alert API endpoint
    // For now, simulate a delay and show the message
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const settings = getSettings();
    if (settings.cities.length === 0) {
      showResult('error', 'Select a city first, then test.');
    } else {
      const cityNames = settings.cities
        .map((id) => {
          const city = Object.values(allCities).find((c) => c.id === id);
          return city ? city.en : `ID ${id}`;
        })
        .join(', ');

      showResult(
        'success',
        `Test alert would be sent for: ${cityNames}. ` +
        `Connect your Alexa skill to receive the actual test notification.`,
      );
    }
  } catch (err) {
    showResult('error', 'Failed to send test alert. Check your connection.');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Send Test Alert';
  }
});

function showResult(type: 'success' | 'error', message: string): void {
  testResult.className = `test-result ${type}`;
  testResult.textContent = message;
  setTimeout(() => {
    testResult.className = 'test-result';
  }, 5000);
}

// Load saved settings
function loadSavedSettings(): void {
  const saved = localStorage.getItem('pikudalexa-settings');
  if (!saved) return;

  try {
    const settings: Settings = JSON.parse(saved);
    selectedCityIds = new Set(settings.cities);
    (document.getElementById('threatMissiles') as HTMLInputElement).checked =
      settings.enabledThreats.includes(0);
    (document.getElementById('threatTerror') as HTMLInputElement).checked =
      settings.enabledThreats.includes(2);
    (document.getElementById('threatAircraft') as HTMLInputElement).checked =
      settings.enabledThreats.includes(5);
    (document.getElementById('threatNonConv') as HTMLInputElement).checked =
      settings.enabledThreats.includes(7);
    (document.getElementById('drills') as HTMLInputElement).checked = settings.enableDrills;
    (document.getElementById('systemMessages') as HTMLInputElement).checked =
      settings.enableSystemMessages;
    (document.getElementById('vmToken') as HTMLInputElement).value =
      settings.voiceMonkeyToken || '';
    (document.getElementById('vmDevice') as HTMLInputElement).value =
      settings.voiceMonkeyDevice || '';
  } catch {
    // Ignore corrupted settings
  }
}

// Initialize
async function init(): Promise<void> {
  await loadCities();
  loadSavedSettings();
  renderSelectedCities();
}

init();
