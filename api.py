from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import (
    SAT_KEYS, SATELLITES, ACCEL, TICK_S,
    default_state, tick, get_sat_summaries, get_dashboard,
    compute_forecast, alert_summary, fmt_time, fmt_level,
)

app = FastAPI(title="MRDE Risk Engine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_state = default_state()


class TickRequest(BaseModel):
    ticks: int = 1


@app.get("/api/config")
def get_config():
    return {
        "acceleration": ACCEL,
        "tick_seconds_real": TICK_S,
        "sim_minutes_per_tick": TICK_S * ACCEL / 60.0,
        "satellite_keys": SAT_KEYS,
        "satellites": {k: {"name": v["name"], "label": v["label"]} for k, v in SATELLITES.items()},
    }


@app.get("/api/state")
def get_state():
    global _state
    summaries = get_sat_summaries(_state)
    return {
        "clock_min": _state["clock_min"],
        "clock_str": fmt_time(_state["clock_min"]),
        "kp_val": _state["kp_val"],
        "kp_idx": _state["kp_idx"],
        "alerts": _state["alerts"],
        "alert_summary": alert_summary(_state),
        "satellites": summaries,
    }


@app.post("/api/tick")
def do_tick(body: TickRequest):
    global _state
    for _ in range(body.ticks):
        _state = tick(_state)
    summaries = get_sat_summaries(_state)
    return {
        "clock_min": _state["clock_min"],
        "clock_str": fmt_time(_state["clock_min"]),
        "satellites": summaries,
    }


@app.post("/api/reset")
def do_reset():
    global _state
    _state = default_state()
    return {"status": "ok", "clock_str": fmt_time(_state["clock_min"])}


@app.get("/api/satellites")
def list_satellites():
    global _state
    return get_sat_summaries(_state)


@app.get("/api/satellites/{sat_key}")
def satellite_detail(sat_key: str):
    global _state
    if sat_key not in SAT_KEYS:
        raise HTTPException(404, f"Unknown satellite: {sat_key}")
    return get_dashboard(sat_key, _state)


@app.get("/api/satellites/{sat_key}/forecast")
def satellite_forecast(sat_key: str):
    global _state
    if sat_key not in SAT_KEYS:
        raise HTTPException(404, f"Unknown satellite: {sat_key}")
    profile = SATELLITES[sat_key]
    fc = compute_forecast(sat_key, _state)
    return {
        "sat_key": sat_key,
        "name": profile["name"],
        "hours": fc,
        "umrs_series": [p["umrs"] for p in fc],
        "collision_series": [p["collision"] for p in fc],
        "health_series": [p["health"] for p in fc],
        "ground_series": [p["ground"] for p in fc],
        "weather_series": [p["weather"] for p in fc],
    }
