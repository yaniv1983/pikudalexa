import { ProcessedAlert, buildAlertMessage } from '@pikudalexa/shared';

/**
 * Voice Monkey channel - sends TTS announcements to Alexa devices.
 * Provides the spoken details after the doorbell chime.
 *
 * Latency: ~2-3 seconds
 * Free tier: ~2 requests/min
 */

const VOICE_MONKEY_API = 'https://api-v2.voicemonkey.io/announcement';

export async function sendVoiceMonkeyAnnouncement(
  token: string,
  device: string,
  alert: ProcessedAlert,
): Promise<boolean> {
  if (!token || !device) {
    console.log('[VoiceMonkey] Not configured, skipping');
    return false;
  }

  const text = buildAlertMessage(alert.type, {
    threatType: alert.threatType,
    citiesEn: alert.citiesEn,
    countdown: alert.countdown,
    isDrill: alert.isDrill,
  });

  const params = new URLSearchParams({
    token,
    device,
    text,
  });

  try {
    const res = await fetch(`${VOICE_MONKEY_API}?${params}`);

    if (res.ok) {
      console.log('[VoiceMonkey] Announcement sent:', text);
      return true;
    }

    const body = await res.text();
    console.error(`[VoiceMonkey] Failed (${res.status}):`, body);
    return false;
  } catch (err) {
    console.error('[VoiceMonkey] Error:', err);
    return false;
  }
}
