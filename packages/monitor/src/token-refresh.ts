import fs from 'fs';
import path from 'path';
import { StoredTokens } from './token-server';

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const TOKENS_FILE = path.resolve(process.cwd(), 'data', 'tokens.json');
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 minutes before expiry

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start automatic token refresh. Checks token expiry and refreshes
 * before it expires using the LWA refresh token.
 */
export function startTokenRefresh(clientId: string, clientSecret: string): void {
  async function checkAndRefresh() {
    try {
      if (!fs.existsSync(TOKENS_FILE)) return;

      const tokens: StoredTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
      if (!tokens.refreshToken) {
        console.log('[TokenRefresh] No refresh token available');
        return;
      }

      const timeUntilExpiry = tokens.expiresAt - Date.now();

      if (timeUntilExpiry < REFRESH_MARGIN_MS) {
        console.log('[TokenRefresh] Token expiring soon, refreshing...');
        await doRefresh(tokens.refreshToken, clientId, clientSecret);
      } else {
        const minutesLeft = Math.round(timeUntilExpiry / 60000);
        console.log(`[TokenRefresh] Token valid for ${minutesLeft} more minutes`);
      }
    } catch (err) {
      console.error('[TokenRefresh] Error:', (err as Error).message);
    }
  }

  // Check immediately, then every 5 minutes
  checkAndRefresh();
  refreshTimer = setInterval(checkAndRefresh, 5 * 60 * 1000);
  console.log('[TokenRefresh] Auto-refresh started (checking every 5 min)');
}

export function stopTokenRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function doRefresh(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<void> {
  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${body}`);
  }

  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const updated: StoredTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // keep old if not returned
    expiresAt: Date.now() + data.expires_in * 1000,
    updatedAt: new Date().toISOString(),
  };

  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(updated, null, 2));

  console.log(`[TokenRefresh] Token refreshed, valid for ${data.expires_in / 60} minutes`);
}
