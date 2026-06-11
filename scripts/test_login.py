from spacetrack import SpaceTrackClient
from dotenv import load_dotenv
import os

load_dotenv()

st = SpaceTrackClient(
    identity=os.getenv("SPACETRACK_EMAIL"),
    password=os.getenv("SPACETRACK_PASSWORD")
)

result = st.cdm_public(
    limit=1,
    format="json"
)

print(type(result))
print(result[:500])