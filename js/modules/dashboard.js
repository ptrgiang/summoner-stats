/**
 * Dashboard Module - Professional Analytics Dashboard
 */
class Dashboard {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.charts = {};
        this.liveMetrics = {};
        this.performanceCache = {};
        this.initialized = false;
    }

    init() {
        // Prevent multiple initializations
        if (this.initialized) {
            console.log('Dashboard already initialized, skipping...');
            return;
        }
        
        // Clean up any existing dynamic content first
        this.cleanup();
        
        console.log('Initializing Dashboard...');
        const data = this.dataManager.getData();
        
        this.renderKPIs(data);
        this.renderRankedStats(data);
        this.renderCharts(data);
        this.renderAdvancedTrends(data);
        this.renderLiveMetricsCard(data);
        this.renderPerformanceHeatmap(data);
        this.addPerformanceBadges(data);
        this.renderWinPredictionCard(data);
        this.renderComparativeAnalysis(data);
        this.renderChampionMasteryProgression(data);
        
        this.initialized = true;
        console.log('Dashboard initialization complete');
    }

    cleanup() {
        console.log('Cleaning up Dashboard...');
        
        // Clean up charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        
        // Clean up dynamic elements and rows
        const dynamicElements = [
            'live-metrics-container',
            'performance-heatmap-container',
            'game-details-tooltip',
            'win-prediction-container',
            'comparative-analysis-container',
            'performance-timeline-container',
            'timeline-match-tooltip',
            'mastery-progression-container',
            'mastery-details-tooltip',
            'dashboard-advanced-features',
            'dashboard-predictions-row',
            'dashboard-timeline-row',
            'dashboard-mastery-row'
        ];
        
        dynamicElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                console.log(`Removing element: ${id}`);
                element.remove();
            }
        });
        
        // Clean up performance badges
        document.querySelectorAll('.performance-badge').forEach(badge => badge.remove());
        
        // Reset initialization flag
        this.initialized = false;
    }

    renderKPIs(data) {
        const { mainPlayerName, playerMatches } = data;
        
        // Player name
        document.getElementById('player-name').textContent = mainPlayerName;
        document.getElementById('total-games').textContent = playerMatches.length;

        // Win rate with trend
        const wins = playerMatches.filter(m => m.playerParticipant.win).length;
        const winRate = this.dataManager.calculateWinRate(wins, playerMatches.length);
        document.getElementById('win-rate').textContent = `${winRate}%`;

        // Calculate trends for KPI indicators
        const recentGames = Math.min(10, playerMatches.length);
        const recentWins = playerMatches.slice(0, recentGames).filter(m => m.playerParticipant.win).length;
        const recentWinRate = this.dataManager.calculateWinRate(recentWins, recentGames);
        
        const winRateTrendEl = document.getElementById('winrate-trend');
        if (recentWinRate > parseFloat(winRate)) {
            winRateTrendEl.innerHTML = '<i class="bi bi-trend-up trend-up"></i>';
            winRateTrendEl.title = `Recent ${recentGames} games: ${recentWinRate}% (trending up)`;
        } else if (recentWinRate < parseFloat(winRate)) {
            winRateTrendEl.innerHTML = '<i class="bi bi-trend-down trend-down"></i>';
            winRateTrendEl.title = `Recent ${recentGames} games: ${recentWinRate}% (trending down)`;
        } else {
            winRateTrendEl.innerHTML = '<i class="bi bi-dash" style="color: #6b7280;"></i>';
            winRateTrendEl.title = `Recent ${recentGames} games: ${recentWinRate}% (stable)`;
        }

        // Games trend indicator
        const gamesTrendEl = document.getElementById('games-trend');
        gamesTrendEl.innerHTML = '<i class="bi bi-graph-up trend-up"></i>';
        gamesTrendEl.title = `Total games analyzed: ${playerMatches.length}`;
    }

    renderRankedStats(data) {
        const { rankedInfo } = data;
        
        if (rankedInfo) {
            const rankedStatsEl = document.getElementById('ranked-stats');
            rankedInfo.forEach(queue => {
                const queueType = queue.queueType.replace('RANKED_', '').replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                const rank = `${queue.tier} ${queue.rank}`;
                const winLoss = `${queue.wins}W / ${queue.losses}L`;
                const rankWinRate = this.dataManager.calculateWinRate(queue.wins, queue.wins + queue.losses);

                const col = document.createElement('div');
                col.className = 'col-md-6';
                col.innerHTML = `
                    <div class="card stat-card">
                        <div class="card-body">
                            <h5 class="card-title text-center">${queueType}</h5>
                            <div class="rank-crest-container" style="position: relative; width: 100px; height: 100px; margin: 0 auto;">
                                <img src="ranked-emblems/wings/${queue.tier.charAt(0).toUpperCase() + queue.tier.slice(1).toLowerCase()}.png" class="wing" alt="Wing" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                                <img src="ranked-emblems/Rank=${queue.tier.charAt(0).toUpperCase() + queue.tier.slice(1).toLowerCase()}.png" class="rank-crest" alt="Rank Crest" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                                <img src="ranked-emblems/tier-wings/${queue.tier.charAt(0).toUpperCase() + queue.tier.slice(1).toLowerCase()}.png" class="tier-wing" alt="Tier Wing" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                            </div>
                            <h6 class="card-subtitle mb-2 text-muted text-center">${rank} - ${queue.leaguePoints} LP</h6>
                            <p class="card-text text-center">${winLoss} (${rankWinRate}%)</p>
                        </div>
                    </div>
                `;
                rankedStatsEl.appendChild(col);
            });
        }
    }

    renderCharts(data) {
        const { playerMatches, championData } = data;
        
        // Calculate role statistics
        const roleStats = {};
        playerMatches.forEach(({ playerParticipant }) => {
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            if (!roleStats[role]) {
                roleStats[role] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
            }
            roleStats[role].games++;
            if (playerParticipant.win) roleStats[role].wins++;
            roleStats[role].kills += playerParticipant.kills;
            roleStats[role].deaths += playerParticipant.deaths;
            roleStats[role].assists += playerParticipant.assists;
        });

        // Role Distribution Chart
        const roleDistCtx = document.getElementById('role-distribution-chart').getContext('2d');
        this.charts.roleDistribution = ChartUtils.createPieChart(
            roleDistCtx,
            Object.keys(roleStats),
            Object.values(roleStats).map(s => s.games),
            'Games Played'
        );

        // Win/Loss Trend Chart
        const last20Games = playerMatches.slice(0, 20).reverse();
        const chartLabels = last20Games.map((g, i) => `Game ${playerMatches.length - 19 + i}`);
        const chartData = last20Games.map(g => g.playerParticipant.win ? 1 : 0);
        
        const winLossCtx = document.getElementById('win-loss-chart').getContext('2d');
        this.charts.winLoss = this.createInteractiveWinLossChart(winLossCtx, chartData, chartLabels, last20Games);

        // Gold per Minute Trend
        this.renderGPMChart(last20Games);

        // Game Mode Win Rate
        this.renderGameModeChart(playerMatches);

        // Damage Composition
        this.renderDamageComposition(playerMatches);

        // Champion Performance Charts
        this.renderChampionCharts(playerMatches, championData);
    }

    renderGPMChart(last20Games) {
        const gpmTrendCtx = document.getElementById('gpm-trend-chart').getContext('2d');
        const gpmData = last20Games.map(g => this.dataManager.calculateGoldPerMinute(g.playerParticipant.goldEarned, g.match.info.gameDuration));
        const avgGPM = gpmData.reduce((a, b) => a + b, 0) / gpmData.length;
        
        this.charts.gpmTrend = new Chart(gpmTrendCtx, {
            type: 'line',
            data: {
                labels: last20Games.map((g, i) => `Game ${i + 1}`),
                datasets: [{
                    label: 'Gold per Minute',
                    data: gpmData,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    pointBackgroundColor: 'rgba(255, 206, 86, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Average GPM',
                    data: new Array(gpmData.length).fill(avgGPM),
                    borderColor: 'rgba(156, 163, 175, 0.8)',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: ChartUtils.getDefaultTooltipStyle()
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ...ChartUtils.getDefaultScaleStyle()
                    },
                    x: ChartUtils.getDefaultScaleStyle()
                }
            }
        });
    }

    renderGameModeChart(playerMatches) {
        const gameModeStats = {};
        playerMatches.forEach(({ match, playerParticipant }) => {
            const gameMode = match.info.gameMode;
            if (!gameModeStats[gameMode]) {
                gameModeStats[gameMode] = { games: 0, wins: 0 };
            }
            gameModeStats[gameMode].games++;
            if (playerParticipant.win) {
                gameModeStats[gameMode].wins++;
            }
        });

        const gamemodeWinrateCtx = document.getElementById('gamemode-winrate-chart').getContext('2d');
        this.charts.gameModeWinRate = ChartUtils.createBarChart(
            gamemodeWinrateCtx,
            Object.keys(gameModeStats),
            Object.values(gameModeStats).map(s => this.dataManager.calculateWinRate(s.wins, s.games)),
            'Win Rate %',
            ChartUtils.getDefaultColors().info
        );
    }

    renderDamageComposition(playerMatches) {
        let totalPhysicalDamage = 0;
        let totalMagicDamage = 0;
        let totalTrueDamage = 0;
        
        playerMatches.forEach(({ playerParticipant }) => {
            totalPhysicalDamage += playerParticipant.physicalDamageDealtToChampions;
            totalMagicDamage += playerParticipant.magicDamageDealtToChampions;
            totalTrueDamage += playerParticipant.trueDamageDealtToChampions;
        });

        const damageCompCtx = document.getElementById('damage-composition-chart').getContext('2d');
        this.charts.damageComposition = new Chart(damageCompCtx, {
            type: 'doughnut',
            data: {
                labels: ['Physical Damage', 'Magic Damage', 'True Damage'],
                datasets: [{
                    data: [totalPhysicalDamage, totalMagicDamage, totalTrueDamage],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                cutout: '50%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: ChartUtils.getDefaultTooltipStyle()
                }
            }
        });
    }

    renderChampionCharts(playerMatches, championData) {
        const championStats = {};
        const championIdMap = new Map(Object.values(championData.data).map(c => [c.key, c]));

        playerMatches.forEach(({ playerParticipant }) => {
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
                    assists: 0 
                };
            }
            championStats[champId].games++;
            if (playerParticipant.win) championStats[champId].wins++;
            championStats[champId].kills += playerParticipant.kills;
            championStats[champId].deaths += playerParticipant.deaths;
            championStats[champId].assists += playerParticipant.assists;
        });

        const championStatsArray = Object.values(championStats);

        // Top 5 Champions by Win Rate
        const topChampsByWinRate = [...championStatsArray]
            .filter(c => c.games >= 5)
            .sort((a, b) => (b.wins / b.games) - (a.wins / a.games))
            .slice(0, 5);

        const topChampsWinRateCtx = document.getElementById('top-champs-winrate-chart').getContext('2d');
        this.charts.topChampsWinRate = ChartUtils.createBarChart(
            topChampsWinRateCtx,
            topChampsByWinRate.map(c => c.name),
            topChampsByWinRate.map(c => this.dataManager.calculateWinRate(c.wins, c.games)),
            'Win Rate %',
            ChartUtils.getDefaultColors().success,
            true
        );

        // Top 5 Champions by KDA
        const topChampsByKDA = [...championStatsArray]
            .filter(c => c.games >= 5)
            .sort((a, b) => {
                const kdaA = this.dataManager.calculateKDA(a.kills, a.deaths, a.assists);
                const kdaB = this.dataManager.calculateKDA(b.kills, b.deaths, b.assists);
                return kdaB - kdaA;
            })
            .slice(0, 5);

        const topChampsKdaCtx = document.getElementById('top-champs-kda-chart').getContext('2d');
        this.charts.topChampsKDA = ChartUtils.createBarChart(
            topChampsKdaCtx,
            topChampsByKDA.map(c => c.name),
            topChampsByKDA.map(c => {
                const kda = this.dataManager.calculateKDA(c.kills, c.deaths, c.assists);
                return kda === Infinity ? 99 : parseFloat(kda.toFixed(2));
            }),
            'Average KDA',
            ChartUtils.getDefaultColors().secondary,
            true
        );
    }

    // Advanced Trend Analysis System
    renderAdvancedTrends(data) {
        const trends = this.calculatePerformanceTrends(data);
        this.updateTrendIndicators(trends);
    }

    calculatePerformanceTrends(data) {
        const { playerMatches } = data;
        
        return {
            recentStreak: this.calculateWinStreak(playerMatches.slice(0, 5)),
            monthlyTrend: this.calculateMonthlyTrend(playerMatches),
            seasonalComparison: this.calculateSeasonalComparison(playerMatches),
            performanceScore: this.calculateOverallPerformanceScore(playerMatches)
        };
    }

    calculateWinStreak(recentMatches) {
        let currentStreak = 0;
        let streakType = 'none'; // 'win', 'loss', 'none'
        
        for (const { playerParticipant } of recentMatches) {
            if (playerParticipant.win) {
                if (streakType === 'win' || streakType === 'none') {
                    currentStreak++;
                    streakType = 'win';
                } else {
                    break;
                }
            } else {
                if (streakType === 'loss' || streakType === 'none') {
                    currentStreak++;
                    streakType = 'loss';
                } else {
                    break;
                }
            }
        }
        
        return { count: currentStreak, type: streakType };
    }

    calculateMonthlyTrend(playerMatches) {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const recentMatches = playerMatches.filter(({ match }) => 
            new Date(match.info.gameCreation) >= thirtyDaysAgo
        );
        
        const wins = recentMatches.filter(({ playerParticipant }) => playerParticipant.win).length;
        const winRate = this.dataManager.calculateWinRate(wins, recentMatches.length);
        
        return {
            games: recentMatches.length,
            winRate: parseFloat(winRate),
            avgKDA: this.calculateAverageKDA(recentMatches),
            avgGPM: this.calculateAverageGPM(recentMatches)
        };
    }

    calculateSeasonalComparison(playerMatches) {
        // Simple seasonal comparison - could be enhanced with actual season data
        const midPoint = Math.floor(playerMatches.length / 2);
        const recent = playerMatches.slice(0, midPoint);
        const older = playerMatches.slice(midPoint);
        
        return {
            recent: {
                winRate: this.calculateWinRateForMatches(recent),
                avgKDA: this.calculateAverageKDA(recent),
                avgGPM: this.calculateAverageGPM(recent),
                matches: recent
            },
            previous: {
                winRate: this.calculateWinRateForMatches(older),
                avgKDA: this.calculateAverageKDA(older),
                avgGPM: this.calculateAverageGPM(older),
                matches: older
            }
        };
    }

    calculateOverallPerformanceScore(playerMatches) {
        const recentMatches = playerMatches.slice(0, 20);
        const winRate = this.calculateWinRateForMatches(recentMatches);
        const avgKDA = this.calculateAverageKDA(recentMatches);
        const avgGPM = this.calculateAverageGPM(recentMatches);
        
        // Weighted performance score (0-100)
        const score = (
            (winRate * 0.4) +
            (Math.min(avgKDA * 10, 50) * 0.3) +
            (Math.min(avgGPM / 10, 50) * 0.3)
        );
        
        return Math.round(score);
    }

    // Live Performance Metrics
    renderLiveMetricsCard(data) {
        const metrics = this.calculateLiveMetrics(data);
        
        // Check if live metrics card container exists, if not create it
        let container = document.getElementById('live-metrics-container');
        if (container) {
            console.log('Live metrics container already exists, updating content only');
        } else {
            console.log('Creating new live metrics container');
            container = document.createElement('div');
            container.id = 'live-metrics-container';
            container.className = 'col-lg-6 mb-4';
            
            // Get or create the advanced features row
            let advancedRow = document.getElementById('dashboard-advanced-features');
            if (!advancedRow) {
                console.log('Creating dashboard-advanced-features row');
                advancedRow = document.createElement('div');
                advancedRow.id = 'dashboard-advanced-features';
                advancedRow.className = 'row d-flex';
                document.querySelector('#dashboard').appendChild(advancedRow);
            }
            advancedRow.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="card stat-card live-metrics h-100">
                <div class="card-body">
                    <h5 class="card-title">
                        <i class="bi bi-activity me-2 text-success"></i>Live Performance Metrics
                    </h5>
                    <div class="live-metrics-content mt-3">
                        <div class="row g-2">
                            <div class="col-6">
                                <div class="live-metric-box">
                                    <div class="live-metric-value ${this.getStreakClass(metrics.currentStreak)}">${this.formatStreak(metrics.currentStreak)}</div>
                                    <div class="live-metric-label">Current Streak</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="live-metric-box">
                                    <div class="live-metric-value text-primary">${metrics.performanceScore}/100</div>
                                    <div class="live-metric-label">Performance Score</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="live-metric-box">
                                    <div class="live-metric-value text-info">${metrics.averageGameTime}min</div>
                                    <div class="live-metric-label">Avg Game Time</div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="live-metric-box">
                                    <div class="live-metric-value text-warning">${metrics.favoriteDayOfWeek}</div>
                                    <div class="live-metric-label">Best Day</div>
                                </div>
                            </div>
                            <div class="col-12">
                                <div class="live-metric-box">
                                    <div class="live-metric-value text-secondary">${metrics.peakPlayingHours}</div>
                                    <div class="live-metric-label">Peak Hours</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateLiveMetrics(data) {
        const { playerMatches } = data;
        const trends = this.calculatePerformanceTrends(data);
        
        return {
            currentStreak: trends.recentStreak,
            averageGameTime: this.calculateAverageGameTime(playerMatches),
            performanceScore: trends.performanceScore,
            favoriteDayOfWeek: this.calculateBestDayOfWeek(playerMatches),
            peakPlayingHours: this.calculatePeakPlayingHours(playerMatches)
        };
    }

    // Performance Heatmap Calendar
    renderPerformanceHeatmap(data) {
        const { playerMatches } = data;
        const heatmapData = this.calculateDailyPerformance(playerMatches);
        
        // Check if heatmap container exists
        let container = document.getElementById('performance-heatmap-container');
        if (container) {
            console.log('Performance heatmap container already exists, updating content only');
        } else {
            console.log('Creating new performance heatmap container');
            container = document.createElement('div');
            container.id = 'performance-heatmap-container';
            container.className = 'col-lg-6 mb-4';
            
            // Use the same advanced features row
            let advancedRow = document.getElementById('dashboard-advanced-features');
            if (!advancedRow) {
                console.log('Creating dashboard-advanced-features row');
                advancedRow = document.createElement('div');
                advancedRow.id = 'dashboard-advanced-features';
                advancedRow.className = 'row d-flex';
                document.querySelector('#dashboard').appendChild(advancedRow);
            }
            advancedRow.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="card stat-card h-100">
                <div class="card-body">
                    <h5 class="card-title">
                        <i class="bi bi-calendar-heat me-2 text-warning"></i>Performance Heatmap (Last 30 Days)
                    </h5>
                    <div class="performance-heatmap" id="performance-heatmap"></div>
                    <div class="heatmap-legend mt-3 d-flex align-items-center justify-content-center">
                        <span class="me-2">Low</span>
                        <div class="legend-gradient"></div>
                        <span class="ms-2">High</span>
                    </div>
                </div>
            </div>
        `;
        
        this.renderHeatmapCells(heatmapData);
    }

    calculateDailyPerformance(playerMatches) {
        const dailyPerformance = {};
        const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
        
        playerMatches
            .filter(({ match }) => new Date(match.info.gameCreation) >= thirtyDaysAgo)
            .forEach(({ match, playerParticipant }) => {
                const date = new Date(match.info.gameCreation).toDateString();
                
                if (!dailyPerformance[date]) {
                    dailyPerformance[date] = { games: 0, wins: 0, totalKDA: 0, totalGPM: 0 };
                }
                
                dailyPerformance[date].games++;
                if (playerParticipant.win) dailyPerformance[date].wins++;
                
                const kda = this.dataManager.calculateKDA(
                    playerParticipant.kills,
                    playerParticipant.deaths,
                    playerParticipant.assists
                );
                dailyPerformance[date].totalKDA += kda === Infinity ? 10 : kda;
                dailyPerformance[date].totalGPM += this.dataManager.calculateGoldPerMinute(
                    playerParticipant.goldEarned,
                    match.info.gameDuration
                );
            });
        
        return Object.entries(dailyPerformance).map(([date, stats]) => ({
            date,
            games: stats.games,
            winRate: this.dataManager.calculateWinRate(stats.wins, stats.games),
            avgKDA: stats.totalKDA / stats.games,
            avgGPM: stats.totalGPM / stats.games,
            intensity: this.calculateIntensity(stats.wins / stats.games, stats.totalKDA / stats.games)
        }));
    }

    renderHeatmapCells(heatmapData) {
        const heatmapContainer = document.getElementById('performance-heatmap');
        if (!heatmapContainer) return;
        
        heatmapContainer.innerHTML = '';
        
        heatmapData.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = `heatmap-cell intensity-${day.intensity}`;
            dayCell.title = `${day.date}: ${day.winRate}% WR, ${day.games} games, ${day.avgKDA.toFixed(2)} KDA`;
            dayCell.style.backgroundColor = this.getHeatmapColor(day.winRate);
            heatmapContainer.appendChild(dayCell);
        });
    }

    getHeatmapColor(winRate) {
        const intensity = Math.min(100, Math.max(0, winRate)) / 100;
        const red = Math.floor(255 * (1 - intensity));
        const green = Math.floor(255 * intensity);
        return `rgb(${red}, ${green}, 0)`;
    }

    calculateIntensity(winRate, avgKDA) {
        return Math.min(5, Math.floor(((winRate * 0.6) + (Math.min(avgKDA, 5) * 0.4 * 20)) / 20));
    }

    // Performance Badges System
    addPerformanceBadges(data) {
        const achievements = this.calculateAchievements(data);
        
        achievements.forEach((achievement, index) => {
            setTimeout(() => {
                this.createPerformanceBadge(achievement, index);
            }, index * 200); // Stagger badge appearances
        });
    }

    calculateAchievements(data) {
        const { playerMatches } = data;
        const achievements = [];
        const trends = this.calculatePerformanceTrends(data);
        
        // Win streak achievement
        if (trends.recentStreak.count >= 3 && trends.recentStreak.type === 'win') {
            achievements.push({
                icon: 'bi-fire',
                label: `${trends.recentStreak.count} Game Win Streak`,
                color: 'success'
            });
        }
        
        // High performance score
        if (trends.performanceScore >= 80) {
            achievements.push({
                icon: 'bi-star-fill',
                label: 'Elite Performance',
                color: 'warning'
            });
        }
        
        // Consistent player
        const totalGames = playerMatches.length;
        if (totalGames >= 100) {
            achievements.push({
                icon: 'bi-trophy-fill',
                label: 'Veteran Player',
                color: 'info'
            });
        }
        
        return achievements;
    }

    createPerformanceBadge(achievement, index) {
        const badge = document.createElement('div');
        badge.className = 'performance-badge fade-in';
        badge.style.cssText = `
            position: fixed;
            top: ${100 + (index * 60)}px;
            right: 20px;
            z-index: 1050;
            padding: 0.75rem 1rem;
            border-radius: 0.5rem;
            background: linear-gradient(135deg, var(--${achievement.color}-color), var(--${achievement.color}-border));
            color: white;
            font-weight: 600;
            animation: slideInRight 0.5s ease-out;
        `;
        
        badge.innerHTML = `
            <i class="${achievement.icon} me-2"></i>
            ${achievement.label}
        `;
        
        document.body.appendChild(badge);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            badge.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => badge.remove(), 500);
        }, 5000);
    }

    // Interactive Chart Enhancements
    createInteractiveWinLossChart(ctx, chartData, chartLabels, last20Games) {
        const chart = ChartUtils.createWinLossChart(ctx, chartData, chartLabels);
        
        // Add click interaction
        chart.options.onClick = (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const matchData = last20Games[index];
                this.showGameDetails(matchData, event);
            }
        };
        
        return chart;
    }

    showGameDetails(matchData, event) {
        // Create tooltip element
        let tooltip = document.getElementById('game-details-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'game-details-tooltip';
            tooltip.className = 'game-details-tooltip';
            document.body.appendChild(tooltip);
        }
        
        const { playerParticipant, match } = matchData;
        const kda = `${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}`;
        const gameDate = new Date(match.info.gameCreation).toLocaleDateString();
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <img src="${this.dataManager.getChampionIconUrl(playerParticipant.championName, '13.24.1')}" 
                     alt="${playerParticipant.championName}" class="champion-icon" />
                <div>
                    <strong>${playerParticipant.championName}</strong>
                    <div class="text-muted small">${gameDate}</div>
                </div>
            </div>
            <div class="tooltip-stats">
                <div>KDA: <strong>${kda}</strong></div>
                <div>Gold: <strong>${playerParticipant.goldEarned.toLocaleString()}</strong></div>
                <div>Result: <strong class="${playerParticipant.win ? 'text-success' : 'text-danger'}">
                    ${playerParticipant.win ? 'Victory' : 'Defeat'}
                </strong></div>
            </div>
        `;
        
        // Position tooltip near mouse
        tooltip.style.cssText = `
            position: absolute;
            left: ${event.pageX + 10}px;
            top: ${event.pageY - 10}px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 1rem;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (tooltip) tooltip.remove();
        }, 3000);
    }

    // Utility methods for calculations
    calculateWinRateForMatches(matches) {
        const wins = matches.filter(({ playerParticipant }) => playerParticipant.win).length;
        return parseFloat(this.dataManager.calculateWinRate(wins, matches.length));
    }

    calculateAverageKDA(matches) {
        const totalKDA = matches.reduce((sum, { playerParticipant }) => {
            const kda = this.dataManager.calculateKDA(
                playerParticipant.kills,
                playerParticipant.deaths,
                playerParticipant.assists
            );
            return sum + (kda === Infinity ? 10 : kda);
        }, 0);
        
        return matches.length > 0 ? totalKDA / matches.length : 0;
    }

    calculateAverageGPM(matches) {
        const totalGPM = matches.reduce((sum, { playerParticipant, match }) => {
            return sum + this.dataManager.calculateGoldPerMinute(
                playerParticipant.goldEarned,
                match.info.gameDuration
            );
        }, 0);
        
        return matches.length > 0 ? totalGPM / matches.length : 0;
    }

    calculateAverageGameTime(matches) {
        const totalTime = matches.reduce((sum, { match }) => sum + match.info.gameDuration, 0);
        return matches.length > 0 ? Math.round((totalTime / matches.length) / 60) : 0;
    }

    calculateBestDayOfWeek(matches) {
        const dayStats = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        matches.forEach(({ match, playerParticipant }) => {
            const day = new Date(match.info.gameCreation).getDay();
            const dayName = dayNames[day];
            
            if (!dayStats[dayName]) {
                dayStats[dayName] = { games: 0, wins: 0 };
            }
            
            dayStats[dayName].games++;
            if (playerParticipant.win) dayStats[dayName].wins++;
        });
        
        let bestDay = 'Monday';
        let bestWinRate = 0;
        
        Object.entries(dayStats).forEach(([day, stats]) => {
            const winRate = stats.wins / stats.games;
            if (winRate > bestWinRate && stats.games >= 3) {
                bestWinRate = winRate;
                bestDay = day;
            }
        });
        
        return bestDay;
    }

    calculatePeakPlayingHours(matches) {
        const hourStats = {};
        
        matches.forEach(({ match, playerParticipant }) => {
            const hour = new Date(match.info.gameCreation).getHours();
            
            if (!hourStats[hour]) {
                hourStats[hour] = { games: 0, wins: 0 };
            }
            
            hourStats[hour].games++;
            if (playerParticipant.win) hourStats[hour].wins++;
        });
        
        let peakHour = 12;
        let peakPerformance = 0;
        
        Object.entries(hourStats).forEach(([hour, stats]) => {
            const performance = (stats.wins / stats.games) * Math.log(stats.games + 1);
            if (performance > peakPerformance) {
                peakPerformance = performance;
                peakHour = parseInt(hour);
            }
        });
        
        return `${peakHour}:00 - ${peakHour + 1}:00`;
    }

    updateTrendIndicators(trends) {
        // Enhanced trend indicator updates with more sophisticated logic
        const winRateTrendEl = document.getElementById('winrate-trend');
        if (winRateTrendEl && trends.seasonalComparison) {
            const recent = trends.seasonalComparison.recent.winRate;
            const previous = trends.seasonalComparison.previous.winRate;
            
            if (recent > previous + 5) {
                winRateTrendEl.innerHTML = '<i class="bi bi-trend-up trend-up"></i>';
                winRateTrendEl.title = `Improving: ${recent.toFixed(1)}% vs ${previous.toFixed(1)}%`;
            } else if (recent < previous - 5) {
                winRateTrendEl.innerHTML = '<i class="bi bi-trend-down trend-down"></i>';
                winRateTrendEl.title = `Declining: ${recent.toFixed(1)}% vs ${previous.toFixed(1)}%`;
            } else {
                winRateTrendEl.innerHTML = '<i class="bi bi-dash" style="color: #6b7280;"></i>';
                winRateTrendEl.title = `Stable: ${recent.toFixed(1)}%`;
            }
        }
    }

    // Win Rate Prediction System
    renderWinPredictionCard(data) {
        const prediction = this.calculateWinPrediction(data);
        
        let container = document.getElementById('win-prediction-container');
        if (container) {
            console.log('Win prediction container already exists, updating content only');
        } else {
            console.log('Creating new win prediction container');
            container = document.createElement('div');
            container.id = 'win-prediction-container';
            container.className = 'col-lg-4 mb-4';
            
            // Create a separate row for full-width components
            let predictionsRow = document.getElementById('dashboard-predictions-row');
            if (!predictionsRow) {
                console.log('Creating dashboard-predictions-row');
                predictionsRow = document.createElement('div');
                predictionsRow.id = 'dashboard-predictions-row';
                predictionsRow.className = 'row d-flex';
                document.querySelector('#dashboard').appendChild(predictionsRow);
            }
            predictionsRow.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="card stat-card prediction-card h-100">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">
                        <i class="bi bi-magic me-2 text-primary"></i>Next Game Prediction
                    </h5>
                    <div class="prediction-content flex-grow-1 d-flex flex-column justify-content-center">
                        <div class="prediction-gauge">
                            <div class="gauge-container">
                                <div class="gauge-fill" style="width: ${prediction.nextGamePrediction}%"></div>
                                <div class="gauge-text">${Math.round(prediction.nextGamePrediction)}%</div>
                            </div>
                            <div class="prediction-label">Win Probability</div>
                        </div>
                        <div class="prediction-factors mt-3">
                            <div class="factor">
                                <span class="factor-label">Confidence:</span>
                                <span class="factor-value ${this.getConfidenceClass(prediction.confidence)}">${prediction.confidence}%</span>
                            </div>
                        </div>
                        <div class="prediction-recommendations mt-3">
                            <h6>Recommendations:</h6>
                            <ul class="list-unstyled">
                                ${prediction.recommendations.map(rec => `<li><i class="bi bi-arrow-right me-2"></i>${rec}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateWinPrediction(data) {
        const { playerMatches } = data;
        const recentForm = playerMatches.slice(0, 20);
        
        const factors = {
            recentWinRate: this.calculateWinRateForMatches(recentForm),
            roleConsistency: this.calculateRoleConsistency(recentForm),
            championComfort: this.calculateChampionFamiliarity(recentForm),
            timeOfDay: this.analyzeTimeOfDayPerformance(recentForm),
            streakMomentum: this.calculateStreakMomentum(recentForm)
        };
        
        // Weighted prediction algorithm
        const prediction = (
            factors.recentWinRate * 0.35 +
            factors.roleConsistency * 0.15 +
            factors.championComfort * 0.25 +
            factors.timeOfDay * 0.15 +
            factors.streakMomentum * 0.10
        );
        
        return {
            nextGamePrediction: Math.max(20, Math.min(80, prediction)),
            confidence: this.calculatePredictionConfidence(factors),
            recommendations: this.generateRecommendations(factors),
            factors: factors
        };
    }

    calculateRoleConsistency(matches) {
        const roleCounts = {};
        matches.forEach(({ playerParticipant }) => {
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
        
        const maxRoleCount = Math.max(...Object.values(roleCounts));
        return (maxRoleCount / matches.length) * 100;
    }

    calculateChampionFamiliarity(matches) {
        const championCounts = {};
        let totalComfort = 0;
        
        matches.forEach(({ playerParticipant }) => {
            const champion = playerParticipant.championName;
            championCounts[champion] = (championCounts[champion] || 0) + 1;
        });
        
        Object.values(championCounts).forEach(count => {
            totalComfort += Math.min(count * 15, 60); // Cap at 60 for mastery
        });
        
        return Math.min(totalComfort / matches.length, 70);
    }

    analyzeTimeOfDayPerformance(matches) {
        const currentHour = new Date().getHours();
        const hourlyPerformance = {};
        
        matches.forEach(({ match, playerParticipant }) => {
            const hour = new Date(match.info.gameCreation).getHours();
            const hourGroup = Math.floor(hour / 4) * 4; // Group into 4-hour blocks
            
            if (!hourlyPerformance[hourGroup]) {
                hourlyPerformance[hourGroup] = { games: 0, wins: 0 };
            }
            
            hourlyPerformance[hourGroup].games++;
            if (playerParticipant.win) hourlyPerformance[hourGroup].wins++;
        });
        
        const currentHourGroup = Math.floor(currentHour / 4) * 4;
        const currentPerformance = hourlyPerformance[currentHourGroup];
        
        if (currentPerformance && currentPerformance.games >= 3) {
            return (currentPerformance.wins / currentPerformance.games) * 100;
        }
        
        return 50; // Neutral if no data
    }

    calculateStreakMomentum(matches) {
        const recent5 = matches.slice(0, 5);
        let wins = 0;
        let momentum = 50; // Start neutral
        
        recent5.forEach(({ playerParticipant }, index) => {
            if (playerParticipant.win) {
                wins++;
                momentum += (5 - index) * 2; // More recent wins have higher impact
            } else {
                momentum -= (5 - index) * 1.5;
            }
        });
        
        return Math.max(0, Math.min(100, momentum));
    }

    calculatePredictionConfidence(factors) {
        const variance = Object.values(factors).reduce((sum, value) => {
            return sum + Math.pow(value - 50, 2);
        }, 0) / Object.values(factors).length;
        
        const consistency = 100 - (variance / 25); // Normalize variance to confidence
        return Math.max(60, Math.min(95, Math.round(consistency)));
    }

    generateRecommendations(factors) {
        const recommendations = [];
        
        if (factors.roleConsistency < 70) {
            recommendations.push("Stick to your main role for better consistency");
        }
        
        if (factors.championComfort < 50) {
            recommendations.push("Play familiar champions you've mastered");
        }
        
        if (factors.timeOfDay < 45) {
            recommendations.push("Consider playing during your peak performance hours");
        }
        
        if (factors.streakMomentum > 70) {
            recommendations.push("You're on a hot streak - keep the momentum!");
        } else if (factors.streakMomentum < 30) {
            recommendations.push("Take a break and reset your mental state");
        }
        
        if (factors.recentWinRate > 60) {
            recommendations.push("Your recent form is strong - maintain your playstyle");
        }
        
        return recommendations.length > 0 ? recommendations : ["Keep playing and improving your skills"];
    }

    getConfidenceClass(confidence) {
        if (confidence >= 80) return 'text-success';
        if (confidence >= 60) return 'text-warning';
        return 'text-danger';
    }

    // Comparative Analysis Charts
    renderComparativeAnalysis(data) {
        const { playerMatches } = data;
        const comparison = this.calculateSeasonalComparison(playerMatches);
        
        let container = document.getElementById('comparative-analysis-container');
        if (container) {
            console.log('Comparative analysis container already exists, updating content only');
        } else {
            console.log('Creating new comparative analysis container');
            container = document.createElement('div');
            container.id = 'comparative-analysis-container';
            container.className = 'col-lg-8 mb-4';
            
            // Use predictions row for layout
            let predictionsRow = document.getElementById('dashboard-predictions-row');
            if (!predictionsRow) {
                console.log('Creating dashboard-predictions-row');
                predictionsRow = document.createElement('div');
                predictionsRow.id = 'dashboard-predictions-row';
                predictionsRow.className = 'row d-flex';
                document.querySelector('#dashboard').appendChild(predictionsRow);
            }
            predictionsRow.appendChild(container);
        }
        
        container.innerHTML = `
            <div class="card stat-card h-100">
                <div class="card-body">
                    <h5 class="card-title">
                        <i class="bi bi-graph-up-arrow me-2 text-info"></i>Performance Comparison
                    </h5>
                    <div class="chart-container" style="position: relative; height: 60vh; width: 100%">
                        <canvas id="seasonal-comparison-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        this.renderSeasonalRadarChart(comparison);
        this.renderPerformanceTimeline(data);
    }

    // Performance Timeline Implementation
    renderPerformanceTimeline(data) {
        const { playerMatches } = data;
        
        let timelineContainer = document.getElementById('performance-timeline-container');
        if (timelineContainer) {
            console.log('Performance timeline container already exists, updating content only');
        } else {
            console.log('Creating new performance timeline container');
            timelineContainer = document.createElement('div');
            timelineContainer.id = 'performance-timeline-container';
            timelineContainer.className = 'col-lg-12 mb-4';
            
            // Create a separate row for full-width timeline
            let timelineRow = document.getElementById('dashboard-timeline-row');
            if (!timelineRow) {
                console.log('Creating dashboard-timeline-row');
                timelineRow = document.createElement('div');
                timelineRow.id = 'dashboard-timeline-row';
                timelineRow.className = 'row';
                document.querySelector('#dashboard').appendChild(timelineRow);
            }
            timelineRow.appendChild(timelineContainer);
        }
        
        timelineContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-clock-history me-2 text-primary"></i>Performance Timeline
                        </h5>
                        <div class="timeline-controls">
                            <select id="timeline-timeframe" class="form-select form-select-sm" style="width: auto;">
                                <option value="30">Last 30 Games</option>
                                <option value="50">Last 50 Games</option>
                                <option value="100">Last 100 Games</option>
                                <option value="all" selected>All Games</option>
                            </select>
                        </div>
                    </div>
                    <div class="chart-container" style="position: relative; height: 60vh; width: 100%">
                        <canvas id="performance-timeline-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        this.createPerformanceTimelineChart(playerMatches);
        this.attachTimelineControls(playerMatches);
    }

    createPerformanceTimelineChart(playerMatches, gameLimit = null) {
        const gamesToShow = gameLimit ? playerMatches.slice(0, gameLimit) : playerMatches;
        const timelineData = this.calculateTimelineData(gamesToShow.reverse());
        
        const ctx = document.getElementById('performance-timeline-chart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (this.charts.performanceTimeline) {
            this.charts.performanceTimeline.destroy();
        }
        
        this.charts.performanceTimeline = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Win Rate (%)',
                    data: timelineData.winRate,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    pointBackgroundColor: timelineData.winRate.map(wr => wr >= 50 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y'
                }, {
                    label: 'KDA Trend',
                    data: timelineData.kda,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.1)',
                    pointBackgroundColor: 'rgba(255, 206, 86, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1'
                }, {
                    label: 'Gold per Minute',
                    data: timelineData.gpm,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                    pointBackgroundColor: 'rgba(153, 102, 255, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y2'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        ...ChartUtils.getDefaultTooltipStyle(),
                        callbacks: {
                            title: function(context) {
                                return `Game ${context[0].label}`;
                            },
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.y;
                                
                                if (label === 'Win Rate (%)') return `${label}: ${value.toFixed(1)}%`;
                                if (label === 'KDA Trend') return `${label}: ${value.toFixed(2)}`;
                                if (label === 'Gold per Minute') return `${label}: ${Math.round(value)}`;
                                
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ...ChartUtils.getDefaultScaleStyle(),
                        title: {
                            display: true,
                            text: 'Games (Most Recent ←→ Oldest)',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        ticks: {
                            maxTicksLimit: 15,
                            autoSkip: true
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        max: 100,
                        ...ChartUtils.getDefaultScaleStyle(),
                        title: {
                            display: true,
                            text: 'Win Rate (%)',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)',
                            drawOnChartArea: true,
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 10,
                        ...ChartUtils.getDefaultScaleStyle(),
                        title: {
                            display: true,
                            text: 'KDA Ratio',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: false,
                        beginAtZero: true
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const matchData = gamesToShow[index];
                        this.showTimelineMatchDetails(matchData, event);
                    }
                }
            }
        });
    }

    calculateTimelineData(matches) {
        const windowSize = 5; // 5-game rolling average
        const labels = [];
        const winRate = [];
        const kda = [];
        const gpm = [];
        
        for (let i = 0; i < matches.length; i++) {
            const windowStart = Math.max(0, i - windowSize + 1);
            const window = matches.slice(windowStart, i + 1);
            
            // Calculate rolling averages
            const wins = window.filter(m => m.playerParticipant.win).length;
            const avgWinRate = (wins / window.length) * 100;
            
            const avgKDA = window.reduce((sum, m) => {
                const matchKDA = this.dataManager.calculateKDA(
                    m.playerParticipant.kills,
                    m.playerParticipant.deaths,
                    m.playerParticipant.assists
                );
                return sum + (matchKDA === Infinity ? 10 : Math.min(matchKDA, 10));
            }, 0) / window.length;
            
            const avgGPM = window.reduce((sum, m) => {
                return sum + this.dataManager.calculateGoldPerMinute(
                    m.playerParticipant.goldEarned,
                    m.match.info.gameDuration
                );
            }, 0) / window.length;
            
            labels.push(i + 1);
            winRate.push(avgWinRate);
            kda.push(avgKDA);
            gpm.push(avgGPM);
        }
        
        return { labels, winRate, kda, gpm };
    }

    attachTimelineControls(playerMatches) {
        const timeframeSelect = document.getElementById('timeline-timeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                const gameLimit = value === 'all' ? null : parseInt(value);
                this.createPerformanceTimelineChart(playerMatches, gameLimit);
            });
        }
    }

    showTimelineMatchDetails(matchData, event) {
        // Enhanced timeline match details tooltip
        let tooltip = document.getElementById('timeline-match-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'timeline-match-tooltip';
            tooltip.className = 'timeline-match-tooltip';
            document.body.appendChild(tooltip);
        }
        
        const { playerParticipant, match } = matchData;
        const kda = `${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}`;
        const gameDate = new Date(match.info.gameCreation).toLocaleDateString();
        const gameTime = Math.round(match.info.gameDuration / 60);
        
        tooltip.innerHTML = `
            <div class="timeline-tooltip-header">
                <img src="${this.dataManager.getChampionIconUrl(playerParticipant.championName, '13.24.1')}" 
                     alt="${playerParticipant.championName}" class="champion-icon" />
                <div>
                    <strong>${playerParticipant.championName}</strong>
                    <div class="text-muted small">${gameDate} • ${gameTime}min</div>
                </div>
            </div>
            <div class="timeline-tooltip-stats">
                <div class="stat-grid">
                    <div>KDA: <strong>${kda}</strong></div>
                    <div>Gold: <strong>${playerParticipant.goldEarned.toLocaleString()}</strong></div>
                    <div>CS: <strong>${playerParticipant.totalMinionsKilled + playerParticipant.neutralMinionsKilled}</strong></div>
                    <div class="result ${playerParticipant.win ? 'win' : 'loss'}">
                        ${playerParticipant.win ? 'Victory' : 'Defeat'}
                    </div>
                </div>
            </div>
        `;
        
        // Position tooltip near mouse
        const rect = event.target.getBoundingClientRect();
        tooltip.style.cssText = `
            position: fixed;
            left: ${event.clientX + 10}px;
            top: ${event.clientY - 10}px;
            max-width: 280px;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (tooltip) tooltip.remove();
        }, 4000);
    }

    // Champion Mastery Progression Implementation
    renderChampionMasteryProgression(data) {
        const { playerMatches, championData, masteryData } = data;
        
        let masteryContainer = document.getElementById('mastery-progression-container');
        if (masteryContainer) {
            console.log('Mastery progression container already exists, updating content only');
        } else {
            console.log('Creating new mastery progression container');
            masteryContainer = document.createElement('div');
            masteryContainer.id = 'mastery-progression-container';
            masteryContainer.className = 'col-lg-12 mb-4';
            
            // Create a separate row for mastery progression
            let masteryRow = document.getElementById('dashboard-mastery-row');
            if (!masteryRow) {
                console.log('Creating dashboard-mastery-row');
                masteryRow = document.createElement('div');
                masteryRow.id = 'dashboard-mastery-row';
                masteryRow.className = 'row';
                document.querySelector('#dashboard').appendChild(masteryRow);
            }
            masteryRow.appendChild(masteryContainer);
        }
        
        masteryContainer.innerHTML = `
            <div class="card stat-card mastery-card">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-trophy me-2 text-warning"></i>Champion Mastery Progression
                        </h5>
                        <select id="mastery-metric-select" class="form-select form-select-sm" style="width: auto;">
                            <option value="improvement">Improvement Rate</option>
                            <option value="consistency">Consistency</option>
                            <option value="recent">Recent Form</option>
                        </select>
                    </div>
                    <div class="chart-container" style="position: relative; height: 60vh; width: 100%">
                        <canvas id="mastery-progression-chart"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        this.createMasteryProgressionChart(playerMatches, championData, masteryData);
        this.attachMasteryControls(playerMatches, championData, masteryData);
    }

    createMasteryProgressionChart(playerMatches, championData, masteryData, metric = 'improvement') {
        const ctx = document.getElementById('mastery-progression-chart');
        if (!ctx) return;

        const masteryProgression = this.calculateMasteryProgression(playerMatches, championData, masteryData, metric);
        
        // Destroy existing chart if it exists
        if (this.charts.masteryProgression) {
            this.charts.masteryProgression.destroy();
        }
        
        this.charts.masteryProgression = new Chart(ctx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: masteryProgression.labels,
                datasets: [{
                    label: 'Current Performance',
                    data: masteryProgression.currentData,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Early Performance',
                    data: masteryProgression.earlyData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        ...ChartUtils.getDefaultTooltipStyle(),
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.r;
                                const championName = context.chart.data.labels[context.dataIndex];
                                
                                return `${label}: ${value.toFixed(1)} (${championName})`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: '#6b7280',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            color: '#4a5568',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const championName = masteryProgression.labels[index];
                        this.showMasteryDetails(championName, playerMatches, masteryData, event);
                    }
                }
            }
        });
    }

    calculateMasteryProgression(playerMatches, championData, masteryData, metric) {
        const championStats = this.getChampionPerformanceData(playerMatches);
        const topChampions = Object.values(championStats)
            .filter(c => c.games >= 5)
            .sort((a, b) => b.games - a.games)
            .slice(0, 6);
        
        const labels = topChampions.map(c => c.name);
        const currentData = [];
        const earlyData = [];
        
        topChampions.forEach(champion => {
            const championMatches = playerMatches.filter(m => 
                m.playerParticipant.championName === champion.name
            );
            
            let currentScore, earlyScore;
            
            switch (metric) {
                case 'improvement':
                    const scores = this.calculateImprovementScores(championMatches);
                    currentScore = scores.current;
                    earlyScore = scores.early;
                    break;
                case 'consistency':
                    const consistency = this.calculateConsistencyScores(championMatches);
                    currentScore = consistency.current;
                    earlyScore = consistency.early;
                    break;
                case 'recent':
                    const recent = this.calculateRecentFormScores(championMatches);
                    currentScore = recent.current;
                    earlyScore = recent.early;
                    break;
                default:
                    currentScore = 50;
                    earlyScore = 50;
            }
            
            currentData.push(currentScore);
            earlyData.push(earlyScore);
        });
        
        return {
            labels,
            currentData,
            earlyData
        };
    }

    getChampionPerformanceData(playerMatches) {
        const championStats = {};
        
        playerMatches.forEach(({ playerParticipant }) => {
            const name = playerParticipant.championName;
            
            if (!championStats[name]) {
                championStats[name] = { 
                    name,
                    games: 0,
                    wins: 0,
                    kills: 0,
                    deaths: 0,
                    assists: 0,
                    matches: []
                };
            }
            
            championStats[name].games++;
            if (playerParticipant.win) championStats[name].wins++;
            championStats[name].kills += playerParticipant.kills;
            championStats[name].deaths += playerParticipant.deaths;
            championStats[name].assists += playerParticipant.assists;
            championStats[name].matches.push(playerParticipant);
        });
        
        return championStats;
    }

    calculateImprovementScores(championMatches) {
        if (championMatches.length < 3) {
            return { current: 50, early: 50 };
        }
        
        const earlyMatches = championMatches.slice(-Math.ceil(championMatches.length / 2));
        const recentMatches = championMatches.slice(0, Math.ceil(championMatches.length / 2));
        
        const earlyWinRate = earlyMatches.filter(m => m.playerParticipant.win).length / earlyMatches.length;
        const recentWinRate = recentMatches.filter(m => m.playerParticipant.win).length / recentMatches.length;
        
        const earlyKDA = this.calculateAverageKDA(earlyMatches.map(m => ({ playerParticipant: m.playerParticipant })));
        const recentKDA = this.calculateAverageKDA(recentMatches.map(m => ({ playerParticipant: m.playerParticipant })));
        
        const improvement = ((recentWinRate - earlyWinRate) * 50) + ((recentKDA - earlyKDA) * 10) + 50;
        
        return {
            current: Math.max(0, Math.min(100, improvement)),
            early: earlyWinRate * 100
        };
    }

    calculateConsistencyScores(championMatches) {
        if (championMatches.length < 3) {
            return { current: 50, early: 50 };
        }
        
        const winRates = [];
        const kdaRatios = [];
        
        // Calculate rolling 3-game averages
        for (let i = 2; i < championMatches.length; i++) {
            const window = championMatches.slice(i-2, i+1);
            const wins = window.filter(m => m.playerParticipant.win).length;
            winRates.push(wins / 3);
            
            const avgKDA = window.reduce((sum, m) => {
                const kda = this.dataManager.calculateKDA(
                    m.playerParticipant.kills,
                    m.playerParticipant.deaths,
                    m.playerParticipant.assists
                );
                return sum + (kda === Infinity ? 10 : Math.min(kda, 10));
            }, 0) / 3;
            kdaRatios.push(avgKDA);
        }
        
        // Calculate consistency (lower variance = higher consistency)
        const winRateVariance = this.calculateVariance(winRates);
        const kdaVariance = this.calculateVariance(kdaRatios);
        
        const consistencyScore = 100 - ((winRateVariance * 100) + (kdaVariance * 5));
        
        return {
            current: Math.max(0, Math.min(100, consistencyScore)),
            early: Math.max(0, Math.min(100, consistencyScore * 0.8))
        };
    }

    calculateRecentFormScores(championMatches) {
        const recentCount = Math.min(5, championMatches.length);
        const recentMatches = championMatches.slice(0, recentCount);
        
        const recentWins = recentMatches.filter(m => m.playerParticipant.win).length;
        const recentWinRate = recentWins / recentMatches.length;
        
        const recentKDA = this.calculateAverageKDA(recentMatches.map(m => ({ playerParticipant: m.playerParticipant })));
        
        const formScore = (recentWinRate * 60) + (Math.min(recentKDA / 5, 1) * 40);
        
        return {
            current: Math.max(0, Math.min(100, formScore)),
            early: 50 // Baseline for comparison
        };
    }

    calculateVariance(numbers) {
        if (numbers.length === 0) return 0;
        
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
        
        return variance;
    }

    attachMasteryControls(playerMatches, championData, masteryData) {
        const metricSelect = document.getElementById('mastery-metric-select');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                const metric = e.target.value;
                this.createMasteryProgressionChart(playerMatches, championData, masteryData, metric);
            });
        }
    }

    showMasteryDetails(championName, playerMatches, masteryData, event) {
        // Enhanced mastery details tooltip
        let tooltip = document.getElementById('mastery-details-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'mastery-details-tooltip';
            tooltip.className = 'mastery-details-tooltip';
            document.body.appendChild(tooltip);
        }
        
        const championMatches = playerMatches.filter(m => 
            m.playerParticipant.championName === championName
        );
        
        const wins = championMatches.filter(m => m.playerParticipant.win).length;
        const winRate = this.dataManager.calculateWinRate(wins, championMatches.length);
        const avgKDA = this.calculateAverageKDA(championMatches);
        
        // Find mastery data if available
        const masteryInfo = masteryData ? masteryData.find(m => 
            m.championId === championMatches[0]?.playerParticipant.championId
        ) : null;
        
        tooltip.innerHTML = `
            <div class="mastery-tooltip-header">
                <img src="${this.dataManager.getChampionIconUrl(championName, '13.24.1')}" 
                     alt="${championName}" class="champion-icon" />
                <div>
                    <strong>${championName}</strong>
                    ${masteryInfo ? `<div class="text-muted small">Mastery ${masteryInfo.championLevel} • ${masteryInfo.championPoints.toLocaleString()} points</div>` : ''}
                </div>
            </div>
            <div class="mastery-tooltip-stats">
                <div class="mastery-stat-grid">
                    <div>Games: <strong>${championMatches.length}</strong></div>
                    <div>Win Rate: <strong>${winRate}%</strong></div>
                    <div>Avg KDA: <strong>${avgKDA.toFixed(2)}</strong></div>
                    <div class="progression-info">
                        Recent form: ${this.getMasteryTrend(championMatches)}
                    </div>
                </div>
            </div>
        `;
        
        // Position tooltip
        tooltip.style.cssText = `
            position: fixed;
            left: ${event.clientX + 10}px;
            top: ${event.clientY - 10}px;
            max-width: 300px;
            z-index: 1000;
            pointer-events: none;
        `;
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (tooltip) tooltip.remove();
        }, 4000);
    }

    getMasteryTrend(championMatches) {
        if (championMatches.length < 3) return 'Limited data';
        
        const recent = championMatches.slice(0, 3);
        const recentWins = recent.filter(m => m.playerParticipant.win).length;
        
        if (recentWins === 3) return '<span class="text-success">🔥 Hot streak</span>';
        if (recentWins === 2) return '<span class="text-warning">📈 Good form</span>';
        if (recentWins === 1) return '<span class="text-secondary">📊 Average</span>';
        return '<span class="text-danger">📉 Struggling</span>';
    }

    renderSeasonalRadarChart(seasonalData) {
        const ctx = document.getElementById('seasonal-comparison-chart');
        if (!ctx) return;
        
        this.charts.seasonalComparison = new Chart(ctx.getContext('2d'), {
            type: 'radar',
            data: {
                labels: ['Win Rate', 'KDA Ratio', 'Gold per Min', 'Damage per Min', 'Vision Score', 'Kill Participation'],
                datasets: [{
                    label: 'Recent Performance',
                    data: [
                        seasonalData.recent.winRate,
                        Math.min(seasonalData.recent.avgKDA * 20, 100),
                        Math.min(seasonalData.recent.avgGPM / 10, 100),
                        this.calculateAverageDamagePerMinute(seasonalData.recent.matches || []),
                        this.calculateAverageVisionScore(seasonalData.recent.matches || []),
                        this.calculateKillParticipation(seasonalData.recent.matches || [])
                    ],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(75, 192, 192, 1)'
                }, {
                    label: 'Previous Performance',
                    data: [
                        seasonalData.previous.winRate,
                        Math.min(seasonalData.previous.avgKDA * 20, 100),
                        Math.min(seasonalData.previous.avgGPM / 10, 100),
                        this.calculateAverageDamagePerMinute(seasonalData.previous.matches || []),
                        this.calculateAverageVisionScore(seasonalData.previous.matches || []),
                        this.calculateKillParticipation(seasonalData.previous.matches || [])
                    ],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(255, 99, 132, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        ...ChartUtils.getDefaultTooltipStyle(),
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label;
                                const value = context.parsed.r;
                                const dataLabel = context.chart.data.labels[context.dataIndex];
                                
                                let formattedValue = value.toFixed(1);
                                if (dataLabel === 'Win Rate') formattedValue += '%';
                                else if (dataLabel === 'Gold per Min') formattedValue = (value * 10).toFixed(0);
                                else if (dataLabel === 'KDA Ratio') formattedValue = (value / 20).toFixed(2);
                                
                                return `${label}: ${formattedValue}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: '#6b7280',
                            font: {
                                size: 10
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            color: '#4a5568',
                            font: {
                                size: 11,
                                weight: '500'
                            }
                        }
                    }
                }
            }
        });
    }

    calculateAverageDamagePerMinute(matches) {
        if (!matches || matches.length === 0) return 50;
        
        const totalDPM = matches.reduce((sum, { playerParticipant, match }) => {
            const totalDamage = playerParticipant.totalDamageDealtToChampions;
            const gameMinutes = match.info.gameDuration / 60;
            return sum + (totalDamage / gameMinutes);
        }, 0);
        
        const avgDPM = totalDPM / matches.length;
        return Math.min(avgDPM / 15, 100); // Normalize to 0-100 scale
    }

    calculateAverageVisionScore(matches) {
        if (!matches || matches.length === 0) return 50;
        
        const totalVision = matches.reduce((sum, { playerParticipant }) => {
            return sum + (playerParticipant.visionScore || 0);
        }, 0);
        
        const avgVision = totalVision / matches.length;
        return Math.min(avgVision * 2, 100); // Normalize to 0-100 scale
    }

    calculateKillParticipation(matches) {
        if (!matches || matches.length === 0) return 50;
        
        const totalKP = matches.reduce((sum, { match, playerParticipant }) => {
            const team = match.info.teams.find(t => t.teamId === playerParticipant.teamId);
            if (!team) return sum;
            
            const teamKills = team.objectives?.champion?.kills || 1;
            const playerKP = (playerParticipant.kills + playerParticipant.assists) / teamKills;
            return sum + Math.min(playerKP, 1);
        }, 0);
        
        const avgKP = totalKP / matches.length;
        return avgKP * 100;
    }

    // Helper methods for Live Metrics
    getStreakClass(streak) {
        if (streak.type === 'win') {
            return streak.count >= 3 ? 'text-success' : 'text-success';
        } else if (streak.type === 'loss') {
            return 'text-danger';
        }
        return 'text-muted';
    }

    formatStreak(streak) {
        if (streak.type === 'none') return 'No streak';
        const prefix = streak.type === 'win' ? 'W' : 'L';
        return `${streak.count}${prefix}`;
    }

    // Force refresh - useful for development or manual refresh
    refresh() {
        console.log('Force refreshing Dashboard...');
        this.cleanup();
        this.init();
    }

    destroy() {
        this.cleanup();
    }
}

// Export for module use
window.Dashboard = Dashboard;