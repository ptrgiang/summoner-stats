# Mini-map Module Development Guide

The Mini-map module provides interactive champion positioning visualization with realistic lane algorithms, team-based analysis, and statistical insights for positional gameplay patterns.

## 🎯 Current Features

### **Champion Positioning System**
- **Realistic Lane Algorithms**: Champions positioned along actual lane paths
- **Team-Based Coloring**: Blue side (blue border) vs Red side (red border) 
- **Role-Specific Positioning**: Different algorithms for TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY
- **Jitter & Spread**: Visual separation when multiple games overlap
- **Win/Loss Indicators**: Visual styling differences for victories/defeats

### **Interactive Elements**
- **Game Count Filtering**: 10, 20, 35, 50, or All games selector
- **Hover Effects**: Champion icons scale and show tooltips on hover
- **Real-time Updates**: Dynamic re-rendering based on filter selection
- **Champion Icons**: CDN-loaded champion portraits with tooltips

### **Statistical Analysis**
- **Role Distribution**: Breakdown of games played per position
- **Team Side Analysis**: Blue vs Red side performance tracking  
- **Live Statistics Panel**: Games, win rate, side distribution display
- **Performance Indicators**: Win/loss visual cues on champion icons

### **Advanced Positioning Logic**
- **Vector-Based Lanes**: TOP, MIDDLE, BOTTOM use directional vectors
- **Area-Based Jungle**: JUNGLE uses radius-based random positioning
- **Team-Specific Origins**: Different starting points for blue/red teams
- **Spread Calculations**: Distribute multiple games along lane paths

## 🛠️ Development Structure

### **Files to Work With**
```
js/modules/mini-map.js     # Main mini-map logic and positioning
css/styles.css            # Icon styling, hover effects, statistics
index-modular.html        # Mini-map tab HTML structure
mini-map.png             # Base Rift map image
```

### **Core Class Methods**
```javascript
class MiniMap {
    constructor(dataManager)         # Initialize with role path configurations
    init()                          # Setup event listeners and initial render
    setupEventListeners()           # Configure game count filter handlers
    renderMiniMap(gamesToShow)      # Main rendering logic
    renderRoleIcons()               # Position champions by role
    calculateIconPosition()         # Calculate x,y coordinates for champions
    createChampionIcon()            # Create interactive champion elements
    updateMapStatistics()           # Generate and display statistics
    getRoleDistribution()           # Calculate role-based analytics
    getTeamSideStats()             # Analyze blue/red performance
    getPositionalHeatmap()         # Generate role-specific heatmaps
    destroy()                      # Clean up event listeners
}
```

## 🚀 Upgrade Ideas & Implementation

### **1. Advanced Positioning Algorithms**

#### **Dynamic Lane Width Adjustments**
```javascript
// Enhanced positioning with adaptive lane widths based on game count
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
```

#### **Performance-Based Visual Indicators**
```javascript
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
    icon.style.width = `${20 + impactSize * 8}px`;
    icon.style.height = `${20 + impactSize * 8}px`;
    
    // Glow effect for exceptional performances  
    if (performance.exceptional) {
        icon.style.boxShadow = `0 0 ${8 + performance.score * 4}px ${performance.glowColor}`;
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

createEnhancedTooltip(icon, champName, role, gameData, performance) {
    const tooltip = document.createElement('div');
    tooltip.className = 'enhanced-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-header">
            <strong>${champName}</strong>
            <span class="role-badge ${role.toLowerCase()}">${role}</span>
        </div>
        <div class="tooltip-stats">
            <div class="stat-row">
                <span>KDA:</span>
                <span class="kda-value">${gameData.playerParticipant.kills}/${gameData.playerParticipant.deaths}/${gameData.playerParticipant.assists}</span>
            </div>
            <div class="stat-row">
                <span>Result:</span>
                <span class="${gameData.playerParticipant.win ? 'win' : 'loss'}">
                    ${gameData.playerParticipant.win ? 'Victory' : 'Defeat'}
                </span>
            </div>
            <div class="stat-row">
                <span>Performance:</span>
                <span class="performance-${performance.category}">${performance.category.toUpperCase()}</span>
            </div>
            <div class="stat-row">
                <span>Duration:</span>
                <span>${this.formatGameDuration(gameData.match.info.gameDuration)}</span>
            </div>
        </div>
        <div class="tooltip-date">
            ${new Date(gameData.match.info.gameCreation).toLocaleDateString()}
        </div>
    `;
    
    this.setupTooltipInteraction(icon, tooltip);
}
```

### **2. Interactive Heatmaps**

#### **Density-Based Heatmap Overlay**
```javascript
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
    
    relevantMatches.forEach(({ playerParticipant, match }) => {
        const team = playerParticipant.teamId === 100 ? 'blue' : 'red';
        const pathConfig = this.rolePaths[team][role];
        
        // Calculate position using existing algorithm
        const position = this.calculateIconPosition(pathConfig, 0, 1);
        
        // Map to grid coordinates
        const gridX = Math.floor(position.x / 100 * gridSize);
        const gridY = Math.floor(position.y / 100 * gridSize);
        
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            densityGrid[gridY][gridX]++;
            
            // Track performance at this position
            const kda = this.dataManager.calculateKDA(
                playerParticipant.kills,
                playerParticipant.deaths,
                playerParticipant.assists
            );
            performanceGrid[gridY][gridX] += playerParticipant.win ? kda : -kda;
        }
    });
    
    return { density: densityGrid, performance: performanceGrid, gridSize };
}

renderHeatmapData(canvas, heatmapData) {
    const ctx = canvas.getContext('2d');
    const { density, performance, gridSize } = heatmapData;
    
    const cellWidth = canvas.width / gridSize;
    const cellHeight = canvas.height / gridSize;
    
    // Find max values for normalization
    const maxDensity = Math.max(...density.flat());
    const maxPerformance = Math.max(...performance.flat().map(Math.abs));
    
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const densityValue = density[y][x];
            const performanceValue = performance[y][x];
            
            if (densityValue > 0) {
                // Color based on performance, opacity based on density
                const performanceRatio = performanceValue / maxPerformance;
                const densityRatio = densityValue / maxDensity;
                
                const color = this.getHeatmapColor(performanceRatio);
                const alpha = Math.min(0.8, densityRatio);
                
                ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
                ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            }
        }
    }
}
```

#### **Temporal Analysis Visualization**
```javascript
createTemporalAnalysis() {
    const temporalData = this.calculateTemporalPatterns();
    
    const analysisContainer = document.createElement('div');
    analysisContainer.className = 'temporal-analysis';
    analysisContainer.innerHTML = `
        <div class="card stat-card">
            <div class="card-body">
                <h6>Positional Patterns Over Time</h6>
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
                    <canvas id="temporal-timeline-chart"></canvas>
                </div>
                <div class="temporal-insights">
                    <div id="temporal-insights-content"></div>
                </div>
            </div>
        </div>
    `;
    
    this.renderTemporalChart(temporalData);
    this.setupTemporalHandlers(analysisContainer);
    
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
                teamSidePreference: { blue: 0, red: 0 }
            };
        }
        
        const group = timeGroups[dayKey];
        group.matches.push({ match, playerParticipant });
        
        const role = playerParticipant.teamPosition || 'UNKNOWN';
        group.roleDistribution[role] = (group.roleDistribution[role] || 0) + 1;
        
        const team = playerParticipant.teamId === 100 ? 'blue' : 'red';
        group.teamSidePreference[team]++;
    });
    
    return Object.values(timeGroups).sort((a, b) => a.date - b.date);
}
```

### **3. Advanced Analytics**

#### **Champion Synergy Analysis**
```javascript
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
                    avgCombinedKDA: 0
                });
            }
            
            const synergy = synergyMap.get(synergyKey);
            synergy.games++;
            
            if (playerParticipant.win) {
                synergy.wins++;
            }
            
            // Calculate combined performance
            const teammateData = match.info.participants.find(p => p.championName === teammateChamp);
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
                synergy.avgCombinedKDA += (playerKDA + teammateKDA) / 2;
            }
        });
    });
    
    // Calculate averages and filter significant synergies
    const significantSynergies = Array.from(synergyMap.values())
        .filter(synergy => synergy.games >= 3)
        .map(synergy => ({
            ...synergy,
            winRate: (synergy.wins / synergy.games * 100).toFixed(1),
            avgCombinedKDA: (synergy.avgCombinedKDA / synergy.games).toFixed(2)
        }))
        .sort((a, b) => b.winRate - a.winRate);
    
    return this.renderChampionSynergies(significantSynergies);
}

renderChampionSynergies(synergies) {
    return `
        <div class="champion-synergies">
            <h6>Champion Synergies</h6>
            <div class="synergies-list">
                ${synergies.slice(0, 10).map(synergy => `
                    <div class="synergy-item">
                        <div class="champion-pair">
                            <img src="${this.dataManager.getChampionIconUrl(synergy.champions[0] + '.png', '13.1.1')}" class="champion-icon-small">
                            <span class="plus-sign">+</span>
                            <img src="${this.dataManager.getChampionIconUrl(synergy.champions[1] + '.png', '13.1.1')}" class="champion-icon-small">
                        </div>
                        <div class="synergy-stats">
                            <span class="win-rate text-${synergy.winRate > 60 ? 'success' : 'muted'}">${synergy.winRate}%</span>
                            <span class="games-count">${synergy.games} games</span>
                            <span class="combined-kda">KDA: ${synergy.avgCombinedKDA}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
```

#### **Predictive Positioning**
```javascript
calculateOptimalPositioning(role, currentConditions) {
    const historicalData = this.getPositionalHeatmap(role, 100);
    const winConditions = this.analyzeWinningPositions(role);
    
    // Machine learning-like prediction based on historical success
    const optimalZones = this.identifyOptimalZones(historicalData, winConditions);
    
    return this.generatePositionalRecommendations(optimalZones, currentConditions);
}

identifyOptimalZones(heatmapData, winConditions) {
    const zones = [];
    
    // Analyze high-performance areas
    heatmapData.forEach((position, index) => {
        if (position.winRate > 65 && position.games >= 5) {
            zones.push({
                x: position.x,
                y: position.y,
                winRate: position.winRate,
                confidence: Math.min(100, position.games * 10),
                factors: this.analyzePositionFactors(position)
            });
        }
    });
    
    return zones.sort((a, b) => b.winRate - a.winRate);
}

generatePositionalRecommendations(optimalZones, conditions) {
    return {
        primaryRecommendation: optimalZones[0],
        alternativeOptions: optimalZones.slice(1, 4),
        reasoning: this.explainRecommendation(optimalZones[0], conditions),
        riskAssessment: this.assessPositionalRisk(optimalZones[0]),
        contextualAdjustments: this.getContextualAdjustments(conditions)
    };
}
```

### **4. Enhanced User Experience**

#### **Interactive Tour System**
```javascript
createInteractiveTour() {
    const tour = {
        steps: [
            {
                target: '#mini-map-container',
                title: 'Champion Positioning Map',
                content: 'This shows where you played each champion. Blue borders = Blue team, Red borders = Red team.',
                position: 'bottom'
            },
            {
                target: '#mini-map-filter',
                title: 'Game Filter',
                content: 'Choose how many recent games to display on the map.',
                position: 'left'
            },
            {
                target: '.champion-icon-map:first-child',
                title: 'Champion Icons',
                content: 'Hover over icons to see game details. Brighter icons = wins, dimmer = losses.',
                position: 'top'
            },
            {
                target: '#minimap-stats',
                title: 'Positional Statistics',
                content: 'View your role distribution and team side performance.',
                position: 'top'
            }
        ],
        currentStep: 0
    };
    
    this.initializeTour(tour);
}

createCustomizationPanel() {
    const customPanel = document.createElement('div');
    customPanel.className = 'mini-map-customization';
    customPanel.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h6>Map Customization</h6>
                <div class="customization-options">
                    <div class="option-group">
                        <label>Icon Size:</label>
                        <input type="range" id="icon-size-slider" min="16" max="32" value="24">
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
                </div>
                <div class="preset-layouts">
                    <button class="btn btn-sm btn-outline-primary" onclick="this.applyPreset('minimal')">Minimal</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="this.applyPreset('detailed')">Detailed</button>
                    <button class="btn btn-sm btn-outline-primary" onclick="this.applyPreset('performance')">Performance</button>
                </div>
            </div>
        </div>
    `;
    
    this.setupCustomizationHandlers(customPanel);
    return customPanel;
}
```

## 🎨 Advanced Styling

### **CSS for Enhanced Features**
```css
/* Enhanced Champion Icons */
.champion-icon-map.enhanced {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    filter: brightness(1.0) saturate(1.0);
}

.champion-icon-map.exceptional {
    animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
    0%, 100% { 
        box-shadow: 0 0 8px var(--success-border); 
        transform: translate(-50%, -50%) scale(1); 
    }
    50% { 
        box-shadow: 0 0 16px var(--success-border); 
        transform: translate(-50%, -50%) scale(1.1); 
    }
}

.champion-icon-map.poor-performance {
    opacity: 0.6;
    filter: saturate(0.5);
}

/* Enhanced Tooltips */
.enhanced-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 1000;
    min-width: 200px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.role-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
}

.role-badge.top { background: #ef4444; }
.role-badge.jungle { background: #10b981; }
.role-badge.middle { background: #f59e0b; }
.role-badge.bottom { background: #3b82f6; }
.role-badge.utility { background: #8b5cf6; }

.stat-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
}

.kda-value {
    font-weight: 600;
    font-family: 'Courier New', monospace;
}

.performance-excellent { color: #10b981; font-weight: 600; }
.performance-good { color: #f59e0b; font-weight: 600; }
.performance-average { color: #6b7280; }
.performance-poor { color: #ef4444; font-weight: 600; }

/* Heatmap Overlay */
.position-heatmap {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0.6;
    pointer-events: none;
    border-radius: 0.5rem;
    mix-blend-mode: multiply;
}

/* Temporal Analysis */
.temporal-analysis .temporal-controls {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
}

.temporal-timeline {
    height: 200px;
    margin-bottom: 1rem;
}

.temporal-insights {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
}

/* Champion Synergies */
.synergies-list {
    max-height: 300px;
    overflow-y: auto;
}

.synergy-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s;
}

.synergy-item:hover {
    background-color: #f3f4f6;
}

.champion-pair {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.champion-icon-small {
    width: 24px;
    height: 24px;
    border-radius: 50%;
}

.plus-sign {
    color: #6b7280;
    font-weight: 600;
}

.synergy-stats {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
}

/* Customization Panel */
.mini-map-customization .customization-options {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

.option-group {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.option-group label {
    font-size: 0.875rem;
    font-weight: 500;
}

.preset-layouts {
    display: flex;
    gap: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .champion-icon-map {
        width: 16px;
        height: 16px;
    }
    
    .enhanced-tooltip {
        font-size: 0.75rem;
        min-width: 150px;
        padding: 0.5rem;
    }
    
    .temporal-controls {
        flex-direction: column;
        gap: 0.5rem;
    }
}
```

## 🧪 Testing & Validation

### **Position Algorithm Testing**
```javascript
function testPositionCalculations() {
    const miniMap = new MiniMap(mockDataManager);
    
    // Test lane positioning
    const topLanePosition = miniMap.calculateIconPosition(
        miniMap.rolePaths.blue.TOP,
        0,
        1
    );
    
    assert(topLanePosition.x >= 0 && topLanePosition.x <= 100, 'X position valid');
    assert(topLanePosition.y >= 0 && topLanePosition.y <= 100, 'Y position valid');
    
    // Test jungle area positioning
    const junglePosition = miniMap.calculateIconPosition(
        miniMap.rolePaths.blue.JUNGLE,
        0,
        1
    );
    
    assert(Math.abs(junglePosition.x - 35) <= 12, 'Jungle X within bounds');
    assert(Math.abs(junglePosition.y - 40) <= 12, 'Jungle Y within bounds');
}

function testStatisticsCalculation() {
    const miniMap = new MiniMap(mockDataManager);
    const roleDistribution = miniMap.getRoleDistribution(50);
    
    const totalGames = Object.values(roleDistribution).reduce((a, b) => a + b, 0);
    assert(totalGames <= 50, 'Game count within limit');
    assert(totalGames > 0, 'Games found');
}
```

## 🚀 Implementation Priority

### **Phase 1: Enhanced Positioning**
1. Performance-based visual indicators
2. Advanced positioning algorithms
3. Enhanced tooltips with detailed stats

### **Phase 2: Interactive Analysis**
1. Positional heatmap overlay
2. Temporal pattern analysis
3. Champion synergy calculations

### **Phase 3: Advanced Features**
1. Predictive positioning recommendations
2. Interactive tour system
3. Customization panel

The Mini-map module serves as the spatial intelligence hub, providing unique insights into positional gameplay patterns and team-based performance analysis that can't be found in traditional statistics.