# PikudAlexa

Open-source Alexa skill for real-time **Pikud HaOref** (Israel Home Front Command) rocket and missile alerts.

Get instant doorbell chime + spoken announcements on your Echo devices when alerts are detected in your area.

## Features

- **Real-time alerts** via TzevaAdom/Tzofar WebSocket (works worldwide, no Israeli server needed)
- **Multi-path delivery**: Virtual doorbell chime (~2-3s) + Voice Monkey TTS + Proactive Events
- **All alert types**: Rockets, hostile aircraft, terrorist infiltration, non-conventional missiles
- **Early warnings**: ~10 minute advance notice for long-range missile launches (e.g., from Iran)
- **All-clear notifications**: Know when it's safe to leave shelter
- **Web settings panel**: Choose your cities, configure alert preferences
- **Test button**: Verify your setup works before you need it
- **Open source**: Self-deploy to your own AWS account

## Architecture

```
[TzevaAdom WebSocket] → [Monitor Service] → [Alexa Doorbell + Voice Monkey + Proactive Events]
                              ↑
                     [Web Settings Panel]
```

The monitor connects to the TzevaAdom/Tzofar real-time alert feed, filters alerts by your configured cities, and pushes notifications through multiple Alexa channels simultaneously for the fastest possible delivery.

## Alert Types

| Type | Sound | Example Message |
|------|-------|----------------|
| **Early Warning** | Alert tone | "Early warning! Missile launches detected toward Israel. You may have about 10 minutes." |
| **Rocket Alert** | Doorbell chime + siren | "Red alert! Rockets and missiles in Salit. 90 seconds to shelter. Go now!" |
| **All Clear** | Gentle tone | "All clear. The alert has ended. You may leave the shelter." |

## Quick Start

### Prerequisites

- Node.js 20+
- An Amazon Developer account (free)
- An AWS account (free tier sufficient)
- ASK CLI (`npm install -g ask-cli`)

### 1. Clone and install

```bash
git clone https://github.com/yaniv1983/pikudalexa.git
cd pikudalexa
npm install
```

### 2. Find your city ID

```bash
node test-cities.js
```

Search for your city in the output. Note the ID number.

### 3. Configure

```bash
cp .env.example .env
# Edit .env with your city ID and credentials
```

### 4. Run the monitor

```bash
# Build
npm run build --workspace=packages/shared
npm run build --workspace=packages/monitor

# Run
npm start --workspace=packages/monitor
```

Or with Docker:

```bash
docker compose up -d
```

### 5. Deploy the Alexa skill

```bash
cd packages/skill
npm run build
ask deploy
```

### 6. Web settings panel

```bash
cd packages/web
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
packages/
├── shared/     # Types, threat mappings, message builder
├── monitor/    # WebSocket client, alert processor, dispatch channels
├── skill/      # Alexa Lambda handler (Custom + Smart Home)
└── web/        # Settings panel (Vite SPA)
```

## Important Notes

- **This is a supplementary system**, not a replacement for the official Pikud HaOref app or municipal sirens
- **Alexa has a nighttime limitation**: Announcements may be suppressed between 10 PM - 7 AM by Do Not Disturb mode
- **Latency**: Expect 3-7 seconds from alert publication to Alexa announcement
- **Internet required**: Unlike physical sirens, this system depends on your internet connection

## Supported Cities

All 1,449 cities and towns in Israel are supported, organized by 30 Pikud HaOref areas.

## License

MIT

## Contributing

Contributions welcome! Please open an issue or pull request.
