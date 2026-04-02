/** TzevaAdom WebSocket message types */

export interface TzevaAdomAlert {
  type: 'ALERT';
  data: {
    cities: string[];   // Hebrew city names
    threat: ThreatType;
    isDrill: boolean;
  };
}

export interface TzevaAdomSystemMessage {
  type: 'SYSTEM_MESSAGE';
  data: {
    titleHe: string;
    bodyHe: string;
    citiesIds: number[];
  };
}

export type TzevaAdomMessage = TzevaAdomAlert | TzevaAdomSystemMessage;

/** Threat type IDs from TzevaAdom */
export enum ThreatType {
  Missiles = 0,
  TerroristInfiltration = 2,
  HostileAircraft = 5,
  NonConventionalMissile = 7,
}

/** Parsed system message sub-types */
export enum SystemMessageType {
  EarlyWarning = 'early_warning',
  AllClear = 'all_clear',
  Unknown = 'unknown',
}

/** City data from TzevaAdom cities.json */
export interface City {
  id: number;
  he: string;
  en: string;
  ru: string;
  ar: string;
  es: string;
  area: number;
  countdown: number;  // seconds to reach shelter
  lat: number;
  lng: number;
}

export interface Area {
  id: number;
  he: string;
  en: string;
}

export interface CitiesData {
  cities: Record<string, City>;
  areas: Record<string, Area>;
}

/** User preferences stored in DynamoDB */
export interface UserPreferences {
  userId: string;
  email?: string;
  cities: number[];              // city IDs
  alertAreas: number[];          // area IDs (subscribe to whole area)
  enabledThreats: ThreatType[];
  enableDrills: boolean;
  enableSystemMessages: boolean;  // early warnings + all clear

  // Alexa Event Gateway tokens
  alexaAccessToken?: string;
  alexaRefreshToken?: string;
  alexaTokenExpiry?: number;

  // Voice Monkey (optional)
  voiceMonkeyToken?: string;
  voiceMonkeyDevice?: string;

  createdAt: string;
  updatedAt: string;
}

/** A processed alert ready for dispatch */
export interface ProcessedAlert {
  id: string;
  timestamp: string;
  type: 'alert' | 'early_warning' | 'all_clear';
  threatType?: ThreatType;
  cities: string[];        // Hebrew names
  citiesEn: string[];      // English names
  cityIds: number[];
  countdown?: number;      // shortest countdown among matched cities
  isDrill: boolean;
  rawTitle?: string;       // for system messages
  rawBody?: string;        // for system messages
}
