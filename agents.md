# MRDE — Agent Instructions

## Project structure

Flat Python project (no packaging, no `__init__.py`). No tests framework; ad-hoc test scripts in `scripts/`.

## Setup

- Venv: `venv\Scripts\Activate.ps1`
- Install deps: `pip install -r requirements.txt`
- `.env` contains credentials (`SPACETRACK_EMAIL`, `SPACETRACK_PASSWORD`, `OPENROUTER_API_KEY`). `OPENROUTER_MODEL` defaults to `google/gemma-2-9b-it:free`.

## Path quirk

Directory `risk engine/` and file `risk engine/priority engine.py` contain spaces. **Always quote these paths** when running commands.

## Risk engine (`risk engine/`)

| File | Class | Method |
|---|---|---|
| `collision.py` | `CollisionRisk` | `calculate(collision_probability, min_range_m)` |
| `weather.py` | `SpaceWeatherRisk` | `calculate(kp_index, active_alert=False)` |
| `ground_segment.py` | `GroundSegmentRisk` | `calculate(future_obs, success_rate, status)` |
| `spacecraft_health.py` | `SpacecraftHealthRisk` | `calculate(battery_percentage, eclipse_duration, payload_utilization, solar_efficiency, temperature_state)` |
| `umrs.py` | `UMRS` | `calculate(collision_score, weather_score, ground_score, health_score)` |
| `priority engine.py` | `PriorityEngine` | `generate(collision_score, weather_score, ground_score, health_score)` |
| `recommendation.py` | `RecommendationEngine` | `generate(priority_list, umrs_result)` |

All `calculate` methods are `@staticmethod` and return `{"component": ..., "score": round(...)}`.

UMRS weights: collision 0.35, ground 0.25, health 0.25, weather 0.15.

Risk levels: `LOW` (<25), `MODERATE` (<50), `HIGH` (<75), `CRITICAL` (>=75).

## Recommendation engine

Uses OpenRouter API (Gemma 2 9B). Falls back to rule-based if `OPENROUTER_API_KEY` is empty. Use `RecommendationEngine.generate_fallback(priority_list, umrs_result)` for quick rule-based output without instantiating. Avoids non-ASCII chars (em dashes etc.) for cp1252 compat.

## Data files

All under `data/` — JSON files from Space-Track, NOAA, SatNOGS, and synthetic spacecraft telemetry. Pre-populated; data acquisition scripts in `scripts/` can re-fetch.

## Engine + CLI Dashboard

Two files at root:
- **`engine.py`** — Core engine. Loads risk modules via `importlib`, provides `default_state()`, `tick()`, `get_dashboard(sat_key, state)`, `compute_forecast(sat_key, state)`. Imports cleanly; designed for FastAPI wrapping later.
- **`cli_dashboard.py`** — Terminal UI. Run standalone: `python cli_dashboard.py`. Key controls: 1/2/3 select satellite, p pause, q quit. Uses `msvcrt` for keyboard.

### 3 curated satellites
Each showcases a different dominant risk (selector shows UMRS badge):
| Key | Name | Dominant | How |
|---|---|---|---|
| `sat1` | ISS (ZARYA) | Collision Risk | CDM pc=0.08, range=30m |
| `sat2` | COSMOS 2288 (GLONASS) | Spacecraft Health | Battery 10%, temp Critical |
| `sat3` | NOAA 19 | Ground Segment | Wallops offline, Santiago testing |

### 24h forecast
Projected forward from current state using scheduled events (CDM alerts, eclipse cycles, station status changes). Shows hourly UMRS + 4 component scores.

### Dynamic events
Scheduled events fire at sim time during `tick()` and mutate satellite state (cdms, health, station status). Priority queue reorders dynamically with ^/v arrows. Live events section shows recently fired events.

## No entrypoint

No `main.py` or pipeline runner. Each module is meant to be imported and called individually. No lint/typecheck config.
