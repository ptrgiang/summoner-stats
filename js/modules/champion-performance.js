/**
 * Champion Performance Module - Sortable table with champion statistics
 */
class ChampionPerformance {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.championStats = [];
        this.currentSort = { key: 'games', order: 'desc' };
    }

    init() {
        const data = this.dataManager.getData();
        this.calculateChampionStats(data);
        this.setupSortHandlers();
        this.renderTable();
        this.populateFilters();
        this.renderEnhancements();
    }

    renderEnhancements() {
        // Find the champion performance tab content
        const championPerformanceTab = document.getElementById('champion-performance');
        if (!championPerformanceTab) return;
        
        // Add all enhancement components before the table
        const trendAnalysis = this.renderChampionTrendAnalysis();
        const comparisonTool = this.createChampionComparison();
        const masteryProgression = this.renderMasteryProgression();
        const advancedFilters = this.createAdvancedFilters();
        const exportTools = this.createExportTools();
        const tableCard = championPerformanceTab.querySelector('.card');
        
        if (tableCard) {
            tableCard.parentNode.insertBefore(trendAnalysis, tableCard);
            tableCard.parentNode.insertBefore(comparisonTool, tableCard);
            tableCard.parentNode.insertBefore(masteryProgression, tableCard);
            tableCard.parentNode.insertBefore(advancedFilters, tableCard);
            
            // Insert export tools right before the table
            const cardBody = tableCard.querySelector('.card-body');
            const tableContainer = cardBody.querySelector('.table-responsive');
            cardBody.insertBefore(exportTools, tableContainer);
        }
    }

    calculateChampionStats(data) {
        const { playerMatches, championData, masteryMap } = data;
        const championStats = {};
        const championIdMap = new Map(Object.values(championData.data).map(c => [c.key, c]));

        playerMatches.forEach(({ match, playerParticipant }) => {
            const champId = playerParticipant.championId;
            if (!championStats[champId]) {
                const champInfo = championIdMap.get(String(champId));
                championStats[champId] = { 
                    id: champId,
                    name: playerParticipant.championName, 
                    image: champInfo ? champInfo.image.full : '',
                    games: 0, 
                    wins: 0, 
                    kills: 0, 
                    deaths: 0, 
                    assists: 0,
                    // Advanced metrics
                    firstBlood: 0,
                    firstTower: 0,
                    soloKills: 0,
                    multikills: 0,
                    visionScore: 0,
                    csPerMinute: 0,
                    goldPerMinute: 0,
                    damagePerGold: 0,
                    killParticipation: 0,
                    earlyGamePerformance: 0,
                    lateGamePerformance: 0,
                    totalDamage: 0,
                    totalGold: 0,
                    totalCS: 0,
                    gamesByPatch: new Map(),
                    performanceByRole: new Map(),
                    itemBuilds: new Map(),
                    runeSets: new Map()
                };
            }
            
            const stats = championStats[champId];
            stats.games++;
            if (playerParticipant.win) stats.wins++;
            stats.kills += playerParticipant.kills;
            stats.deaths += playerParticipant.deaths;
            stats.assists += playerParticipant.assists;

            // Advanced metrics calculation
            if (playerParticipant.firstBloodKill) stats.firstBlood++;
            if (playerParticipant.firstTowerKill) stats.firstTower++;
            
            stats.visionScore += playerParticipant.visionScore || 0;
            stats.totalDamage += playerParticipant.totalDamageDealtToChampions || 0;
            stats.totalGold += playerParticipant.goldEarned || 0;
            
            // Calculate CS per minute
            const totalCS = (playerParticipant.totalMinionsKilled || 0) + (playerParticipant.neutralMinionsKilled || 0);
            const gameMinutes = match.info.gameDuration / 60;
            stats.totalCS += totalCS;
            stats.csPerMinute += gameMinutes > 0 ? totalCS / gameMinutes : 0;
            
            // Gold per minute
            stats.goldPerMinute += gameMinutes > 0 ? (playerParticipant.goldEarned || 0) / gameMinutes : 0;
            
            // Damage efficiency
            if (playerParticipant.goldEarned > 0) {
                stats.damagePerGold += (playerParticipant.totalDamageDealtToChampions || 0) / playerParticipant.goldEarned;
            }
            
            // Kill participation
            const teamKills = this.calculateTeamKills(match, playerParticipant.teamId);
            if (teamKills > 0) {
                stats.killParticipation += ((playerParticipant.kills + playerParticipant.assists) / teamKills) * 100;
            }
            
            // Early/Late game performance
            stats.earlyGamePerformance += this.calculateEarlyGameScore(playerParticipant);
            stats.lateGamePerformance += this.calculateLateGameScore(playerParticipant);
            
            // Track item builds and rune sets
            this.trackItemBuilds(stats, playerParticipant);
            this.trackRuneSets(stats, playerParticipant);
        });

        // Normalize advanced stats (convert totals to averages)
        Object.values(championStats).forEach(champ => {
            if (champ.games > 0) {
                champ.avgVisionScore = (champ.visionScore / champ.games).toFixed(1);
                champ.avgCSPerMin = (champ.csPerMinute / champ.games).toFixed(1);
                champ.avgGoldPerMin = (champ.goldPerMinute / champ.games).toFixed(0);
                champ.avgDamagePerGold = (champ.damagePerGold / champ.games).toFixed(2);
                champ.avgKillParticipation = (champ.killParticipation / champ.games).toFixed(1);
                champ.avgEarlyGame = (champ.earlyGamePerformance / champ.games).toFixed(2);
                champ.avgLateGame = (champ.lateGamePerformance / champ.games).toFixed(2);
            }
        });

        // Add mastery information
        Object.values(championStats).forEach(champ => {
            const mastery = masteryMap.get(champ.id);
            champ.masteryLevel = mastery ? mastery.level : 0;
            champ.masteryPoints = mastery ? mastery.points : 0;
        });

        this.championStats = Object.values(championStats);
    }

    setupSortHandlers() {
        this.sortStack = []; // Track multiple sort criteria for advanced sorting
        
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortKey = header.dataset.sort;
                
                if (e.ctrlKey || e.metaKey) {
                    // Multi-column sort with Ctrl/Cmd
                    this.addToSortStack(this.sortStack, sortKey);
                } else {
                    // Single column sort
                    const currentOrder = header.dataset.order || 'desc';
                    const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
                    header.dataset.order = newOrder;
                    
                    this.sortStack = [{ key: sortKey, order: newOrder }];
                    this.currentSort = { key: sortKey, order: newOrder };
                }
                
                this.applySortStack(this.sortStack);
                this.updateSortIndicators(this.sortStack);
            });
        });
        
        // Add instruction for multi-sort
        const tableContainer = document.querySelector('#champion-performance .table-responsive');
        if (tableContainer && !tableContainer.querySelector('.sort-instructions')) {
            const instructions = document.createElement('small');
            instructions.className = 'text-muted sort-instructions mt-2 d-block';
            instructions.innerHTML = '<i class="bi bi-info-circle me-1"></i>Hold Ctrl/Cmd to sort by multiple columns';
            tableContainer.appendChild(instructions);
        }
    }

    addToSortStack(sortStack, sortKey) {
        // Remove existing sort for this key
        const existingIndex = sortStack.findIndex(sort => sort.key === sortKey);
        
        if (existingIndex !== -1) {
            // Toggle existing sort order
            const currentSort = sortStack[existingIndex];
            currentSort.order = currentSort.order === 'desc' ? 'asc' : 'desc';
        } else {
            // Add new sort
            sortStack.push({ key: sortKey, order: 'desc' });
        }
    }

    applySortStack(sortStack) {
        this.championStats.sort((a, b) => {
            for (const sort of sortStack) {
                const comparison = this.compareChampions(a, b, sort.key);
                if (comparison !== 0) {
                    return sort.order === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
        
        this.renderingFromSort = true;
        this.renderTable();
        this.renderingFromSort = false;
    }

    compareChampions(a, b, sortKey) {
        let valA, valB;
        
        switch (sortKey) {
            case 'name':
                valA = a.name;
                valB = b.name;
                break;
            case 'winRate':
                valA = a.wins / a.games;
                valB = b.wins / b.games;
                break;
            case 'kda':
                valA = this.dataManager.calculateKDA(a.kills, a.deaths, a.assists);
                valB = this.dataManager.calculateKDA(b.kills, b.deaths, b.assists);
                break;
            case 'masteryLevel':
                valA = a.masteryLevel;
                valB = b.masteryLevel;
                break;
            case 'masteryPoints':
                valA = a.masteryPoints;
                valB = b.masteryPoints;
                break;
            default:
                valA = a[sortKey];
                valB = b[sortKey];
        }

        if (typeof valA === 'string') {
            return valA.localeCompare(valB);
        }
        return valA - valB;
    }

    updateSortIndicators(sortStack) {
        // Clear all icons first
        document.querySelectorAll('.sortable-header i').forEach(i => {
            i.className = 'bi bi-sort-down';
        });
        
        // Update icons for sorted columns
        sortStack.forEach((sort, index) => {
            const header = document.querySelector(`[data-sort="${sort.key}"]`);
            if (header) {
                const icon = header.querySelector('i');
                let iconClass = sort.order === 'desc' ? 'bi bi-sort-down' : 'bi bi-sort-up';
                
                if (sort.key === 'name') {
                    iconClass = sort.order === 'desc' ? 'bi bi-sort-alpha-down' : 'bi bi-sort-alpha-up';
                }
                
                // Add number indicator for multi-sort
                if (sortStack.length > 1) {
                    iconClass += ` sort-number-${index + 1}`;
                }
                
                icon.className = iconClass;
                
                // Add visual indicator for multi-sort priority
                if (sortStack.length > 1) {
                    header.setAttribute('data-sort-priority', index + 1);
                    header.style.position = 'relative';
                    
                    // Remove existing priority indicator
                    const existingIndicator = header.querySelector('.sort-priority');
                    if (existingIndicator) {
                        existingIndicator.remove();
                    }
                    
                    // Add priority indicator
                    const priorityIndicator = document.createElement('span');
                    priorityIndicator.className = 'sort-priority badge bg-primary ms-1';
                    priorityIndicator.textContent = index + 1;
                    priorityIndicator.style.fontSize = '0.7rem';
                    header.appendChild(priorityIndicator);
                } else {
                    // Remove priority indicators for single sort
                    const priorityIndicator = header.querySelector('.sort-priority');
                    if (priorityIndicator) {
                        priorityIndicator.remove();
                    }
                    header.removeAttribute('data-sort-priority');
                }
            }
        });
    }

    sortChampions() {
        // Use advanced sorting if sort stack exists, otherwise fall back to simple sort
        if (this.sortStack && this.sortStack.length > 0) {
            this.applySortStack(this.sortStack);
            return;
        }
        
        const { key, order } = this.currentSort;
        
        this.championStats.sort((a, b) => {
            const comparison = this.compareChampions(a, b, key);
            return order === 'asc' ? comparison : -comparison;
        });
    }

    renderTable() {
        // Only sort if not called from applySortStack to avoid recursion
        if (!this.renderingFromSort) {
            this.sortChampions();
        }
        
        const championStatsTable = document.getElementById('champion-stats-table');
        championStatsTable.innerHTML = '';

        const data = this.dataManager.getData();
        const { championData } = data;

        this.championStats.forEach(champ => {
            const champWinRate = this.dataManager.calculateWinRate(champ.wins, champ.games);
            const avgKills = (champ.kills / champ.games).toFixed(1);
            const avgDeaths = (champ.deaths / champ.games).toFixed(1);
            const avgAssists = (champ.assists / champ.games).toFixed(1);
            const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
            const kdaDisplay = kda === Infinity ? 'Perfect' : kda.toFixed(2);
            // Use the same URL pattern as the original index.html
            const champIconUrl = champ.image 
                ? `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champ.image}`
                : `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champ.name}.png`;

            const row = document.createElement('tr');
            row.className = 'clickable-row';
            row.innerHTML = `
                <td><img src="${champIconUrl}" class="champion-icon me-2" alt="${champ.name}"> ${champ.name}</td>
                <td>${champ.games}</td>
                <td>${champWinRate}%</td>
                <td>${kdaDisplay}</td>
                <td>${champ.masteryLevel || 'N/A'}</td>
                <td>${champ.masteryPoints ? champ.masteryPoints.toLocaleString() : 'N/A'}</td>
            `;
            
            // Add click handler for filtering and double-click for modal
            row.addEventListener('click', () => {
                this.onChampionClick(champ.name);
            });
            
            row.addEventListener('dblclick', () => {
                this.createChampionDetailModal(champ.name);
            });
            
            championStatsTable.appendChild(row);
        });
    }

    populateFilters() {
        const championFilter = document.getElementById('champion-filter');
        if (championFilter) {
            // Clear existing options except the first one
            championFilter.innerHTML = '<option value="">All Champions</option>';
            
            this.championStats.forEach(champ => {
                const option = document.createElement('option');
                option.value = champ.name;
                option.textContent = champ.name;
                championFilter.appendChild(option);
            });
        }
    }

    onChampionClick(championName) {
        // Trigger filter in match history module
        if (window.matchHistory && typeof window.matchHistory.applyFilters === 'function') {
            window.matchHistory.applyFilters({ champion: championName });
            
            // Switch to match history tab
            const matchHistoryTab = document.getElementById('match-history-tab');
            if (matchHistoryTab) {
                matchHistoryTab.click();
            }
        }
    }

    getChampionStats() {
        return this.championStats;
    }

    // Filter champions based on criteria
    filterChampions(criteria) {
        return this.championStats.filter(champ => {
            if (criteria.minGames && champ.games < criteria.minGames) return false;
            if (criteria.name && !champ.name.toLowerCase().includes(criteria.name.toLowerCase())) return false;
            if (criteria.minWinRate) {
                const winRate = (champ.wins / champ.games) * 100;
                if (winRate < criteria.minWinRate) return false;
            }
            return true;
        });
    }

    // Get top performing champions
    getTopChampions(metric = 'winRate', limit = 5, minGames = 5) {
        return [...this.championStats]
            .filter(c => c.games >= minGames)
            .sort((a, b) => {
                switch (metric) {
                    case 'winRate':
                        return (b.wins / b.games) - (a.wins / a.games);
                    case 'kda':
                        const kdaA = this.dataManager.calculateKDA(a.kills, a.deaths, a.assists);
                        const kdaB = this.dataManager.calculateKDA(b.kills, b.deaths, b.assists);
                        return kdaB - kdaA;
                    case 'games':
                        return b.games - a.games;
                    default:
                        return 0;
                }
            })
            .slice(0, limit);
    }

    calculateTeamKills(match, teamId) {
        return match.info.participants
            .filter(p => p.teamId === teamId)
            .reduce((total, p) => total + p.kills, 0);
    }

    calculateEarlyGameScore(participant) {
        // Score based on early game impact (0-15 minutes)
        return (participant.kills * 2 + participant.assists + 
               (participant.firstBloodKill ? 5 : 0)) / Math.max(participant.deaths, 1);
    }

    calculateLateGameScore(participant) {
        // Score based on late game performance
        const damageRatio = (participant.totalDamageDealtToChampions || 0) / Math.max(participant.goldEarned, 1);
        return damageRatio * 1000; // Scale for readability
    }

    trackItemBuilds(stats, participant) {
        const items = [participant.item0, participant.item1, participant.item2, 
                      participant.item3, participant.item4, participant.item5]
            .filter(id => id !== 0)
            .sort((a, b) => a - b)
            .join(',');
        
        if (items) {
            const current = stats.itemBuilds.get(items) || { count: 0, wins: 0 };
            current.count++;
            if (participant.win) current.wins++;
            stats.itemBuilds.set(items, current);
        }
    }

    trackRuneSets(stats, participant) {
        // Track primary rune tree if available
        if (participant.perks && participant.perks.styles && participant.perks.styles.length > 0) {
            const primaryStyle = participant.perks.styles[0].style;
            const current = stats.runeSets.get(primaryStyle) || { count: 0, wins: 0 };
            current.count++;
            if (participant.win) current.wins++;
            stats.runeSets.set(primaryStyle, current);
        }
    }

    calculateChampionTrends() {
        const recentGames = 20;
        const { playerMatches } = this.dataManager.getData();
        const championTrends = {};
        
        // Ensure championStats is populated
        if (!this.championStats || this.championStats.length === 0) {
            console.warn('ChampionStats not populated, calculating trends from matches directly');
            return this.calculateTrendsFromMatches(playerMatches, recentGames);
        }
        
        this.championStats.forEach(champ => {
            const recentMatches = playerMatches
                .filter(m => m.playerParticipant.championName === champ.name)
                .slice(0, recentGames);
            
            if (recentMatches.length >= 3) { // Lowered threshold for more data
                const recentWins = recentMatches.filter(m => m.playerParticipant.win).length;
                const recentWinRate = (recentWins / recentMatches.length) * 100;
                const overallWinRate = (champ.wins / champ.games) * 100;
                const trend = recentWinRate - overallWinRate;
                
                championTrends[champ.name] = {
                    trend: trend,
                    recentWinRate: parseFloat(recentWinRate.toFixed(1)),
                    overallWinRate: parseFloat(overallWinRate.toFixed(1)),
                    recentGames: recentMatches.length,
                    confidence: this.calculateTrendConfidence(recentMatches)
                };
            }
        });
        
        console.log('Champion trends calculated:', championTrends);
        return championTrends;
    }

    calculateTrendsFromMatches(playerMatches, recentGames) {
        const championGroups = {};
        const championTrends = {};
        
        // Group matches by champion
        playerMatches.forEach(matchData => {
            const champName = matchData.playerParticipant.championName;
            if (!championGroups[champName]) {
                championGroups[champName] = [];
            }
            championGroups[champName].push(matchData);
        });
        
        // Calculate trends for each champion
        Object.entries(championGroups).forEach(([champName, matches]) => {
            if (matches.length >= 3) {
                const recentMatches = matches.slice(0, recentGames);
                const recentWins = recentMatches.filter(m => m.playerParticipant.win).length;
                const recentWinRate = (recentWins / recentMatches.length) * 100;
                
                const totalWins = matches.filter(m => m.playerParticipant.win).length;
                const overallWinRate = (totalWins / matches.length) * 100;
                const trend = recentWinRate - overallWinRate;
                
                championTrends[champName] = {
                    trend: trend,
                    recentWinRate: parseFloat(recentWinRate.toFixed(1)),
                    overallWinRate: parseFloat(overallWinRate.toFixed(1)),
                    recentGames: recentMatches.length,
                    totalGames: matches.length,
                    confidence: this.calculateTrendConfidence(recentMatches)
                };
            }
        });
        
        return championTrends;
    }

    calculateTrendConfidence(recentMatches) {
        // Simple confidence based on sample size and consistency
        const sampleSize = recentMatches.length;
        const wins = recentMatches.filter(m => m.playerParticipant.win).length;
        const losses = sampleSize - wins;
        
        // Higher confidence with more games and less extreme win rates
        const sizeConfidence = Math.min(sampleSize / 20, 1);
        const balanceConfidence = 1 - Math.abs((wins / sampleSize) - 0.5) * 2;
        
        return ((sizeConfidence + balanceConfidence) / 2 * 100).toFixed(0);
    }

    renderChampionTrendAnalysis() {
        const trendData = this.calculateChampionTrends();
        console.log('Trend data for rendering:', trendData);
        
        const improving = Object.entries(trendData)
            .filter(([_, data]) => data.trend > 0) // Show any positive trend
            .sort((a, b) => b[1].trend - a[1].trend)
            .slice(0, 5);
        
        const declining = Object.entries(trendData)
            .filter(([_, data]) => data.trend < 0) // Show any negative trend
            .sort((a, b) => a[1].trend - b[1].trend)
            .slice(0, 5);
        
        console.log('Improving champions:', improving);
        console.log('Declining champions:', declining);
        
        // If no trends at all, show top performed champions instead
        if (Object.keys(trendData).length === 0) {
            return this.renderFallbackTrendAnalysis();
        }
        
        const container = document.createElement('div');
        container.className = 'champion-trends-container mb-4';
        container.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Champion Performance Trends</h5>
                    <div class="trends-grid">
                        <div class="trend-item improving">
                            <div class="trend-header">
                                <h6><i class="bi bi-trending-up text-success me-2"></i>Improving Champions</h6>
                            </div>
                            <div id="improving-champions">
                                ${improving.length > 0 ? improving.map(([name, data]) => `
                                    <div class="trend-champion-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="champion-name">${name}</span>
                                            <span class="trend-value text-success">+${data.trend.toFixed(1)}%</span>
                                        </div>
                                        <small class="text-muted">Recent: ${data.recentWinRate}% (${data.recentGames}g) | Overall: ${data.overallWinRate}%</small>
                                    </div>
                                `).join('') : '<p class="text-muted"><i class="bi bi-info-circle me-2"></i>No improving trends detected. Play more games to see trends!</p>'}
                            </div>
                        </div>
                        <div class="trend-item declining">
                            <div class="trend-header">
                                <h6><i class="bi bi-trending-down text-danger me-2"></i>Declining Champions</h6>
                            </div>
                            <div id="declining-champions">
                                ${declining.length > 0 ? declining.map(([name, data]) => `
                                    <div class="trend-champion-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="champion-name">${name}</span>
                                            <span class="trend-value text-danger">${data.trend.toFixed(1)}%</span>
                                        </div>
                                        <small class="text-muted">Recent: ${data.recentWinRate}% (${data.recentGames}g) | Overall: ${data.overallWinRate}%</small>
                                    </div>
                                `).join('') : '<p class="text-muted"><i class="bi bi-info-circle me-2"></i>No declining trends detected. Keep up the good performance!</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return container;
    }

    renderFallbackTrendAnalysis() {
        const { playerMatches } = this.dataManager.getData();
        const championStats = {};
        
        // Calculate basic stats from matches
        playerMatches.forEach(matchData => {
            const champName = matchData.playerParticipant.championName;
            if (!championStats[champName]) {
                championStats[champName] = { wins: 0, games: 0 };
            }
            championStats[champName].games++;
            if (matchData.playerParticipant.win) {
                championStats[champName].wins++;
            }
        });
        
        const topChampions = Object.entries(championStats)
            .filter(([_, data]) => data.games >= 2)
            .map(([name, data]) => ({
                name,
                winRate: ((data.wins / data.games) * 100).toFixed(1),
                games: data.games,
                wins: data.wins
            }))
            .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
            .slice(0, 5);
        
        const bottomChampions = Object.entries(championStats)
            .filter(([_, data]) => data.games >= 2)
            .map(([name, data]) => ({
                name,
                winRate: ((data.wins / data.games) * 100).toFixed(1),
                games: data.games,
                wins: data.wins
            }))
            .sort((a, b) => parseFloat(a.winRate) - parseFloat(b.winRate))
            .slice(0, 5);
        
        const container = document.createElement('div');
        container.className = 'champion-trends-container mb-4';
        container.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Champion Performance Overview</h5>
                    <p class="text-muted mb-3">
                        <i class="bi bi-info-circle me-2"></i>
                        Not enough games for trend analysis. Showing current performance rankings.
                    </p>
                    <div class="trends-grid">
                        <div class="trend-item improving">
                            <div class="trend-header">
                                <h6><i class="bi bi-trophy text-success me-2"></i>Best Performing Champions</h6>
                            </div>
                            <div id="top-champions">
                                ${topChampions.map(champ => `
                                    <div class="trend-champion-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="champion-name">${champ.name}</span>
                                            <span class="trend-value text-success">${champ.winRate}%</span>
                                        </div>
                                        <small class="text-muted">${champ.wins}W ${champ.games - champ.wins}L (${champ.games} games)</small>
                                    </div>
                                `).join('')}
                                ${topChampions.length === 0 ? '<p class="text-muted">No champions with multiple games</p>' : ''}
                            </div>
                        </div>
                        <div class="trend-item declining">
                            <div class="trend-header">
                                <h6><i class="bi bi-arrow-down text-warning me-2"></i>Champions to Improve</h6>
                            </div>
                            <div id="bottom-champions">
                                ${bottomChampions.map(champ => `
                                    <div class="trend-champion-item">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="champion-name">${champ.name}</span>
                                            <span class="trend-value text-warning">${champ.winRate}%</span>
                                        </div>
                                        <small class="text-muted">${champ.wins}W ${champ.games - champ.wins}L (${champ.games} games)</small>
                                    </div>
                                `).join('')}
                                ${bottomChampions.length === 0 ? '<p class="text-muted">No champions with multiple games</p>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return container;
    }

    createChampionDetailModal(championName) {
        const champion = this.championStats.find(c => c.name === championName);
        if (!champion) return;

        const advancedStats = this.getAdvancedChampionStats(championName);
        
        // Remove existing modal if any
        const existingModal = document.getElementById('champion-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'champion-detail-modal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <img src="${this.getChampionIcon(champion)}" class="champion-icon me-2">
                            ${championName} Performance Analysis
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${this.renderChampionDetailsContent(champion, advancedStats)}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        
        // Clean up modal when hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    getChampionIcon(champion) {
        const data = this.dataManager.getData();
        const { championData } = data;
        // Use the same URL pattern as the original index.html
        if (champion.image) {
            return `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champion.image}`;
        }
        // Fallback for cases where we don't have the image filename
        return `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champion.name}.png`;
    }

    getAdvancedChampionStats(championName) {
        const { playerMatches } = this.dataManager.getData();
        const championMatches = playerMatches.filter(m => m.playerParticipant.championName === championName);
        
        // Calculate additional statistics
        const recentPerformance = championMatches.slice(0, 10);
        const oldPerformance = championMatches.slice(10);
        
        return {
            recentWinRate: recentPerformance.length > 0 ? 
                (recentPerformance.filter(m => m.playerParticipant.win).length / recentPerformance.length * 100).toFixed(1) : 0,
            historicalWinRate: oldPerformance.length > 0 ? 
                (oldPerformance.filter(m => m.playerParticipant.win).length / oldPerformance.length * 100).toFixed(1) : 0,
            averageGameDuration: championMatches.length > 0 ?
                (championMatches.reduce((sum, m) => sum + m.match.info.gameDuration, 0) / championMatches.length / 60).toFixed(1) : 0,
            bestPerformance: this.getBestPerformance(championMatches),
            worstPerformance: this.getWorstPerformance(championMatches)
        };
    }

    getBestPerformance(matches) {
        if (matches.length === 0) return null;
        
        return matches.reduce((best, current) => {
            const currentKDA = this.dataManager.calculateKDA(
                current.playerParticipant.kills,
                current.playerParticipant.deaths,
                current.playerParticipant.assists
            );
            const bestKDA = this.dataManager.calculateKDA(
                best.playerParticipant.kills,
                best.playerParticipant.deaths,
                best.playerParticipant.assists
            );
            return currentKDA > bestKDA ? current : best;
        });
    }

    getWorstPerformance(matches) {
        if (matches.length === 0) return null;
        
        return matches.reduce((worst, current) => {
            const currentKDA = this.dataManager.calculateKDA(
                current.playerParticipant.kills,
                current.playerParticipant.deaths,
                current.playerParticipant.assists
            );
            const worstKDA = this.dataManager.calculateKDA(
                worst.playerParticipant.kills,
                worst.playerParticipant.deaths,
                worst.playerParticipant.assists
            );
            return currentKDA < worstKDA ? current : worst;
        });
    }

    renderChampionDetailsContent(champion, advancedStats) {
        const winRate = this.dataManager.calculateWinRate(champion.wins, champion.games);
        const kda = this.dataManager.calculateKDA(champion.kills, champion.deaths, champion.assists);
        const kdaDisplay = kda === Infinity ? 'Perfect' : kda.toFixed(2);
        
        return `
            <div class="row">
                <div class="col-md-4">
                    <div class="champion-overview">
                        <h6>Overview</h6>
                        <div class="stat-item mb-2">
                            <span class="label">Total Games:</span>
                            <span class="value ms-2"><strong>${champion.games}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Win Rate:</span>
                            <span class="value ms-2 ${parseFloat(winRate) > 50 ? 'text-success' : 'text-danger'}">
                                <strong>${winRate}%</strong>
                            </span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Average KDA:</span>
                            <span class="value ms-2"><strong>${kdaDisplay}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Mastery Level:</span>
                            <span class="value ms-2"><strong>${champion.masteryLevel || 'N/A'}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Mastery Points:</span>
                            <span class="value ms-2"><strong>${champion.masteryPoints ? champion.masteryPoints.toLocaleString() : 'N/A'}</strong></span>
                        </div>
                    </div>
                    
                    <div class="champion-advanced-stats mt-4">
                        <h6>Advanced Statistics</h6>
                        <div class="stat-item mb-2">
                            <span class="label">Avg Vision Score:</span>
                            <span class="value ms-2"><strong>${champion.avgVisionScore || '0'}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Avg CS/min:</span>
                            <span class="value ms-2"><strong>${champion.avgCSPerMin || '0'}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Avg Gold/min:</span>
                            <span class="value ms-2"><strong>${champion.avgGoldPerMin || '0'}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">Kill Participation:</span>
                            <span class="value ms-2"><strong>${champion.avgKillParticipation || '0'}%</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">First Blood:</span>
                            <span class="value ms-2"><strong>${champion.firstBlood || 0}</strong></span>
                        </div>
                        <div class="stat-item mb-2">
                            <span class="label">First Tower:</span>
                            <span class="value ms-2"><strong>${champion.firstTower || 0}</strong></span>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="champion-performance-trends">
                        <h6>Performance Trends</h6>
                        <div class="row mb-3">
                            <div class="col-6">
                                <div class="trend-stat">
                                    <span class="trend-label">Recent Win Rate (Last 10):</span>
                                    <span class="trend-value ${parseFloat(advancedStats.recentWinRate) > parseFloat(winRate) ? 'text-success' : 'text-danger'}">
                                        ${advancedStats.recentWinRate}%
                                    </span>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="trend-stat">
                                    <span class="trend-label">Historical Win Rate:</span>
                                    <span class="trend-value">${advancedStats.historicalWinRate}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <span class="trend-label">Average Game Duration:</span>
                            <span class="trend-value">${advancedStats.averageGameDuration} minutes</span>
                        </div>
                    </div>
                    
                    ${advancedStats.bestPerformance ? `
                    <div class="champion-best-game mb-3">
                        <h6>Best Performance</h6>
                        <div class="performance-game">
                            <span class="performance-kda">
                                ${advancedStats.bestPerformance.playerParticipant.kills}/${advancedStats.bestPerformance.playerParticipant.deaths}/${advancedStats.bestPerformance.playerParticipant.assists}
                            </span>
                            <span class="performance-result ${advancedStats.bestPerformance.playerParticipant.win ? 'text-success' : 'text-danger'}">
                                ${advancedStats.bestPerformance.playerParticipant.win ? 'Victory' : 'Defeat'}
                            </span>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="champion-recommendations">
                        <h6>Recommendations</h6>
                        <div class="recommendation-list">
                            ${this.generateChampionRecommendations(champion)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateChampionRecommendations(champion) {
        const recommendations = [];
        const winRate = (champion.wins / champion.games) * 100;
        
        if (winRate < 40) {
            recommendations.push({
                icon: 'bi-exclamation-triangle text-warning',
                text: 'Consider practicing this champion in normal games before ranked play'
            });
        } else if (winRate > 70) {
            recommendations.push({
                icon: 'bi-star-fill text-warning',
                text: 'Excellent performance! Consider this champion for your main pool'
            });
        }
        
        if (champion.games < 10) {
            recommendations.push({
                icon: 'bi-info-circle text-info',
                text: 'Play more games to get better performance insights'
            });
        }
        
        if ((champion.avgVisionScore || 0) < 20) {
            recommendations.push({
                icon: 'bi-eye text-primary',
                text: 'Focus on improving vision control and ward placement'
            });
        }
        
        if ((champion.avgCSPerMin || 0) < 6 && champion.games > 5) {
            recommendations.push({
                icon: 'bi-coin text-success',
                text: 'Work on CS fundamentals to improve gold income'
            });
        }
        
        return recommendations.map(rec => `
            <div class="recommendation-item mb-2">
                <i class="${rec.icon} me-2"></i>
                <span>${rec.text}</span>
            </div>
        `).join('');
    }

    createChampionComparison() {
        const comparisonContainer = document.createElement('div');
        comparisonContainer.className = 'champion-comparison-tool mb-4';
        comparisonContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Champion Comparison</h5>
                    <div class="comparison-controls">
                        <select id="champion1-select" class="form-select">
                            <option value="">Select First Champion</option>
                            ${this.championStats.map(champ => `
                                <option value="${champ.name}">${champ.name}</option>
                            `).join('')}
                        </select>
                        <span class="vs-text">vs</span>
                        <select id="champion2-select" class="form-select">
                            <option value="">Select Second Champion</option>
                            ${this.championStats.map(champ => `
                                <option value="${champ.name}">${champ.name}</option>
                            `).join('')}
                        </select>
                        <button id="compare-btn" class="btn btn-primary">Compare</button>
                    </div>
                    <div id="comparison-results" class="comparison-results mt-3"></div>
                </div>
            </div>
        `;
        
        this.setupComparisonHandlers(comparisonContainer);
        return comparisonContainer;
    }

    setupComparisonHandlers(container) {
        const champion1Select = container.querySelector('#champion1-select');
        const champion2Select = container.querySelector('#champion2-select');
        const compareBtn = container.querySelector('#compare-btn');
        const resultsDiv = container.querySelector('#comparison-results');

        compareBtn.addEventListener('click', () => {
            const champ1Name = champion1Select.value;
            const champ2Name = champion2Select.value;
            
            if (!champ1Name || !champ2Name) {
                resultsDiv.innerHTML = '<p class="text-warning">Please select two champions to compare.</p>';
                return;
            }
            
            if (champ1Name === champ2Name) {
                resultsDiv.innerHTML = '<p class="text-warning">Please select two different champions.</p>';
                return;
            }
            
            const champ1 = this.championStats.find(c => c.name === champ1Name);
            const champ2 = this.championStats.find(c => c.name === champ2Name);
            
            if (champ1 && champ2) {
                resultsDiv.innerHTML = this.renderComparisonResults(champ1, champ2);
            }
        });
    }

    renderComparisonResults(champ1, champ2) {
        const comparison = this.calculateChampionComparison(champ1, champ2);
        
        return `
            <div class="comparison-grid">
                <div class="comparison-header mb-3">
                    <div class="row">
                        <div class="col-5 text-center">
                            <img src="${this.getChampionIcon(champ1)}" class="champion-icon mb-2">
                            <h6>${champ1.name}</h6>
                        </div>
                        <div class="col-2 text-center">
                            <strong>VS</strong>
                        </div>
                        <div class="col-5 text-center">
                            <img src="${this.getChampionIcon(champ2)}" class="champion-icon mb-2">
                            <h6>${champ2.name}</h6>
                        </div>
                    </div>
                </div>
                
                <div class="comparison-metrics">
                    <div class="metric-comparison mb-3">
                        <h6 class="text-center mb-2">Win Rate</h6>
                        <div class="row">
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.winRate.winner === 'champ1' ? 'text-success fw-bold' : ''}">
                                    ${((champ1.wins / champ1.games) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div class="col-2 text-center">
                                <i class="bi bi-arrow-left-right text-muted"></i>
                            </div>
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.winRate.winner === 'champ2' ? 'text-success fw-bold' : ''}">
                                    ${((champ2.wins / champ2.games) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-comparison mb-3">
                        <h6 class="text-center mb-2">Average KDA</h6>
                        <div class="row">
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.kda.winner === 'champ1' ? 'text-success fw-bold' : ''}">
                                    ${this.dataManager.calculateKDA(champ1.kills, champ1.deaths, champ1.assists).toFixed(2)}
                                </span>
                            </div>
                            <div class="col-2 text-center">
                                <i class="bi bi-arrow-left-right text-muted"></i>
                            </div>
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.kda.winner === 'champ2' ? 'text-success fw-bold' : ''}">
                                    ${this.dataManager.calculateKDA(champ2.kills, champ2.deaths, champ2.assists).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-comparison mb-3">
                        <h6 class="text-center mb-2">Games Played</h6>
                        <div class="row">
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.games.winner === 'champ1' ? 'text-info fw-bold' : ''}">
                                    ${champ1.games}
                                </span>
                            </div>
                            <div class="col-2 text-center">
                                <i class="bi bi-arrow-left-right text-muted"></i>
                            </div>
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.games.winner === 'champ2' ? 'text-info fw-bold' : ''}">
                                    ${champ2.games}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-comparison mb-3">
                        <h6 class="text-center mb-2">Average CS/min</h6>
                        <div class="row">
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.csPerMin.winner === 'champ1' ? 'text-warning fw-bold' : ''}">
                                    ${champ1.avgCSPerMin || '0'}
                                </span>
                            </div>
                            <div class="col-2 text-center">
                                <i class="bi bi-arrow-left-right text-muted"></i>
                            </div>
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.csPerMin.winner === 'champ2' ? 'text-warning fw-bold' : ''}">
                                    ${champ2.avgCSPerMin || '0'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-comparison">
                        <h6 class="text-center mb-2">Mastery Level</h6>
                        <div class="row">
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.mastery.winner === 'champ1' ? 'text-primary fw-bold' : ''}">
                                    ${champ1.masteryLevel || 0}
                                </span>
                            </div>
                            <div class="col-2 text-center">
                                <i class="bi bi-arrow-left-right text-muted"></i>
                            </div>
                            <div class="col-5 text-center">
                                <span class="comparison-value ${comparison.mastery.winner === 'champ2' ? 'text-primary fw-bold' : ''}">
                                    ${champ2.masteryLevel || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="comparison-summary mt-4">
                    <h6>Summary</h6>
                    <p class="text-muted">${this.generateComparisonSummary(champ1, champ2, comparison)}</p>
                </div>
            </div>
        `;
    }

    calculateChampionComparison(champ1, champ2) {
        const champ1WinRate = (champ1.wins / champ1.games) * 100;
        const champ2WinRate = (champ2.wins / champ2.games) * 100;
        
        const champ1KDA = this.dataManager.calculateKDA(champ1.kills, champ1.deaths, champ1.assists);
        const champ2KDA = this.dataManager.calculateKDA(champ2.kills, champ2.deaths, champ2.assists);
        
        const champ1CSPerMin = parseFloat(champ1.avgCSPerMin || 0);
        const champ2CSPerMin = parseFloat(champ2.avgCSPerMin || 0);
        
        return {
            winRate: { winner: champ1WinRate > champ2WinRate ? 'champ1' : 'champ2' },
            kda: { winner: champ1KDA > champ2KDA ? 'champ1' : 'champ2' },
            games: { winner: champ1.games > champ2.games ? 'champ1' : 'champ2' },
            csPerMin: { winner: champ1CSPerMin > champ2CSPerMin ? 'champ1' : 'champ2' },
            mastery: { winner: (champ1.masteryLevel || 0) > (champ2.masteryLevel || 0) ? 'champ1' : 'champ2' }
        };
    }

    generateComparisonSummary(champ1, champ2, comparison) {
        const champ1Wins = Object.values(comparison).filter(metric => metric.winner === 'champ1').length;
        const champ2Wins = Object.values(comparison).filter(metric => metric.winner === 'champ2').length;
        
        if (champ1Wins > champ2Wins) {
            return `${champ1.name} performs better overall with ${champ1Wins} winning metrics vs ${champ2.name}'s ${champ2Wins}.`;
        } else if (champ2Wins > champ1Wins) {
            return `${champ2.name} performs better overall with ${champ2Wins} winning metrics vs ${champ1.name}'s ${champ1Wins}.`;
        } else {
            return `Both champions show similar performance levels with ${champ1Wins} winning metrics each.`;
        }
    }

    renderMasteryProgression() {
        const masteryProgression = this.calculateMasteryProgression();
        
        const progressionContainer = document.createElement('div');
        progressionContainer.className = 'mastery-progression mb-4';
        progressionContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Mastery Progression</h5>
                    <div class="mastery-timeline">
                        ${masteryProgression.map(item => `
                            <div class="mastery-item">
                                <img src="${this.getChampionIcon(item.champion)}" class="champion-icon me-3">
                                <div class="mastery-info flex-grow-1">
                                    <h6 class="mb-1">${item.champion.name}</h6>
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <div class="mastery-level">Level ${item.currentLevel}</div>
                                        <div class="mastery-points text-muted">${item.currentPoints.toLocaleString()} points</div>
                                    </div>
                                    <div class="progress mb-1" style="height: 8px;">
                                        <div class="progress-bar ${this.getMasteryProgressColor(item.currentLevel)}" 
                                             role="progressbar" 
                                             style="width: ${item.progressPercent}%"
                                             aria-valuenow="${item.progressPercent}" 
                                             aria-valuemin="0" 
                                             aria-valuemax="100">
                                        </div>
                                    </div>
                                    ${item.nextLevel <= 7 ? `
                                        <small class="text-muted">
                                            ${item.pointsToNext.toLocaleString()} points to Level ${item.nextLevel}
                                        </small>
                                    ` : `
                                        <small class="text-success">
                                            <i class="bi bi-star-fill me-1"></i>Maximum Mastery Achieved!
                                        </small>
                                    `}
                                </div>
                                <div class="mastery-badge">
                                    <i class="bi bi-trophy${item.currentLevel >= 7 ? '-fill text-warning' : ' text-muted'}"></i>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${masteryProgression.length === 0 ? `
                        <p class="text-muted text-center">No mastery data available</p>
                    ` : ''}
                </div>
            </div>
        `;
        
        return progressionContainer;
    }

    calculateMasteryProgression() {
        const { masteryMap } = this.dataManager.getData();
        if (!masteryMap || masteryMap.size === 0) return [];
        
        const masteryThresholds = [0, 1800, 6000, 21000, 36000, 60000, 96000]; // M1-M7 thresholds
        
        return Array.from(masteryMap.entries())
            .map(([championId, mastery]) => {
                const champion = this.championStats.find(c => c.id == championId);
                if (!champion) return null;
                
                const currentLevel = mastery.level;
                const currentPoints = mastery.points;
                const nextLevel = Math.min(currentLevel + 1, 7);
                const nextThreshold = masteryThresholds[nextLevel] || masteryThresholds[7];
                const currentThreshold = masteryThresholds[currentLevel] || 0;
                
                let progressPercent;
                if (currentLevel >= 7) {
                    progressPercent = 100;
                } else {
                    const progressInLevel = currentPoints - currentThreshold;
                    const levelRange = nextThreshold - currentThreshold;
                    progressPercent = (progressInLevel / levelRange) * 100;
                }
                
                return {
                    champion,
                    currentLevel,
                    currentPoints,
                    nextLevel,
                    pointsToNext: Math.max(0, nextThreshold - currentPoints),
                    progressPercent: Math.max(0, Math.min(100, progressPercent))
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => {
                // Sort by level first (descending), then by progress within level (descending)
                if (a.currentLevel !== b.currentLevel) {
                    return b.currentLevel - a.currentLevel;
                }
                return b.progressPercent - a.progressPercent;
            })
            .slice(0, 10); // Show top 10 champions
    }

    getMasteryProgressColor(level) {
        switch (level) {
            case 7: return 'bg-warning';
            case 6: return 'bg-info';
            case 5: return 'bg-primary';
            case 4: return 'bg-success';
            default: return 'bg-secondary';
        }
    }

    createAdvancedFilters() {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'advanced-filters mb-4';
        filterContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h6 class="mb-3">
                        <i class="bi bi-funnel me-2"></i>Advanced Filters
                        <button id="toggle-filters" class="btn btn-sm btn-outline-secondary ms-2">
                            <i class="bi bi-chevron-down"></i> Show
                        </button>
                    </h6>
                    <div id="filter-panel" class="filter-panel" style="display: none;">
                        <div class="filter-row">
                            <div class="filter-group">
                                <label>Min Games:</label>
                                <input type="number" id="min-games-filter" class="form-control form-control-sm" min="1" value="1" placeholder="Minimum games">
                            </div>
                            <div class="filter-group">
                                <label>Min Win Rate (%):</label>
                                <input type="number" id="min-winrate-filter" class="form-control form-control-sm" min="0" max="100" value="0" placeholder="0-100">
                            </div>
                            <div class="filter-group">
                                <label>Max Win Rate (%):</label>
                                <input type="number" id="max-winrate-filter" class="form-control form-control-sm" min="0" max="100" value="100" placeholder="0-100">
                            </div>
                            <div class="filter-group">
                                <label>Min KDA:</label>
                                <input type="number" id="min-kda-filter" class="form-control form-control-sm" min="0" step="0.1" value="0" placeholder="0.0">
                            </div>
                            <div class="filter-group">
                                <label>Min Mastery Level:</label>
                                <select id="min-mastery-filter" class="form-select form-select-sm">
                                    <option value="0">Any</option>
                                    <option value="1">Level 1+</option>
                                    <option value="2">Level 2+</option>
                                    <option value="3">Level 3+</option>
                                    <option value="4">Level 4+</option>
                                    <option value="5">Level 5+</option>
                                    <option value="6">Level 6+</option>
                                    <option value="7">Level 7</option>
                                </select>
                            </div>
                            <div class="filter-group">
                                <label>Champion Name:</label>
                                <input type="text" id="champion-name-filter" class="form-control form-control-sm" placeholder="Search champion...">
                            </div>
                        </div>
                        <div class="filter-actions mt-3">
                            <button id="apply-filters-btn" class="btn btn-primary btn-sm me-2">Apply Filters</button>
                            <button id="reset-filters-btn" class="btn btn-secondary btn-sm me-2">Reset</button>
                            <button id="save-filter-preset-btn" class="btn btn-outline-info btn-sm">Save Preset</button>
                        </div>
                        <div id="filter-presets" class="filter-presets mt-2"></div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupFilterHandlers(filterContainer);
        return filterContainer;
    }

    setupFilterHandlers(container) {
        const toggleBtn = container.querySelector('#toggle-filters');
        const filterPanel = container.querySelector('#filter-panel');
        const applyBtn = container.querySelector('#apply-filters-btn');
        const resetBtn = container.querySelector('#reset-filters-btn');
        const savePresetBtn = container.querySelector('#save-filter-preset-btn');

        // Toggle filter panel
        toggleBtn.addEventListener('click', () => {
            const isVisible = filterPanel.style.display !== 'none';
            filterPanel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.innerHTML = isVisible ? 
                '<i class="bi bi-chevron-down"></i> Show' : 
                '<i class="bi bi-chevron-up"></i> Hide';
        });

        // Apply filters
        applyBtn.addEventListener('click', () => {
            const filters = this.getFilterValues(container);
            this.applyAdvancedFilters(filters);
        });

        // Reset filters
        resetBtn.addEventListener('click', () => {
            this.resetAdvancedFilters(container);
        });

        // Save preset
        savePresetBtn.addEventListener('click', () => {
            const filters = this.getFilterValues(container);
            this.saveFilterPreset(filters, container);
        });

        // Load existing presets
        this.loadFilterPresets(container);
    }

    getFilterValues(container) {
        return {
            minGames: parseInt(container.querySelector('#min-games-filter').value) || 0,
            minWinRate: parseFloat(container.querySelector('#min-winrate-filter').value) || 0,
            maxWinRate: parseFloat(container.querySelector('#max-winrate-filter').value) || 100,
            minKDA: parseFloat(container.querySelector('#min-kda-filter').value) || 0,
            minMastery: parseInt(container.querySelector('#min-mastery-filter').value) || 0,
            championName: container.querySelector('#champion-name-filter').value || ''
        };
    }

    applyAdvancedFilters(filters) {
        // Store original data if not already stored
        if (!this.originalChampionStats) {
            this.originalChampionStats = [...this.championStats];
        }

        // Apply filters
        this.championStats = this.originalChampionStats.filter(champ => {
            // Min games filter
            if (filters.minGames > 0 && champ.games < filters.minGames) return false;
            
            // Win rate filters
            const winRate = (champ.wins / champ.games) * 100;
            if (winRate < filters.minWinRate || winRate > filters.maxWinRate) return false;
            
            // KDA filter
            const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
            if (kda !== Infinity && kda < filters.minKDA) return false;
            
            // Mastery filter
            if (filters.minMastery > 0 && (champ.masteryLevel || 0) < filters.minMastery) return false;
            
            // Name filter
            if (filters.championName && !champ.name.toLowerCase().includes(filters.championName.toLowerCase())) return false;
            
            return true;
        });

        this.renderTable();
        this.updateFilterStatus(filters);
    }

    resetAdvancedFilters(container) {
        container.querySelector('#min-games-filter').value = 1;
        container.querySelector('#min-winrate-filter').value = 0;
        container.querySelector('#max-winrate-filter').value = 100;
        container.querySelector('#min-kda-filter').value = 0;
        container.querySelector('#min-mastery-filter').value = 0;
        container.querySelector('#champion-name-filter').value = '';
        
        // Restore original data
        if (this.originalChampionStats) {
            this.championStats = [...this.originalChampionStats];
            this.renderTable();
        }
        
        this.updateFilterStatus(null);
    }

    updateFilterStatus(filters) {
        // Find or create filter status
        let statusEl = document.querySelector('.filter-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.className = 'filter-status alert alert-info mt-2 mb-0';
            const filtersCard = document.querySelector('.advanced-filters .card-body');
            if (filtersCard) {
                filtersCard.appendChild(statusEl);
            }
        }

        if (filters) {
            const totalChampions = this.originalChampionStats ? this.originalChampionStats.length : this.championStats.length;
            const filteredCount = this.championStats.length;
            statusEl.innerHTML = `
                <i class="bi bi-filter me-2"></i>
                Showing ${filteredCount} of ${totalChampions} champions
                ${filteredCount !== totalChampions ? 
                    `<button class="btn btn-sm btn-outline-secondary ms-2" onclick="window.championPerformance?.resetAdvancedFilters(document.querySelector('.advanced-filters'))">Clear Filters</button>` : 
                    ''
                }
            `;
            statusEl.style.display = 'block';
        } else {
            statusEl.style.display = 'none';
        }
    }

    saveFilterPreset(filters, container) {
        const presetName = prompt('Enter a name for this filter preset:');
        if (!presetName) return;

        let presets = JSON.parse(localStorage.getItem('championFilterPresets') || '[]');
        presets.push({ name: presetName, filters: filters });
        localStorage.setItem('championFilterPresets', JSON.stringify(presets));
        
        this.loadFilterPresets(container);
    }

    loadFilterPresets(container) {
        const presets = JSON.parse(localStorage.getItem('championFilterPresets') || '[]');
        const presetsContainer = container.querySelector('#filter-presets');
        
        if (presets.length === 0) {
            presetsContainer.innerHTML = '';
            return;
        }

        presetsContainer.innerHTML = `
            <small class="text-muted">Saved Presets:</small>
            <div class="btn-group-sm mt-1">
                ${presets.map((preset, index) => `
                    <button class="btn btn-outline-secondary btn-sm me-1 mb-1" 
                            data-preset-index="${index}">
                        ${preset.name}
                    </button>
                `).join('')}
            </div>
        `;

        // Add preset click handlers
        presetsContainer.querySelectorAll('[data-preset-index]').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.presetIndex);
                const preset = presets[index];
                this.applyFilterPreset(preset.filters, container);
            });
        });
    }

    applyFilterPreset(filters, container) {
        container.querySelector('#min-games-filter').value = filters.minGames || 1;
        container.querySelector('#min-winrate-filter').value = filters.minWinRate || 0;
        container.querySelector('#max-winrate-filter').value = filters.maxWinRate || 100;
        container.querySelector('#min-kda-filter').value = filters.minKDA || 0;
        container.querySelector('#min-mastery-filter').value = filters.minMastery || 0;
        container.querySelector('#champion-name-filter').value = filters.championName || '';
        
        this.applyAdvancedFilters(filters);
    }

    // Export functionality
    createExportTools() {
        const exportContainer = document.createElement('div');
        exportContainer.className = 'export-tools mb-3';
        exportContainer.innerHTML = `
            <div class="d-flex justify-content-end">
                <div class="btn-group" role="group">
                    <button id="export-csv-btn" class="btn btn-outline-primary btn-sm">
                        <i class="bi bi-filetype-csv me-1"></i>Export CSV
                    </button>
                    <button id="export-json-btn" class="btn btn-outline-info btn-sm">
                        <i class="bi bi-filetype-json me-1"></i>Export JSON
                    </button>
                    <button id="print-report-btn" class="btn btn-outline-secondary btn-sm">
                        <i class="bi bi-printer me-1"></i>Print Report
                    </button>
                </div>
            </div>
        `;

        this.setupExportHandlers(exportContainer);
        return exportContainer;
    }

    setupExportHandlers(container) {
        const csvBtn = container.querySelector('#export-csv-btn');
        const jsonBtn = container.querySelector('#export-json-btn');
        const printBtn = container.querySelector('#print-report-btn');

        csvBtn.addEventListener('click', () => this.exportToCSV());
        jsonBtn.addEventListener('click', () => this.exportToJSON());
        printBtn.addEventListener('click', () => this.printReport());
    }

    exportToCSV() {
        const headers = [
            'Champion',
            'Games',
            'Wins',
            'Win Rate (%)',
            'KDA',
            'Avg Kills',
            'Avg Deaths',
            'Avg Assists',
            'Mastery Level',
            'Mastery Points',
            'Avg Vision Score',
            'Avg CS/min',
            'Avg Gold/min',
            'Kill Participation (%)',
            'First Blood',
            'First Tower'
        ];

        const csvData = [headers.join(',')];
        
        this.championStats.forEach(champ => {
            const winRate = ((champ.wins / champ.games) * 100).toFixed(1);
            const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
            const kdaDisplay = kda === Infinity ? 'Perfect' : kda.toFixed(2);
            const avgKills = (champ.kills / champ.games).toFixed(1);
            const avgDeaths = (champ.deaths / champ.games).toFixed(1);
            const avgAssists = (champ.assists / champ.games).toFixed(1);

            const row = [
                `"${champ.name}"`,
                champ.games,
                champ.wins,
                winRate,
                kdaDisplay,
                avgKills,
                avgDeaths,
                avgAssists,
                champ.masteryLevel || 0,
                champ.masteryPoints || 0,
                champ.avgVisionScore || 0,
                champ.avgCSPerMin || 0,
                champ.avgGoldPerMin || 0,
                champ.avgKillParticipation || 0,
                champ.firstBlood || 0,
                champ.firstTower || 0
            ];
            csvData.push(row.join(','));
        });

        this.downloadFile('champion-performance.csv', csvData.join('\n'), 'text/csv');
    }

    exportToJSON() {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalChampions: this.championStats.length,
            champions: this.championStats.map(champ => {
                const winRate = ((champ.wins / champ.games) * 100).toFixed(1);
                const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
                
                return {
                    name: champ.name,
                    id: champ.id,
                    games: champ.games,
                    wins: champ.wins,
                    winRate: parseFloat(winRate),
                    kda: kda === Infinity ? 'Perfect' : parseFloat(kda.toFixed(2)),
                    avgKills: parseFloat((champ.kills / champ.games).toFixed(1)),
                    avgDeaths: parseFloat((champ.deaths / champ.games).toFixed(1)),
                    avgAssists: parseFloat((champ.assists / champ.games).toFixed(1)),
                    masteryLevel: champ.masteryLevel || 0,
                    masteryPoints: champ.masteryPoints || 0,
                    advancedStats: {
                        avgVisionScore: parseFloat(champ.avgVisionScore) || 0,
                        avgCSPerMin: parseFloat(champ.avgCSPerMin) || 0,
                        avgGoldPerMin: parseFloat(champ.avgGoldPerMin) || 0,
                        avgKillParticipation: parseFloat(champ.avgKillParticipation) || 0,
                        firstBlood: champ.firstBlood || 0,
                        firstTower: champ.firstTower || 0,
                        avgEarlyGameScore: parseFloat(champ.avgEarlyGame) || 0,
                        avgLateGameScore: parseFloat(champ.avgLateGame) || 0
                    }
                };
            })
        };

        this.downloadFile('champion-performance.json', JSON.stringify(exportData, null, 2), 'application/json');
    }

    printReport() {
        const printWindow = window.open('', '_blank');
        const reportHTML = this.generatePrintReport();
        
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.print();
    }

    generatePrintReport() {
        const topChampions = this.getTopChampions('winRate', 10, 5);
        const currentDate = new Date().toLocaleDateString();
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Champion Performance Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 2rem; }
                    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1rem; margin-bottom: 2rem; }
                    .section { margin-bottom: 2rem; }
                    .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f5f5f5; font-weight: bold; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
                    .stat-item { padding: 1rem; border: 1px solid #ddd; border-radius: 0.5rem; }
                    .stat-value { font-size: 1.5rem; font-weight: bold; color: #0066cc; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Champion Performance Report</h1>
                    <p>Generated on ${currentDate}</p>
                </div>
                
                <div class="section">
                    <h2>Summary Statistics</h2>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${this.championStats.length}</div>
                            <div>Total Champions Played</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${this.championStats.reduce((sum, c) => sum + c.games, 0)}</div>
                            <div>Total Games</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${(this.championStats.reduce((sum, c) => sum + c.wins, 0) / this.championStats.reduce((sum, c) => sum + c.games, 0) * 100).toFixed(1)}%</div>
                            <div>Overall Win Rate</div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <h2>Top Performing Champions (Min 5 Games)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Champion</th>
                                <th>Games</th>
                                <th>Win Rate</th>
                                <th>KDA</th>
                                <th>Mastery Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${topChampions.map(champ => {
                                const winRate = ((champ.wins / champ.games) * 100).toFixed(1);
                                const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
                                const kdaDisplay = kda === Infinity ? 'Perfect' : kda.toFixed(2);
                                
                                return `
                                    <tr>
                                        <td>${champ.name}</td>
                                        <td>${champ.games}</td>
                                        <td>${winRate}%</td>
                                        <td>${kdaDisplay}</td>
                                        <td>${champ.masteryLevel || 'N/A'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <h2>All Champions</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Champion</th>
                                <th>Games</th>
                                <th>Win Rate</th>
                                <th>KDA</th>
                                <th>Avg CS/min</th>
                                <th>Mastery</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.championStats.map(champ => {
                                const winRate = ((champ.wins / champ.games) * 100).toFixed(1);
                                const kda = this.dataManager.calculateKDA(champ.kills, champ.deaths, champ.assists);
                                const kdaDisplay = kda === Infinity ? 'Perfect' : kda.toFixed(2);
                                
                                return `
                                    <tr>
                                        <td>${champ.name}</td>
                                        <td>${champ.games}</td>
                                        <td>${winRate}%</td>
                                        <td>${kdaDisplay}</td>
                                        <td>${champ.avgCSPerMin || 'N/A'}</td>
                                        <td>Level ${champ.masteryLevel || 0}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </body>
            </html>
        `;
    }

    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        // Show success notification
        this.showExportNotification(`Successfully exported ${filename}`);
    }

    showExportNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'alert alert-success export-notification';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.innerHTML = `
            <i class="bi bi-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close ms-2" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    destroy() {
        // Clean up event listeners if needed
        document.querySelectorAll('.sortable-header').forEach(header => {
            header.replaceWith(header.cloneNode(true));
        });
    }
}

// Export for module use
window.ChampionPerformance = ChampionPerformance;