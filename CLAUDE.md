# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Environment

This is a client-side League of Legends statistics dashboard that runs entirely in the browser without a build process. To develop and test:

- Serve files through a local web server (required for CORS)
- Open `index.html` in browser
- No build, compile, or installation steps needed

## Project Architecture

### Data Flow
1. **Static JSON Data**: Pre-fetched League of Legends match data, champion info, and player stats stored in JSON files
2. **Client-side Processing**: JavaScript processes all data in the browser to generate statistics and visualizations
3. **Real-time Rendering**: Charts.js renders interactive graphs and statistics

### Core Components

**Main Application (`index.html`)**
- Bootstrap 5.3.0 UI framework with custom CSS
- Chart.js for data visualization
- Tabbed interface: Dashboard, Champion Performance, Match History, Mini-map
- Modal system for detailed match views

**Match Data Management (`match_list.js`)**
- Contains array of match file names for batch loading
- Critical for the data loading pipeline

### Data Structure

**Static Data Sources:**
- `game-data/`: Champion, item, game mode definitions from Riot API
- `player-data/`: Ranked info and champion mastery for the tracked player
- `matches/`: Individual match JSON files with complete game data
- `ranked-emblems/`: Tier images and visual assets

**Key Processing Logic:**
- Automatic player identification from match metadata
- Champion performance aggregation across all games
- Role-based statistics and mini-map visualization
- Sortable tables with filtering capabilities

### Data Dependencies

The application relies on specific Riot Games API data structure:
- Match files must contain `metadata.participants` and `info.participants`
- Champion data requires both ID and name mappings
- Item data needs image references for the CDN

### Mini-map Feature

Advanced positioning system that places champion icons on a League of Legends mini-map based on:
- Team assignment (blue/red side spawns)
- Role-specific lane paths with realistic positioning
- Jitter and spread algorithms for visual clarity when multiple games overlap