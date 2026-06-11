import os
import json
from datetime import datetime
from dotenv import load_dotenv
from spacetrack import SpaceTrackClient

# ==================================================
# CONFIG
# ==================================================

load_dotenv()

EMAIL = os.getenv("SPACETRACK_EMAIL")
PASSWORD = os.getenv("SPACETRACK_PASSWORD")

OUTPUT_FILE = "data/cdm_data.json"

MAX_RECORDS = 200

# ==================================================
# CONNECT
# ==================================================

print("Connecting to Space-Track...")

st = SpaceTrackClient(
    identity=EMAIL,
    password=PASSWORD
)

print("Connected successfully")

# ==================================================
# FETCH RAW CDMS
# ==================================================

print(f"\nFetching {MAX_RECORDS} CDMs...")

raw_result = st.cdm_public(
    limit=MAX_RECORDS,
    format="json"
)

records = json.loads(raw_result)

print(f"Fetched {len(records)} raw records")

# ==================================================
# PARSE RECORDS
# ==================================================

parsed_records = []

for record in records:

    try:

        # ------------------------------------------
        # Collision Probability
        # ------------------------------------------

        pc_raw = record.get("PC")

        if pc_raw is None:
            pc = 0.0
        else:
            try:
                pc = float(pc_raw)
            except:
                pc = 0.0

        # ------------------------------------------
        # Minimum Range
        # ------------------------------------------

        min_rng_raw = record.get("MIN_RNG")

        if min_rng_raw is None:
            min_rng = 0.0
        else:
            try:
                min_rng = float(min_rng_raw)
            except:
                min_rng = 0.0

        # ------------------------------------------
        # Hours To TCA
        # ------------------------------------------

        tca_str = record.get("TCA")

        hours_to_tca = None

        if tca_str:

            try:

                tca_dt = datetime.fromisoformat(
                    tca_str.replace("Z", "")
                )

                hours_to_tca = round(
                    (
                        tca_dt - datetime.utcnow()
                    ).total_seconds() / 3600,
                    2
                )

            except:
                hours_to_tca = None

        # ------------------------------------------
        # Build MRDE Record
        # ------------------------------------------

        parsed_record = {

            "cdm_id":
                record.get("CDM_ID"),

            "created":
                record.get("CREATED"),

            "emergency_reportable":
                (
                    record.get(
                        "EMERGENCY_REPORTABLE"
                    ) == "Y"
                ),

            "sat_1_id":
                record.get("SAT_1_ID"),

            "sat_1_name":
                record.get("SAT_1_NAME"),

            "sat_1_type":
                record.get("SAT1_OBJECT_TYPE"),

            "sat_2_id":
                record.get("SAT_2_ID"),

            "sat_2_name":
                record.get("SAT_2_NAME"),

            "sat_2_type":
                record.get("SAT2_OBJECT_TYPE"),

            "tca":
                tca_str,

            "hours_to_tca":
                hours_to_tca,

            "pc":
                pc,

            "min_rng_m":
                min_rng
        }

        parsed_records.append(
            parsed_record
        )

    except Exception as e:

        print(
            f"Skipped record: {e}"
        )

# ==================================================
# SORT
# ==================================================

parsed_records.sort(
    key=lambda x: (
        -x["pc"],
        x["min_rng_m"]
    )
)

# ==================================================
# SAVE
# ==================================================

os.makedirs(
    "data",
    exist_ok=True
)

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        parsed_records,
        f,
        indent=2
    )

print(
    f"\nSaved {len(parsed_records)} records"
)

# ==================================================
# SUMMARY
# ==================================================

print("\nTop 5 Collision Events:\n")

for item in parsed_records[:5]:

    print(
        f"PC={item['pc']:.8f} | "
        f"Range={item['min_rng_m']} m | "
        f"{item['sat_1_name']} ↔ {item['sat_2_name']}"
    )

print(
    f"\nOutput saved to: {OUTPUT_FILE}"
)