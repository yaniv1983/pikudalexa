# PikudAlexa

Open-source Alexa skill for real-time **Pikud HaOref** (Israel Home Front Command) rocket and missile alerts.

Your Echo devices chime instantly when alerts are detected in your area — rockets, hostile aircraft, early warnings, and more.

## How It Works

```
TzevaAdom WebSocket ──> Monitor Service ──> Alexa Event Gateway ──> Echo chimes (~3 sec)
   (real-time)           (always-on)         (DoorbellPress)
```

1. The **Monitor** connects to the [TzevaAdom/Tzofar](https://www.tzevaadom.co.il/) WebSocket feed — real-time Pikud HaOref alerts, works worldwide (no Israeli server needed)
2. When an alert matches your configured cities, it sends a **DoorbellPress** event to the Alexa Event Gateway
3. Your Echo devices **chime immediately** (~3 seconds latency)

## Features

- **Instant doorbell chime** on all Echo devices when alerts hit your area
- **All alert types**: rockets/missiles, hostile aircraft (UAVs), terrorist infiltration, non-conventional threats
- **Early warnings**: ~10 minute advance notice for long-range missile launches (e.g., from Iran)
- **All-clear notifications**: know when it's safe to leave shelter
- **1,449 cities** supported across all 30 Pikud HaOref areas
- **Voice commands**: "Alexa, open Pikud Alert" — check status, last alert, test
- **Auto token refresh**: Event Gateway tokens refresh automatically
- **Web settings panel**: choose cities, configure alert types, customize messages

## Alert Types

| Type | Trigger | What Happens |
|------|---------|-------------|
| Early Warning | `SYSTEM_MESSAGE` with launch detection keywords | Doorbell chime |
| Rocket/Missile Alert | `ALERT` threat 0 | Doorbell chime |
| Hostile Aircraft | `ALERT` threat 5 | Doorbell chime |
| Terrorist Infiltration | `ALERT` threat 2 | Doorbell chime |
| All Clear | `SYSTEM_MESSAGE` with "incident ended" keywords | Doorbell chime |

## Architecture

```
packages/
├── shared/          # Types, threat mappings, TTS message builder
├── monitor/         # Always-on service: WebSocket → alert processing → Alexa dispatch
│   ├── websocket-client.ts    # TzevaAdom connection with auto-reconnect
│   ├── alert-processor.ts     # Parse, deduplicate, filter by user cities
│   ├── alert-dispatcher.ts    # Fan-out to notification channels
│   ├── channels/
│   │   ├── doorbell.ts        # Alexa Event Gateway DoorbellPress (~3s)
│   │   ├── voice-monkey.ts    # Voice Monkey TTS announcements
│   │   └── proactive.ts       # Proactive Events API (fallback)
│   ├── token-refresh.ts       # Auto-refresh Event Gateway tokens
│   └── token-server.ts        # Receives tokens from Lambda after AcceptGrant
├── skill/           # Alexa Lambda (Custom + Smart Home hybrid)
│   ├── handlers/              # Voice intents + AcceptGrant + Discovery
│   └── skill-package/         # Skill manifest + interaction model
└── web/             # Settings panel (Vite SPA)
```

## Self-Deployment Guide

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **AWS account** (free tier is sufficient)
- **Amazon Developer account** (free)
- **A server** for the monitor (any Linux box, VPS, or Raspberry Pi)
- **ASK CLI**: `npm install -g ask-cli`

### Step 1: Clone and install

```bash
git clone https://github.com/yaniv1983/pikudalexa.git
cd pikudalexa
npm install
```

### Step 2: Find your city ID

```bash
node test-cities.js
```

Search the output for your city. Note the ID number and countdown time.

### Step 3: Create Amazon Developer & LWA Security Profile

1. Sign up at [developer.amazon.com](https://developer.amazon.com)
2. Go to [Login with Amazon](https://developer.amazon.com/lwa/sp/overview.html) → Create a Security Profile
3. Note the **Client ID** and **Client Secret**

### Step 4: Deploy the Alexa Skill

```bash
ask configure    # one-time: link your Amazon Developer + AWS accounts
cd packages/skill
npm run build
npx ask deploy
```

After deployment:
1. Go to the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Open your skill → **Build** → **Account Linking** → configure with your LWA credentials
3. Go to **Build** → **Permissions** → enable **"Send Alexa Events"**
4. Copy the **Alexa Client Id** and **Alexa Client Secret** from the Permissions page (these are different from LWA credentials!)
5. Add the Alexa redirect URLs to your LWA Security Profile's "Allowed Return URLs"

### Step 5: Add Smart Home trigger to Lambda

The Lambda needs permission to receive Smart Home directives:

```bash
aws lambda add-permission \
  --function-name YOUR_LAMBDA_FUNCTION_NAME \
  --statement-id alexa-smart-home-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-connectedhome.amazon.com \
  --event-source-token YOUR_SKILL_ID
```

Set Lambda environment variables:
- `ALEXA_CLIENT_ID` — Alexa Skill Messaging Client ID (from Permissions page)
- `ALEXA_CLIENT_SECRET` — Alexa Skill Messaging Client Secret
- `MONITOR_TOKEN_URL` — URL where your monitor receives tokens (e.g., `https://yourserver.com/pikudalexa/api/tokens`)
- `TOKEN_SECRET` — shared secret for token endpoint authentication

### Step 6: Configure and run the Monitor

```bash
cp .env.example .env
# Edit .env with your city ID and credentials
```

Key `.env` settings:
```
MONITOR_CITY_IDS=882          # Your city ID(s), comma-separated
ALEXA_REGION=NA               # NA, EU, or FE
ALEXA_CLIENT_ID=amzn1...      # Alexa Skill Messaging Client ID
ALEXA_CLIENT_SECRET=amzn1...  # Alexa Skill Messaging Client Secret
TOKEN_SECRET=...              # Must match Lambda's TOKEN_SECRET
```

Build and run:
```bash
npm run build --workspace=packages/shared
npm run build --workspace=packages/monitor
npm start --workspace=packages/monitor
```

Or with Docker:
```bash
docker compose up -d
```

Or as a systemd service:
```bash
sudo cp pikudalexa-monitor.service /etc/systemd/system/
sudo systemctl enable --now pikudalexa-monitor
```

### Step 7: Enable the Skill and Link Account

1. Open the **Alexa app** on your phone
2. Go to **More** → **Skills & Games** → **Your Skills** → **Dev**
3. Enable **Pikud Alert** → sign in with your Amazon account
4. The AcceptGrant flow will send tokens to your monitor
5. Alexa will discover the virtual doorbell device
6. Done! Your Echo will now chime on alerts in your area

### Step 8: Web Settings Panel (Optional)

```bash
cd packages/web
npm run dev
# Open http://localhost:3000
```

Or deploy the built files to any static hosting:
```bash
npm run build
# Upload dist/ to your web server
```

## Voice Commands

| Command | Response |
|---------|----------|
| "Alexa, open Pikud Alert" | Welcome + menu |
| "Alexa, ask Pikud Alert to check status" | Current alert status |
| "Alexa, ask Pikud Alert for the last alert" | Most recent alert |
| "Alexa, ask Pikud Alert to send a test alert" | Test drill preview |
| "Alexa, ask Pikud Alert how much time do I have" | Shelter countdown |
| "Alexa, ask Pikud Alert what cities am I monitoring" | Your cities |

## Important Notes

- **This is a supplementary system**, not a replacement for the official Pikud HaOref app or municipal sirens
- **Latency**: ~3 seconds from alert publication to Echo chime
- **Nighttime limitation**: Alexa may suppress doorbell announcements during Do Not Disturb hours (10 PM – 7 AM)
- **Internet required**: unlike physical sirens, this depends on your internet connection
- **Token refresh**: tokens auto-refresh every hour; if the monitor restarts, tokens persist on disk

## Data Source

Alerts come from the [TzevaAdom/Tzofar](https://www.tzevaadom.co.il/) WebSocket feed, which relays official Pikud HaOref alerts in real-time. The WebSocket works worldwide — no Israeli server or VPN needed. City data (1,449 cities) is bundled locally as a fallback when the REST API is Cloudflare-blocked.

## Contributing

Contributions welcome! Some ideas:
- Voice Monkey TTS integration for spoken alert details
- Multi-user support via DynamoDB
- Smart bulb integration (LIFX, Hue) for visual alerts
- Nighttime alerting workaround
- Localization (Hebrew, Arabic, Russian)

## License

MIT
