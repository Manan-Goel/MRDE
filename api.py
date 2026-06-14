import threading
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import (
    SAT_KEYS, SATELLITES, ACCEL, TICK_S,
    default_state, tick, get_sat_summaries, get_dashboard,
    compute_forecast, alert_summary, fmt_time, fmt_level,
    _resolve_alert,
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
_state_lock = threading.Lock()


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
    with _state_lock:
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
    with _state_lock:
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
    with _state_lock:
        _state = default_state()
        return {"status": "ok", "clock_str": fmt_time(_state["clock_min"]), "alerts_reset": True}


@app.get("/api/satellites")
def list_satellites():
    global _state
    with _state_lock:
        return get_sat_summaries(_state)


@app.get("/api/satellites/{sat_key}")
def satellite_detail(sat_key: str):
    global _state
    if sat_key not in SAT_KEYS:
        raise HTTPException(404, f"Unknown satellite: {sat_key}")
    with _state_lock:
        return get_dashboard(sat_key, _state)


@app.get("/api/alerts")
def list_alerts():
    global _state
    with _state_lock:
        active = [a for a in _state["alerts"] if not a.get("resolved", False)]
        resolved = [a for a in _state["alerts"] if a.get("resolved", False)]
        return {"alerts": _state["alerts"], "active": active, "resolved": resolved}


@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    global _state
    with _state_lock:
        _resolve_alert(_state, alert_id)
        return {"status": "ok", "alert_id": alert_id}


@app.get("/api/satellites/{sat_key}/forecast")
def satellite_forecast(sat_key: str):
    global _state
    if sat_key not in SAT_KEYS:
        raise HTTPException(404, f"Unknown satellite: {sat_key}")
    with _state_lock:
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
