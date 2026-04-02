import { v4 as uuid } from 'uuid';
import { ProcessedAlert, buildAlertMessage } from '@pikudalexa/shared';

/**
 * Proactive Events API - yellow ring notification fallback.
 * This is the slowest channel (~5-15s) and requires the user to ask
 * "Alexa, what are my notifications?" but serves as a persistent record.
 *
 * Uses AMAZON.MessageAlert.Activated schema as it allows the most
 * flexible text content.
 */

const PROACTIVE_API: Record<string, string> = {
  NA: 'https://api.amazonalexa.com/v1/proactiveEvents/stages/live',
  EU: 'https://api.eu.amazonalexa.com/v1/proactiveEvents/stages/live',
  FE: 'https://api.fe.amazonalexa.com/v1/proactiveEvents/stages/live',
};

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';

let cachedToken: { token: string; expiry: number } | null = null;

export async function sendProactiveEvent(
  alert: ProcessedAlert,
  clientId: string,
  clientSecret: string,
  region = 'EU',
): Promise<boolean> {
  try {
    const token = await getAccessToken(clientId, clientSecret);
    const endpoint = PROACTIVE_API[region] || PROACTIVE_API.EU;

    const message = buildAlertMessage(alert.type, {
      threatType: alert.threatType,
      citiesEn: alert.citiesEn,
      countdown: alert.countdown,
      isDrill: alert.isDrill,
    });

    const event = {
      timestamp: new Date().toISOString(),
      referenceId: uuid(),
      expiryTime: new Date(Date.now() + 300_000).toISOString(), // 5 min expiry
      event: {
        name: 'AMAZON.MessageAlert.Activated',
        payload: {
          state: { status: 'UNREAD', freshness: { new: true } },
          messageGroup: {
            creator: { name: 'Pikud HaOref' },
            count: 1,
            urgency: 'URGENT',
          },
        },
      },
      localizedAttributes: [
        {
          locale: 'en-US',
          providerName: 'Pikud Alert',
          contentBody: message,
        },
      ],
      relevantAudience: {
        type: 'Multicast',
        payload: {},
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });

    if (res.status === 202 || res.status === 200) {
      console.log('[Proactive] Event sent');
      return true;
    }

    const body = await res.text();
    console.error(`[Proactive] Failed (${res.status}):`, body);
    return false;
  } catch (err) {
    console.error('[Proactive] Error:', err);
    return false;
  }
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiry - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'alexa::proactive_events',
    }),
  });

  if (!res.ok) {
    throw new Error(`LWA token request failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiry: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}
