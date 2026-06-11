import requests
import json
from pathlib import Path

# -------------------------------
# CONFIG
# -------------------------------

SATNOGS_URL = "https://network.satnogs.org/api/stations/"

OUTPUT_DIR = Path("data/satnogs")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

RAW_FILE = OUTPUT_DIR / "all_stations.json"
ONLINE_FILE = OUTPUT_DIR / "online_stations.json"

# -------------------------------
# FETCH DATA
# -------------------------------

print("Fetching SatNOGS stations...")

response = requests.get(
    SATNOGS_URL,
    timeout=60
)

response.raise_for_status()

stations = response.json()

print(f"Total stations fetched: {len(stations)}")

# -------------------------------
# SAVE RAW DATA
# -------------------------------

with open(RAW_FILE, "w", encoding="utf-8") as f:
    json.dump(
        stations,
        f,
        indent=2,
        ensure_ascii=False
    )

print(f"Saved raw data -> {RAW_FILE}")

# -------------------------------
# FILTER ONLINE STATIONS
# -------------------------------

online_stations = [
    station
    for station in stations
    if station.get("status") == "Online"
]

print(f"Online stations found: {len(online_stations)}")

# -------------------------------
# SAVE ONLINE DATA
# -------------------------------

with open(ONLINE_FILE, "w", encoding="utf-8") as f:
    json.dump(
        online_stations,
        f,
        indent=2,
        ensure_ascii=False
    )

print(f"Saved online stations -> {ONLINE_FILE}")

# -------------------------------
# SUMMARY
# -------------------------------

print("\nTop 10 busiest online stations:\n")

sorted_stations = sorted(
    online_stations,
    key=lambda x: x.get("future_observations", 0),
    reverse=True
)

for station in sorted_stations[:10]:

    print(
        f"{station['name'][:35]:35} "
        f"| Future Obs: {station.get('future_observations',0):3} "
        f"| Success: {station.get('success_rate',0):3}"
    )

print("\nDone.")