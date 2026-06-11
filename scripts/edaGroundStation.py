import json

with open("data/satnogs/online_stations.json", "r", encoding="utf-8") as f:
    stations = json.load(f)

future_obs = [
    s.get("future_observations", 0)
    for s in stations
]

print("Max:", max(future_obs))
print("Min:", min(future_obs))
print("Avg:", sum(future_obs)/len(future_obs))

future_obs_sorted = sorted(future_obs)

print("95th percentile:",
      future_obs_sorted[int(len(future_obs_sorted)*0.95)])

print("99th percentile:",
      future_obs_sorted[int(len(future_obs_sorted)*0.99)])