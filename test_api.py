import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL", "google/gemma-2-9b-it:free")
url = "https://openrouter.ai/api/v1/chat/completions"

print(f"Key: {api_key[:20]}..." if api_key else "NO KEY")
print(f"Model: {model}")
print(f"URL: {url}")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "You are a test."},
        {"role": "user", "content": "Say hello"}
    ],
    "temperature": 0.3,
    "max_tokens": 50
}

try:
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
except Exception as e:
    print(f"Error: {e}")
