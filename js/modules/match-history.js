/**
 * Match History Module - Filterable match list with detailed modal view
 */
class MatchHistory {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentFilters = {};
        this.filteredMatches = [];
    }

    init() {
        const data = this.dataManager.getData();
        this.setupFilters(data);
        this.setupAdvancedFilters();
        this.setupEventListeners();
        this.renderMatchList();
    }

    setupFilters(data) {
        const { playerMatches } = data;
        
        // Populate role filter
        const roleStats = {};
        playerMatches.forEach(({ playerParticipant }) => {
            const role = playerParticipant.teamPosition || 'UNKNOWN';
            roleStats[role] = (roleStats[role] || 0) + 1;
        });

        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            Object.keys(roleStats).sort().forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                roleFilter.appendChild(option);
            });
        }

        // Champion filter is populated by ChampionPerformance module
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const roleFilter = document.getElementById('role-filter');
        const championFilter = document.getElementById('champion-filter');
        const clearFilterBtn = document.getElementById('clear-filter-btn');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.applyFilters({ search: e.target.value });
            });
        }

        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.applyFilters({ role: e.target.value });
            });
        }

        if (championFilter) {
            championFilter.addEventListener('change', (e) => {
                this.applyFilters({ champion: e.target.value });
            });
        }

        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Advanced feature buttons
        const toggleComparisonBtn = document.getElementById('toggle-comparison-btn');
        const toggleStatisticsBtn = document.getElementById('toggle-statistics-btn');
        const exportDataBtn = document.getElementById('export-data-btn');

        if (toggleComparisonBtn) {
            toggleComparisonBtn.addEventListener('click', () => {
                this.toggleMatchComparison();
            });
        }

        if (toggleStatisticsBtn) {
            toggleStatisticsBtn.addEventListener('click', () => {
                this.toggleStatisticsDashboard();
            });
        }

        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => {
                this.showExportOptions();
            });
        }
    }

    applyFilters(newFilters) {
        this.currentFilters = { ...this.currentFilters, ...newFilters };
        
        // Update filter UI
        const roleFilter = document.getElementById('role-filter');
        const championFilter = document.getElementById('champion-filter');
        const searchInput = document.getElementById('search-input');
        
        if (roleFilter) roleFilter.value = this.currentFilters.role || '';
        if (championFilter) championFilter.value = this.currentFilters.champion || '';
        if (searchInput) searchInput.value = this.currentFilters.search || '';
        
        this.renderMatchList();
    }

    clearFilters() {
        this.currentFilters = {};
        const roleFilter = document.getElementById('role-filter');
        const championFilter = document.getElementById('champion-filter');
        const searchInput = document.getElementById('search-input');
        
        if (roleFilter) roleFilter.value = '';
        if (championFilter) championFilter.value = '';
        if (searchInput) searchInput.value = '';
        
        // Clear quick filter active states
        const quickFilterButtons = document.querySelectorAll('.quick-filter-btn');
        quickFilterButtons.forEach(btn => btn.classList.remove('active'));
        
        this.renderMatchList();
    }

    filterMatches() {
        const data = this.dataManager.getData();
        let filteredMatches = [...data.playerMatches];

        // Basic filters
        if (this.currentFilters.champion) {
            filteredMatches = filteredMatches.filter(({ playerParticipant }) => 
                playerParticipant.championName.toLowerCase() === this.currentFilters.champion.toLowerCase()
            );
        }

        if (this.currentFilters.role) {
            filteredMatches = filteredMatches.filter(({ playerParticipant }) => 
                (playerParticipant.teamPosition || 'UNKNOWN') === this.currentFilters.role
            );
        }

        if (this.currentFilters.search) {
            filteredMatches = filteredMatches.filter(({ playerParticipant }) => 
                playerParticipant.championName.toLowerCase().includes(this.currentFilters.search.toLowerCase())
            );
        }

        // Advanced filters
        filteredMatches = filteredMatches.filter(({ match, playerParticipant }) => {
            // Date range filter
            if (this.currentFilters.dateFrom) {
                const matchDate = new Date(match.info.gameCreation);
                const fromDate = new Date(this.currentFilters.dateFrom);
                if (matchDate < fromDate) return false;
            }
            
            if (this.currentFilters.dateTo) {
                const matchDate = new Date(match.info.gameCreation);
                const toDate = new Date(this.currentFilters.dateTo);
                toDate.setHours(23, 59, 59); // End of day
                if (matchDate > toDate) return false;
            }
            
            // Duration filter
            const duration = match.info.gameDuration;
            if (duration < (this.currentFilters.minDuration || 0) || duration > (this.currentFilters.maxDuration || Infinity)) {
                return false;
            }
            
            // Game mode filter
            if (this.currentFilters.gameMode && match.info.gameMode !== this.currentFilters.gameMode) {
                return false;
            }
            
            // Win/Loss filter
            if (this.currentFilters.winsOnly && !playerParticipant.win) return false;
            if (this.currentFilters.lossesOnly && playerParticipant.win) return false;
            
            // KDA filters
            const kda = this.dataManager.calculateKDA(
                playerParticipant.kills,
                playerParticipant.deaths,
                playerParticipant.assists
            );
            
            if (this.currentFilters.positiveKDAOnly && kda < 1) return false;
            if (kda < (this.currentFilters.minKDA || 0) || kda > (this.currentFilters.maxKDA || Infinity)) return false;
            
            return true;
        });

        this.filteredMatches = filteredMatches;
        return filteredMatches;
    }

    renderMatchList() {
        const matchListEl = document.getElementById('match-list');
        if (!matchListEl) return;

        const filteredMatches = this.filterMatches();
        matchListEl.innerHTML = '';

        if (filteredMatches.length === 0) {
            matchListEl.innerHTML = '<li class="list-group-item text-center text-muted">No matches found</li>';
            return;
        }

        const data = this.dataManager.getData();

        filteredMatches.forEach(({ match, playerParticipant }) => {
            const li = document.createElement('li');
            li.className = `list-group-item d-flex justify-content-between align-items-center match-list-item ${
                playerParticipant.win ? 'list-group-item-success' : 'list-group-item-danger'
            }`;
            
            const gameDate = new Date(match.info.gameCreation).toLocaleString();
            const duration = this.formatGameDuration(match.info.gameDuration);
            const kda = `${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}`;
            const champIconUrl = this.dataManager.getChampionIconUrl(playerParticipant.championName, data.championData.version);

            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${champIconUrl}" class="champion-icon me-3" alt="${playerParticipant.championName}">
                    <div>
                        <div><strong>${playerParticipant.championName}</strong> <span class="badge bg-secondary">${playerParticipant.teamPosition || 'N/A'}</span></div>
                        <small class="text-muted">${gameDate} • ${duration}</small>
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">KDA: ${kda}</div>
                    <small class="text-muted">${playerParticipant.goldEarned.toLocaleString()} gold</small>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.showMatchDetails(match, data);
            });
            
            matchListEl.appendChild(li);
        });
    }

    formatGameDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showMatchDetails(match, data) {
        const { mainPlayerPuuid, championData, itemData, gameModes } = data;
        const modalBody = document.getElementById('match-details-body');
        const modalTitle = document.getElementById('matchDetailsModalLabel');

        if (!modalBody || !modalTitle) return;

        // Set modal title
        const gameModeInfo = gameModes.find(gm => gm.gameMode === match.info.gameMode);
        modalTitle.textContent = `Match Details - ${gameModeInfo ? gameModeInfo.description : match.info.gameMode}`;

        // Organize teams
        const teams = { 100: [], 200: [] };
        match.info.participants.forEach(p => teams[p.teamId].push(p));

        const playerParticipant = match.info.participants.find(p => p.puuid === mainPlayerPuuid);
        
        // Create enhanced match details with tabs
        modalBody.innerHTML = `
            <!-- Match Summary -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <h6>Game Information</h6>
                    <div class="row">
                        <div class="col-md-3">
                            <strong>Duration:</strong> ${this.formatGameDuration(match.info.gameDuration)}
                        </div>
                        <div class="col-md-3">
                            <strong>Game Mode:</strong> ${match.info.gameMode}
                        </div>
                        <div class="col-md-3">
                            <strong>Queue:</strong> ${match.info.queueId}
                        </div>
                        <div class="col-md-3">
                            <strong>Date:</strong> ${new Date(match.info.gameCreation).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    ${playerParticipant ? this.renderPlayerHighlight(playerParticipant, championData) : ''}
                </div>
            </div>

            <!-- Match Timeline -->
            ${this.renderMatchTimeline(match, mainPlayerPuuid)}

            <!-- Performance Breakdown -->
            ${playerParticipant ? this.renderPerformanceBreakdown(playerParticipant, match) : ''}
            
            <!-- Team Tables -->
            <div class="row mt-4">
                <div class="col-lg-6">
                    <h5 class="text-primary">Blue Team ${match.info.teams[0].win ? '(Victory)' : '(Defeat)'}</h5>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>KDA</th>
                                    <th>Damage</th>
                                    <th>Gold</th>
                                    <th>Items</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTeamTable(teams[100], mainPlayerPuuid, championData, itemData)}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="col-lg-6">
                    <h5 class="text-danger">Red Team ${match.info.teams[1].win ? '(Victory)' : '(Defeat)'}</h5>
                    <div class="table-responsive">
                        <table class="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>KDA</th>
                                    <th>Damage</th>
                                    <th>Gold</th>
                                    <th>Items</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderTeamTable(teams[200], mainPlayerPuuid, championData, itemData)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('match-details-modal'));
        modal.show();
    }

    renderTeamTable(team, mainPlayerPuuid, championData, itemData) {
        return team.map(p => {
            const isMainPlayer = p.puuid === mainPlayerPuuid;
            const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6]
                        .filter(id => id !== 0)
                        .map(id => `<img src="${this.dataManager.getItemUrl(id, itemData)}" class="item-icon" title="${itemData.data[id]?.name || 'Unknown Item'}">`)
                        .join('');
            
            const championIdMap = new Map(Object.values(championData.data).map(c => [c.key, c]));
            const champInfo = championIdMap.get(String(p.championId));
            const champIconUrl = champInfo ? 
                `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champInfo.image.full}` : 
                'https://via.placeholder.com/32';

            return `
                <tr class="${isMainPlayer ? 'table-info' : ''}">
                    <td>
                        <img src="${champIconUrl}" class="champion-icon me-2" alt="${p.championName}">
                        ${p.riotIdGameName}
                        ${isMainPlayer ? '<span class="badge bg-primary ms-1">You</span>' : ''}
                    </td>
                    <td>${p.kills}/${p.deaths}/${p.assists}</td>
                    <td>${p.totalDamageDealtToChampions.toLocaleString()}</td>
                    <td>${p.goldEarned.toLocaleString()}</td>
                    <td>${items}</td>
                </tr>
            `;
        }).join('');
    }

    getFilteredMatches() {
        return this.filteredMatches;
    }

    // Analytics methods
    getMatchStatistics() {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        
        const wins = matches.filter(m => m.playerParticipant.win).length;
        const totalGames = matches.length;
        const winRate = this.dataManager.calculateWinRate(wins, totalGames);
        
        const avgKills = matches.reduce((sum, m) => sum + m.playerParticipant.kills, 0) / totalGames;
        const avgDeaths = matches.reduce((sum, m) => sum + m.playerParticipant.deaths, 0) / totalGames;
        const avgAssists = matches.reduce((sum, m) => sum + m.playerParticipant.assists, 0) / totalGames;
        const avgKDA = this.dataManager.calculateKDA(avgKills, avgDeaths, avgAssists);

        return {
            totalGames,
            wins,
            losses: totalGames - wins,
            winRate: parseFloat(winRate),
            avgKills: avgKills.toFixed(1),
            avgDeaths: avgDeaths.toFixed(1),
            avgAssists: avgAssists.toFixed(1),
            avgKDA: avgKDA === Infinity ? 'Perfect' : avgKDA.toFixed(2)
        };
    }

    setupAdvancedFilters() {
        const matchHistoryCard = document.querySelector('#match-history .card-body');
        if (!matchHistoryCard) return;

        // Add toggle button for advanced filters
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        if (clearFilterBtn && !document.getElementById('toggle-advanced-filters')) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggle-advanced-filters';
            toggleBtn.className = 'btn btn-outline-primary btn-sm me-2';
            toggleBtn.innerHTML = '<i class="bi bi-funnel me-1"></i>Advanced Filters';
            toggleBtn.setAttribute('data-bs-toggle', 'collapse');
            toggleBtn.setAttribute('data-bs-target', '#advanced-filters');
            clearFilterBtn.parentNode.insertBefore(toggleBtn, clearFilterBtn);
        }

        // Add quick filter shortcuts
        const quickFiltersContainer = this.createQuickFilters();
        const existingFilters = matchHistoryCard.querySelector('.row.g-3.mb-3');
        if (existingFilters && !document.getElementById('quick-filters')) {
            existingFilters.insertAdjacentElement('afterend', quickFiltersContainer);
        }

        const advancedFiltersContainer = this.createAdvancedFilters();
        const quickFilters = matchHistoryCard.querySelector('#quick-filters');
        if (quickFilters && !document.getElementById('advanced-filters')) {
            quickFilters.insertAdjacentElement('afterend', advancedFiltersContainer);
        }
    }

    createQuickFilters() {
        const quickFiltersContainer = document.createElement('div');
        quickFiltersContainer.id = 'quick-filters';
        quickFiltersContainer.className = 'quick-filters mb-3';
        quickFiltersContainer.innerHTML = `
            <div class="quick-filters-header">
                <small class="text-muted fw-medium">Quick Filters:</small>
            </div>
            <div class="quick-filters-buttons">
                <button class="btn btn-outline-primary btn-sm quick-filter-btn" data-filter="recent-wins">
                    <i class="bi bi-trophy"></i> Recent Wins (7d)
                </button>
                <button class="btn btn-outline-danger btn-sm quick-filter-btn" data-filter="recent-losses">
                    <i class="bi bi-x-circle"></i> Recent Losses (7d)
                </button>
                <button class="btn btn-outline-success btn-sm quick-filter-btn" data-filter="high-kda">
                    <i class="bi bi-star"></i> High KDA (3+)
                </button>
                <button class="btn btn-outline-warning btn-sm quick-filter-btn" data-filter="long-games">
                    <i class="bi bi-clock"></i> Long Games (35m+)
                </button>
                <button class="btn btn-outline-info btn-sm quick-filter-btn" data-filter="ranked-only">
                    <i class="bi bi-shield"></i> Ranked Only
                </button>
                <button class="btn btn-outline-secondary btn-sm quick-filter-btn" data-filter="this-week">
                    <i class="bi bi-calendar-week"></i> This Week
                </button>
            </div>
        `;
        
        this.setupQuickFilterHandlers(quickFiltersContainer);
        return quickFiltersContainer;
    }

    createAdvancedFilters() {
        const advancedFiltersContainer = document.createElement('div');
        advancedFiltersContainer.className = 'advanced-filters-panel collapse';
        advancedFiltersContainer.id = 'advanced-filters';
        advancedFiltersContainer.innerHTML = `
            <div class="card stat-card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Advanced Filters</h6>
                        <div>
                            <button id="save-filter-preset" class="btn btn-success btn-sm me-2">Save Preset</button>
                            <button id="clear-advanced-filters" class="btn btn-secondary btn-sm">Clear All</button>
                        </div>
                    </div>
                    <div class="filters-grid">
                        <!-- Date Range Filter -->
                        <div class="filter-group">
                            <label>Date Range</label>
                            <div class="date-range-inputs">
                                <input type="date" id="date-from" class="form-control">
                                <span class="to-separator">to</span>
                                <input type="date" id="date-to" class="form-control">
                            </div>
                        </div>
                        
                        <!-- Game Duration Filter -->
                        <div class="filter-group">
                            <label>Game Duration</label>
                            <div class="duration-filter">
                                <div class="range-inputs">
                                    <input type="range" id="min-duration" class="form-range" min="0" max="60" value="0">
                                    <input type="range" id="max-duration" class="form-range" min="0" max="60" value="60">
                                </div>
                                <span id="duration-display" class="duration-display">0m - 60m</span>
                            </div>
                        </div>
                        
                        <!-- Performance Filters -->
                        <div class="filter-group">
                            <label>Performance Criteria</label>
                            <div class="performance-filters">
                                <div class="form-check">
                                    <input type="checkbox" id="filter-wins" class="form-check-input">
                                    <label for="filter-wins" class="form-check-label">Wins Only</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="filter-losses" class="form-check-input">
                                    <label for="filter-losses" class="form-check-label">Losses Only</label>
                                </div>
                                <div class="form-check">
                                    <input type="checkbox" id="filter-positive-kda" class="form-check-input">
                                    <label for="filter-positive-kda" class="form-check-label">Positive KDA Only</label>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Game Mode Filter -->
                        <div class="filter-group">
                            <label>Game Mode</label>
                            <select id="gamemode-filter" class="form-select">
                                <option value="">All Game Modes</option>
                                <option value="CLASSIC">Ranked/Normal</option>
                                <option value="ARAM">ARAM</option>
                                <option value="URF">URF</option>
                                <option value="ONEFORALL">One for All</option>
                            </select>
                        </div>
                        
                        <!-- KDA Range Filter -->
                        <div class="filter-group">
                            <label>KDA Range</label>
                            <div class="kda-range">
                                <input type="number" id="min-kda" class="form-control" placeholder="Min KDA" step="0.1" min="0">
                                <input type="number" id="max-kda" class="form-control" placeholder="Max KDA" step="0.1" min="0">
                            </div>
                        </div>

                        <!-- Filter Presets -->
                        <div class="filter-group">
                            <label>Filter Presets</label>
                            <select id="filter-presets" class="form-select">
                                <option value="">Select Preset</option>
                                <option value="recent-wins">Recent Wins (7 days)</option>
                                <option value="poor-performance">Poor Performance</option>
                                <option value="long-games">Long Games (35+ min)</option>
                                <option value="carry-games">Carry Games (KDA 3+)</option>
                                <option value="recent-ranked">Recent Ranked (14 days)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupAdvancedFilterHandlers(advancedFiltersContainer);
        return advancedFiltersContainer;
    }

    setupAdvancedFilterHandlers(container) {
        const minDuration = container.querySelector('#min-duration');
        const maxDuration = container.querySelector('#max-duration');
        const durationDisplay = container.querySelector('#duration-display');
        
        const updateDurationDisplay = () => {
            durationDisplay.textContent = `${minDuration.value}m - ${maxDuration.value}m`;
        };
        
        minDuration.addEventListener('input', updateDurationDisplay);
        maxDuration.addEventListener('input', updateDurationDisplay);
        
        container.querySelector('#clear-advanced-filters').addEventListener('click', () => {
            this.clearAdvancedFilters();
        });
        
        container.querySelector('#save-filter-preset').addEventListener('click', () => {
            this.saveCustomPreset();
        });
        
        container.querySelector('#filter-presets').addEventListener('change', (e) => {
            this.applyFilterPreset(e.target.value);
        });

        // Apply filters when any advanced filter changes
        const filterInputs = container.querySelectorAll('input, select');
        filterInputs.forEach(input => {
            if (input.id !== 'filter-presets' && input.id !== 'save-filter-preset') {
                input.addEventListener('change', () => {
                    this.applyAdvancedFilters();
                });
                if (input.type === 'range') {
                    input.addEventListener('input', () => {
                        this.applyAdvancedFilters();
                    });
                }
            }
        });
    }

    applyAdvancedFilters() {
        const filters = {
            ...this.currentFilters,
            dateFrom: document.getElementById('date-from')?.value,
            dateTo: document.getElementById('date-to')?.value,
            minDuration: parseInt(document.getElementById('min-duration')?.value || 0) * 60,
            maxDuration: parseInt(document.getElementById('max-duration')?.value || 60) * 60,
            gameMode: document.getElementById('gamemode-filter')?.value,
            winsOnly: document.getElementById('filter-wins')?.checked,
            lossesOnly: document.getElementById('filter-losses')?.checked,
            positiveKDAOnly: document.getElementById('filter-positive-kda')?.checked,
            minKDA: parseFloat(document.getElementById('min-kda')?.value) || 0,
            maxKDA: parseFloat(document.getElementById('max-kda')?.value) || Infinity
        };
        
        this.currentFilters = filters;
        this.renderMatchList();
    }

    clearAdvancedFilters() {
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('min-duration').value = 0;
        document.getElementById('max-duration').value = 60;
        document.getElementById('duration-display').textContent = '0m - 60m';
        document.getElementById('gamemode-filter').value = '';
        document.getElementById('filter-wins').checked = false;
        document.getElementById('filter-losses').checked = false;
        document.getElementById('filter-positive-kda').checked = false;
        document.getElementById('min-kda').value = '';
        document.getElementById('max-kda').value = '';
        document.getElementById('filter-presets').value = '';
        
        this.applyAdvancedFilters();
    }

    applyFilterPreset(presetName) {
        if (!presetName) return;
        
        this.clearAdvancedFilters();
        
        const presets = {
            'recent-wins': {
                winsOnly: true,
                dateFrom: this.getDateDaysAgo(7)
            },
            'poor-performance': {
                maxKDA: 1.0,
                lossesOnly: true
            },
            'long-games': {
                minDuration: 35 * 60 // 35+ minutes
            },
            'carry-games': {
                minKDA: 3.0,
                winsOnly: true
            },
            'recent-ranked': {
                gameMode: 'CLASSIC',
                dateFrom: this.getDateDaysAgo(14)
            }
        };
        
        const preset = presets[presetName];
        if (preset) {
            if (preset.winsOnly) document.getElementById('filter-wins').checked = true;
            if (preset.lossesOnly) document.getElementById('filter-losses').checked = true;
            if (preset.dateFrom) document.getElementById('date-from').value = preset.dateFrom;
            if (preset.minDuration) document.getElementById('min-duration').value = Math.floor(preset.minDuration / 60);
            if (preset.minKDA) document.getElementById('min-kda').value = preset.minKDA;
            if (preset.maxKDA) document.getElementById('max-kda').value = preset.maxKDA;
            if (preset.gameMode) document.getElementById('gamemode-filter').value = preset.gameMode;
            
            this.applyAdvancedFilters();
        }
    }

    saveCustomPreset() {
        const name = prompt('Enter preset name:');
        if (!name) return;
        
        const filters = {
            dateFrom: document.getElementById('date-from').value,
            dateTo: document.getElementById('date-to').value,
            minDuration: parseInt(document.getElementById('min-duration').value) * 60,
            maxDuration: parseInt(document.getElementById('max-duration').value) * 60,
            gameMode: document.getElementById('gamemode-filter').value,
            winsOnly: document.getElementById('filter-wins').checked,
            lossesOnly: document.getElementById('filter-losses').checked,
            positiveKDAOnly: document.getElementById('filter-positive-kda').checked,
            minKDA: parseFloat(document.getElementById('min-kda').value) || 0,
            maxKDA: parseFloat(document.getElementById('max-kda').value) || Infinity
        };
        
        const savedPresets = JSON.parse(localStorage.getItem('matchHistoryPresets') || '{}');
        savedPresets[name] = filters;
        localStorage.setItem('matchHistoryPresets', JSON.stringify(savedPresets));
        
        alert(`Preset "${name}" saved successfully!`);
        this.updatePresetDropdown();
    }

    setupQuickFilterHandlers(container) {
        const quickFilterButtons = container.querySelectorAll('.quick-filter-btn');
        quickFilterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Toggle active state
                const wasActive = button.classList.contains('active');
                
                // Remove active from all buttons
                quickFilterButtons.forEach(btn => btn.classList.remove('active'));
                
                if (!wasActive) {
                    button.classList.add('active');
                    this.applyQuickFilter(button.dataset.filter);
                } else {
                    // If was active, clear all filters
                    this.clearFilters();
                }
            });
        });
    }

    applyQuickFilter(filterType) {
        // Clear existing filters first
        this.currentFilters = {};
        
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const oneWeekAgo = this.getDateDaysAgo(7);
        
        switch (filterType) {
            case 'recent-wins':
                this.currentFilters = {
                    dateFrom: sevenDaysAgo.toISOString().split('T')[0],
                    winsOnly: true
                };
                break;
                
            case 'recent-losses':
                this.currentFilters = {
                    dateFrom: sevenDaysAgo.toISOString().split('T')[0],
                    lossesOnly: true
                };
                break;
                
            case 'high-kda':
                this.currentFilters = {
                    minKDA: 3.0
                };
                break;
                
            case 'long-games':
                this.currentFilters = {
                    minDuration: 35 * 60 // 35 minutes in seconds
                };
                break;
                
            case 'ranked-only':
                this.currentFilters = {
                    gameMode: 'CLASSIC'
                };
                break;
                
            case 'this-week':
                this.currentFilters = {
                    dateFrom: oneWeekAgo
                };
                break;
        }
        
        // Update the basic filter UI to reflect the quick filter
        this.updateFilterUI();
        this.renderMatchList();
    }

    updateFilterUI() {
        const roleFilter = document.getElementById('role-filter');
        const championFilter = document.getElementById('champion-filter');
        const searchInput = document.getElementById('search-input');
        
        if (roleFilter) roleFilter.value = this.currentFilters.role || '';
        if (championFilter) championFilter.value = this.currentFilters.champion || '';
        if (searchInput) searchInput.value = this.currentFilters.search || '';
        
        // Update advanced filters if they exist
        const advancedFilters = document.getElementById('advanced-filters');
        if (advancedFilters && advancedFilters.classList.contains('show')) {
            if (this.currentFilters.dateFrom) {
                const dateFromInput = document.getElementById('date-from');
                if (dateFromInput) dateFromInput.value = this.currentFilters.dateFrom;
            }
            
            if (this.currentFilters.minDuration) {
                const minDurationInput = document.getElementById('min-duration');
                if (minDurationInput) minDurationInput.value = Math.floor(this.currentFilters.minDuration / 60);
            }
            
            if (this.currentFilters.gameMode) {
                const gameModeInput = document.getElementById('gamemode-filter');
                if (gameModeInput) gameModeInput.value = this.currentFilters.gameMode;
            }
            
            if (this.currentFilters.winsOnly) {
                const winsInput = document.getElementById('filter-wins');
                if (winsInput) winsInput.checked = true;
            }
            
            if (this.currentFilters.lossesOnly) {
                const lossesInput = document.getElementById('filter-losses');
                if (lossesInput) lossesInput.checked = true;
            }
            
            if (this.currentFilters.minKDA) {
                const minKdaInput = document.getElementById('min-kda');
                if (minKdaInput) minKdaInput.value = this.currentFilters.minKDA;
            }
        }
    }

    updatePresetDropdown() {
        const presetSelect = document.getElementById('filter-presets');
        const savedPresets = JSON.parse(localStorage.getItem('matchHistoryPresets') || '{}');
        
        // Clear custom presets and re-add them
        const options = Array.from(presetSelect.options);
        options.forEach(option => {
            if (!['', 'recent-wins', 'poor-performance', 'long-games', 'carry-games', 'recent-ranked'].includes(option.value)) {
                option.remove();
            }
        });
        
        Object.keys(savedPresets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            presetSelect.appendChild(option);
        });
    }

    getDateDaysAgo(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0];
    }

    renderPlayerHighlight(playerParticipant, championData) {
        const championIdMap = new Map(Object.values(championData.data).map(c => [c.key, c]));
        const champInfo = championIdMap.get(String(playerParticipant.championId));
        const champIconUrl = champInfo ? 
            `https://ddragon.leagueoflegends.com/cdn/${championData.version}/img/champion/${champInfo.image.full}` : 
            'https://via.placeholder.com/64';

        const kda = this.dataManager.calculateKDA(
            playerParticipant.kills,
            playerParticipant.deaths,
            playerParticipant.assists
        );

        return `
            <div class="player-highlight text-center">
                <img src="${champIconUrl}" class="champion-icon-large mb-2" alt="${playerParticipant.championName}" style="width: 64px; height: 64px;">
                <h6>${playerParticipant.championName}</h6>
                <div class="result-badge ${playerParticipant.win ? 'bg-success' : 'bg-danger'} text-white px-3 py-1 rounded">
                    ${playerParticipant.win ? 'Victory' : 'Defeat'}
                </div>
                <div class="mt-2">
                    <strong>KDA:</strong> ${playerParticipant.kills}/${playerParticipant.deaths}/${playerParticipant.assists}
                    <br><span class="text-muted">(${kda === Infinity ? 'Perfect' : kda.toFixed(2)})</span>
                </div>
            </div>
        `;
    }

    renderMatchTimeline(match, mainPlayerPuuid) {
        const timelineData = this.processMatchTimeline(match);
        
        return `
            <div class="match-timeline mb-4">
                <h6>Match Timeline</h6>
                <div class="timeline-container">
                    <div class="timeline-header">
                        <span class="time-marker">0m</span>
                        <span class="time-marker">10m</span>
                        <span class="time-marker">20m</span>
                        <span class="time-marker">30m</span>
                        <span class="time-marker">End</span>
                    </div>
                    <div class="timeline-events">
                        ${timelineData.events.map(event => `
                            <div class="timeline-event ${event.type} ${event.importance} team-${event.teamId}" 
                                 style="left: ${event.position}%" 
                                 data-importance="${event.importance}">
                                <i class="${event.icon}"></i>
                                <div class="event-tooltip enhanced-event-tooltip">
                                    <div class="event-tooltip-header">
                                        <strong>${event.title}</strong>
                                        <span class="event-team ${event.teamId === 100 ? 'blue-team' : 'red-team'}">
                                            ${event.teamId === 100 ? 'Blue' : 'Red'}
                                        </span>
                                    </div>
                                    <div class="event-description">${event.description}</div>
                                    <div class="event-timestamp">
                                        <i class="bi bi-clock"></i>${event.timestamp}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    processMatchTimeline(match) {
        const events = [];
        const gameDuration = match.info.gameDuration / 60; // Convert to minutes
        
        // Process team objectives
        if (match.info.teams) {
            match.info.teams.forEach((team, index) => {
                const teamName = team.teamId === 100 ? 'Blue' : 'Red';
                const teamClass = team.teamId === 100 ? 'first-blood' : 'tower';
                
                if (team.objectives) {
                    // First Blood
                    if (team.objectives.champion && team.objectives.champion.first) {
                        events.push({
                            type: 'first-blood',
                            title: 'First Blood',
                            description: `${teamName} Team secured first kill`,
                            timestamp: '~2-5m',
                            position: Math.min(8 / gameDuration * 100, 95),
                            icon: 'bi-droplet-half',
                            teamId: team.teamId,
                            importance: 'high'
                        });
                    }
                    
                    // Towers
                    if (team.objectives.tower && team.objectives.tower.kills > 0) {
                        const towerKills = Math.min(team.objectives.tower.kills, 5);
                        for (let i = 1; i <= towerKills; i++) {
                            const timeEstimate = 8 + (i * 4) + Math.random() * 3;
                            events.push({
                                type: 'tower',
                                title: i === 1 ? 'First Tower' : `Tower ${i}`,
                                description: `${teamName} Team destroyed ${this.getTowerTypeDescription(i)}`,
                                timestamp: `~${Math.floor(timeEstimate)}m`,
                                position: Math.min(timeEstimate / gameDuration * 100, 95),
                                icon: 'bi-building-fill',
                                teamId: team.teamId,
                                importance: i <= 2 ? 'high' : 'medium'
                            });
                        }
                    }
                    
                    // Dragons
                    if (team.objectives.dragon && team.objectives.dragon.kills > 0) {
                        const dragonKills = Math.min(team.objectives.dragon.kills, 4);
                        for (let i = 1; i <= dragonKills; i++) {
                            const timeEstimate = 6 + (i * 5) + Math.random() * 2;
                            events.push({
                                type: 'dragon',
                                title: i === 4 ? 'Elder Dragon' : `Dragon ${i}`,
                                description: `${teamName} Team secured ${this.getDragonTypeDescription(i)}`,
                                timestamp: `~${Math.floor(timeEstimate)}m`,
                                position: Math.min(timeEstimate / gameDuration * 100, 95),
                                icon: i === 4 ? 'bi-award-fill' : 'bi-fire',
                                teamId: team.teamId,
                                importance: i === 4 ? 'critical' : 'high'
                            });
                        }
                    }
                    
                    // Baron
                    if (team.objectives.baron && team.objectives.baron.kills > 0) {
                        const baronTime = Math.max(20, gameDuration * 0.65);
                        events.push({
                            type: 'baron',
                            title: 'Baron Nashor',
                            description: `${teamName} Team secured Baron Nashor buff`,
                            timestamp: `~${Math.floor(baronTime)}m`,
                            position: Math.min(baronTime / gameDuration * 100, 95),
                            icon: 'bi-gem',
                            teamId: team.teamId,
                            importance: 'critical'
                        });
                    }
                    
                    // Rift Herald
                    if (team.objectives.riftHerald && team.objectives.riftHerald.kills > 0) {
                        const heraldTime = 12 + Math.random() * 8;
                        events.push({
                            type: 'herald',
                            title: 'Rift Herald',
                            description: `${teamName} Team secured Rift Herald`,
                            timestamp: `~${Math.floor(heraldTime)}m`,
                            position: Math.min(heraldTime / gameDuration * 100, 95),
                            icon: 'bi-eye-fill',
                            teamId: team.teamId,
                            importance: 'medium'
                        });
                    }
                }
            });
        }
        
        return { events: events.sort((a, b) => a.position - b.position) };
    }

    getTowerTypeDescription(towerNumber) {
        const descriptions = {
            1: 'outer turret',
            2: 'inner turret', 
            3: 'inhibitor turret',
            4: 'nexus turret',
            5: 'nexus turret'
        };
        return descriptions[towerNumber] || 'turret';
    }

    getDragonTypeDescription(dragonNumber) {
        const descriptions = {
            1: 'Elemental Drake',
            2: 'Elemental Drake',
            3: 'Elemental Drake',
            4: 'Elder Dragon'
        };
        return descriptions[dragonNumber] || 'Dragon';
    }

    renderPerformanceBreakdown(playerData, match) {
        const breakdown = this.analyzePlayerPerformance(playerData, match);
        
        return `
            <div class="performance-breakdown mb-4">
                <h6>Performance Analysis</h6>
                <div class="breakdown-grid">
                    <div class="breakdown-section">
                        <h7>Combat Performance</h7>
                        <div class="breakdown-item">
                            <span class="label">Kill Participation:</span>
                            <span class="value">${breakdown.killParticipation}%</span>
                            <div class="rating ${breakdown.killParticipationRating}">${breakdown.killParticipationRating}</div>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">Damage Share:</span>
                            <span class="value">${breakdown.damageShare}%</span>
                            <div class="rating ${breakdown.damageShareRating}">${breakdown.damageShareRating}</div>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">KDA:</span>
                            <span class="value">${playerData.kills}/${playerData.deaths}/${playerData.assists}</span>
                            <div class="rating ${breakdown.kdaRating}">${breakdown.kdaRating}</div>
                        </div>
                    </div>
                    
                    <div class="breakdown-section">
                        <h7>Economy & Farm</h7>
                        <div class="breakdown-item">
                            <span class="label">CS per Minute:</span>
                            <span class="value">${breakdown.csPerMinute}</span>
                            <div class="rating ${breakdown.csRating}">${breakdown.csRating}</div>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">Gold per Minute:</span>
                            <span class="value">${breakdown.goldPerMinute}</span>
                            <div class="rating ${breakdown.goldRating}">${breakdown.goldRating}</div>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">Damage per Gold:</span>
                            <span class="value">${breakdown.damagePerGold}</span>
                            <div class="rating ${breakdown.efficiencyRating}">${breakdown.efficiencyRating}</div>
                        </div>
                    </div>
                    
                    <div class="breakdown-section">
                        <h7>Vision & Map Control</h7>
                        <div class="breakdown-item">
                            <span class="label">Vision Score:</span>
                            <span class="value">${playerData.visionScore}</span>
                            <div class="rating ${breakdown.visionRating}">${breakdown.visionRating}</div>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">Wards Placed:</span>
                            <span class="value">${playerData.wardsPlaced || 0}</span>
                        </div>
                        <div class="breakdown-item">
                            <span class="label">Control Wards:</span>
                            <span class="value">${playerData.detectorWardsPlaced || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    analyzePlayerPerformance(playerData, match) {
        const teamStats = this.calculateTeamStats(match, playerData.teamId);
        const gameMinutes = match.info.gameDuration / 60;
        
        const kda = this.dataManager.calculateKDA(playerData.kills, playerData.deaths, playerData.assists);
        const killParticipation = Math.round((playerData.kills + playerData.assists) / Math.max(teamStats.kills, 1) * 100);
        const damageShare = Math.round(playerData.totalDamageDealtToChampions / Math.max(teamStats.totalDamage, 1) * 100);
        const csPerMinute = (playerData.totalMinionsKilled / gameMinutes).toFixed(1);
        const goldPerMinute = Math.round(playerData.goldEarned / gameMinutes);
        const damagePerGold = (playerData.totalDamageDealtToChampions / playerData.goldEarned).toFixed(2);
        
        return {
            killParticipation,
            damageShare,
            csPerMinute,
            goldPerMinute,
            damagePerGold,
            killParticipationRating: this.getRating(killParticipation, [40, 60, 80]),
            damageShareRating: this.getRating(damageShare, [15, 25, 35]),
            kdaRating: this.getRating(kda, [1, 2, 3]),
            csRating: this.getRating(parseFloat(csPerMinute), [5, 7, 9]),
            goldRating: this.getRating(goldPerMinute, [300, 400, 500]),
            efficiencyRating: this.getRating(parseFloat(damagePerGold), [1.5, 2.0, 2.5]),
            visionRating: this.getRating(playerData.visionScore, [15, 25, 40])
        };
    }

    calculateTeamStats(match, teamId) {
        const teamPlayers = match.info.participants.filter(p => p.teamId === teamId);
        
        return {
            kills: teamPlayers.reduce((sum, p) => sum + p.kills, 0),
            totalDamage: teamPlayers.reduce((sum, p) => sum + p.totalDamageDealtToChampions, 0)
        };
    }

    getRating(value, thresholds) {
        if (value >= thresholds[2]) return 'excellent';
        if (value >= thresholds[1]) return 'good';
        if (value >= thresholds[0]) return 'average';
        return 'poor';
    }

    toggleMatchComparison() {
        const container = document.getElementById('match-comparison-container');
        if (!container) return;

        if (container.style.display === 'none') {
            container.innerHTML = this.createMatchComparison();
            container.style.display = 'block';
            this.setupMatchComparisonHandlers();
        } else {
            container.style.display = 'none';
        }
    }

    createMatchComparison() {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        
        return `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Match Comparison</h5>
                    <div class="comparison-setup">
                        <div class="match-selector">
                            <label>Select First Match:</label>
                            <select id="match1-select" class="form-select">
                                <option value="">Select a match...</option>
                                ${matches.map((matchData, index) => {
                                    const { match, playerParticipant } = matchData;
                                    const date = new Date(match.info.gameCreation).toLocaleDateString();
                                    const result = playerParticipant.win ? 'W' : 'L';
                                    return `<option value="${index}">${playerParticipant.championName} - ${result} - ${date}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <div class="match-selector">
                            <label>Select Second Match:</label>
                            <select id="match2-select" class="form-select">
                                <option value="">Select a match...</option>
                                ${matches.map((matchData, index) => {
                                    const { match, playerParticipant } = matchData;
                                    const date = new Date(match.info.gameCreation).toLocaleDateString();
                                    const result = playerParticipant.win ? 'W' : 'L';
                                    return `<option value="${index}">${playerParticipant.championName} - ${result} - ${date}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        <button id="compare-matches-btn" class="btn btn-primary">Compare</button>
                    </div>
                    <div id="match-comparison-results"></div>
                </div>
            </div>
        `;
    }

    setupMatchComparisonHandlers() {
        const compareBtn = document.getElementById('compare-matches-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                this.performMatchComparison();
            });
        }
    }

    performMatchComparison() {
        const match1Index = document.getElementById('match1-select').value;
        const match2Index = document.getElementById('match2-select').value;
        const resultsDiv = document.getElementById('match-comparison-results');
        
        if (!match1Index || !match2Index || match1Index === match2Index) {
            resultsDiv.innerHTML = '<div class="alert alert-warning">Please select two different matches to compare.</div>';
            return;
        }

        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        const match1Data = matches[parseInt(match1Index)];
        const match2Data = matches[parseInt(match2Index)];

        resultsDiv.innerHTML = this.renderMatchComparisonResults(match1Data, match2Data);
    }

    renderMatchComparisonResults(match1Data, match2Data) {
        const { match: match1, playerParticipant: player1 } = match1Data;
        const { match: match2, playerParticipant: player2 } = match2Data;
        
        const data = this.dataManager.getData();
        const champIconUrl1 = this.dataManager.getChampionIconUrl(player1.championName, data.championData.version);
        const champIconUrl2 = this.dataManager.getChampionIconUrl(player2.championName, data.championData.version);

        const comparison = this.calculateMatchComparison(match1Data, match2Data);

        return `
            <div class="comparison-results mt-3">
                <div class="comparison-header">
                    <div class="match-info">
                        <h6>Match 1</h6>
                        <div class="match-summary">
                            <img src="${champIconUrl1}" class="champion-icon me-2" alt="${player1.championName}">
                            <div>
                                <span class="fw-bold">${player1.championName}</span>
                                <span class="result ${player1.win ? 'win' : 'loss'} ms-2">
                                    ${player1.win ? 'Victory' : 'Defeat'}
                                </span>
                                <br><small class="text-muted">${new Date(match1.info.gameCreation).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                    <div class="match-info">
                        <h6>Match 2</h6>
                        <div class="match-summary">
                            <img src="${champIconUrl2}" class="champion-icon me-2" alt="${player2.championName}">
                            <div>
                                <span class="fw-bold">${player2.championName}</span>
                                <span class="result ${player2.win ? 'win' : 'loss'} ms-2">
                                    ${player2.win ? 'Victory' : 'Defeat'}
                                </span>
                                <br><small class="text-muted">${new Date(match2.info.gameCreation).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="comparison-metrics mt-3">
                    ${this.renderMetricComparison('KDA', comparison.kda)}
                    ${this.renderMetricComparison('Damage Dealt', comparison.damage)}
                    ${this.renderMetricComparison('Gold Earned', comparison.gold)}
                    ${this.renderMetricComparison('Minions Killed', comparison.cs)}
                    ${this.renderMetricComparison('Vision Score', comparison.vision)}
                </div>
            </div>
        `;
    }

    calculateMatchComparison(match1Data, match2Data) {
        const player1 = match1Data.playerParticipant;
        const player2 = match2Data.playerParticipant;
        
        const kda1 = this.dataManager.calculateKDA(player1.kills, player1.deaths, player1.assists);
        const kda2 = this.dataManager.calculateKDA(player2.kills, player2.deaths, player2.assists);

        return {
            kda: { value1: kda1, value2: kda2 },
            damage: { value1: player1.totalDamageDealtToChampions, value2: player2.totalDamageDealtToChampions },
            gold: { value1: player1.goldEarned, value2: player2.goldEarned },
            cs: { value1: player1.totalMinionsKilled, value2: player2.totalMinionsKilled },
            vision: { value1: player1.visionScore, value2: player2.visionScore }
        };
    }

    renderMetricComparison(metricName, metricData) {
        const { value1, value2 } = metricData;
        const max = Math.max(value1, value2);
        const percentage1 = max > 0 ? (value1 / max * 100) : 0;
        const percentage2 = max > 0 ? (value2 / max * 100) : 0;
        
        const format = (value) => {
            if (metricName === 'KDA') return value === Infinity ? 'Perfect' : value.toFixed(2);
            if (typeof value === 'number' && value >= 1000) return value.toLocaleString();
            return value.toString();
        };

        return `
            <div class="metric-comparison">
                <div class="metric-name">${metricName}</div>
                <div class="metric-bars">
                    <div class="metric-bar-container mb-1">
                        <div class="metric-bar ${value1 >= value2 ? 'better' : 'worse'}" 
                             style="width: ${percentage1}%"></div>
                        <span class="metric-value">${format(value1)}</span>
                    </div>
                    <div class="metric-bar-container">
                        <div class="metric-bar ${value2 >= value1 ? 'better' : 'worse'}" 
                             style="width: ${percentage2}%"></div>
                        <span class="metric-value">${format(value2)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    toggleStatisticsDashboard() {
        const container = document.getElementById('statistics-dashboard-container');
        if (!container) return;

        if (container.style.display === 'none') {
            container.innerHTML = this.createStatisticsDashboard();
            container.style.display = 'block';
            
            // Setup event listeners for the new dashboard
            this.setupStatisticsDashboardHandlers();
            
            // Initialize the trends chart when trends tab is shown
            const trendsTab = document.getElementById('trends-tab');
            if (trendsTab) {
                trendsTab.addEventListener('shown.bs.tab', () => {
                    this.initPerformanceTrendsChart();
                });
            }
            
            // Initialize the heatmap when heatmap tab is shown
            const heatmapTab = document.getElementById('heatmap-tab');
            if (heatmapTab) {
                heatmapTab.addEventListener('shown.bs.tab', () => {
                    this.initChampionHeatmap();
                });
            }
        } else {
            container.style.display = 'none';
        }
    }

    createStatisticsDashboard() {
        const stats = this.calculateComprehensiveStatistics();
        
        return `
            <div class="card stat-card">
                <div class="card-body">
                    <h5 class="card-title">Comprehensive Statistics</h5>
                    
                    <!-- Statistics Navigation -->
                    <ul class="nav nav-pills mb-3" id="stats-tabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="overview-tab" data-bs-toggle="pill" data-bs-target="#overview" type="button" role="tab">Overview</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="trends-tab" data-bs-toggle="pill" data-bs-target="#trends" type="button" role="tab">Performance Trends</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="heatmap-tab" data-bs-toggle="pill" data-bs-target="#heatmap" type="button" role="tab">Champion Heatmap</button>
                        </li>
                    </ul>
                    
                    <div class="tab-content" id="stats-content">
                        <!-- Overview Tab -->
                        <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview-tab">
                            <div class="statistics-dashboard">
                                <div class="stats-grid">
                                    <div class="stat-category">
                                        <h6>Overall Performance</h6>
                                        <div class="stat-item">
                                            <span class="label">Total Matches:</span>
                                            <span class="value">${stats.totalMatches}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Win Rate:</span>
                                            <span class="value text-${stats.winRate >= 50 ? 'success' : 'danger'}">
                                                ${stats.winRate}%
                                            </span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Average KDA:</span>
                                            <span class="value">${stats.avgKDA}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Average GPM:</span>
                                            <span class="value">${stats.avgGPM}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-category">
                                        <h6>Streaks & Records</h6>
                                        <div class="stat-item">
                                            <span class="label">Longest Win Streak:</span>
                                            <span class="value text-success">${stats.longestWinStreak}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Longest Loss Streak:</span>
                                            <span class="value text-danger">${stats.longestLossStreak}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Current Streak:</span>
                                            <span class="value text-${stats.currentStreak.type === 'win' ? 'success' : 'danger'}">
                                                ${stats.currentStreak.count} ${stats.currentStreak.type}${stats.currentStreak.count === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Best KDA Game:</span>
                                            <span class="value">${stats.bestKDAGame.kda}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-category">
                                        <h6>Recent Form</h6>
                                        <div class="stat-item">
                                            <span class="label">Last 10 Games:</span>
                                            <span class="value">${stats.recent10.wins}W/${stats.recent10.losses}L</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Last 20 Games:</span>
                                            <span class="value">${stats.recent20.wins}W/${stats.recent20.losses}L</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">This Week:</span>
                                            <span class="value">${stats.thisWeek.games} games</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Best Performance Role:</span>
                                            <span class="value">${stats.bestRole.role} (${stats.bestRole.winRate}%)</span>
                                        </div>
                                    </div>
                                    
                                    <div class="stat-category">
                                        <h6>Combat Statistics</h6>
                                        <div class="stat-item">
                                            <span class="label">Avg Kills:</span>
                                            <span class="value">${stats.avgKills}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Avg Deaths:</span>
                                            <span class="value">${stats.avgDeaths}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Avg Assists:</span>
                                            <span class="value">${stats.avgAssists}</span>
                                        </div>
                                        <div class="stat-item">
                                            <span class="label">Avg Damage per Game:</span>
                                            <span class="value">${stats.avgDamagePerGame.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Trends Tab -->
                        <div class="tab-pane fade" id="trends" role="tabpanel" aria-labelledby="trends-tab">
                            <div class="trends-container">
                                <div class="mb-3">
                                    <label for="trend-period" class="form-label">Time Period:</label>
                                    <select id="trend-period" class="form-select w-auto d-inline-block">
                                        <option value="week">Weekly</option>
                                        <option value="day" selected>Daily (last 30 days)</option>
                                        <option value="game">Per Game (last 50)</option>
                                    </select>
                                </div>
                                <canvas id="performance-trends-chart" width="800" height="400"></canvas>
                            </div>
                        </div>
                        
                        <!-- Champion Heatmap Tab -->
                        <div class="tab-pane fade" id="heatmap" role="tabpanel" aria-labelledby="heatmap-tab">
                            <div id="champion-heatmap" class="champion-heatmap-container">
                                <!-- Heatmap will be generated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    calculateComprehensiveStatistics() {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        
        if (matches.length === 0) {
            return {
                totalMatches: 0,
                winRate: 0,
                avgKDA: '0.00',
                avgGPM: 0,
                longestWinStreak: 0,
                longestLossStreak: 0,
                currentStreak: { count: 0, type: 'none' },
                bestKDAGame: { kda: '0.00' },
                recent10: { wins: 0, losses: 0 },
                recent20: { wins: 0, losses: 0 },
                thisWeek: { games: 0 },
                bestRole: { role: 'N/A', winRate: 0 },
                avgKills: '0.0',
                avgDeaths: '0.0',
                avgAssists: '0.0',
                avgDamagePerGame: 0
            };
        }

        const totalMatches = matches.length;
        const wins = matches.filter(m => m.playerParticipant.win).length;
        const winRate = Math.round((wins / totalMatches) * 100);

        // Calculate averages
        const totalKills = matches.reduce((sum, m) => sum + m.playerParticipant.kills, 0);
        const totalDeaths = matches.reduce((sum, m) => sum + m.playerParticipant.deaths, 0);
        const totalAssists = matches.reduce((sum, m) => sum + m.playerParticipant.assists, 0);
        const totalDamage = matches.reduce((sum, m) => sum + m.playerParticipant.totalDamageDealtToChampions, 0);
        const totalGold = matches.reduce((sum, m) => sum + m.playerParticipant.goldEarned, 0);
        const totalGameTime = matches.reduce((sum, m) => sum + m.match.info.gameDuration, 0);

        const avgKDA = this.dataManager.calculateKDA(totalKills, totalDeaths, totalAssists);
        const avgGPM = Math.round((totalGold / totalGameTime) * 60);

        // Calculate streaks
        const streaks = this.calculateStreaks(matches);
        
        // Calculate recent form
        const recent10 = matches.slice(-10);
        const recent20 = matches.slice(-20);
        const recent10Wins = recent10.filter(m => m.playerParticipant.win).length;
        const recent20Wins = recent20.filter(m => m.playerParticipant.win).length;

        // Calculate this week's games
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const thisWeekGames = matches.filter(m => new Date(m.match.info.gameCreation) >= oneWeekAgo).length;

        // Find best role
        const roleStats = {};
        matches.forEach(m => {
            const role = m.playerParticipant.teamPosition || 'UNKNOWN';
            if (!roleStats[role]) {
                roleStats[role] = { games: 0, wins: 0 };
            }
            roleStats[role].games++;
            if (m.playerParticipant.win) roleStats[role].wins++;
        });

        let bestRole = { role: 'N/A', winRate: 0 };
        Object.entries(roleStats).forEach(([role, stats]) => {
            if (stats.games >= 3) { // Only consider roles with at least 3 games
                const winRate = Math.round((stats.wins / stats.games) * 100);
                if (winRate > bestRole.winRate) {
                    bestRole = { role, winRate };
                }
            }
        });

        // Find best KDA game
        let bestKDAGame = { kda: '0.00' };
        matches.forEach(m => {
            const kda = this.dataManager.calculateKDA(
                m.playerParticipant.kills,
                m.playerParticipant.deaths,
                m.playerParticipant.assists
            );
            const kdaValue = kda === Infinity ? 999 : kda;
            const bestKdaValue = bestKDAGame.kda === 'Perfect' ? 999 : parseFloat(bestKDAGame.kda);
            
            if (kdaValue > bestKdaValue) {
                bestKDAGame.kda = kda === Infinity ? 'Perfect' : kda.toFixed(2);
            }
        });

        return {
            totalMatches,
            winRate,
            avgKDA: avgKDA === Infinity ? 'Perfect' : avgKDA.toFixed(2),
            avgGPM,
            longestWinStreak: streaks.longestWin,
            longestLossStreak: streaks.longestLoss,
            currentStreak: streaks.current,
            bestKDAGame,
            recent10: { wins: recent10Wins, losses: recent10.length - recent10Wins },
            recent20: { wins: recent20Wins, losses: recent20.length - recent20Wins },
            thisWeek: { games: thisWeekGames },
            bestRole,
            avgKills: (totalKills / totalMatches).toFixed(1),
            avgDeaths: (totalDeaths / totalMatches).toFixed(1),
            avgAssists: (totalAssists / totalMatches).toFixed(1),
            avgDamagePerGame: Math.round(totalDamage / totalMatches)
        };
    }

    calculateStreaks(matches) {
        let longestWin = 0;
        let longestLoss = 0;
        let currentWin = 0;
        let currentLoss = 0;
        let currentStreak = { count: 0, type: 'none' };

        // Process matches in chronological order
        const sortedMatches = [...matches].sort((a, b) => a.match.info.gameCreation - b.match.info.gameCreation);
        
        for (let i = 0; i < sortedMatches.length; i++) {
            const isWin = sortedMatches[i].playerParticipant.win;
            
            if (isWin) {
                currentWin++;
                currentLoss = 0;
                longestWin = Math.max(longestWin, currentWin);
            } else {
                currentLoss++;
                currentWin = 0;
                longestLoss = Math.max(longestLoss, currentLoss);
            }
        }

        // Current streak is from the most recent matches
        if (sortedMatches.length > 0) {
            const mostRecent = sortedMatches[sortedMatches.length - 1];
            let streakCount = 1;
            const streakType = mostRecent.playerParticipant.win ? 'win' : 'loss';
            
            for (let i = sortedMatches.length - 2; i >= 0; i--) {
                if (sortedMatches[i].playerParticipant.win === mostRecent.playerParticipant.win) {
                    streakCount++;
                } else {
                    break;
                }
            }
            
            currentStreak = { count: streakCount, type: streakType };
        }

        return {
            longestWin,
            longestLoss,
            current: currentStreak
        };
    }

    showExportOptions() {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Export Match History</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Choose export format:</p>
                        <div class="export-controls">
                            <button id="export-json-btn" class="btn btn-primary export-btn">
                                <i class="bi bi-filetype-json"></i>Export as JSON
                            </button>
                            <button id="export-csv-btn" class="btn btn-success export-btn">
                                <i class="bi bi-filetype-csv"></i>Export as CSV
                            </button>
                        </div>
                        <hr>
                        <small class="text-muted">
                            Export includes ${this.filteredMatches.length || this.dataManager.getData().playerMatches.length} matches
                            ${this.filteredMatches.length ? ' (filtered)' : ' (all matches)'}.
                        </small>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();

        modal.querySelector('#export-json-btn').addEventListener('click', () => {
            this.exportMatchHistory('json');
            bootstrapModal.hide();
        });

        modal.querySelector('#export-csv-btn').addEventListener('click', () => {
            this.exportMatchHistory('csv');
            bootstrapModal.hide();
        });

        modal.addEventListener('hidden.bs.modal', () => {
            document.body.removeChild(modal);
        });
    }

    exportMatchHistory(format) {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        const exportData = {
            exportDate: new Date().toISOString(),
            player: this.dataManager.getData().mainPlayerName || 'Unknown Player',
            totalMatches: matches.length,
            filters: this.currentFilters,
            statistics: this.getMatchStatistics(),
            matches: matches.map(({ match, playerParticipant }) => ({
                matchId: match.metadata.matchId,
                gameCreation: new Date(match.info.gameCreation).toISOString(),
                gameDuration: match.info.gameDuration,
                gameMode: match.info.gameMode,
                queueId: match.info.queueId,
                champion: playerParticipant.championName,
                role: playerParticipant.teamPosition || 'UNKNOWN',
                result: playerParticipant.win ? 'Victory' : 'Defeat',
                kills: playerParticipant.kills,
                deaths: playerParticipant.deaths,
                assists: playerParticipant.assists,
                kda: this.dataManager.calculateKDA(playerParticipant.kills, playerParticipant.deaths, playerParticipant.assists),
                goldEarned: playerParticipant.goldEarned,
                totalDamageDealtToChampions: playerParticipant.totalDamageDealtToChampions,
                totalMinionsKilled: playerParticipant.totalMinionsKilled,
                visionScore: playerParticipant.visionScore,
                wardsPlaced: playerParticipant.wardsPlaced || 0,
                wardsKilled: playerParticipant.wardsKilled || 0
            }))
        };

        if (format === 'json') {
            this.downloadJSON(exportData);
        } else if (format === 'csv') {
            this.downloadCSV(exportData);
        }
    }

    downloadJSON(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `match-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    downloadCSV(data) {
        const csvHeader = [
            'Match ID', 'Date', 'Duration (min)', 'Game Mode', 'Champion', 'Role', 'Result',
            'Kills', 'Deaths', 'Assists', 'KDA', 'Gold', 'Damage', 'CS', 'Vision Score'
        ].join(',');
        
        const csvRows = data.matches.map(match => [
            match.matchId,
            match.gameCreation.split('T')[0],
            Math.round(match.gameDuration / 60),
            match.gameMode,
            match.champion,
            match.role,
            match.result,
            match.kills,
            match.deaths,
            match.assists,
            match.kda === Infinity ? 'Perfect' : match.kda.toFixed(2),
            match.goldEarned,
            match.totalDamageDealtToChampions,
            match.totalMinionsKilled,
            match.visionScore
        ].map(field => `"${field}"`).join(','));

        const csvContent = [csvHeader, ...csvRows].join('\n');
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `match-history-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    setupStatisticsDashboardHandlers() {
        const trendPeriodSelect = document.getElementById('trend-period');
        if (trendPeriodSelect) {
            trendPeriodSelect.addEventListener('change', () => {
                this.updatePerformanceTrendsChart();
            });
        }
    }

    initPerformanceTrendsChart() {
        const canvas = document.getElementById('performance-trends-chart');
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.trendsChart) {
            this.trendsChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        this.trendsChart = this.createPerformanceTrendsChart(ctx);
    }

    createPerformanceTrendsChart(ctx) {
        const trends = this.calculatePerformanceTrends();
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: trends.map(t => t.period),
                datasets: [{
                    label: 'Win Rate %',
                    data: trends.map(t => t.winRate),
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Average KDA',
                    data: trends.map(t => t.avgKDA),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }, {
                    label: 'Gold per Minute',
                    data: trends.map(t => t.avgGPM),
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    yAxisID: 'y2',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Performance Trends Over Time'
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time Period'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        display: true,
                        title: {
                            display: true,
                            text: 'Win Rate %'
                        },
                        min: 0,
                        max: 100
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        display: true,
                        title: {
                            display: true,
                            text: 'Average KDA'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        display: false,
                        title: {
                            display: true,
                            text: 'Gold per Minute'
                        }
                    }
                }
            }
        });
    }

    calculatePerformanceTrends() {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        const period = document.getElementById('trend-period')?.value || 'day';
        
        return this.groupMatchesByPeriod(matches, period);
    }

    groupMatchesByPeriod(matches, period) {
        const sortedMatches = [...matches].sort((a, b) => a.match.info.gameCreation - b.match.info.gameCreation);
        const groups = new Map();
        
        sortedMatches.forEach(matchData => {
            const date = new Date(matchData.match.info.gameCreation);
            let key;
            
            switch (period) {
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'game':
                    key = `Game ${sortedMatches.indexOf(matchData) + 1}`;
                    break;
                default:
                    key = date.toISOString().split('T')[0];
            }
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(matchData);
        });

        const trends = [];
        const groupEntries = Array.from(groups.entries());
        
        // Limit to last 30 days, 10 weeks, or 50 games based on period
        const limit = period === 'week' ? 10 : (period === 'game' ? 50 : 30);
        const recentEntries = groupEntries.slice(-limit);
        
        recentEntries.forEach(([key, periodMatches]) => {
            const wins = periodMatches.filter(m => m.playerParticipant.win).length;
            const totalKills = periodMatches.reduce((sum, m) => sum + m.playerParticipant.kills, 0);
            const totalDeaths = periodMatches.reduce((sum, m) => sum + m.playerParticipant.deaths, 0);
            const totalAssists = periodMatches.reduce((sum, m) => sum + m.playerParticipant.assists, 0);
            const totalGold = periodMatches.reduce((sum, m) => sum + m.playerParticipant.goldEarned, 0);
            const totalGameTime = periodMatches.reduce((sum, m) => sum + m.match.info.gameDuration, 0);
            
            trends.push({
                period: period === 'game' ? key : new Date(key).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    ...(period === 'week' ? {} : {})
                }),
                matches: periodMatches.length,
                winRate: Math.round((wins / periodMatches.length) * 100),
                avgKDA: this.dataManager.calculateKDA(totalKills, totalDeaths, totalAssists),
                avgGPM: Math.round((totalGold / totalGameTime) * 60)
            });
        });
        
        return trends;
    }

    updatePerformanceTrendsChart() {
        if (this.trendsChart) {
            const trends = this.calculatePerformanceTrends();
            
            this.trendsChart.data.labels = trends.map(t => t.period);
            this.trendsChart.data.datasets[0].data = trends.map(t => t.winRate);
            this.trendsChart.data.datasets[1].data = trends.map(t => t.avgKDA);
            this.trendsChart.data.datasets[2].data = trends.map(t => t.avgGPM);
            
            this.trendsChart.update();
        }
    }

    initChampionHeatmap() {
        const container = document.getElementById('champion-heatmap');
        if (!container) return;

        const heatmapData = this.calculateChampionHeatmapData();
        container.innerHTML = this.renderChampionHeatmap(heatmapData);
    }

    calculateChampionHeatmapData() {
        const matches = this.filteredMatches.length ? this.filteredMatches : this.dataManager.getData().playerMatches;
        const championStats = new Map();

        matches.forEach(({ match, playerParticipant }) => {
            const champion = playerParticipant.championName;
            if (!championStats.has(champion)) {
                championStats.set(champion, {
                    games: 0,
                    wins: 0,
                    totalKills: 0,
                    totalDeaths: 0,
                    totalAssists: 0,
                    totalDamage: 0,
                    totalGold: 0
                });
            }

            const stats = championStats.get(champion);
            stats.games++;
            if (playerParticipant.win) stats.wins++;
            stats.totalKills += playerParticipant.kills;
            stats.totalDeaths += playerParticipant.deaths;
            stats.totalAssists += playerParticipant.assists;
            stats.totalDamage += playerParticipant.totalDamageDealtToChampions;
            stats.totalGold += playerParticipant.goldEarned;
        });

        return Array.from(championStats.entries()).map(([champion, stats]) => ({
            champion,
            games: stats.games,
            winRate: Math.round((stats.wins / stats.games) * 100),
            avgKDA: this.dataManager.calculateKDA(stats.totalKills, stats.totalDeaths, stats.totalAssists),
            avgDamage: Math.round(stats.totalDamage / stats.games),
            avgGold: Math.round(stats.totalGold / stats.games),
            performance: this.calculateChampionPerformanceScore(stats)
        })).sort((a, b) => b.performance - a.performance);
    }

    calculateChampionPerformanceScore(stats) {
        const winRate = stats.wins / stats.games;
        const avgKDA = this.dataManager.calculateKDA(stats.totalKills, stats.totalDeaths, stats.totalAssists);
        const kdaScore = avgKDA === Infinity ? 10 : Math.min(avgKDA, 10);
        
        return (winRate * 50) + (kdaScore * 5) + Math.min(stats.games, 10);
    }

    renderChampionHeatmap(data) {
        if (data.length === 0) {
            return '<div class="text-center text-muted p-4">No champion data available</div>';
        }

        const maxPerformance = Math.max(...data.map(d => d.performance));
        const minPerformance = Math.min(...data.map(d => d.performance));

        return `
            <div class="heatmap-header mb-3">
                <h6>Champion Performance Heatmap</h6>
                <div class="heatmap-legend d-flex align-items-center justify-content-center gap-3">
                    <small class="text-muted">Performance Score:</small>
                    <div class="legend-gradient"></div>
                    <small class="text-muted">Low</small>
                    <small class="text-muted">High</small>
                </div>
            </div>
            <div class="champion-heatmap-grid">
                ${data.map(championData => {
                    const data = this.dataManager.getData();
                    const champIconUrl = this.dataManager.getChampionIconUrl(championData.champion, data.championData.version);
                    const intensity = (championData.performance - minPerformance) / (maxPerformance - minPerformance);
                    const heatColor = this.getHeatmapColor(intensity);
                    
                    return `
                        <div class="champion-heatmap-cell" 
                             style="background-color: ${heatColor}" 
                             title="${championData.champion}: ${championData.games} games, ${championData.winRate}% WR, ${championData.avgKDA === Infinity ? 'Perfect' : championData.avgKDA.toFixed(2)} KDA">
                            <img src="${champIconUrl}" class="champion-icon-small" alt="${championData.champion}">
                            <div class="champion-stats">
                                <div class="champion-name">${championData.champion}</div>
                                <div class="champion-metrics">
                                    <small>${championData.games}G | ${championData.winRate}%</small>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="heatmap-footer mt-3">
                <small class="text-muted">
                    Performance score combines win rate, KDA, and games played. 
                    Click on champions for detailed analysis.
                </small>
            </div>
        `;
    }

    getHeatmapColor(intensity) {
        // Create a gradient from cool blue (low) to hot red (high)
        const colors = [
            { r: 59, g: 130, b: 246 },   // Blue (low performance)
            { r: 34, g: 197, b: 94 },    // Green (medium performance)  
            { r: 245, g: 158, b: 11 },   // Orange (good performance)
            { r: 239, g: 68, b: 68 }     // Red (high performance)
        ];
        
        const scaledIntensity = Math.max(0, Math.min(1, intensity));
        const colorIndex = scaledIntensity * (colors.length - 1);
        const baseIndex = Math.floor(colorIndex);
        const nextIndex = Math.min(baseIndex + 1, colors.length - 1);
        const factor = colorIndex - baseIndex;
        
        const baseColor = colors[baseIndex];
        const nextColor = colors[nextIndex];
        
        const r = Math.round(baseColor.r + (nextColor.r - baseColor.r) * factor);
        const g = Math.round(baseColor.g + (nextColor.g - baseColor.g) * factor);
        const b = Math.round(baseColor.b + (nextColor.b - baseColor.b) * factor);
        
        return `rgba(${r}, ${g}, ${b}, ${0.3 + scaledIntensity * 0.7})`;
    }

    destroy() {
        // Clean up event listeners
        const elements = ['search-input', 'role-filter', 'champion-filter', 'clear-filter-btn'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.replaceWith(element.cloneNode(true));
            }
        });
    }
}

// Export for module use
window.MatchHistory = MatchHistory;