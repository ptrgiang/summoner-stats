# Summoner Stats

## 📝 Project Description

**Summoner Stats** is a personal project built to track and display detailed League of Legends statistics for a single summoner. It uses Riot’s official API to fetch real-time and historical data including match history, champion mastery, and ranked progress. The project is embedded on a personal website to serve as a live showcase of player performance.

---

## 🔧 Features

- **Live & Historical Match Data**  
  Displays recent matches with detailed stats such as KDA, CS, game mode, and match duration.

- **Champion Mastery & Performance**  
  Shows mastery points, win/loss ratio, and average performance per champion.

- **Rank Tracking**  
  Visualizes current tier, division, LP, and ranked performance trends.

- **Seasonal Comparison & Trends**  
  Includes performance graphs and comparisons across seasons for long-term tracking.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

This project uses the following dependencies, which are included via CDN:

* [Bootstrap 5.3.0](https://getbootstrap.com/)
* [Bootstrap Icons 1.10.5](https://icons.getbootstrap.com/)
* [Chart.js](https://www.chartjs.org/)

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/your_project_name.git
   ```
2. Open `index.html` in your browser.

---

## 📂 File Structure

```
.gitignore
index.html
match_list.js
mini-map.png
project_description.md
fetch_data/
game-data/
├── champion.json
├── gameModes.json
├── gameTypes.json
└── item.json
matches/
├── ... (match data files)
player-data/
ranked-emblems/
├── tier-wings/
│   ├── ... (tier wing images)
└── wings/
    ├── ... (wing images)
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgements

* [Riot Games API](https://developer.riotgames.com/)
* [Bootstrap](https://getbootstrap.com/)
* [Chart.js](https://www.chartjs.org/)
