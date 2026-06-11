"""
MRDE Simulation Engine — Core

Loads risk engine modules, provides 3 curated satellite scenarios,
risk calculations, priority/recommendation generation, and 24h forecast.
"""

import json
import os
import random
import importlib.util
from copy import deepcopy

BASE = os.path.dirname(os.path.abspath(__file__))
ENGINE_DIR = os.path.join(BASE, "risk engine")
DATA = os.path.join(BASE, "data")

# ── Import risk engine modules ──

def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

_CollisionRisk = _load("collision", os.path.join(ENGINE_DIR, "collision.py")).CollisionRisk
_SpaceWeather = _load("weather", os.path.join(ENGINE_DIR, "weather.py")).SpaceWeatherRisk
_GroundSegment = _load("ground", os.path.join(ENGINE_DIR, "ground_segment.py")).GroundSegmentRisk
_HealthRisk = _load("health", os.path.join(ENGINE_DIR, "spacecraft_health.py")).SpacecraftHealthRisk
_UMRS = _load("umrs", os.path.join(ENGINE_DIR, "umrs.py")).UMRS
_PriorityEngine = _load("priority", os.path.join(ENGINE_DIR, "priority engine.py")).PriorityEngine
_RecEngine = _load("recommend", os.path.join(ENGINE_DIR, "recommendation.py")).RecommendationEngine

# ── Load data ──

CDM_DATA = json.load(open(os.path.join(DATA, "cdm_data.json"), encoding="utf-8"))
KP_CYCLE = json.load(open(os.path.join(DATA, "kp_index.json"), encoding="utf-8"))
ALERTS_DATA = json.load(open(os.path.join(DATA, "noaa_alerts.json"), encoding="utf-8"))
HEALTH_ALL = json.load(open(os.path.join(DATA, "spacecraft", "spacecraft_health.json"), encoding="utf-8"))["satellites"]

STATIONS = [
    {"name": "Svalbard",  "future_obs": 394, "success_rate": 69, "status": "Online"},
    {"name": "Fairbanks", "future_obs": 226, "success_rate": 78, "status": "Online"},
    {"name": "Kourou",    "future_obs": 199, "success_rate": 66, "status": "Online"},
    {"name": "Wallops",   "future_obs": 139, "success_rate": 82, "status": "Online"},
    {"name": "Mauritius", "future_obs": 123, "success_rate": 51, "status": "Online"},
    {"name": "Santiago",  "future_obs": 45,  "success_rate": 73, "status": "Testing"},
]

# ── 3 Curated Satellite Profiles ──

SATELLITES = {
    "sat1": {
        "id": "SAT-001",
        "name": "ISS (ZARYA)",
        "label": "Collision Risk",
        "desc": "High-probability conjunction alert with debris",
        "health_idx": 0,
        "stations": ["Svalbard", "Wallops", "Mauritius"],
        "cdms": [{"pc": 0.08, "min_rng_m": 30.0}],
        "health_overrides": {},
        "events": [
            {"hour": 3, "type": "cdm", "data": {"pc": 0.25, "min_rng_m": 5.0}},
            {"hour": 8, "type": "cdm_resolve"},
            {"hour": 16, "type": "cdm", "data": {"pc": 0.12, "min_rng_m": 12.0}},
            {"hour": 22, "type": "cdm_resolve"},
        ],
    },
    "sat2": {
        "id": "SAT-005",
        "name": "COSMOS 2288 (GLONASS)",
        "label": "Spacecraft Health",
        "desc": "Critical battery and thermal stress before eclipse",
        "health_idx": 4,
        "stations": ["Fairbanks", "Kourou", "Svalbard"],
        "cdms": [{"pc": 0.0001, "min_rng_m": 2000.0}],
        "health_overrides": {"temperature_status": "Critical", "battery_percentage": 10},
        "events": [
            {"hour": 2, "type": "eclipse_start", "data": {"battery_drop": -25, "eclipse_add": 20}},
            {"hour": 6, "type": "temp_spike", "data": "Critical"},
            {"hour": 10, "type": "battery_critical", "data": {"battery_set": 3}},
            {"hour": 14, "type": "eclipse_end", "data": {"battery_add": 15, "eclipse_sub": 20}},
            {"hour": 20, "type": "battery_recover", "data": {"battery_set": 12}},
        ],
    },
    "sat3": {
        "id": "SAT-010",
        "name": "NOAA 19",
        "label": "Ground Segment",
        "desc": "Multiple ground stations offline or in testing",
        "health_idx": 9,
        "stations": ["Wallops", "Santiago", "Fairbanks"],
        "cdms": [{"pc": 0.0001, "min_rng_m": 2000.0}],
        "health_overrides": {},
        "events": [
            {"hour": 0, "type": "station_status", "station": "Wallops", "status": "Offline"},
            {"hour": 0, "type": "station_status", "station": "Santiago", "status": "Testing"},
            {"hour": 5, "type": "station_status", "station": "Fairbanks", "status": "Offline"},
            {"hour": 11, "type": "station_status", "station": "Wallops", "status": "Online"},
            {"hour": 19, "type": "station_status", "station": "Fairbanks", "status": "Online"},
        ],
    },
}

SAT_KEYS = ["sat1", "sat2", "sat3"]

ACCEL = 60
TICK_S = 2.0
SIM_MIN_PER_TICK = TICK_S * ACCEL / 60.0

# ── Helpers ──

def _get_health(sat_key):
    profile = SATELLITES[sat_key]
    h = deepcopy(HEALTH_ALL[profile["health_idx"]])
    h.update(profile.get("health_overrides", {}))
    return h

def _station_ground(sat_key, station_states):
    profile = SATELLITES[sat_key]
    pool = [s for s in STATIONS if s["name"] in profile["stations"]]
    obs = 0
    rate_sum = 0
    online = 0
    testing = 0
    for s in pool:
        st = station_states.get(s["name"], "Online")
        if st == "Online":
            obs += s["future_obs"]
            rate_sum += s["success_rate"]
            online += 1
        elif st == "Testing":
            testing += 1
    if online > 0:
        return obs, rate_sum / online, "Online"
    elif testing > 0:
        return 0, 0, "Testing"
    return 0, 0, "Offline"

# ── Event processing ──

def _apply_event(evt, sat_state):
    """Apply a profile event to live satellite state. Returns description string."""
    desc = ""
    if evt["type"] == "cdm":
        sat_state["cdms"].append(evt["data"])
        d = evt["data"]
        desc = f"CDM alert: pc={d['pc']}, range={d['min_rng_m']}m"
    elif evt["type"] == "cdm_resolve":
        sat_state["cdms"].clear()
        desc = "CDM resolved, no further risk"
    elif evt["type"] == "temp_spike":
        sat_state["health"]["temperature_status"] = evt["data"]
        desc = f"Temperature spiked to {evt['data']}"
    elif evt["type"] == "eclipse_start":
        d = evt["data"]
        sat_state["health"]["battery_percentage"] = max(0, sat_state["health"]["battery_percentage"] + d["battery_drop"])
        sat_state["health"]["eclipse_duration_minutes"] += d["eclipse_add"]
        desc = f"Eclipse start: battery {d['battery_drop']}%, eclipse +{d['eclipse_add']}min"
    elif evt["type"] == "eclipse_end":
        d = evt["data"]
        sat_state["health"]["battery_percentage"] = min(100, sat_state["health"]["battery_percentage"] + d["battery_add"])
        sat_state["health"]["eclipse_duration_minutes"] = max(0, sat_state["health"]["eclipse_duration_minutes"] - d["eclipse_sub"])
        desc = f"Eclipse end: battery +{d['battery_add']}%, eclipse -{d['eclipse_sub']}min"
    elif evt["type"] == "battery_critical":
        sat_state["health"]["battery_percentage"] = evt["data"]["battery_set"]
        desc = f"Battery dropped to {evt['data']['battery_set']}%"
    elif evt["type"] == "battery_recover":
        sat_state["health"]["battery_percentage"] = evt["data"]["battery_set"]
        desc = f"Battery recovering to {evt['data']['battery_set']}%"
    elif evt["type"] == "station_status":
        old = sat_state["stations"].get(evt["station"], "Online")
        sat_state["stations"][evt["station"]] = evt["status"]
        desc = f"Station {evt['station']}: {old} -> {evt['status']}"
    return desc

# ── Core calculations ──

def compute_scores(sat_key, kp, cdms, health, station_states, has_alerts):
    if cdms:
        worst = max(cdms, key=lambda c: c["pc"])
        cr = _CollisionRisk.calculate(worst["pc"], worst["min_rng_m"])["score"]
    else:
        cr = 0.0

    wr = _SpaceWeather.calculate(kp, has_alerts)["score"]
    obs, rate, st = _station_ground(sat_key, station_states)
    gr = _GroundSegment.calculate(obs, rate, st)["score"]
    hr = _HealthRisk.calculate(
        health["battery_percentage"],
        health["eclipse_duration_minutes"],
        health["payload_utilization"],
        health["solar_panel_efficiency"],
        health["temperature_status"],
    )["score"]
    umrs = _UMRS.calculate(cr, wr, gr, hr)

    return {
        "collision": round(cr, 1),
        "weather": round(wr, 1),
        "ground": round(gr, 1),
        "health": round(hr, 1),
        "umrs": round(umrs["umrs"], 1),
        "level": umrs["level"],
    }


def compute_priority(scores):
    return _PriorityEngine.generate(
        scores["collision"], scores["weather"],
        scores["ground"], scores["health"],
    )


def compute_recommendations(priority_list, umrs_result):
    return _RecEngine.generate_fallback(priority_list, umrs_result)


def compute_forecast(sat_key, state):
    profile = SATELLITES[sat_key]
    # Always project from initial profile state for consistent 24h view
    health = _get_health(sat_key)
    station_states = {s: "Online" for s in profile["stations"]}
    cdms = deepcopy(profile.get("cdms", []))
    kp = state["kp_val"]

    # Apply hour-0 events (same as init)
    for evt in profile["events"]:
        if evt["hour"] == 0:
            if evt["type"] == "cdm":
                cdms.append(evt["data"])
            elif evt["type"] == "station_status":
                station_states[evt["station"]] = evt["status"]

    points = []
    for hour in range(24):
        for evt in profile["events"]:
            if evt["hour"] != hour:
                continue
            if evt["type"] == "cdm":
                cdms.append(evt["data"])
            elif evt["type"] == "cdm_resolve":
                cdms.clear()
            elif evt["type"] == "temp_spike":
                health["temperature_status"] = evt["data"]
            elif evt["type"] == "eclipse_start":
                health["battery_percentage"] = max(0, health["battery_percentage"] + evt["data"]["battery_drop"])
                health["eclipse_duration_minutes"] += evt["data"]["eclipse_add"]
            elif evt["type"] == "eclipse_end":
                health["battery_percentage"] = min(100, health["battery_percentage"] + evt["data"]["battery_add"])
                health["eclipse_duration_minutes"] = max(0, health["eclipse_duration_minutes"] - evt["data"]["eclipse_sub"])
            elif evt["type"] == "battery_critical":
                health["battery_percentage"] = evt["data"]["battery_set"]
            elif evt["type"] == "battery_recover":
                health["battery_percentage"] = evt["data"]["battery_set"]
            elif evt["type"] == "station_status":
                station_states[evt["station"]] = evt["status"]

        kp_drift = max(0, min(9, kp + random.uniform(-0.3, 0.3)))
        if random.random() < 0.03:
            kp_drift = min(9, kp_drift + random.uniform(1, 2.5))
        kp = kp_drift

        sc = compute_scores(sat_key, kp, cdms, health, station_states, False)
        sc["hour"] = hour
        evt_labels = []
        for e in profile["events"]:
            if e["hour"] == hour:
                lbl = e["type"].replace("_", " ").title()
                if "station" in e["type"] and "station" in e:
                    lbl += f" ({e['station']})"
                evt_labels.append(lbl)
        sc["events"] = evt_labels
        points.append(sc)
    return points


def get_sat_summaries(state):
    raw = []
    for k in SAT_KEYS:
        p = SATELLITES[k]
        ss = state["satellites"][k]
        cdms = ss["cdms"]
        if cdms:
            worst = max(cdms, key=lambda c: c["pc"])
            cr = _CollisionRisk.calculate(worst["pc"], worst["min_rng_m"])["score"]
        else:
            cr = 0.0
        wr = _SpaceWeather.calculate(state["kp_val"], len(state["alerts"]) > 0)["score"]
        obs, rate, st = _station_ground(k, ss["stations"])
        gr = _GroundSegment.calculate(obs, rate, st)["score"]
        hr = _HealthRisk.calculate(
            ss["health"]["battery_percentage"],
            ss["health"]["eclipse_duration_minutes"],
            ss["health"]["payload_utilization"],
            ss["health"]["solar_panel_efficiency"],
            ss["health"]["temperature_status"],
        )["score"]
        umrs = _UMRS.calculate(cr, wr, gr, hr)
        raw.append({
            "key": k,
            "name": p["name"],
            "label": p["label"],
            "desc": p["desc"],
            "umrs": round(umrs["umrs"], 1),
            "level": umrs["level"],
            "collision": round(cr, 1),
            "weather": round(wr, 1),
            "ground": round(gr, 1),
            "health": round(hr, 1),
        })

    # Compute priority rank: critical first, then UMRS descending
    ranked = sorted(raw, key=lambda x: (x["level"] != "CRITICAL", -x["umrs"]))
    for i, r in enumerate(ranked, 1):
        r["priority"] = i

    # Detect movement vs previous tick
    prev = state.get("prev_priority_keys", [])
    current_keys = [r["key"] for r in ranked]
    for r in ranked:
        if not prev or r["key"] not in prev:
            r["movement"] = None
        else:
            old_pos = prev.index(r["key"])
            new_pos = current_keys.index(r["key"])
            if old_pos > new_pos:
                r["movement"] = "up"
            elif old_pos < new_pos:
                r["movement"] = "down"
            else:
                r["movement"] = None
    state["prev_priority_keys"] = current_keys

    return raw


def get_dashboard(sat_key, state):
    ss = state["satellites"][sat_key]
    scores = compute_scores(
        sat_key, state["kp_val"], ss["cdms"],
        ss["health"], ss["stations"],
        len(state["alerts"]) > 0,
    )
    priority = compute_priority(scores)
    umrs_result = {"umrs": scores["umrs"], "level": scores["level"]}
    recs = compute_recommendations(priority, umrs_result)
    forecast = compute_forecast(sat_key, state)

    summaries = get_sat_summaries(state)
    movement = None
    for s in summaries:
        if s["key"] == sat_key:
            movement = s.get("movement")
            break

    return {
        "sat_key": sat_key,
        "profile": SATELLITES[sat_key],
        "scores": scores,
        "priority": priority,
        "recommendations": recs,
        "forecast": forecast,
        "health": ss["health"],
        "stations": ss["stations"],
        "cdms": ss["cdms"],
        "movement": movement,
        "recent_events": ss.get("recent_events", []),
        "all_summaries": summaries,
    }


# ── Sim state management ──

def default_state():
    state = {
        "clock_min": 0.0,
        "kp_idx": 3,
        "kp_val": KP_CYCLE[3]["kp_index"],
        "alerts": [],
        "prev_priority_keys": [],
        "satellites": {},
    }
    for k in SAT_KEYS:
        p = SATELLITES[k]
        health = _get_health(k)
        station_states = {s: "Online" for s in p["stations"]}
        cdms = deepcopy(p.get("cdms", []))
        sat_state = {
            "health": health,
            "stations": station_states,
            "cdms": cdms,
            "processed_events": set(),
            "recent_events": [],
        }
        # Pre-fire hour-0 events so initial state is correct
        for idx, evt in enumerate(p["events"]):
            if evt["hour"] == 0:
                _apply_event(evt, sat_state)
                sat_state["processed_events"].add(idx)
                if evt["type"] == "station_status":
                    sat_state["recent_events"].append(f"Station {evt['station']} -> {evt['status']}")
        state["satellites"][k] = sat_state
    return state


def tick(state):
    state["clock_min"] += SIM_MIN_PER_TICK
    current_hour = int(state["clock_min"] / 60)

    for k in SAT_KEYS:
        p = SATELLITES[k]
        sat_state = state["satellites"][k]
        for idx, evt in enumerate(p["events"]):
            if idx in sat_state["processed_events"]:
                continue
            if evt["hour"] <= current_hour:
                sat_state["processed_events"].add(idx)
                desc = _apply_event(evt, sat_state)
                if desc:
                    lbl = evt["type"].replace("_", " ").title()
                    if "station" in evt.get("type", ""):
                        sat_state["recent_events"].append(f"h{current_hour} Station {evt['station']}: {evt['status']}")
                    else:
                        sat_state["recent_events"].append(f"h{current_hour} {lbl}")
                    # Keep last 6 events
                    if len(sat_state["recent_events"]) > 6:
                        sat_state["recent_events"] = sat_state["recent_events"][-6:]

    drift = random.choices([-1, 0, 0, 1], weights=[1, 5, 5, 1])[0]
    if drift != 0:
        ni = max(0, min(state["kp_idx"] + drift, len(KP_CYCLE) - 1))
        if ni != state["kp_idx"]:
            state["kp_idx"] = ni
            state["kp_val"] = KP_CYCLE[ni]["kp_index"]

    if random.random() < 0.06 and ALERTS_DATA:
        a = random.choice(ALERTS_DATA)
        if a not in state["alerts"]:
            state["alerts"].append(a)
    if state["alerts"] and random.random() < 0.08:
        state["alerts"].pop(0)

    return state


def alert_summary(state):
    if not state["alerts"]:
        return "None"
    w = sum(1 for a in state["alerts"] if "WARNING" in a.get("message", "").upper())
    a = sum(1 for a in state["alerts"] if "ALERT" in a.get("message", "").upper())
    parts = []
    if w: parts.append(f"{w}W")
    if a: parts.append(f"{a}A")
    return "+".join(parts) if parts else "Active"


def fmt_time(minutes):
    h = int(minutes // 60)
    m = int(minutes % 60)
    return f"{h:02d}h {m:02d}m"


def fmt_level(lvl):
    return {"CRITICAL": "CRIT", "HIGH": "HIGH", "MODERATE": "MOD", "LOW": "LOW"}.get(lvl, lvl)
