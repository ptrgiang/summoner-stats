#!/bin/bash

echo "=================================="
echo "Updating Summoner Stats Data"
echo "=================================="
echo ""

cd fetch_data

echo "[1/3] Fetching player data (ranked stats, champion mastery)..."
python fetch_data.py
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to fetch player data"
    exit 1
fi

echo ""
echo "[2/3] Fetching latest match data from Riot API..."
python get_matches.py
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to fetch match data"
    exit 1
fi

echo ""
echo "[3/3] Updating match list..."
python update_match_list.py
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to update match list"
    exit 1
fi

echo ""
echo "=================================="
echo "Update complete!"
echo "=================================="
echo ""
echo "To view your stats:"
echo "1. Run: python -m http.server 8000"
echo "2. Open: http://localhost:8000"
echo ""
