import { ProcessedAlert, UserPreferences } from '@pikudalexa/shared';
import { sendDoorbellPress } from './channels/doorbell';
import { sendVoiceMonkeyAnnouncement } from './channels/voice-monkey';
import { sendProactiveEvent } from './channels/proactive';

export interface DispatcherConfig {
  alexaRegion: string;
  alexaClientId?: string;
  alexaClientSecret?: string;
}

/**
 * Dispatches alerts through all available channels simultaneously.
 * Fires all channels in parallel - fastest channel wins for initial notification.
 */
export class AlertDispatcher {
  constructor(private config: DispatcherConfig) {}

  async dispatch(alert: ProcessedAlert, users: UserPreferences[]): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const user of users) {
      promises.push(this.dispatchToUser(alert, user));
    }

    await Promise.allSettled(promises);
  }

  async dispatchToUser(alert: ProcessedAlert, user: UserPreferences): Promise<void> {
    console.log(
      `[Dispatch] Sending ${alert.type} to user ${user.userId}: ` +
      `${alert.citiesEn.join(', ')} (${alert.type === 'alert' ? `threat=${alert.threatType}` : alert.type})`,
    );

    const channels: Promise<boolean>[] = [];

    // Channel 1: Doorbell (fastest, ~2-3s)
    if (user.alexaAccessToken) {
      channels.push(
        sendDoorbellPress(user, alert, this.config.alexaRegion)
          .catch((err) => {
            if (err?.message === 'TOKEN_EXPIRED') {
              console.log('[Dispatch] Alexa token expired, needs refresh');
              // TODO: trigger token refresh via token-manager
            }
            return false;
          }),
      );
    }

    // Channel 2: Voice Monkey TTS (~2-3s)
    if (user.voiceMonkeyToken && user.voiceMonkeyDevice) {
      channels.push(
        sendVoiceMonkeyAnnouncement(user.voiceMonkeyToken, user.voiceMonkeyDevice, alert),
      );
    }

    // Channel 3: Proactive Events fallback (~5-15s)
    if (this.config.alexaClientId && this.config.alexaClientSecret) {
      channels.push(
        sendProactiveEvent(
          alert,
          this.config.alexaClientId,
          this.config.alexaClientSecret,
          this.config.alexaRegion,
        ),
      );
    }

    if (channels.length === 0) {
      console.warn(`[Dispatch] No channels configured for user ${user.userId}`);
      return;
    }

    const results = await Promise.allSettled(channels);
    const successes = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failures = results.length - successes;

    console.log(
      `[Dispatch] User ${user.userId}: ${successes}/${results.length} channels succeeded` +
      (failures > 0 ? ` (${failures} failed)` : ''),
    );
  }
}
