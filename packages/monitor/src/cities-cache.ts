import https from 'https';
import { City, Area, CitiesData } from '@pikudalexa/shared';

const VERSIONS_URL = 'https://api.tzevaadom.co.il/lists-versions';
const CITIES_URL = 'https://www.tzevaadom.co.il/static/cities.json';

/** In-memory cache of city data with name→id and id→city lookups */
export class CitiesCache {
  private citiesByName = new Map<string, City>();  // Hebrew name → City
  private citiesById = new Map<number, City>();    // ID → City
  private areasById = new Map<number, Area>();
  private loaded = false;

  async load(): Promise<void> {
    const version = await this.fetchVersion();
    const data = await this.fetchCities(version);

    this.citiesByName.clear();
    this.citiesById.clear();
    this.areasById.clear();

    for (const [name, city] of Object.entries(data.cities)) {
      this.citiesByName.set(name, city);
      this.citiesById.set(city.id, city);
    }

    for (const [id, area] of Object.entries(data.areas)) {
      this.areasById.set(Number(id), area);
    }

    this.loaded = true;
    console.log(`[Cities] Loaded ${this.citiesByName.size} cities, ${this.areasById.size} areas`);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getCityByName(hebrewName: string): City | undefined {
    return this.citiesByName.get(hebrewName);
  }

  getCityById(id: number): City | undefined {
    return this.citiesById.get(id);
  }

  getArea(areaId: number): Area | undefined {
    return this.areasById.get(areaId);
  }

  /** Get all city IDs in an area */
  getCityIdsByArea(areaId: number): number[] {
    const ids: number[] = [];
    for (const city of this.citiesById.values()) {
      if (city.area === areaId) ids.push(city.id);
    }
    return ids;
  }

  private fetchVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      https.get(VERSIONS_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).cities);
          } catch (e) {
            reject(new Error(`Failed to parse versions: ${data}`));
          }
        });
      }).on('error', reject);
    });
  }

  private fetchCities(version: number): Promise<CitiesData> {
    return new Promise((resolve, reject) => {
      https.get(`${CITIES_URL}?v=${version}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse cities data`));
          }
        });
      }).on('error', reject);
    });
  }
}
