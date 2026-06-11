import requests

stations = requests.get("https://network.satnogs.org/api/stations/").json()

stations = sorted(
    stations,
    key=lambda x: x["future_observations"],
    reverse=True
)

for s in stations[:20]:
    print(
        s["name"],
        s["future_observations"],
        s["success_rate"],
        s["status"]
    )