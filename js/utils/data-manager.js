/**
 * Data Manager - Centralized data loading and processing
 */
class DataManager {
    constructor() {
        this.MATCHES_DIR = './matches/';
        this.GAME_DATA_DIR = './game-data/';
        this.PLAYER_DATA_DIR = './player-data/';
        this.data = {};
    }

    async fetchData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async loadAllData() {
        const [
            championData,
            itemData,
            gameModes,
            rankedInfo,
            championMastery,
            matches
        ] = await Promise.all([
            this.fetchData(`${this.GAME_DATA_DIR}champion.json`),
            this.fetchData(`${this.GAME_DATA_DIR}item.json`),
            this.fetchData(`${this.GAME_DATA_DIR}gameModes.json`),
            this.fetchData(`${this.PLAYER_DATA_DIR}rankedInfo.json`),
            this.fetchData(`${this.PLAYER_DATA_DIR}championMastery.json`),
            Promise.all(matchFiles.map(file => this.fetchData(`${this.MATCHES_DIR}${file}`)))
        ]);

        if (!matches.every(m => m)) {
            throw new Error('Failed to load match data');
        }

        // Sort matches by creation date (newest first)
        matches.sort((a, b) => b.info.gameCreation - a.info.gameCreation);

        // Process data
        const masteryMap = new Map();
        if (championMastery) {
            championMastery.forEach(m => {
                masteryMap.set(m.championId, { level: m.championLevel, points: m.championPoints });
            });
        }

        // Find main player
        const allPuuids = matches.flatMap(match => match.metadata.participants);
        const puuidCounts = allPuuids.reduce((acc, puuid) => {
            acc[puuid] = (acc[puuid] || 0) + 1;
            return acc;
        }, {});
        const mainPlayerPuuid = Object.keys(puuidCounts).reduce((a, b) => puuidCounts[a] > puuidCounts[b] ? a : b);
        
        let mainPlayerName = '';
        const playerMatches = matches.map(match => {
            const playerParticipant = match.info.participants.find(p => p.puuid === mainPlayerPuuid);
            if (playerParticipant && !mainPlayerName) {
                mainPlayerName = playerParticipant.riotIdGameName;
            }
            return { match, playerParticipant };
        }).filter(m => m.playerParticipant);

        // Store processed data
        this.data = {
            championData,
            itemData,
            gameModes,
            rankedInfo,
            championMastery,
            masteryMap,
            matches,
            playerMatches,
            mainPlayerPuuid,
            mainPlayerName
        };

        return this.data;
    }

    getData() {
        return this.data;
    }

    // Utility methods for common calculations
    calculateWinRate(wins, totalGames) {
        return totalGames > 0 ? (wins / totalGames * 100).toFixed(2) : 0;
    }

    calculateKDA(kills, deaths, assists) {
        return deaths > 0 ? (kills + assists) / deaths : Infinity;
    }

    calculateGoldPerMinute(goldEarned, gameDuration) {
        return gameDuration > 0 ? goldEarned / (gameDuration / 60) : 0;
    }

    getChampionIconUrl(championName, version) {
        return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
    }

    getItemUrl(itemId, itemData) {
        if (!itemId || !itemData.data[itemId]) return 'https://via.placeholder.com/32';
        const item = itemData.data[itemId];
        return `https://ddragon.leagueoflegends.com/cdn/${itemData.version}/img/item/${item.image.full}`;
    }
}

// Export for module use
window.DataManager = DataManager;