# Quick Start Guide

## 🚀 One-Time Setup (5 minutes)

### 1. Install Dependencies
```bash
pip install requests python-dotenv tqdm
```

### 2. Add Your Riot API Key
Create `fetch_data/.env`:
```
API-KEY=your_api_key_here
```
Get your key from: https://developer.riotgames.com/

### 3. Done! You're ready to use the app.

---

## 📊 Daily Usage

### Update Data & View Stats

**Option A - Automated (Recommended):**
```bash
# Windows
update_data.bat

# Linux/Mac
./update_data.sh
```
This fetches:
1. Player data (ranked stats, champion mastery)
2. New match history
3. Updates match list

**Option B - Manual:**
```bash
cd fetch_data
python fetch_data.py        # Get player data
python get_matches.py        # Get new matches
python update_match_list.py  # Update match list
```

### View in Browser
```bash
python -m http.server 8000
```
Open: http://localhost:8000

---

## 📁 Project Structure

```
summoner-stats/
├── 🌐 index.html              Your stats dashboard
├── 📋 match_list.js            Auto-generated (297 matches)
├── ⚙️ update_data.bat/sh       Run this to update!
│
├── 📂 fetch_data/
│   ├── 🔑 .env                 Your API key (create this)
│   ├── 🐍 get_matches.py       Fetch new matches
│   └── 🐍 update_match_list.py Update match list
│
├── 📂 matches/                 297 match files
├── 📂 player-data/             Ranked stats & mastery
└── 📂 game-data/               Champion & item data
```

---

## ⚡ Common Tasks

| Task | Command |
|------|---------|
| **Update everything** | `update_data.bat` or `./update_data.sh` |
| **Start web server** | `python -m http.server 8000` |
| **Player data only** | `cd fetch_data && python fetch_data.py` |
| **New matches only** | `cd fetch_data && python get_matches.py` |
| **Update match list** | `cd fetch_data && python update_match_list.py` |

---

## 🔧 Troubleshooting

**"401 Unauthorized"**
→ Your API key expired. Get a new one and update `fetch_data/.env`

**"No such file or directory"**
→ Run scripts from `fetch_data/` directory

**"CORS policy blocked"**
→ Use a web server, don't open index.html directly

**Page shows no data**
→ Check `match_list.js` exists and `matches/` has files

---

## 📚 More Help

- **Setup:** See `SETUP.md` for detailed instructions
- **Development:** See `CLAUDE.md` for technical details
- **Audit Results:** See `AUDIT_SUMMARY.md` for what was fixed

**Current Status:** ✅ 297 matches ready to view!
