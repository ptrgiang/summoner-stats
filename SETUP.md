# Setup Guide

This guide will help you set up and run the Summoner Stats application.

## Prerequisites

- **Python 3.8+** with pip
- **Web browser** (Chrome, Firefox, Edge, etc.)
- **Riot API Key** from [Riot Developer Portal](https://developer.riotgames.com/)

## Initial Setup

### 1. Install Python Dependencies

```bash
pip install requests python-dotenv tqdm
```

### 2. Configure API Key

1. Get your Riot API key from https://developer.riotgames.com/
2. Create a `.env` file in the `fetch_data/` directory:

```bash
cd fetch_data
```

Create `.env` file with:
```
API-KEY=your_riot_api_key_here
```

**Note:** Development API keys expire after 24 hours. You'll need to renew them daily.

### 3. Fetch Initial Data

Run the full data fetch (this will take several minutes):

```bash
# From the fetch_data directory
python fetch_data.py

# Then update the match list
python update_match_list.py
```

Or use the automated script from the root directory:

**Windows:**
```cmd
update_data.bat
```

**Linux/Mac:**
```bash
chmod +x update_data.sh
./update_data.sh
```

### 4. Start the Web Server

From the project root directory:

```bash
python -m http.server 8000
```

Or with Node.js:
```bash
npx http-server
```

### 5. Open in Browser

Navigate to: `http://localhost:8000`

You should see your Summoner Stats dashboard!

## Regular Updates

To fetch the latest matches:

1. **Renew your API key** (if expired) in `fetch_data/.env`
2. **Run the update script:**
   - Windows: `update_data.bat`
   - Linux/Mac: `./update_data.sh`
3. **Refresh your browser** to see new matches

## Project Structure

```
summoner-stats/
├── index.html              # Main web application
├── match_list.js           # Generated list of match files
├── update_data.bat         # Windows update script
├── update_data.sh          # Linux/Mac update script
├── fetch_data/
│   ├── .env               # API key (YOU CREATE THIS)
│   ├── fetch_data.py      # Full data fetch script
│   ├── get_matches.py     # Incremental match updates
│   └── update_match_list.py # Match list generator
├── matches/               # Match JSON files (auto-generated)
├── player-data/           # Player stats (auto-generated)
│   ├── rankedInfo.json
│   └── championMastery.json
├── game-data/             # Static League data
│   ├── champion.json
│   ├── item.json
│   ├── gameModes.json
│   └── gameTypes.json
└── ranked-emblems/        # Rank badge images
```

## Customization

To track a different summoner, edit `fetch_data/fetch_data.py` and `fetch_data/get_matches.py`:

```python
RIOT_ID = ("GameName", "TagLine")  # Replace with desired summoner
```

Then run the full data fetch again.

## Troubleshooting

### API Key Issues
- **Error: 401 Unauthorized**
  - Your API key has expired (development keys last 24 hours)
  - Get a new key from https://developer.riotgames.com/
  - Update `fetch_data/.env` with the new key

### Path Issues
- **Error: No such file or directory**
  - Always run scripts from the `fetch_data/` directory
  - Or use the provided `update_data.bat/.sh` scripts

### CORS Errors
- **Error: CORS policy blocked**
  - Never open `index.html` directly (file://)
  - Always use a web server: `python -m http.server 8000`

### No Data Showing
- Check that `match_list.js` exists in the root directory
- Verify `matches/` directory contains JSON files
- Check browser console for errors (F12)

## Tips

- **Rate limiting:** The scripts automatically respect Riot's API rate limits
- **Incremental updates:** `get_matches.py` only downloads new matches
- **Full refresh:** Use `fetch_data.py` to re-fetch all data including ranked stats
- **Data persistence:** All data is stored locally in JSON files

## Support

For issues or questions, refer to:
- [Riot API Documentation](https://developer.riotgames.com/docs/lol)
- Project CLAUDE.md for development details
