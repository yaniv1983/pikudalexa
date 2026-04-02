import https from 'https';
import fs from 'fs';
import path from 'path';
import { City, Area, CitiesData } from '@pikudalexa/shared';

const VERSIONS_URL = 'https://api.tzevaadom.co.il/lists-versions';
const CITIES_URL = 'https://www.tzevaadom.co.il/static/cities.json';

/** In-memory cache of city data with name->id and id->city lookups */
export class CitiesCache {
  private citiesByName = new Map<string, City>();  // Hebrew name -> City
  private citiesById = new Map<number, City>();    // ID -> City
  private areasById = new Map<number, Area>();
  private loaded = false;

  async load(): Promise<void> {
    let data: CitiesData;

    try {
      // Try fetching from API first
      const version = await this.fetchVersion();
      data = await this.fetchCities(version);
    } catch (err) {
      // Fall back to local file (for servers blocked by Cloudflare)
      console.log(`[Cities] API fetch failed (${(err as Error).message}), trying local file...`);
      data = this.loadFromFile();
    }

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

  getCityIdsByArea(areaId: number): number[] {
    const ids: number[] = [];
    for (const city of this.citiesById.values()) {
      if (city.area === areaId) ids.push(city.id);
    }
    return ids;
  }

  private loadFromFile(): CitiesData {
    // Look for data/cities.json relative to the project root
    const candidates = [
      path.resolve(process.cwd(), 'data', 'cities.json'),
      path.resolve(__dirname, '..', '..', '..', 'data', 'cities.json'),
      path.resolve(__dirname, '..', 'data', 'cities.json'),
    ];

    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        console.log(`[Cities] Loading from local file: ${filePath}`);
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    }

    throw new Error('No cities data available (API blocked and no local file found)');
  }

  private fetchVersion(): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = https.get(VERSIONS_URL, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).cities);
          } catch (e) {
            reject(new Error(`Failed to parse versions: ${data.substring(0, 100)}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  private fetchCities(version: number): Promise<CitiesData> {
    return new Promise((resolve, reject) => {
      const req = https.get(`${CITIES_URL}?v=${version}`, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse cities data'));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }
}
