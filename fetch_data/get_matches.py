import requests
import json
import os
import time
from collections import deque
from dotenv import load_dotenv
from tqdm import tqdm  # Progress bar

# Load API key from .env
load_dotenv()  # Load from current directory or parent
API_KEY = os.getenv("API-KEY")

# Riot ID: (GameName, TagLine)
RIOT_ID = ("Matt de Laur", "matt")

# API endpoints
BASE_URL_ACCOUNT = "https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id"
BASE_URL_MATCHES = "https://sea.api.riotgames.com/lol/match/v5/matches"

HEADERS = {"X-Riot-Token": API_KEY}

# Rate limit tracker
REQUEST_LOG = deque()

def rate_limited_request(method, url, **kwargs):
    """Riot API rate limits: 20 reqs/sec, 100 reqs/120s"""
    global REQUEST_LOG
    now = time.time()

    # Clean up old requests outside 120s
    while REQUEST_LOG and REQUEST_LOG[0] < now - 120:
        REQUEST_LOG.popleft()

    # Wait if over 100 requests in last 2 minutes
    while len(REQUEST_LOG) >= 100:
        wait_time = max(0, REQUEST_LOG[0] + 120 - now)
        print(f"[Rate Limit] Waiting {wait_time:.2f}s (100/120s)")
        time.sleep(wait_time)
        now = time.time()

    # Wait if over 20 requests in last 1 second
    recent = [t for t in REQUEST_LOG if t > now - 1]
    if len(recent) >= 20:
        wait_time = max(0, 1 - (now - recent[0]))
        print(f"[Rate Limit] Waiting {wait_time:.2f}s (20/1s)")
        time.sleep(wait_time)

    response = method(url, **kwargs)
    REQUEST_LOG.append(time.time())
    return response

def get_puuid():
    url = f"{BASE_URL_ACCOUNT}/{RIOT_ID[0]}/{RIOT_ID[1]}"
    response = rate_limited_request(requests.get, url, headers=HEADERS)
    response.raise_for_status()
    return response.json()["puuid"]

def get_match_ids(puuid, start=0, count=100):
    url = f"{BASE_URL_MATCHES}/by-puuid/{puuid}/ids"
    params = {"start": start, "count": count}
    response = rate_limited_request(requests.get, url, headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json()

def get_match_details(match_id):
    url = f"{BASE_URL_MATCHES}/{match_id}"
    response = rate_limited_request(requests.get, url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def get_existing_match_ids(folder="../matches"):
    if not os.path.exists(folder):
        os.makedirs(folder)
        return set()
    return set(f.replace(".json", "") for f in os.listdir(folder) if f.endswith(".json"))

def main():
    try:
        puuid = get_puuid()
        print(f"PUUID: {puuid}")

        existing_ids = get_existing_match_ids("../matches")
        print(f"Found {len(existing_ids)} existing match files.")

        start = 0
        count = 100
        total_downloaded = 0

        while True:
            match_ids = get_match_ids(puuid, start=start, count=count)
            if not match_ids:
                break

            for match_id in tqdm(match_ids, desc=f"Downloading from index {start}", unit="match"):
                if match_id in existing_ids:
                    continue

                try:
                    match_data = get_match_details(match_id)
                    with open(f"../matches/{match_id}.json", "w", encoding="utf-8") as f:
                        json.dump(match_data, f, indent=4)
                    existing_ids.add(match_id)
                    total_downloaded += 1
                except requests.RequestException as err:
                    print(f"[Error] Failed to fetch match {match_id}: {err}")

            start += count

        print(f"[SUCCESS] Downloaded {total_downloaded} new matches.")

    except requests.RequestException as e:
        print(f"[ERROR] API Error: {e}")

if __name__ == "__main__":
    main()
