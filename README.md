# MRDE — Mission Risk & Decision Engine

A real-time satellite mission risk simulation engine. Computes collision, weather, ground segment, and spacecraft health risks across 3 curated satellite scenarios, generates AI-powered operational recommendations, and displays everything through a live CLI dashboard or REST API.

## Features

- **Risk Computation** — 4 risk modules + UMRS (Unified Mission Risk Score) with configurable weights
- **3 Curated Satellites** — Each showcases a different dominant risk profile (ISS: collision, COSMOS: health, NOAA: ground)
- **Live Simulation** — Dynamic event system (CDMs, eclipses, station outages) fires at sim time and reorders the priority queue with ^/v arrows
- **AI Recommendations** — AI-powered explanation cards via OpenRouter (falls back to rule-based when offline)
- **24h Forecast** — Projected risk timeline showing UMRS + all 4 component scores with scheduled event markers
- **REST API** — FastAPI backend ready for frontend integration (CORS enabled)
- **Terminal Dashboard** — Runs in plain console (no curses/rich), cp1252-safe

## Architecture

```
MRDE/
├── engine.py           ← Core simulation engine
├── cli_dashboard.py    ← Terminal UI
├── api.py              ← FastAPI REST wrapper
├── risk engine/        ← Scoring modules
│   ├── collision.py
│   ├── weather.py
│   ├── ground_segment.py
│   ├── spacecraft_health.py
│   ├── umrs.py
│   ├── priority engine.py
│   └── recommendation.py
├── data/               ← JSON telemetry and event data
└── scripts/            ← Data acquisition utilities
```

Scoring pipeline:
```
Raw telemetry → Risk modules → 4 scores + UMRS → PriorityEngine → Recommendations
```

UMRS weights: `collision 0.35, ground 0.25, health 0.25, weather 0.15`

Risk levels: `LOW < 25 < MODERATE < 50 < HIGH < 75 < CRITICAL`

## Quick Start

### Setup

```bash
git clone <repo-url>
cd MRDE
python -m venv venv

# Windows
venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct
```

> OpenRouter API key enables AI-generated recommendations. Without it, the engine uses a built-in rule-based fallback.

### Run

**Terminal Dashboard:**
```bash
python cli_dashboard.py
```
Controls: `1/2/3` select satellite, `p` pause, `q` quit

**REST API:**
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```
Open `http://localhost:8000/docs` for interactive Swagger docs.

## API

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Simulation configuration (ACCEL, tick speed, satellite metadata) |
| `GET` | `/api/state` | Full sim state — clock, Kp, alerts, all 3 satellite summaries with movement arrows |
| `POST` | `/api/tick` | Advance simulation by N ticks (default 1) |
| `POST` | `/api/reset` | Reset to t=0 |
| `GET` | `/api/satellites` | All 3 satellite summaries |
| `GET` | `/api/satellites/{key}` | Full dashboard — scores, priority, AI recommendations, forecast, health, stations, CDMs, events |
| `GET` | `/api/satellites/{key}/forecast` | 24-hour forecast with series arrays for charting |

### Satellite Keys

| Key | Name | Dominant Risk | Trigger |
|-----|------|---------------|---------|
| `sat1` | ISS (ZARYA) | Collision | CDM pc=0.08, range=30m |
| `sat2` | COSMOS 2288 (GLONASS) | Spacecraft Health | Battery 10%, temp Critical |
| `sat3` | NOAA 19 | Ground Segment | Wallops offline, Santiago testing |

### Example: Fetch Dashboard

```bash
curl http://localhost:8000/api/satellites/sat1
```

Response includes `scores`, `priority` (ranked component list), `recommendations` (AI cards), `forecast` (24 data points), `health`, `stations`, `cdms`, `recent_events`, and `movement`.

### Example: Advance Simulation

```bash
curl -X POST http://localhost:8000/api/tick \
  -H "Content-Type: application/json" \
  -d '{"ticks": 30}'
```

30 ticks = 1 sim hour (at 60x acceleration).

### Deployment

**Railway (recommended):**
Push to GitHub → Create Railway project from repo → Railway auto-detects the `Procfile`.

Public URL: `https://your-project.up.railway.app`

**Local network:**
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```
Access at `http://<YOUR_LAN_IP>:8000/docs`.

## Satellite Events

Each satellite has scheduled events that fire during `tick()`:

| Hour | Event | Effect |
|------|-------|--------|
| h3 | ISS CDM | Collision risk spikes |
| h8 | ISS Resolve | ISS drops from #1 in priority queue |
| h2 | COSMOS Eclipse | Battery degrades, health score rises |
| h10 | COSMOS Battery Critical | Health peaks, COSMOS stays #1 |
| h14 | COSMOS Eclipse End | Battery recovers |
| h5 | NOAA Fairbanks Offline | Ground segment spikes |
| h11 | NOAA Wallops Online | Partial recovery |

Events mutate real satellite state (not just display), so the priority queue reorders dynamically.

## Project Structure

```
MRDE/
├── engine.py              # Core simulation engine
├── cli_dashboard.py       # Terminal UI dashboard
├── api.py                 # FastAPI REST API
├── Procfile               # Railway deployment config
├── requirements.txt       # Python dependencies
├── data/                  # JSON telemetry files
├── risk engine/           # Risk scoring modules
│   ├── collision.py
│   ├── weather.py
│   ├── ground_segment.py
│   ├── spacecraft_health.py
│   ├── umrs.py            # Unified Mission Risk Score
│   ├── priority engine.py # Risk ranking
│   └── recommendation.py  # AI + fallback recommendations
└── scripts/               # Data acquisition utilities
```

## Tech Stack

- **Python 3.11** — Core engine
- **FastAPI** — REST API layer
- **OpenRouter** — AI recommendation generation
- **Railway** — Deployment
- **JSON** — Static telemetry data (no live API calls during demo)
