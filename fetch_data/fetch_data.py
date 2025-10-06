import requests
import json
import os
import time
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()  # Load from current directory or parent

# Configuration
API_KEY = os.getenv("API-KEY")
RIOT_ID = ("Matt de Laur", "matt")  # (GameName, TagLine)

# Riot API endpoints
BASE_URL_ACCOUNT = "https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id"
BASE_URL_LEAGUE = "https://vn2.api.riotgames.com/lol/league/v4/entries/by-puuid"
BASE_URL_CHAMPION_MASTERY = "https://vn2.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid"
BASE_URL_MATCHES = "https://sea.api.riotgames.com/lol/match/v5/matches"

HEADERS = {
    "X-Riot-Token": API_KEY
}

# Get PUUID by Riot ID
def get_puuid():
    url = f"{BASE_URL_ACCOUNT}/{RIOT_ID[0]}/{RIOT_ID[1]}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()["puuid"]

# Get ranked stats
def get_ranked_stats(puuid):
    url = f"{BASE_URL_LEAGUE}/{puuid}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

# Get champion mastery
def get_champion_mastery(puuid):
    url = f"{BASE_URL_CHAMPION_MASTERY}/{puuid}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

# Get match IDs (paginated)
def get_match_ids(puuid, start=0, count=100):
    url = f"{BASE_URL_MATCHES}/by-puuid/{puuid}/ids"
    params = {"start": start, "count": count}
    response = requests.get(url, headers=HEADERS, params=params)
    response.raise_for_status()
    return response.json()

# Get match details
def get_match_details(match_id):
    url = f"{BASE_URL_MATCHES}/{match_id}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

# Get already-downloaded match IDs
def get_existing_match_ids(folder="../matches"):
    if not os.path.exists(folder):
        os.makedirs(folder)
        return set()
    return set(f.replace(".json", "") for f in os.listdir(folder) if f.endswith(".json"))

# Main logic
def main():
    try:
        puuid = get_puuid()
        print(f"PUUID: {puuid}")

        # Save ranked stats
        print("Fetching ranked stats...")
        ranked_stats = get_ranked_stats(puuid)
        with open("../player-data/rankedInfo.json", "w", encoding="utf-8") as f:
            json.dump(ranked_stats, f, indent=4)
        print("Saved ranked stats.")
        time.sleep(1)

        # Save champion mastery
        print("Fetching champion mastery...")
        champion_mastery = get_champion_mastery(puuid)
        with open("../player-data/championMastery.json", "w", encoding="utf-8") as f:
            json.dump(champion_mastery, f, indent=4)
        print("Saved champion mastery.")
        time.sleep(1)

        # Download all match details
        # existing_ids = get_existing_match_ids("../matches")
        # print(f"Found {len(existing_ids)} existing match files.")
        
        # start = 0
        # count = 100
        # total_downloaded = 0

        # while True:
        #     match_ids = get_match_ids(puuid, start=start, count=count)
        #     if not match_ids:
        #         break  # No more matches
            
        #     for match_id in match_ids:
        #         if match_id in existing_ids:
        #             print(f"Skipping already downloaded match: {match_id}")
        #             continue

        #         print(f"Downloading match: {match_id}")
        #         match_details = get_match_details(match_id)

        #         file_path = f"../matches/{match_id}.json"
        #         with open(file_path, "w", encoding="utf-8") as f:
        #             json.dump(match_details, f, indent=4)
        #         print(f"Saved match to {file_path}")

        #         existing_ids.add(match_id)
        #         total_downloaded += 1
        #         time.sleep(1.5)  # Be nice to the API

        #     start += count  # Move to next page

        # print(f"[SUCCESS] Downloaded {total_downloaded} new matches.")

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] An error occurred: {e}")

if __name__ == "__main__":
    main()
