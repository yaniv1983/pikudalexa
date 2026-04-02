import { v4 as uuid } from 'uuid';
import {
  TzevaAdomMessage,
  ProcessedAlert,
  ThreatType,
  UserPreferences,
  classifySystemMessage,
  SystemMessageType,
  NATIONWIDE_CITY_ID,
  NATIONWIDE_CITY_NAME,
} from '@pikudalexa/shared';
import { CitiesCache } from './cities-cache';

export class AlertProcessor {
  /** Track recent alert fingerprints to deduplicate */
  private recentFingerprints = new Set<string>();
  private fingerprintExpiry = 120_000; // 2 minutes

  constructor(private cities: CitiesCache) {}

  /**
   * Process a raw TzevaAdom message into a ProcessedAlert (or null if irrelevant).
   */
  process(msg: TzevaAdomMessage): ProcessedAlert | null {
    if (msg.type === 'ALERT') {
      return this.processAlert(msg.data);
    }
    if (msg.type === 'SYSTEM_MESSAGE') {
      return this.processSystemMessage(msg.data);
    }
    return null;
  }

  /**
   * Check if a processed alert is relevant to a user's subscriptions.
   */
  isRelevantToUser(alert: ProcessedAlert, user: UserPreferences): boolean {
    // Early warnings and all-clear with nationwide scope are always relevant
    if (alert.type === 'early_warning' || alert.type === 'all_clear') {
      if (alert.cityIds.includes(NATIONWIDE_CITY_ID) || alert.cityIds.length === 0) {
        return true;
      }
    }

    // Check if user has the threat type enabled
    if (alert.type === 'alert' && alert.threatType !== undefined) {
      if (!user.enabledThreats.includes(alert.threatType)) return false;
    }

    // Check drills
    if (alert.isDrill && !user.enableDrills) return false;

    // Check system messages preference
    if ((alert.type === 'early_warning' || alert.type === 'all_clear') && !user.enableSystemMessages) {
      return false;
    }

    // Check city/area match
    const userCityIds = new Set(user.cities);
    const userAreaCityIds = new Set<number>();
    // Expand area subscriptions to individual city IDs
    for (const areaId of user.alertAreas) {
      for (const cityId of this.cities.getCityIdsByArea(areaId)) {
        userAreaCityIds.add(cityId);
      }
    }

    return alert.cityIds.some((id) => userCityIds.has(id) || userAreaCityIds.has(id));
  }

  private processAlert(data: { cities: string[]; threat: ThreatType; isDrill: boolean }): ProcessedAlert | null {
    const fingerprint = `alert:${data.threat}:${[...data.cities].sort().join(',')}`;
    if (this.isDuplicate(fingerprint)) return null;

    const cityIds: number[] = [];
    const citiesEn: string[] = [];
    let shortestCountdown: number | undefined;

    for (const cityName of data.cities) {
      if (cityName === NATIONWIDE_CITY_NAME) {
        citiesEn.push('Nationwide');
        cityIds.push(NATIONWIDE_CITY_ID);
        continue;
      }
      const city = this.cities.getCityByName(cityName);
      if (city) {
        cityIds.push(city.id);
        citiesEn.push(city.en);
        if (shortestCountdown === undefined || city.countdown < shortestCountdown) {
          shortestCountdown = city.countdown;
        }
      } else {
        citiesEn.push(cityName); // fallback: use Hebrew name
      }
    }

    return {
      id: uuid(),
      timestamp: new Date().toISOString(),
      type: 'alert',
      threatType: data.threat,
      cities: data.cities,
      citiesEn,
      cityIds,
      countdown: shortestCountdown,
      isDrill: data.isDrill,
    };
  }

  private processSystemMessage(data: { titleHe: string; bodyHe: string; citiesIds: number[] }): ProcessedAlert | null {
    const msgType = classifySystemMessage(data.titleHe, data.bodyHe);
    if (msgType === SystemMessageType.Unknown) return null;

    const fingerprint = `system:${msgType}:${[...data.citiesIds].sort().join(',')}`;
    if (this.isDuplicate(fingerprint)) return null;

    const cities: string[] = [];
    const citiesEn: string[] = [];

    for (const id of data.citiesIds) {
      if (id === NATIONWIDE_CITY_ID) {
        cities.push(NATIONWIDE_CITY_NAME);
        citiesEn.push('Nationwide');
        continue;
      }
      const city = this.cities.getCityById(id);
      if (city) {
        cities.push(city.he);
        citiesEn.push(city.en);
      }
    }

    return {
      id: uuid(),
      timestamp: new Date().toISOString(),
      type: msgType === SystemMessageType.EarlyWarning ? 'early_warning' : 'all_clear',
      cities,
      citiesEn,
      cityIds: data.citiesIds,
      isDrill: false,
      rawTitle: data.titleHe,
      rawBody: data.bodyHe,
    };
  }

  private isDuplicate(fingerprint: string): boolean {
    if (this.recentFingerprints.has(fingerprint)) return true;
    this.recentFingerprints.add(fingerprint);
    setTimeout(() => this.recentFingerprints.delete(fingerprint), this.fingerprintExpiry);
    return false;
  }
}
