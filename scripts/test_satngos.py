import requests
import json

url = "https://network.satnogs.org/api/stations/"

response = requests.get(url, timeout=30)

print("Status:", response.status_code)

data = response.json()

print("Total stations returned:", len(data))

print("\nFirst station:\n")
print(json.dumps(data[0], indent=2))