import http from 'http';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.resolve(process.cwd(), 'data', 'tokens.json');
const TOKEN_SECRET = process.env.TOKEN_SECRET || '';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  updatedAt: string;
}

/** Read stored tokens from disk */
export function loadTokens(): StoredTokens | null {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Tokens] Failed to load tokens:', err);
  }
  return null;
}

/** Save tokens to disk */
function saveTokens(tokens: StoredTokens): void {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  console.log('[Tokens] Saved tokens to', TOKENS_FILE);
}

/**
 * Start a simple HTTP server that receives tokens from the Lambda.
 * The Lambda POSTs tokens after AcceptGrant.
 * Protected by a shared secret in the Authorization header.
 */
export function startTokenServer(port = 9876): http.Server {
  const server = http.createServer((req, res) => {
    // Normalize path - strip any proxy prefix
    const url = (req.url || '').replace(/^\/pikudalexa\/api/, '');

    // Health check
    if (req.method === 'GET' && (url === '/health' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', hasTokens: fs.existsSync(TOKENS_FILE) }));
      return;
    }

    // Receive tokens
    if (req.method === 'POST' && (url === '/tokens' || req.url === '/tokens')) {
      // Verify secret
      const auth = req.headers.authorization || '';
      if (TOKEN_SECRET && auth !== `Bearer ${TOKEN_SECRET}`) {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      let body = '';
      req.on('data', (chunk) => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const tokens: StoredTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
            updatedAt: new Date().toISOString(),
          };
          saveTokens(tokens);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          console.error('[Tokens] Failed to parse token data:', err);
          res.writeHead(400);
          res.end('Invalid JSON');
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Tokens] Token server listening on port ${port}`);
  });

  return server;
}
