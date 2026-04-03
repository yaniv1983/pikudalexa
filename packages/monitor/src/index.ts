import 'dotenv/config';
import { TzevaAdomMessage, UserPreferences } from '@pikudalexa/shared';
import { TzevaAdomClient } from './websocket-client';
import { CitiesCache } from './cities-cache';
import { AlertProcessor } from './alert-processor';
import { AlertDispatcher } from './alert-dispatcher';
import { startTokenServer, loadTokens } from './token-server';
import { startTokenRefresh, stopTokenRefresh } from './token-refresh';

async function main() {
  console.log('=== PikudAlexa Monitor ===');
  console.log('Starting up...\n');

  // Load city data
  const cities = new CitiesCache();
  await cities.load();

  // Initialize processor and dispatcher
  const processor = new AlertProcessor(cities);
  const dispatcher = new AlertDispatcher({
    alexaRegion: process.env.ALEXA_REGION || 'EU',
    alexaClientId: process.env.ALEXA_CLIENT_ID,
    alexaClientSecret: process.env.ALEXA_CLIENT_SECRET,
  });

  // Start token receiver server (Lambda posts tokens here after AcceptGrant)
  const tokenPort = Number(process.env.TOKEN_PORT) || 9876;
  startTokenServer(tokenPort);

  // Start automatic token refresh (refreshes before expiry)
  if (process.env.ALEXA_CLIENT_ID && process.env.ALEXA_CLIENT_SECRET) {
    startTokenRefresh(process.env.ALEXA_CLIENT_ID, process.env.ALEXA_CLIENT_SECRET);
  }

  // Load user config
  const users = loadUsersFromEnv();
  console.log(`Monitoring for ${users.length} user(s)\n`);

  // Connect to TzevaAdom WebSocket
  const client = new TzevaAdomClient();

  client.on('connected', () => {
    console.log('[Monitor] Connected to TzevaAdom - listening for alerts...');
  });

  client.on('disconnected', (reason: string) => {
    console.log(`[Monitor] Disconnected: ${reason}`);
  });

  client.on('alert', async (msg: TzevaAdomMessage) => {
    console.log(`\n[Monitor] Received ${msg.type}:`, JSON.stringify(msg.data));

    const alert = processor.process(msg);
    if (!alert) {
      console.log('[Monitor] Duplicate or irrelevant, skipping');
      return;
    }

    // Refresh tokens from file before dispatch (Lambda may have updated them)
    refreshUserTokens(users);

    // Find matching users
    const matchingUsers = users.filter((u) => processor.isRelevantToUser(alert, u));
    if (matchingUsers.length === 0) {
      console.log(`[Monitor] No matching users for cities: ${alert.citiesEn.join(', ')}`);
      return;
    }

    console.log(`[Monitor] Alert relevant to ${matchingUsers.length} user(s), dispatching...`);
    await dispatcher.dispatch(alert, matchingUsers);
  });

  client.on('error', (err: Error) => {
    console.error('[Monitor] Error:', err.message);
  });

  client.connect();

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Monitor] Shutting down...');
    client.stop();
    stopTokenRefresh();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/** Refresh user tokens from the tokens file (written by Lambda via token server) */
function refreshUserTokens(users: UserPreferences[]): void {
  const tokens = loadTokens();
  if (tokens && users.length > 0) {
    users[0].alexaAccessToken = tokens.accessToken;
    users[0].alexaRefreshToken = tokens.refreshToken;
  }
}

function loadUsersFromEnv(): UserPreferences[] {
  const cityIds = process.env.MONITOR_CITY_IDS;
  if (!cityIds) {
    console.warn('[Config] No MONITOR_CITY_IDS set. Monitor will log all alerts but not dispatch.');
    return [];
  }

  // Try loading existing tokens
  const tokens = loadTokens();

  const user: UserPreferences = {
    userId: 'local-user',
    cities: cityIds.split(',').map(Number),
    alertAreas: process.env.MONITOR_AREA_IDS
      ? process.env.MONITOR_AREA_IDS.split(',').map(Number)
      : [],
    enabledThreats: [0, 2, 5, 7],
    enableDrills: process.env.MONITOR_ENABLE_DRILLS === 'true',
    enableSystemMessages: true,
    alexaAccessToken: tokens?.accessToken || process.env.ALEXA_ACCESS_TOKEN,
    alexaRefreshToken: tokens?.refreshToken || process.env.ALEXA_REFRESH_TOKEN,
    voiceMonkeyToken: process.env.VOICE_MONKEY_TOKEN,
    voiceMonkeyDevice: process.env.VOICE_MONKEY_DEVICE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return [user];
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
