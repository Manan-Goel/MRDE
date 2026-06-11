import json
import random
from pathlib import Path

NUM_SATS = 100

satellites = []

for i in range(NUM_SATS):

    battery = random.randint(10, 100)

    satellite = {
        "satellite_id": f"SAT-{i+1:03d}",
        "battery_percentage": battery,
        "eclipse_duration_minutes": random.randint(5, 60),
        "payload_utilization": random.randint(20, 100),
        "solar_panel_efficiency": random.randint(60, 100),
        "temperature_status": random.choices(
            ["Nominal", "Warning", "Critical"],
            weights=[70, 20, 10]
        )[0],
        "communication_backlog_mb": random.randint(0, 100)
    }

    satellites.append(satellite)

output = {
    "satellites": satellites
}

Path("data/spacecraft").mkdir(
    parents=True,
    exist_ok=True
)

with open(
    "data/spacecraft/spacecraft_health.json",
    "w"
) as f:
    json.dump(output, f, indent=2)

print(
    f"Generated {NUM_SATS} spacecraft records"
)