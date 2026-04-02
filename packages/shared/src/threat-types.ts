import { ThreatType, SystemMessageType } from './types';

export const THREAT_LABELS: Record<ThreatType, { en: string; he: string; priority: number }> = {
  [ThreatType.Missiles]: {
    en: 'Rockets and missiles',
    he: 'ירי טילים ורקטות',
    priority: 8,
  },
  [ThreatType.TerroristInfiltration]: {
    en: 'Terrorist infiltration',
    he: 'חדירת מחבלים',
    priority: 1,
  },
  [ThreatType.HostileAircraft]: {
    en: 'Hostile aircraft intrusion',
    he: 'חדירת כלי טיס עוין',
    priority: 5,
  },
  [ThreatType.NonConventionalMissile]: {
    en: 'Non-conventional missile threat',
    he: 'טיל לא קונבנציונלי',
    priority: 2,
  },
};

/** Keywords that identify early warning messages (pre-alert, ~10 min before Iranian missiles) */
const EARLY_WARNING_KEYWORDS = [
  'בדקות הקרובות',
  'צפויות להתקבל התרעות',
  'ייתכן ויופעלו התרעות',
  'זיהוי שיגורים',
  'שיגורים לעבר ישראל',
  'בעקבות זיהוי שיגורים',
];

/** Keywords that identify all-clear messages */
const ALL_CLEAR_KEYWORDS = [
  'האירוע הסתיים',
  'הסתיים באזורים',
];

/** Nationwide city ID in SYSTEM_MESSAGE */
export const NATIONWIDE_CITY_ID = 10000000;

/** Nationwide city name in ALERT messages */
export const NATIONWIDE_CITY_NAME = 'רחבי הארץ';

export function classifySystemMessage(title: string, body: string): SystemMessageType {
  const text = `${title} ${body}`;

  if (EARLY_WARNING_KEYWORDS.some((kw) => text.includes(kw))) {
    return SystemMessageType.EarlyWarning;
  }
  if (ALL_CLEAR_KEYWORDS.some((kw) => text.includes(kw))) {
    return SystemMessageType.AllClear;
  }
  return SystemMessageType.Unknown;
}

/** Build English TTS message for Alexa announcement */
export function buildAlertMessage(
  type: 'alert' | 'early_warning' | 'all_clear',
  options: {
    threatType?: ThreatType;
    citiesEn: string[];
    countdown?: number;
    isDrill?: boolean;
  },
): string {
  const { threatType, citiesEn, countdown, isDrill } = options;
  const cityList = citiesEn.length > 3
    ? `${citiesEn.slice(0, 3).join(', ')} and ${citiesEn.length - 3} more areas`
    : citiesEn.join(' and ');

  if (isDrill) {
    return `This is a drill. Test alert for ${cityList}. This is only a test.`;
  }

  switch (type) {
    case 'early_warning':
      return `Early warning! Missile launches detected toward Israel. ` +
        `You may have about 10 minutes before impact. Prepare to move to shelter. ` +
        (citiesEn.length > 0 ? `Affected areas include ${cityList}.` : 'This is a nationwide alert.');

    case 'alert': {
      const threat = threatType !== undefined ? THREAT_LABELS[threatType]?.en ?? 'Alert' : 'Alert';
      const countdownMsg = countdown
        ? ` You have ${countdown} seconds to reach shelter.`
        : '';
      return `Red alert! ${threat} in ${cityList}.${countdownMsg} Go to shelter now!`;
    }

    case 'all_clear':
      return `All clear. The alert in your area has ended. You may leave the shelter.`;

    default:
      return `Pikud HaOref alert for ${cityList}.`;
  }
}
