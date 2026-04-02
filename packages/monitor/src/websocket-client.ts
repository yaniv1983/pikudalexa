import WebSocket from 'ws';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { TzevaAdomMessage } from '@pikudalexa/shared';

const PRIMARY_URL = 'wss://ws.tzevaadom.co.il/socket?platform=ANDROID';
const FALLBACK_URL = 'wss://ws.tzevaadom.co.il:8443/socket?platform=WEB';

const PING_INTERVAL_MS = 60_000;
const PONG_TIMEOUT_MS = 420_000; // 7 minutes
const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 60_000;
const RECONNECT_MULTIPLIER = 2;

export interface TzevaAdomClientEvents {
  alert: [TzevaAdomMessage];
  connected: [];
  disconnected: [string];
  error: [Error];
}

export class TzevaAdomClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private useFallback = false;
  private stopped = false;

  connect(): void {
    this.stopped = false;
    this.doConnect();
  }

  stop(): void {
    this.stopped = true;
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private get url(): string {
    return this.useFallback ? FALLBACK_URL : PRIMARY_URL;
  }

  private doConnect(): void {
    if (this.stopped) return;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36',
      'Referer': 'https://www.tzevaadom.co.il',
      'Origin': 'https://www.tzevaadom.co.il',
      'tzofar': crypto.randomBytes(16).toString('hex'),
    };

    console.log(`[WS] Connecting to ${this.url}...`);
    this.ws = new WebSocket(this.url, { headers });

    this.ws.on('open', () => {
      console.log('[WS] Connected');
      this.reconnectDelay = INITIAL_RECONNECT_MS;
      this.useFallback = false;
      this.startPingPong();
      this.emit('connected');
    });

    this.ws.on('message', (raw: WebSocket.RawData) => {
      this.resetPongTimeout();
      const text = raw.toString().trim();
      if (!text) return; // empty heartbeat

      try {
        const msg: TzevaAdomMessage = JSON.parse(text);
        if (msg.type === 'ALERT' || msg.type === 'SYSTEM_MESSAGE') {
          this.emit('alert', msg);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message:', text.substring(0, 200));
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[WS] Error:', err.message);
      this.emit('error', err);
    });

    this.ws.on('close', (code: number) => {
      console.log(`[WS] Closed (code: ${code})`);
      this.cleanup();
      this.emit('disconnected', `Code: ${code}`);
      this.scheduleReconnect();
    });

    this.ws.on('pong', () => {
      this.resetPongTimeout();
    });
  }

  private startPingPong(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PING_INTERVAL_MS);

    this.resetPongTimeout();
  }

  private resetPongTimeout(): void {
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
    this.pongTimeout = setTimeout(() => {
      console.log('[WS] Pong timeout - reconnecting');
      this.ws?.terminate();
    }, PONG_TIMEOUT_MS);
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;

    console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_MULTIPLIER,
      MAX_RECONNECT_MS,
    );

    // After 3 failed attempts on primary, try fallback
    if (this.reconnectDelay > INITIAL_RECONNECT_MS * 4) {
      this.useFallback = !this.useFallback;
    }
  }
}
