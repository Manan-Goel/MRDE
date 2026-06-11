from anyio.streams import stapled
import os
import json
import requests
from dotenv import load_dotenv
from spacetrack import SpaceTrackClient

load_dotenv()

EMAIL = os.getenv("SPACETRACK_EMAIL")
PASSWORD = os.getenv("SPACETRACK_PASSWORD")

print("=" * 60)
print("TESTING SPACE-TRACK")
print("=" * 60)

try:
    st = SpaceTrackClient(
        identity=EMAIL,
        password=PASSWORD
    )

    print("✓ Space-Track Login Successful")

except Exception as e:
    print("✗ Space-Track Login Failed")
    print(e)
    exit()

# --------------------------------------------------
# ISS TLE
# --------------------------------------------------

print("\nFetching ISS TLE...")

try:
    data = st.gp(
        norad_cat_id=25544,
        orderby="EPOCH desc",
        limit=1,
        format="json"
    )

    if isinstance(data, str):
        data = json.loads(data)
    tle_json = data[0]

    print("✓ ISS TLE Retrieved")

    print("\nSatellite:")
    print(tle_json["OBJECT_NAME"])

    with open("iss_tle.json", "w") as f:
        json.dump(tle_json, f, indent=2)

except Exception as e:
    print("✗ Failed ISS TLE")
    print(e)

# --------------------------------------------------
# CDM
# --------------------------------------------------

print("\nFetching CDM Data...")

try:

    cdm = st.cdm_public(
        format="json",
        limit= 1
    )

    print(f"✓ Retrieved {len(cdm)} CDM Records")

    with open("cdm_data.json", "w") as f:
        json.dump(cdm[:10], f, indent=2)

except Exception as e:
    print("✗ Failed CDM Fetch")
    print(e)

# --------------------------------------------------
# NOAA KP
# --------------------------------------------------

print("\nFetching NOAA Kp Index...")

try:

    kp_url = (
        "https://services.swpc.noaa.gov/json/"
        "planetary_k_index_1m.json"
    )

    kp_data = requests.get(kp_url, timeout=30).json()

    latest_kp = kp_data[-1]

    print("✓ NOAA Kp Retrieved")

    print("\nLatest Kp:")
    print(latest_kp)

    with open("kp_index.json", "w") as f:
        json.dump(kp_data, f, indent=2)

except Exception as e:
    print("✗ NOAA Kp Failed")
    print(e)

# --------------------------------------------------
# NOAA ALERTS
# --------------------------------------------------

print("\nFetching NOAA Alerts...")

try:

    alert_url = (
        "https://services.swpc.noaa.gov/products/alerts.json"
    )

    alerts = requests.get(
        alert_url,
        timeout=30
    ).json()

    print("✓ NOAA Alerts Retrieved")

    print("\nRecent Alerts:")

    for alert in alerts[-5:]:
        print(alert)

    with open("noaa_alerts.json", "w") as f:
        json.dump(alerts, f, indent=2)

except Exception as e:
    print("✗ NOAA Alerts Failed")
    print(e)

print("\n")
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)