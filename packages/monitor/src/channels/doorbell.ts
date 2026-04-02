import { v4 as uuid } from 'uuid';
import { ProcessedAlert, UserPreferences } from '@pikudalexa/shared';

/**
 * Alexa Event Gateway - DoorbellPress channel.
 * Sends a virtual doorbell press event which triggers an immediate chime
 * and announcement on all Echo devices.
 *
 * Latency: ~2-3 seconds (fastest official Alexa mechanism)
 * Limitation: 30-second cooldown between events for the same endpoint.
 */

// Event Gateway endpoints by region
const EVENT_GATEWAY: Record<string, string> = {
  NA: 'https://api.amazonalexa.com/v3/events',
  EU: 'https://api.eu.amazonalexa.com/v3/events',
  FE: 'https://api.fe.amazonalexa.com/v3/events',
};

export async function sendDoorbellPress(
  user: UserPreferences,
  _alert: ProcessedAlert,
  region = 'EU',
): Promise<boolean> {
  const token = user.alexaAccessToken;
  if (!token) {
    console.log('[Doorbell] No Alexa access token for user', user.userId);
    return false;
  }

  const endpoint = EVENT_GATEWAY[region] || EVENT_GATEWAY.EU;

  const event = {
    event: {
      header: {
        messageId: uuid(),
        namespace: 'Alexa.DoorbellEventSource',
        name: 'DoorbellPress',
        payloadVersion: '3',
      },
      endpoint: {
        scope: {
          type: 'BearerToken',
          token,
        },
        endpointId: 'pikud-alert-doorbell',
      },
      payload: {
        cause: { type: 'PHYSICAL_INTERACTION' },
        timestamp: new Date().toISOString(),
      },
    },
    context: {},
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });

    if (res.status === 202 || res.status === 200) {
      console.log('[Doorbell] Sent successfully');
      return true;
    }

    const body = await res.text();
    console.error(`[Doorbell] Failed (${res.status}):`, body);

    // Token expired - caller should refresh
    if (res.status === 401) {
      throw new Error('TOKEN_EXPIRED');
    }

    return false;
  } catch (err) {
    if (err instanceof Error && err.message === 'TOKEN_EXPIRED') throw err;
    console.error('[Doorbell] Error:', err);
    return false;
  }
}
