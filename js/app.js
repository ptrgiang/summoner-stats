/**
 * Main Application - Orchestrates all modules
 */
class SummonerStatsApp {
    constructor() {
        this.dataManager = new DataManager();
        this.dashboard = null;
        this.championPerformance = null;
        this.matchHistory = null;
        this.miniMap = null;
        this.currentTab = 'dashboard';
    }

    async init() {
        try {
            // Show loading state
            this.showLoading();

            // Load all data
            await this.dataManager.loadAllData();

            // Initialize all modules
            this.initializeModules();

            // Setup tab switching
            this.setupTabSwitching();

            // Hide loading and show content
            this.showContent();

        } catch (error) {
            this.showError(error.message);
            console.error('Failed to initialize app:', error);
        }
    }

    initializeModules() {
        // Initialize Dashboard
        this.dashboard = new Dashboard(this.dataManager);
        this.dashboard.init();

        // Initialize Champion Performance
        this.championPerformance = new ChampionPerformance(this.dataManager);
        this.championPerformance.init();

        // Initialize Match History
        this.matchHistory = new MatchHistory(this.dataManager);
        this.matchHistory.init();

        // Initialize Mini-map
        this.miniMap = new MiniMap(this.dataManager);
        this.miniMap.init();

        // Make modules available globally for cross-module communication
        window.dashboard = this.dashboard;
        window.championPerformance = this.championPerformance;
        window.matchHistory = this.matchHistory;
        window.miniMap = this.miniMap;
    }

    setupTabSwitching() {
        // Setup Bootstrap tab event listeners
        const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabElements.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (event) => {
                const targetTab = event.target.getAttribute('data-bs-target').replace('#', '');
                this.onTabSwitch(targetTab);
            });
        });
    }

    onTabSwitch(tabName) {
        this.currentTab = tabName;
        
        // Perform tab-specific initialization or updates
        switch (tabName) {
            case 'dashboard':
                // Dashboard charts might need resize after becoming visible
                this.resizeDashboardCharts();
                break;
            case 'champion-performance':
                // Refresh champion performance data if needed
                break;
            case 'match-history':
                // Update match list if needed
                break;
            case 'mini-map':
                // Re-render mini-map if needed
                if (this.miniMap) {
                    this.miniMap.renderMiniMap(199);
                }
                break;
        }
    }

    resizeDashboardCharts() {
        // Trigger resize for Chart.js charts
        console.log('Resizing dashboard charts...');
        setTimeout(() => {
            if (this.dashboard && this.dashboard.charts) {
                Object.values(this.dashboard.charts).forEach(chart => {
                    if (chart && typeof chart.resize === 'function') {
                        chart.resize();
                    }
                });
            }
        }, 100);
    }
    
    refreshDashboard() {
        if (this.dashboard) {
            console.log('Refreshing dashboard via app...');
            this.dashboard.refresh();
        }
    }

    showLoading() {
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('content');
        
        if (loadingEl) loadingEl.classList.remove('d-none');
        if (contentEl) contentEl.classList.add('d-none');
    }

    showContent() {
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('content');
        
        if (loadingEl) loadingEl.classList.add('d-none');
        if (contentEl) contentEl.classList.remove('d-none');
    }

    showError(message) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="text-center">
                    <div class="alert alert-danger">
                        <h5>Error Loading Data</h5>
                        <p>${message}</p>
                        <small>Please make sure you are running this from a local web server and all data files are present.</small>
                    </div>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // Public API methods
    getData() {
        return this.dataManager.getData();
    }

    getCurrentTab() {
        return this.currentTab;
    }

    switchToTab(tabName) {
        const tabButton = document.getElementById(`${tabName}-tab`);
        if (tabButton) {
            tabButton.click();
        }
    }

    // Analytics aggregation methods
    getOverallStatistics() {
        const data = this.dataManager.getData();
        const { playerMatches } = data;

        const wins = playerMatches.filter(m => m.playerParticipant.win).length;
        const winRate = this.dataManager.calculateWinRate(wins, playerMatches.length);

        // Calculate average performance
        const avgKills = playerMatches.reduce((sum, m) => sum + m.playerParticipant.kills, 0) / playerMatches.length;
        const avgDeaths = playerMatches.reduce((sum, m) => sum + m.playerParticipant.deaths, 0) / playerMatches.length;
        const avgAssists = playerMatches.reduce((sum, m) => sum + m.playerParticipant.assists, 0) / playerMatches.length;
        const avgKDA = this.dataManager.calculateKDA(avgKills, avgDeaths, avgAssists);

        // Calculate average gold per minute
        const avgGPM = playerMatches.reduce((sum, m) => {
            return sum + this.dataManager.calculateGoldPerMinute(m.playerParticipant.goldEarned, m.match.info.gameDuration);
        }, 0) / playerMatches.length;

        return {
            totalGames: playerMatches.length,
            wins,
            losses: playerMatches.length - wins,
            winRate: parseFloat(winRate),
            avgKills: avgKills.toFixed(1),
            avgDeaths: avgDeaths.toFixed(1),
            avgAssists: avgAssists.toFixed(1),
            avgKDA: avgKDA === Infinity ? 'Perfect' : avgKDA.toFixed(2),
            avgGPM: avgGPM.toFixed(0)
        };
    }

    exportStatistics() {
        const stats = this.getOverallStatistics();
        const championStats = this.championPerformance ? this.championPerformance.getChampionStats() : [];
        const roleDistribution = this.miniMap ? this.miniMap.getRoleDistribution() : {};
        
        const exportData = {
            player: this.dataManager.getData().mainPlayerName,
            generated: new Date().toISOString(),
            overall: stats,
            champions: championStats,
            roles: roleDistribution
        };

        // Create downloadable JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `summoner-stats-${exportData.player}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    destroy() {
        // Clean up all modules
        if (this.dashboard) this.dashboard.destroy();
        if (this.championPerformance) this.championPerformance.destroy();
        if (this.matchHistory) this.matchHistory.destroy();
        if (this.miniMap) this.miniMap.destroy();

        // Clean up global references
        delete window.dashboard;
        delete window.championPerformance;
        delete window.matchHistory;
        delete window.miniMap;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SummonerStatsApp();
    window.app.init();
});

// Export for global access
window.SummonerStatsApp = SummonerStatsApp;