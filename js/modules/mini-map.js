/**
 * Mini-map Module - Interactive champion positioning visualization
 */
class MiniMap {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.rolePaths = {
            blue: {
                // bot-left to top-left → move up (y ↓), x stays low
                TOP: { origin: { x: 15, y: 85 }, vector: { x: 0, y: -60 }, spread: 0.8, jitter: 4 },
                // top-side jungle → upper triangle near mid/top
                JUNGLE: { origin: { x: 35, y: 40 }, radiusX: 12, radiusY: 12 },
                // bot-left to center → move up-right
                MIDDLE: { origin: { x: 20, y: 80 }, vector: { x: 30, y: -30 }, spread: 1, jitter: 3 },
                // bot-left to bot-right → y constant, x increases
                BOTTOM: { origin: { x: 25, y: 95 }, vector: { x: 50, y: 0 }, spread: 0.7, jitter: 4 },
                UTILITY: { origin: { x: 30, y: 95 }, vector: { x: 50, y: 0 }, spread: 0.7, jitter: 4 },
                // top-left to center → x and y both increase
                UNKNOWN: { origin: { x: 20, y: 20 }, radiusX: 6, radiusY: 10 }
            },
            red: {
                // top-right to top-left → y constant, x decreases
                TOP: { origin: { x: 85, y: 15 }, vector: { x: -60, y: 0 }, spread: 0.8, jitter: 4 },
                // bot-side jungle → bottom triangle near mid/bot
                JUNGLE: { origin: { x: 65, y: 60 }, radiusX: 12, radiusY: 12 },
                // top-right to center → x and y decrease
                MIDDLE: { origin: { x: 80, y: 20 }, vector: { x: -30, y: 30 }, spread: 1, jitter: 3 },
                // top-right to bot-right → x constant, y increases
                BOTTOM: { origin: { x: 95, y: 25 }, vector: { x: 0, y: 50 }, spread: 0.7, jitter: 4 },
                UTILITY: { origin: { x: 95, y: 30 }, vector: { x: 0, y: 50 }, spread: 0.7, jitter: 4 },
                // bot-right to center → x and y decrease
                UNKNOWN: { origin: { x: 80, y: 80 }, radiusX: 6, radiusY: 10 }
            }
        };
    }

    init() {
        this.setupEventListeners();
        this.addCustomizationToggle();
        this.renderMiniMap(199); // Show all games by default
        this.tooltipsEnabled = true; // Initialize tooltip state
    }

    setupEventListeners() {
        const miniMapFilter = document.getElementById('mini-map-filter');
        if (miniMapFilter) {
            miniMapFilter.addEventListener('change', (e) => {
                this.renderMiniMap(parseInt(e.target.value, 10));
            });
        }
    }

    renderMiniMap(gamesToShow) {
        const miniMapIconsEl = document.getElementById('mini-map-icons');
        if (!miniMapIconsEl) return;

        miniMapIconsEl.innerHTML = '';
        
        const data = this.dataManager.getData();
        const { playerMatches, championData } = data;
        const matchesToRender = playerMatches.slice(0, gamesToShow);
        
        // Group matches by role for better positioning
        const matchesByRole = { 
            TOP: [], 
            JUNGLE: [], 
            MIDDLE: [], 
            BOTTOM: [], 
            UTILITY: [], 
            UNKNOWN: [] 
        };
        
        matchesToRender.forEach(match => {
            const role = match.playerParticipant.teamPosition || 'UNKNOWN';
            if (matchesByRole[role]) {
                matchesByRole[role].push(match);
            }
        });

        // Render icons for each role
        for (const role in matchesByRole) {
            const gamesInRole = matchesByRole[role];
            if (gamesInRole.length === 0) continue;

            this.renderRoleIcons(gamesInRole, role, championData);
        }

        // Update statistics display
        this.updateMapStatistics(matchesToRender);
    }

    renderRoleIcons(gamesInRole, role, championData) {
        const miniMapIconsEl = document.getElementById('mini-map-icons');
        
        gamesInRole.forEach((matchData, index) => {
            const { playerParticipant } = matchData;
            const teamId = playerParticipant.teamId;
            const team = teamId === 100 ? 'blue' : 'red';
            const pathOrBox = this.rolePaths[team][role];

            const position = this.calculateIconPosition(pathOrBox, index, gamesInRole.length, matchData);
            
            const champName = playerParticipant.championName;
            const champIconUrl = this.dataManager.getChampionIconUrl(champName, championData.version);

            const icon = this.createEnhancedChampionIcon(
                champIconUrl,
                champName,
                role,
                position,
                team,
                matchData
            );

            miniMapIconsEl.appendChild(icon);
        });
    }

    calculateIconPosition(pathOrBox, index, totalInRole, gameData = null) {
        return gameData ? 
            this.calculateAdvancedPosition(pathOrBox, index, totalInRole, gameData) :
            this.calculateBasicPosition(pathOrBox, index, totalInRole);
    }

    calculateBasicPosition(pathOrBox, index, totalInRole) {
        let posX, posY;

        if (pathOrBox.vector) { 
            // It's a lane with a vector path
            const t = totalInRole > 1 ? index / (totalInRole - 1) : 0.5;
            posX = pathOrBox.origin.x + t * pathOrBox.vector.x * pathOrBox.spread;
            posY = pathOrBox.origin.y + t * pathOrBox.vector.y * pathOrBox.spread;

            // Add perpendicular jitter for visual separation
            const perpVector = { x: -pathOrBox.vector.y, y: pathOrBox.vector.x };
            const norm = Math.sqrt(perpVector.x * perpVector.x + perpVector.y * perpVector.y);
            if (norm > 0) {
                const normalizedPerp = { x: perpVector.x / norm, y: perpVector.y / norm };
                const jitterAmount = (Math.random() - 0.5) * pathOrBox.jitter;
                posX += normalizedPerp.x * jitterAmount;
                posY += normalizedPerp.y * jitterAmount;
            }
        } else if (pathOrBox.radiusX) { 
            // It's a box area (Jungle/Unknown)
            posX = pathOrBox.origin.x + (Math.random() - 0.5) * 2 * pathOrBox.radiusX;
            posY = pathOrBox.origin.y + (Math.random() - 0.5) * 2 * pathOrBox.radiusY;
        }

        return { x: this.clampPosition(posX), y: this.clampPosition(posY) };
    }

    calculateAdvancedPosition(pathOrBox, index, totalInRole, gameData) {
        let posX, posY;
        
        if (pathOrBox.vector) {
            // Adaptive spread based on game density
            const adaptiveSpread = this.calculateAdaptiveSpread(totalInRole, pathOrBox.spread);
            const basePosition = totalInRole > 1 ? index / (totalInRole - 1) : 0.5;
            
            // Apply performance-based positioning variance
            const performanceVariance = this.calculatePerformanceVariance(gameData);
            
            posX = pathOrBox.origin.x + basePosition * pathOrBox.vector.x * adaptiveSpread;
            posY = pathOrBox.origin.y + basePosition * pathOrBox.vector.y * adaptiveSpread;
            
            // Enhanced jitter with performance correlation
            const enhancedJitter = this.calculateEnhancedJitter(
                pathOrBox, 
                gameData.playerParticipant.win,
                gameData.playerParticipant.kills,
                gameData.playerParticipant.deaths
            );
            
            posX += enhancedJitter.x;
            posY += enhancedJitter.y;
            
            // Temporal clustering - similar timeframes cluster together
            const temporalOffset = this.calculateTemporalOffset(gameData.match.info.gameCreation);
            posX += temporalOffset.x;
            posY += temporalOffset.y;
            
        } else if (pathOrBox.radiusX) {
            // Advanced jungle positioning with quadrant preference
            const quadrant = this.determineJungleQuadrant(gameData);
            const quadrantOffset = this.getQuadrantOffset(quadrant);
            
            posX = pathOrBox.origin.x + quadrantOffset.x + 
                   (Math.random() - 0.5) * 2 * pathOrBox.radiusX * 0.8;
            posY = pathOrBox.origin.y + quadrantOffset.y + 
                   (Math.random() - 0.5) * 2 * pathOrBox.radiusY * 0.8;
        }
        
        return { x: this.clampPosition(posX), y: this.clampPosition(posY) };
    }

    calculateAdaptiveSpread(gameCount, baseSpread) {
        // Increase spread for more games, decrease for fewer
        const spreadMultiplier = Math.min(2.0, Math.max(0.5, gameCount / 10));
        return baseSpread * spreadMultiplier;
    }

    calculatePerformanceVariance(gameData) {
        const { playerParticipant } = gameData;
        const kda = this.dataManager.calculateKDA(
            playerParticipant.kills,
            playerParticipant.deaths,
            playerParticipant.assists
        );
        
        // Better performance = closer to optimal lane position
        // Poor performance = more scattered
        const performanceFactor = Math.min(2.0, Math.max(0.5, kda));
        return {
            scatter: (2.0 - performanceFactor) * 2, // 0-3 scatter range
            direction: playerParticipant.win ? 'forward' : 'backward'
        };
    }

    calculateEnhancedJitter(pathOrBox, isWin, kills, deaths) {
        const performance = kills / Math.max(deaths, 1);
        const jitterMultiplier = isWin ? 0.8 : 1.2; // Less jitter for wins
        const performanceJitter = Math.max(0.5, Math.min(1.5, 2 - performance));
        
        const perpVector = { x: -pathOrBox.vector.y, y: pathOrBox.vector.x };
        const norm = Math.sqrt(perpVector.x * perpVector.x + perpVector.y * perpVector.y);
        
        if (norm > 0) {
            const normalizedPerp = { x: perpVector.x / norm, y: perpVector.y / norm };
            const jitterAmount = (Math.random() - 0.5) * pathOrBox.jitter * jitterMultiplier * performanceJitter;
            return {
                x: normalizedPerp.x * jitterAmount,
                y: normalizedPerp.y * jitterAmount
            };
        }
        
        return { x: 0, y: 0 };
    }

    calculateTemporalOffset(gameCreation) {
        // Cluster games from similar time periods
        const gameTime = new Date(gameCreation);
        const timeOfDay = (gameTime.getHours() + gameTime.getMinutes() / 60) / 24;
        const dayOffset = Math.sin(timeOfDay * 2 * Math.PI) * 2;
        
        return {
            x: dayOffset,
            y: (Math.random() - 0.5) * 1
        };
    }

    determineJungleQuadrant(gameData) {
        const { playerParticipant, match } = gameData;
        
        // Analyze jungle pathing based on champion and performance
        const isEarlyGame = match.info.gameDuration < 900; // 15 minutes
        const teamId = playerParticipant.teamId;
        
        if (teamId === 100) { // Blue team
            return isEarlyGame ? 'top-river' : 'bot-river';
        } else { // Red team  
            return isEarlyGame ? 'bot-river' : 'top-river';
        }
    }

    getQuadrantOffset(quadrant) {
        const offsets = {
            'top-river': { x: -3, y: -3 },
            'bot-river': { x: 3, y: 3 },
            'top-side': { x: -2, y: -4 },
            'bot-side': { x: 2, y: 4 }
        };
        return offsets[quadrant] || { x: 0, y: 0 };
    }

    clampPosition(value) {
        return Math.max(2, Math.min(98, value));
    }

    createChampionIcon(iconUrl, champName, role, position, team, isWin) {
        const icon = document.createElement('img');
        icon.src = iconUrl;
        icon.title = `${champName} (${role}) - ${isWin ? 'Win' : 'Loss'}`;
        icon.className = 'champion-icon-map';
        icon.style.left = `${position.x}%`;
        icon.style.top = `${position.y}%`;
        icon.style.borderColor = team === 'blue' ? '#007bff' : '#dc3545';
        
        // Add win/loss styling
        if (isWin) {
            icon.style.boxShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
        } else {
            icon.style.opacity = '0.7';
            icon.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.4)';
        }

        // Add hover effects
        icon.addEventListener('mouseenter', () => {
            icon.style.transform = 'translate(-50%, -50%) scale(1.2)';
            icon.style.zIndex = '1000';
        });

        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'translate(-50%, -50%) scale(1)';
            icon.style.zIndex = '1';
        });

        return icon;
    }

    createEnhancedChampionIcon(iconUrl, champName, role, position, team, gameData) {
        const icon = document.createElement('img');
        icon.src = iconUrl;
        icon.className = 'champion-icon-map enhanced';
        icon.style.left = `${position.x}%`;
        icon.style.top = `${position.y}%`;
        
        // Performance-based styling
        const performance = this.analyzeGamePerformance(gameData);
        
        // Border styling based on performance
        icon.style.borderColor = this.getPerformanceBorderColor(performance, team);
        icon.style.borderWidth = `${this.getPerformanceBorderWidth(performance)}px`;
        
        // Icon size based on impact
        const impactSize = this.calculateGameImpact(gameData);
        const iconSize = 20 + impactSize * 8;
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
        
        // Glow effect for exceptional performances  
        if (performance.exceptional) {
            icon.style.boxShadow = `0 0 ${8 + performance.score * 4}px ${performance.glowColor}`;
            icon.classList.add('exceptional');
        } else if (performance.category === 'poor') {
            icon.classList.add('poor-performance');
        }
        
        // Enhanced tooltip with detailed stats
        this.createEnhancedTooltip(icon, champName, role, gameData, performance);
        
        // Animation based on game outcome
        this.addPerformanceAnimation(icon, performance);
        
        return icon;
    }

    analyzeGamePerformance(gameData) {
        const { playerParticipant, match } = gameData;
        const kda = this.dataManager.calculateKDA(
            playerParticipant.kills,
            playerParticipant.deaths,
            playerParticipant.assists
        );
        
        const damageRatio = playerParticipant.totalDamageDealtToChampions / 
                           Math.max(playerParticipant.goldEarned, 1);
        
        const visionScore = playerParticipant.visionScore || 0;
        const gameLength = match.info.gameDuration / 60;
        
        // Calculate composite performance score
        const performanceScore = (
            (kda * 0.3) +
            (damageRatio * 0.25) +
            (visionScore / gameLength * 0.2) +
            (playerParticipant.win ? 0.25 : 0)
        );
        
        return {
            score: performanceScore,
            kda: kda,
            exceptional: performanceScore > 2.5 || kda > 5,
            category: this.categorizePerformance(performanceScore),
            glowColor: this.getPerformanceGlowColor(performanceScore, playerParticipant.win)
        };
    }

    categorizePerformance(score) {
        if (score >= 2.5) return 'excellent';
        if (score >= 1.5) return 'good';
        if (score >= 0.8) return 'average';
        return 'poor';
    }

    getPerformanceBorderColor(performance, team) {
        const baseColor = team === 'blue' ? '#007bff' : '#dc3545';
        if (performance.exceptional) {
            return '#10b981'; // Green for exceptional
        }
        if (performance.category === 'poor') {
            return '#ef4444'; // Red for poor
        }
        return baseColor;
    }

    getPerformanceBorderWidth(performance) {
        if (performance.exceptional) return 3;
        if (performance.category === 'good') return 2.5;
        return 2;
    }

    calculateGameImpact(gameData) {
        const { playerParticipant } = gameData;
        const kda = this.dataManager.calculateKDA(
            playerParticipant.kills,
            playerParticipant.deaths,
            playerParticipant.assists
        );
        
        // Normalize impact score between 0-1
        const impactScore = Math.min(1, Math.max(0, (kda - 1) / 4));
        return impactScore;
    }

    getPerformanceGlowColor(score, isWin) {
        if (score >= 2.5) return '#10b981';
        if (score >= 1.5) return isWin ? '#22c55e' : '#f59e0b';
        if (score >= 0.8) return isWin ? '#3b82f6' : '#6b7280';
        return '#ef4444';
    }

    addPerformanceAnimation(icon, performance) {
        if (performance.exceptional) {
            icon.addEventListener('mouseenter', () => {
                icon.style.transform = 'translate(-50%, -50%) scale(1.3)';
                icon.style.zIndex = '1000';
            });
        } else {
            icon.addEventListener('mouseenter', () => {
                icon.style.transform = 'translate(-50%, -50%) scale(1.2)';
                icon.style.zIndex = '1000';
            });
        }
        
        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'translate(-50%, -50%) scale(1)';
            icon.style.zIndex = '1';
        });
    }

    updateMapStatistics(matches) {
        // Create or update statistics panel
        let statsPanel = document.getElementById('minimap-stats');
        if (!statsPanel) {
            statsPanel = this.createStatisticsPanel();
        }

        // Calculate statistics
        const roleStats = {};
        const teamStats = { blue: 0, red: 0 };
        const winStats = { wins: 0, losses: 0 };

        matches.forEach(({ playerParticipant }) => {
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            const team = playerParticipant.teamId === 100 ? 'blue' : 'red';
            
            roleStats[role] = (roleStats[role] || 0) + 1;
            teamStats[team]++;
            
            if (playerParticipant.win) {
                winStats.wins++;
            } else {
                winStats.losses++;
            }
        });

        // Update statistics display
        this.displayMapStatistics(roleStats, teamStats, winStats, matches.length);
        
        // Add advanced analytics below the basic stats
        this.addAdvancedAnalytics();
    }

    addAdvancedAnalytics() {
        // Only add analytics once
        if (document.getElementById('advanced-analytics-container')) return;

        const miniMapTab = document.getElementById('mini-map');
        if (!miniMapTab) return;

        // Find the main card body to append properly
        const cardBody = miniMapTab.querySelector('.card-body');
        if (!cardBody) return;

        // Create container for advanced analytics
        const analyticsContainer = document.createElement('div');
        analyticsContainer.id = 'advanced-analytics-container';
        analyticsContainer.className = 'advanced-analytics-section mt-4';
        analyticsContainer.innerHTML = `
            <div class="analytics-header mb-3">
                <h6 class="text-muted mb-0">
                    <i class="bi bi-graph-up me-2"></i>Advanced Analytics
                </h6>
            </div>
            <div class="row g-3">
                <div class="col-lg-6">
                    <div id="temporal-analysis-container"></div>
                </div>
                <div class="col-lg-6">
                    <div id="synergy-analysis-container"></div>
                </div>
            </div>
        `;

        // Add to the card body instead of the tab directly
        cardBody.appendChild(analyticsContainer);

        // Now add the components
        const temporalContainer = document.getElementById('temporal-analysis-container');
        const synergyContainer = document.getElementById('synergy-analysis-container');

        if (temporalContainer) {
            const temporalAnalysis = this.createTemporalAnalysis();
            temporalContainer.appendChild(temporalAnalysis);
        }

        if (synergyContainer) {
            const synergyAnalysis = this.calculateChampionSynergies();
            synergyContainer.appendChild(synergyAnalysis);
        }
    }

    createStatisticsPanel() {
        const miniMapTab = document.getElementById('mini-map');
        if (!miniMapTab) return null;

        // Find the main card body to append the stats panel properly
        const cardBody = miniMapTab.querySelector('.card-body');
        if (!cardBody) return null;

        const statsPanel = document.createElement('div');
        statsPanel.id = 'minimap-stats';
        statsPanel.className = 'mt-4 mb-3';
        statsPanel.innerHTML = `
            <div class="minimap-statistics-section">
                <h6 class="text-muted mb-3">
                    <i class="bi bi-bar-chart me-2"></i>Position Statistics
                </h6>
                <div class="row text-center g-3">
                    <div class="col-6 col-md-3">
                        <div class="minimap-stat-card">
                            <div id="map-total-games" class="stat-number">0</div>
                            <div class="stat-label">Games</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="minimap-stat-card">
                            <div id="map-win-rate" class="stat-number text-success">0%</div>
                            <div class="stat-label">Win Rate</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="minimap-stat-card">
                            <div id="map-blue-side" class="stat-number text-primary">0</div>
                            <div class="stat-label">Blue Side</div>
                        </div>
                    </div>
                    <div class="col-6 col-md-3">
                        <div class="minimap-stat-card">
                            <div id="map-red-side" class="stat-number text-danger">0</div>
                            <div class="stat-label">Red Side</div>
                        </div>
                    </div>
                </div>
                <div class="mt-3">
                    <h6 class="text-muted mb-2">
                        <i class="bi bi-diagram-3 me-2"></i>Role Distribution
                    </h6>
                    <div id="map-role-breakdown" class="role-badges-container"></div>
                </div>
            </div>
        `;

        cardBody.appendChild(statsPanel);
        return statsPanel;
    }

    displayMapStatistics(roleStats, teamStats, winStats, totalGames) {
        // Update basic stats
        document.getElementById('map-total-games').textContent = totalGames;
        
        const winRate = totalGames > 0 ? ((winStats.wins / totalGames) * 100).toFixed(1) : 0;
        document.getElementById('map-win-rate').textContent = `${winRate}%`;
        
        document.getElementById('map-blue-side').textContent = teamStats.blue;
        document.getElementById('map-red-side').textContent = teamStats.red;

        // Update role breakdown
        const roleBreakdown = document.getElementById('map-role-breakdown');
        if (roleBreakdown) {
            roleBreakdown.innerHTML = '';
            
            Object.entries(roleStats).forEach(([role, count]) => {
                const percentage = ((count / totalGames) * 100).toFixed(1);
                const badge = document.createElement('span');
                badge.className = 'badge bg-secondary';
                badge.textContent = `${role}: ${count} (${percentage}%)`;
                roleBreakdown.appendChild(badge);
            });
        }
    }

    createEnhancedTooltip(icon, champName, role, gameData, performance) {
        if (!this.tooltipsEnabled) return;

        const { playerParticipant, match } = gameData;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'enhanced-tooltip';
        tooltip.style.display = 'none';
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <strong>${champName}</strong>
                <span class="role-badge ${role.toLowerCase()}">${role}</span>
            </div>
            <div class="tooltip-stats">
                <div class="stat-row">
                    <span>KDA:</span>
                    <span class="kda-value">${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}</span>
                </div>
                <div class="stat-row">
                    <span>Result:</span>
                    <span class="${playerParticipant.win ? 'win' : 'loss'}">
                        ${playerParticipant.win ? 'Victory' : 'Defeat'}
                    </span>
                </div>
                <div class="stat-row">
                    <span>Performance:</span>
                    <span class="performance-${performance.category}">${performance.category.toUpperCase()}</span>
                </div>
                <div class="stat-row">
                    <span>Duration:</span>
                    <span>${this.formatGameDuration(match.info.gameDuration)}</span>
                </div>
                <div class="stat-row">
                    <span>Damage:</span>
                    <span>${this.formatNumber(playerParticipant.totalDamageDealtToChampions)}</span>
                </div>
                <div class="stat-row">
                    <span>Gold:</span>
                    <span>${this.formatNumber(playerParticipant.goldEarned)}</span>
                </div>
            </div>
            <div class="tooltip-date">
                ${new Date(match.info.gameCreation).toLocaleDateString()}
            </div>
        `;
        
        document.body.appendChild(tooltip);
        this.setupTooltipInteraction(icon, tooltip);
    }

    setupTooltipInteraction(icon, tooltip) {
        let tooltipTimeout;
        
        icon.addEventListener('mouseenter', (e) => {
            clearTimeout(tooltipTimeout);
            const rect = icon.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
        });
        
        icon.addEventListener('mouseleave', () => {
            tooltipTimeout = setTimeout(() => {
                tooltip.style.display = 'none';
                tooltip.style.opacity = '0';
            }, 100);
        });
    }

    formatGameDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Analytics methods
    getRoleDistribution(gamesToShow = 199) {
        const data = this.dataManager.getData();
        const matches = data.playerMatches.slice(0, gamesToShow);
        
        const distribution = {};
        matches.forEach(({ playerParticipant }) => {
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            distribution[role] = (distribution[role] || 0) + 1;
        });
        
        return distribution;
    }

    // Heatmap functionality
    createPositionalHeatmap(role, gamesToShow = 199) {
        const heatmapData = this.calculateHeatmapData(role, gamesToShow);
        
        const heatmapCanvas = document.createElement('canvas');
        heatmapCanvas.id = `heatmap-${role.toLowerCase()}`;
        heatmapCanvas.className = 'position-heatmap';
        heatmapCanvas.width = 400;
        heatmapCanvas.height = 400;
        
        this.renderHeatmapData(heatmapCanvas, heatmapData);
        
        return heatmapCanvas;
    }

    calculateHeatmapData(role, gamesToShow) {
        const data = this.dataManager.getData();
        const relevantMatches = data.playerMatches
            .filter(({ playerParticipant }) => 
                (playerParticipant.teamPosition || 'UNKNOWN') === role
            )
            .slice(0, gamesToShow);
        
        // Create density grid
        const gridSize = 40;
        const densityGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        const performanceGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        const gameCountGrid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        
        relevantMatches.forEach(({ playerParticipant, match }, index) => {
            const team = playerParticipant.teamId === 100 ? 'blue' : 'red';
            const pathConfig = this.rolePaths[team][role];
            
            // Calculate position using existing algorithm
            const position = this.calculateIconPosition(pathConfig, index, relevantMatches.length, { playerParticipant, match });
            
            // Map to grid coordinates
            const gridX = Math.floor((position.x / 100) * gridSize);
            const gridY = Math.floor((position.y / 100) * gridSize);
            
            if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
                densityGrid[gridY][gridX]++;
                gameCountGrid[gridY][gridX]++;
                
                // Track performance at this position
                const kda = this.dataManager.calculateKDA(
                    playerParticipant.kills,
                    playerParticipant.deaths,
                    playerParticipant.assists
                );
                const performanceScore = playerParticipant.win ? kda : -kda * 0.5;
                performanceGrid[gridY][gridX] += performanceScore;
            }
        });
        
        // Normalize performance by game count
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (gameCountGrid[y][x] > 0) {
                    performanceGrid[y][x] /= gameCountGrid[y][x];
                }
            }
        }
        
        return { density: densityGrid, performance: performanceGrid, gameCount: gameCountGrid, gridSize };
    }

    renderHeatmapData(canvas, heatmapData) {
        const ctx = canvas.getContext('2d');
        const { density, performance, gameCount, gridSize } = heatmapData;
        
        const cellWidth = canvas.width / gridSize;
        const cellHeight = canvas.height / gridSize;
        
        // Find max values for normalization
        const maxDensity = Math.max(...density.flat());
        const maxPerformance = Math.max(...performance.flat().map(Math.abs));
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const densityValue = density[y][x];
                const performanceValue = performance[y][x];
                const gameCountValue = gameCount[y][x];
                
                if (densityValue > 0) {
                    // Color based on performance, opacity based on density
                    const performanceRatio = maxPerformance > 0 ? performanceValue / maxPerformance : 0;
                    const densityRatio = maxDensity > 0 ? densityValue / maxDensity : 0;
                    
                    const color = this.getHeatmapColor(performanceRatio);
                    const alpha = Math.min(0.8, Math.max(0.1, densityRatio * 0.6 + 0.2));
                    
                    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    
                    // Add subtle border for visibility
                    if (gameCountValue >= 2) {
                        ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
                        ctx.lineWidth = 0.5;
                        ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                    }
                }
            }
        }
    }

    getHeatmapColor(performanceRatio) {
        // Normalize performance ratio to 0-1 range (from -1 to 1)
        const normalized = (performanceRatio + 1) / 2;
        
        if (normalized >= 0.6) {
            // Good performance - green
            return { r: 16, g: 185, b: 129 };
        } else if (normalized >= 0.4) {
            // Average performance - yellow
            return { r: 245, g: 158, b: 11 };
        } else {
            // Poor performance - red
            return { r: 239, g: 68, b: 68 };
        }
    }

    toggleHeatmap(role) {
        const miniMapContainer = document.getElementById('mini-map-container');
        if (!miniMapContainer) return;
        
        const existingHeatmap = document.getElementById(`heatmap-${role.toLowerCase()}`);
        
        if (existingHeatmap) {
            // Remove existing heatmap
            existingHeatmap.remove();
        } else {
            // Create new heatmap
            const heatmap = this.createPositionalHeatmap(role, 50);
            heatmap.style.position = 'absolute';
            heatmap.style.top = '0';
            heatmap.style.left = '0';
            heatmap.style.width = '100%';
            heatmap.style.height = '100%';
            heatmap.style.zIndex = '5';
            
            miniMapContainer.appendChild(heatmap);
        }
    }

    getTeamSideStats(gamesToShow = 199) {
        const data = this.dataManager.getData();
        const matches = data.playerMatches.slice(0, gamesToShow);
        
        const sideStats = {
            blue: { games: 0, wins: 0 },
            red: { games: 0, wins: 0 }
        };
        
        matches.forEach(({ playerParticipant }) => {
            const side = playerParticipant.teamId === 100 ? 'blue' : 'red';
            sideStats[side].games++;
            if (playerParticipant.win) {
                sideStats[side].wins++;
            }
        });
        
        // Calculate win rates
        Object.keys(sideStats).forEach(side => {
            const stats = sideStats[side];
            stats.winRate = stats.games > 0 ? (stats.wins / stats.games * 100).toFixed(1) : 0;
        });
        
        return sideStats;
    }

    getPositionalHeatmap(role, gamesToShow = 199) {
        const data = this.dataManager.getData();
        const matches = data.playerMatches.slice(0, gamesToShow);
        
        const roleMatches = matches.filter(({ playerParticipant }) => 
            (playerParticipant.teamPosition || 'UNKNOWN') === role
        );
        
        return roleMatches.map(({ playerParticipant }) => ({
            team: playerParticipant.teamId === 100 ? 'blue' : 'red',
            win: playerParticipant.win,
            champion: playerParticipant.championName,
            kda: `${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}`
        }));
    }

    // Temporal Analysis
    createTemporalAnalysis() {
        const temporalData = this.calculateTemporalPatterns();
        
        const analysisContainer = document.createElement('div');
        analysisContainer.className = 'temporal-analysis';
        analysisContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h6><i class="bi bi-clock me-2"></i>Positional Patterns Over Time</h6>
                    <div class="temporal-controls">
                        <select id="temporal-period" class="form-select">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                        <select id="temporal-role" class="form-select">
                            <option value="all">All Roles</option>
                            <option value="TOP">Top Lane</option>
                            <option value="JUNGLE">Jungle</option>
                            <option value="MIDDLE">Mid Lane</option>
                            <option value="BOTTOM">Bot Lane</option>
                            <option value="UTILITY">Support</option>
                        </select>
                    </div>
                    <div class="temporal-timeline">
                        <canvas id="temporal-timeline-chart" width="400" height="200"></canvas>
                    </div>
                    <div class="temporal-insights">
                        <div id="temporal-insights-content">
                            <h6>Key Insights</h6>
                            <div class="insights-grid">
                                <div class="insight-item">
                                    <i class="bi bi-calendar-week text-primary"></i>
                                    <div class="insight-content">
                                        <div class="insight-label">Most Active Period</div>
                                        <div class="insight-value" id="most-active-period">Loading...</div>
                                    </div>
                                </div>
                                <div class="insight-item">
                                    <i class="bi bi-trophy text-warning"></i>
                                    <div class="insight-content">
                                        <div class="insight-label">Best Performance Period</div>
                                        <div class="insight-value" id="best-performance-period">Loading...</div>
                                    </div>
                                </div>
                                <div class="insight-item">
                                    <i class="bi bi-graph-up text-success"></i>
                                    <div class="insight-content">
                                        <div class="insight-label">Improvement Trend</div>
                                        <div class="insight-value" id="improvement-trend">Loading...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.renderTemporalChart(temporalData, analysisContainer);
        this.setupTemporalHandlers(analysisContainer);
        this.updateTemporalInsights(temporalData);
        
        return analysisContainer;
    }

    calculateTemporalPatterns() {
        const data = this.dataManager.getData();
        const { playerMatches } = data;
        
        // Group matches by time periods
        const timeGroups = {};
        
        playerMatches.forEach(({ match, playerParticipant }) => {
            const date = new Date(match.info.gameCreation);
            const dayKey = date.toDateString();
            
            if (!timeGroups[dayKey]) {
                timeGroups[dayKey] = {
                    date: date,
                    matches: [],
                    roleDistribution: {},
                    avgPerformance: 0,
                    teamSidePreference: { blue: 0, red: 0 },
                    totalWins: 0,
                    totalGames: 0
                };
            }
            
            const group = timeGroups[dayKey];
            group.matches.push({ match, playerParticipant });
            group.totalGames++;
            
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            group.roleDistribution[role] = (group.roleDistribution[role] || 0) + 1;
            
            const team = playerParticipant.teamId === 100 ? 'blue' : 'red';
            group.teamSidePreference[team]++;
            
            if (playerParticipant.win) {
                group.totalWins++;
            }
            
            // Calculate performance score
            const kda = this.dataManager.calculateKDA(
                playerParticipant.kills,
                playerParticipant.deaths,
                playerParticipant.assists
            );
            group.avgPerformance += kda;
        });
        
        // Calculate averages and win rates
        Object.values(timeGroups).forEach(group => {
            group.avgPerformance /= group.matches.length;
            group.winRate = (group.totalWins / group.totalGames) * 100;
        });
        
        return Object.values(timeGroups).sort((a, b) => a.date - b.date);
    }

    renderTemporalChart(temporalData, container) {
        const canvas = container.querySelector('#temporal-timeline-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        if (temporalData.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No temporal data available', width / 2, height / 2);
            return;
        }
        
        // Chart dimensions
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Data preparation
        const maxWinRate = Math.max(...temporalData.map(d => d.winRate));
        const minWinRate = Math.min(...temporalData.map(d => d.winRate));
        const maxPerformance = Math.max(...temporalData.map(d => d.avgPerformance));
        
        // Draw axes
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        // Y-axis
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();
        
        // X-axis
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();
        
        // Draw win rate line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        temporalData.forEach((point, index) => {
            const x = padding + (index / (temporalData.length - 1)) * chartWidth;
            const y = height - padding - ((point.winRate - minWinRate) / (maxWinRate - minWinRate)) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw performance dots
        temporalData.forEach((point, index) => {
            const x = padding + (index / (temporalData.length - 1)) * chartWidth;
            const y = height - padding - ((point.avgPerformance / maxPerformance)) * chartHeight;
            
            ctx.fillStyle = point.winRate > 50 ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        // Add labels
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        
        // Date labels (show every few points to avoid crowding)
        const labelInterval = Math.max(1, Math.floor(temporalData.length / 5));
        temporalData.forEach((point, index) => {
            if (index % labelInterval === 0) {
                const x = padding + (index / (temporalData.length - 1)) * chartWidth;
                const y = height - 10;
                ctx.fillText(point.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), x, y);
            }
        });
    }

    setupTemporalHandlers(container) {
        const periodSelect = container.querySelector('#temporal-period');
        const roleSelect = container.querySelector('#temporal-role');
        
        const updateChart = () => {
            const period = periodSelect.value;
            const role = roleSelect.value;
            
            // Recalculate data based on selections
            const filteredData = this.calculateFilteredTemporalData(period, role);
            this.renderTemporalChart(filteredData, container);
            this.updateTemporalInsights(filteredData);
        };
        
        periodSelect.addEventListener('change', updateChart);
        roleSelect.addEventListener('change', updateChart);
    }

    calculateFilteredTemporalData(period, role) {
        const data = this.dataManager.getData();
        let { playerMatches } = data;
        
        // Filter by role if specified
        if (role !== 'all') {
            playerMatches = playerMatches.filter(({ playerParticipant }) => 
                (playerParticipant.teamPosition || 'UNKNOWN') === role
            );
        }
        
        // Group by period
        const timeGroups = {};
        const getTimeKey = (date) => {
            switch (period) {
                case 'weekly':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    return weekStart.toDateString();
                case 'monthly':
                    return `${date.getFullYear()}-${date.getMonth()}`;
                default: // daily
                    return date.toDateString();
            }
        };
        
        playerMatches.forEach(({ match, playerParticipant }) => {
            const date = new Date(match.info.gameCreation);
            const timeKey = getTimeKey(date);
            
            if (!timeGroups[timeKey]) {
                timeGroups[timeKey] = {
                    date: new Date(timeKey),
                    matches: [],
                    avgPerformance: 0,
                    totalWins: 0,
                    totalGames: 0,
                    winRate: 0
                };
            }
            
            const group = timeGroups[timeKey];
            group.matches.push({ match, playerParticipant });
            group.totalGames++;
            
            if (playerParticipant.win) {
                group.totalWins++;
            }
            
            const kda = this.dataManager.calculateKDA(
                playerParticipant.kills,
                playerParticipant.deaths,
                playerParticipant.assists
            );
            group.avgPerformance += kda;
        });
        
        // Calculate averages
        return Object.values(timeGroups).map(group => {
            group.avgPerformance /= group.matches.length;
            group.winRate = (group.totalWins / group.totalGames) * 100;
            return group;
        }).sort((a, b) => a.date - b.date);
    }

    updateTemporalInsights(temporalData) {
        if (temporalData.length === 0) return;
        
        // Most active period
        const mostActive = temporalData.reduce((max, current) => 
            current.totalGames > max.totalGames ? current : max
        );
        const mostActiveEl = document.getElementById('most-active-period');
        if (mostActiveEl) {
            mostActiveEl.textContent = `${mostActive.date.toLocaleDateString()} (${mostActive.totalGames} games)`;
        }
        
        // Best performance period
        const bestPerformance = temporalData.reduce((max, current) => 
            current.winRate > max.winRate ? current : max
        );
        const bestPerformanceEl = document.getElementById('best-performance-period');
        if (bestPerformanceEl) {
            bestPerformanceEl.textContent = `${bestPerformance.date.toLocaleDateString()} (${bestPerformance.winRate.toFixed(1)}% WR)`;
        }
        
        // Improvement trend
        const recentData = temporalData.slice(-5);
        const earlyData = temporalData.slice(0, 5);
        const recentAvg = recentData.reduce((sum, d) => sum + d.winRate, 0) / recentData.length;
        const earlyAvg = earlyData.reduce((sum, d) => sum + d.winRate, 0) / earlyData.length;
        const trend = recentAvg > earlyAvg ? 'Improving' : recentAvg < earlyAvg ? 'Declining' : 'Stable';
        const trendDiff = Math.abs(recentAvg - earlyAvg).toFixed(1);
        
        const improvementTrendEl = document.getElementById('improvement-trend');
        if (improvementTrendEl) {
            improvementTrendEl.textContent = `${trend} (${recentAvg > earlyAvg ? '+' : recentAvg < earlyAvg ? '-' : '±'}${trendDiff}%)`;
        }
    }

    // Champion Synergy Analysis
    calculateChampionSynergies() {
        const data = this.dataManager.getData();
        const { playerMatches } = data;
        
        const synergyMap = new Map();
        
        playerMatches.forEach(({ match, playerParticipant }) => {
            const playerChampion = playerParticipant.championName;
            const playerTeamId = playerParticipant.teamId;
            
            // Find teammates
            const teammates = match.info.participants
                .filter(p => p.teamId === playerTeamId && p.puuid !== playerParticipant.puuid)
                .map(p => p.championName);
            
            teammates.forEach(teammateChamp => {
                const synergyKey = [playerChampion, teammateChamp].sort().join('-');
                
                if (!synergyMap.has(synergyKey)) {
                    synergyMap.set(synergyKey, {
                        champions: [playerChampion, teammateChamp],
                        games: 0,
                        wins: 0,
                        totalPlayerKDA: 0,
                        totalTeammateKDA: 0,
                        avgCombinedDamage: 0,
                        avgGameDuration: 0
                    });
                }
                
                const synergy = synergyMap.get(synergyKey);
                synergy.games++;
                
                if (playerParticipant.win) {
                    synergy.wins++;
                }
                
                // Calculate combined performance
                const teammateData = match.info.participants.find(p => 
                    p.championName === teammateChamp && p.teamId === playerTeamId
                );
                
                if (teammateData) {
                    const playerKDA = this.dataManager.calculateKDA(
                        playerParticipant.kills,
                        playerParticipant.deaths,
                        playerParticipant.assists
                    );
                    const teammateKDA = this.dataManager.calculateKDA(
                        teammateData.kills,
                        teammateData.deaths,
                        teammateData.assists
                    );
                    
                    synergy.totalPlayerKDA += playerKDA;
                    synergy.totalTeammateKDA += teammateKDA;
                    synergy.avgCombinedDamage += playerParticipant.totalDamageDealtToChampions + teammateData.totalDamageDealtToChampions;
                    synergy.avgGameDuration += match.info.gameDuration;
                }
            });
        });
        
        // Calculate averages and filter significant synergies
        const significantSynergies = Array.from(synergyMap.values())
            .filter(synergy => synergy.games >= 3)
            .map(synergy => ({
                ...synergy,
                winRate: (synergy.wins / synergy.games * 100).toFixed(1),
                avgPlayerKDA: (synergy.totalPlayerKDA / synergy.games).toFixed(2),
                avgTeammateKDA: (synergy.totalTeammateKDA / synergy.games).toFixed(2),
                avgCombinedKDA: ((synergy.totalPlayerKDA + synergy.totalTeammateKDA) / (synergy.games * 2)).toFixed(2),
                avgCombinedDamage: Math.round(synergy.avgCombinedDamage / synergy.games),
                avgGameDuration: Math.round(synergy.avgGameDuration / synergy.games)
            }))
            .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));
        
        return this.renderChampionSynergies(significantSynergies);
    }

    renderChampionSynergies(synergies) {
        const synergyContainer = document.createElement('div');
        synergyContainer.className = 'champion-synergies';
        
        synergyContainer.innerHTML = `
            <div class="card stat-card">
                <div class="card-body">
                    <h6><i class="bi bi-people me-2"></i>Champion Synergies</h6>
                    <div class="synergy-filters mb-3">
                        <div class="row g-2">
                            <div class="col-md-4">
                                <select id="synergy-sort" class="form-select form-select-sm">
                                    <option value="winRate">Sort by Win Rate</option>
                                    <option value="games">Sort by Games Played</option>
                                    <option value="avgCombinedKDA">Sort by Combined KDA</option>
                                    <option value="avgCombinedDamage">Sort by Combined Damage</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <input type="number" id="min-games-filter" class="form-control form-control-sm" 
                                       placeholder="Min games" value="3" min="1">
                            </div>
                            <div class="col-md-4">
                                <select id="synergy-champion-filter" class="form-select form-select-sm">
                                    <option value="">All Champions</option>
                                    ${this.getUniqueChampions(synergies).map(champ => 
                                        `<option value="${champ}">${champ}</option>`
                                    ).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="synergies-list" id="synergies-container">
                        ${this.renderSynergyItems(synergies)}
                    </div>
                </div>
            </div>
        `;

        this.setupSynergyHandlers(synergyContainer, synergies);
        return synergyContainer;
    }

    renderSynergyItems(synergies) {
        if (synergies.length === 0) {
            return '<div class="text-center text-muted p-3">No significant synergies found (minimum 3 games required)</div>';
        }

        return synergies.map(synergy => `
            <div class="synergy-item" data-champions="${synergy.champions.join(',')}" data-winrate="${synergy.winRate}">
                <div class="champion-pair">
                    <img src="${this.dataManager.getChampionIconUrl(synergy.champions[0], this.dataManager.getData().championData.version)}" 
                         class="champion-icon-small" alt="${synergy.champions[0]}" title="${synergy.champions[0]}">
                    <span class="plus-sign">+</span>
                    <img src="${this.dataManager.getChampionIconUrl(synergy.champions[1], this.dataManager.getData().championData.version)}" 
                         class="champion-icon-small" alt="${synergy.champions[1]}" title="${synergy.champions[1]}">
                </div>
                <div class="synergy-stats">
                    <div class="synergy-primary-stats">
                        <span class="win-rate ${parseFloat(synergy.winRate) >= 60 ? 'text-success' : parseFloat(synergy.winRate) >= 50 ? 'text-warning' : 'text-danger'}">
                            ${synergy.winRate}%
                        </span>
                        <span class="games-count">${synergy.games} games</span>
                    </div>
                    <div class="synergy-secondary-stats">
                        <span class="combined-kda" title="Combined Average KDA">
                            <i class="bi bi-trophy-fill"></i> ${synergy.avgCombinedKDA}
                        </span>
                        <span class="combined-damage" title="Combined Average Damage">
                            <i class="bi bi-lightning-fill"></i> ${this.formatNumber(synergy.avgCombinedDamage)}
                        </span>
                        <span class="avg-duration" title="Average Game Duration">
                            <i class="bi bi-clock-fill"></i> ${this.formatGameDuration(synergy.avgGameDuration)}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getUniqueChampions(synergies) {
        const champions = new Set();
        synergies.forEach(synergy => {
            synergy.champions.forEach(champ => champions.add(champ));
        });
        return Array.from(champions).sort();
    }

    setupSynergyHandlers(container, originalSynergies) {
        const sortSelect = container.querySelector('#synergy-sort');
        const minGamesFilter = container.querySelector('#min-games-filter');
        const championFilter = container.querySelector('#synergy-champion-filter');
        const synergyContainer = container.querySelector('#synergies-container');

        const updateSynergies = () => {
            let filteredSynergies = [...originalSynergies];
            
            // Filter by minimum games
            const minGames = parseInt(minGamesFilter.value) || 1;
            filteredSynergies = filteredSynergies.filter(s => s.games >= minGames);
            
            // Filter by champion
            const selectedChampion = championFilter.value;
            if (selectedChampion) {
                filteredSynergies = filteredSynergies.filter(s => 
                    s.champions.includes(selectedChampion)
                );
            }
            
            // Sort
            const sortBy = sortSelect.value;
            filteredSynergies.sort((a, b) => {
                switch (sortBy) {
                    case 'games':
                        return b.games - a.games;
                    case 'avgCombinedKDA':
                        return parseFloat(b.avgCombinedKDA) - parseFloat(a.avgCombinedKDA);
                    case 'avgCombinedDamage':
                        return b.avgCombinedDamage - a.avgCombinedDamage;
                    default: // winRate
                        return parseFloat(b.winRate) - parseFloat(a.winRate);
                }
            });
            
            synergyContainer.innerHTML = this.renderSynergyItems(filteredSynergies);
        };

        sortSelect.addEventListener('change', updateSynergies);
        minGamesFilter.addEventListener('input', updateSynergies);
        championFilter.addEventListener('change', updateSynergies);
    }


    // Customization Panel
    createCustomizationPanel() {
        const customPanel = document.createElement('div');
        customPanel.id = 'mini-map-customization-panel';
        customPanel.className = 'mini-map-customization';
        customPanel.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h6><i class="bi bi-sliders me-2"></i>Map Customization</h6>
                    <div class="customization-options">
                        <div class="option-group">
                            <label>Icon Size:</label>
                            <input type="range" id="icon-size-slider" min="14" max="32" value="24">
                            <span class="size-display">24px</span>
                        </div>
                        <div class="option-group">
                            <label>Show Win/Loss Colors:</label>
                            <input type="checkbox" id="show-outcome-colors" checked>
                        </div>
                        <div class="option-group">
                            <label>Performance Scaling:</label>
                            <input type="checkbox" id="performance-scaling" checked>
                        </div>
                        <div class="option-group">
                            <label>Show Tooltips:</label>
                            <input type="checkbox" id="show-tooltips" checked>
                        </div>
                        <div class="option-group">
                            <label>Animation Effects:</label>
                            <input type="checkbox" id="enable-animations" checked>
                        </div>
                        <div class="option-group">
                            <label>Show Heatmap:</label>
                            <select id="heatmap-role-select" class="form-select">
                                <option value="">None</option>
                                <option value="TOP">Top Lane</option>
                                <option value="JUNGLE">Jungle</option>
                                <option value="MIDDLE">Mid Lane</option>
                                <option value="BOTTOM">Bot Lane</option>
                                <option value="UTILITY">Support</option>
                            </select>
                        </div>
                    </div>
                    <div class="preset-layouts">
                        <button class="btn btn-sm btn-outline-primary" data-preset="minimal">Minimal</button>
                        <button class="btn btn-sm btn-outline-primary" data-preset="detailed">Detailed</button>
                        <button class="btn btn-sm btn-outline-primary" data-preset="performance">Performance</button>
                        <button class="btn btn-sm btn-outline-secondary" data-preset="reset">Reset</button>
                    </div>
                </div>
            </div>
        `;

        this.setupCustomizationHandlers(customPanel);
        return customPanel;
    }

    setupCustomizationHandlers(panel) {
        // Icon size slider
        const iconSizeSlider = panel.querySelector('#icon-size-slider');
        const sizeDisplay = panel.querySelector('.size-display');
        
        iconSizeSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            sizeDisplay.textContent = `${size}px`;
            this.updateIconSizes(parseInt(size));
        });

        // Toggle options
        panel.querySelector('#show-outcome-colors').addEventListener('change', (e) => {
            this.toggleOutcomeColors(e.target.checked);
        });

        panel.querySelector('#performance-scaling').addEventListener('change', (e) => {
            this.togglePerformanceScaling(e.target.checked);
        });

        panel.querySelector('#show-tooltips').addEventListener('change', (e) => {
            this.toggleTooltips(e.target.checked);
        });

        panel.querySelector('#enable-animations').addEventListener('change', (e) => {
            this.toggleAnimations(e.target.checked);
        });

        // Heatmap role selector
        panel.querySelector('#heatmap-role-select').addEventListener('change', (e) => {
            this.handleHeatmapChange(e.target.value);
        });

        // Preset buttons
        panel.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyPreset(e.target.dataset.preset, panel);
            });
        });
    }

    updateIconSizes(size) {
        const icons = document.querySelectorAll('.champion-icon-map');
        icons.forEach(icon => {
            icon.style.width = `${size}px`;
            icon.style.height = `${size}px`;
        });
    }

    toggleOutcomeColors(enabled) {
        const icons = document.querySelectorAll('.champion-icon-map');
        icons.forEach(icon => {
            if (enabled) {
                icon.classList.remove('no-outcome-colors');
            } else {
                icon.classList.add('no-outcome-colors');
            }
        });
    }

    togglePerformanceScaling(enabled) {
        const icons = document.querySelectorAll('.champion-icon-map');
        icons.forEach(icon => {
            if (enabled) {
                icon.classList.remove('no-performance-scaling');
            } else {
                icon.classList.add('no-performance-scaling');
            }
        });
    }

    toggleTooltips(enabled) {
        this.tooltipsEnabled = enabled;
        if (!enabled) {
            // Remove existing tooltips
            document.querySelectorAll('.enhanced-tooltip').forEach(tooltip => {
                tooltip.remove();
            });
        }
    }

    toggleAnimations(enabled) {
        const icons = document.querySelectorAll('.champion-icon-map');
        icons.forEach(icon => {
            if (enabled) {
                icon.classList.remove('no-animations');
            } else {
                icon.classList.add('no-animations');
            }
        });
    }

    handleHeatmapChange(role) {
        // Clear existing heatmaps
        document.querySelectorAll('.position-heatmap').forEach(heatmap => {
            heatmap.remove();
        });

        if (role) {
            this.toggleHeatmap(role);
        }
    }

    applyPreset(presetName, panel) {
        const iconSizeSlider = panel.querySelector('#icon-size-slider');
        const sizeDisplay = panel.querySelector('.size-display');
        const outcomeColors = panel.querySelector('#show-outcome-colors');
        const performanceScaling = panel.querySelector('#performance-scaling');
        const tooltips = panel.querySelector('#show-tooltips');
        const animations = panel.querySelector('#enable-animations');
        const heatmapSelect = panel.querySelector('#heatmap-role-select');

        switch (presetName) {
            case 'minimal':
                iconSizeSlider.value = '16';
                sizeDisplay.textContent = '16px';
                outcomeColors.checked = false;
                performanceScaling.checked = false;
                tooltips.checked = false;
                animations.checked = false;
                heatmapSelect.value = '';
                break;
            
            case 'detailed':
                iconSizeSlider.value = '28';
                sizeDisplay.textContent = '28px';
                outcomeColors.checked = true;
                performanceScaling.checked = true;
                tooltips.checked = true;
                animations.checked = true;
                heatmapSelect.value = '';
                break;
            
            case 'performance':
                iconSizeSlider.value = '24';
                sizeDisplay.textContent = '24px';
                outcomeColors.checked = true;
                performanceScaling.checked = true;
                tooltips.checked = true;
                animations.checked = true;
                heatmapSelect.value = 'MIDDLE'; // Show mid lane heatmap by default
                break;
            
            case 'reset':
                iconSizeSlider.value = '24';
                sizeDisplay.textContent = '24px';
                outcomeColors.checked = true;
                performanceScaling.checked = true;
                tooltips.checked = true;
                animations.checked = true;
                heatmapSelect.value = '';
                break;
        }

        // Apply all settings
        this.updateIconSizes(parseInt(iconSizeSlider.value));
        this.toggleOutcomeColors(outcomeColors.checked);
        this.togglePerformanceScaling(performanceScaling.checked);
        this.toggleTooltips(tooltips.checked);
        this.toggleAnimations(animations.checked);
        this.handleHeatmapChange(heatmapSelect.value);
    }

    addCustomizationToggle() {
        const miniMapTab = document.getElementById('mini-map');
        if (!miniMapTab) return;

        // Find the header with the title and filter
        const cardHeader = miniMapTab.querySelector('.d-flex.justify-content-between');
        if (!cardHeader) return;

        const toggleButton = document.createElement('button');
        toggleButton.className = 'customization-toggle btn btn-sm btn-outline-primary ms-2';
        toggleButton.innerHTML = '<i class="bi bi-sliders me-1"></i>Customize';
        toggleButton.title = 'Customize Mini-map Display';
        
        toggleButton.addEventListener('click', () => {
            this.toggleCustomizationPanel();
            // Toggle button appearance
            toggleButton.classList.toggle('active');
        });

        // Add the button next to the filter select
        cardHeader.appendChild(toggleButton);
    }

    toggleCustomizationPanel() {
        let panel = document.getElementById('mini-map-customization-panel');
        
        if (!panel) {
            panel = this.createCustomizationPanel();
            const miniMapTab = document.getElementById('mini-map');
            const cardBody = miniMapTab.querySelector('.card-body');
            
            // Insert the panel after the header but before the map container
            const mapContainer = cardBody.querySelector('#mini-map-container').parentNode;
            cardBody.insertBefore(panel, mapContainer);
        }
        
        // Use smooth slide animation
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            setTimeout(() => panel.classList.add('visible'), 10);
        } else {
            panel.classList.remove('visible');
            setTimeout(() => panel.style.display = 'none', 300);
        }
    }

    destroy() {
        // Clean up event listeners
        const miniMapFilter = document.getElementById('mini-map-filter');
        if (miniMapFilter) {
            miniMapFilter.replaceWith(miniMapFilter.cloneNode(true));
        }
        
        // Remove statistics panel
        const statsPanel = document.getElementById('minimap-stats');
        if (statsPanel) {
            statsPanel.remove();
        }

        // Remove customization panel
        const customPanel = document.getElementById('mini-map-customization-panel');
        if (customPanel) {
            customPanel.remove();
        }

        // Remove toggle button
        const toggleButton = document.querySelector('.customization-toggle');
        if (toggleButton) {
            toggleButton.remove();
        }
    }
}

// Export for module use
window.MiniMap = MiniMap;