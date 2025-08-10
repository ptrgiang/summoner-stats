# Development Guide - Modular Summoner Stats

This guide explains how to work with the separated modular structure for independent development of each tab.

## 🏗️ Project Structure

```
summoner-stats/
├── css/
│   └── styles.css                 # All styling consolidated
├── js/
│   ├── app.js                     # Main application orchestrator
│   ├── utils/                     # Shared utilities
│   │   ├── data-manager.js        # Centralized data loading/processing
│   │   └── chart-utils.js         # Chart.js helpers and configurations
│   └── modules/                   # Independent tab modules
│       ├── dashboard.js           # Dashboard analytics
│       ├── champion-performance.js # Champion statistics table
│       ├── match-history.js       # Match filtering and details
│       └── mini-map.js           # Position visualization
├── index-modular.html            # New modular entry point
├── index.html                    # Original monolithic version
└── [existing data folders]
```

## 🚀 Getting Started

### Option 1: Use Modular Version (Recommended)
```bash
# Open the modular version
open index-modular.html
```

### Option 2: Keep Original Version
```bash
# Continue with original
open index.html
```

## 📋 Module Development

### 1. Dashboard Module (`js/modules/dashboard.js`)

**Purpose**: Professional analytics with KPIs, trends, and performance charts

**Key Features**:
- KPI cards with trend indicators
- Ranked statistics display
- Win/loss trend analysis
- Gold per minute tracking
- Role distribution
- Game mode analysis
- Top champion performance

**Development**:
```javascript
// Access the dashboard module
const dashboard = window.dashboard;

// Add new chart
dashboard.charts.newChart = new Chart(ctx, config);

// Get dashboard data
const stats = dashboard.dataManager.getData();
```

**Files to modify**:
- `js/modules/dashboard.js` - Main logic
- `css/styles.css` - Chart styling
- `index-modular.html` - Dashboard tab HTML

---

### 2. Champion Performance Module (`js/modules/champion-performance.js`)

**Purpose**: Sortable champion statistics with mastery integration

**Key Features**:
- Sortable performance table
- Champion filtering integration
- Mastery level display
- Click-to-filter functionality
- Performance analytics

**Development**:
```javascript
// Access champion performance module
const championPerf = window.championPerformance;

// Get champion statistics
const topChamps = championPerf.getTopChampions('winRate', 10);

// Filter champions
const filtered = championPerf.filterChampions({
    minGames: 5,
    minWinRate: 60
});
```

**Files to modify**:
- `js/modules/champion-performance.js` - Main logic
- `css/styles.css` - Table styling
- `index-modular.html` - Champion performance tab HTML

---

### 3. Match History Module (`js/modules/match-history.js`)

**Purpose**: Filterable match list with detailed modal views

**Key Features**:
- Multi-filter system (role, champion, search)
- Match details modal
- Performance statistics
- Cross-module integration

**Development**:
```javascript
// Access match history module
const matchHistory = window.matchHistory;

// Apply filters programmatically
matchHistory.applyFilters({
    champion: 'Jinx',
    role: 'BOTTOM'
});

// Get filtered statistics
const stats = matchHistory.getMatchStatistics();
```

**Files to modify**:
- `js/modules/match-history.js` - Main logic
- `css/styles.css` - List and modal styling
- `index-modular.html` - Match history tab HTML

---

### 4. Mini-map Module (`js/modules/mini-map.js`)

**Purpose**: Interactive champion positioning visualization

**Key Features**:
- Realistic lane positioning
- Team-based color coding
- Role-specific algorithms
- Game filtering
- Position analytics

**Development**:
```javascript
// Access mini-map module
const miniMap = window.miniMap;

// Get role distribution
const roles = miniMap.getRoleDistribution(50);

// Get team side statistics
const sideStats = miniMap.getTeamSideStats(100);

// Custom render
miniMap.renderMiniMap(25);
```

**Files to modify**:
- `js/modules/mini-map.js` - Main logic
- `css/styles.css` - Map and icon styling
- `index-modular.html` - Mini-map tab HTML

## 🛠️ Shared Utilities

### Data Manager (`js/utils/data-manager.js`)
Centralized data loading and processing:
```javascript
const dataManager = new DataManager();
await dataManager.loadAllData();

// Access processed data
const data = dataManager.getData();
const winRate = dataManager.calculateWinRate(wins, games);
```

### Chart Utils (`js/utils/chart-utils.js`)
Common chart configurations:
```javascript
// Create standardized charts
ChartUtils.createWinLossChart(ctx, data, labels);
ChartUtils.createPieChart(ctx, labels, data, 'Title');
ChartUtils.createBarChart(ctx, labels, data, 'Label', color, horizontal);
```

## 🔄 Cross-Module Communication

Modules can interact through the global window object:

```javascript
// From Champion Performance -> Match History
window.matchHistory.applyFilters({ champion: 'Jinx' });

// From any module -> Tab switching
window.app.switchToTab('match-history');

// Access main app data
const data = window.app.getData();
```

## 📊 Adding New Features

### 1. Add to Existing Module
```javascript
// In js/modules/dashboard.js
renderNewChart() {
    // Implementation
}
```

### 2. Create New Module
```javascript
// js/modules/new-feature.js
class NewFeature {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    
    init() {
        // Initialize feature
    }
}
window.NewFeature = NewFeature;
```

### 3. Update Main App
```javascript
// In js/app.js
initializeModules() {
    // Add to initialization
    this.newFeature = new NewFeature(this.dataManager);
    this.newFeature.init();
}
```

## 🎨 Styling Guidelines

All styles are centralized in `css/styles.css`:

```css
/* Use CSS custom properties */
:root {
    --success-color: rgba(75, 192, 192, 0.8);
}

/* Follow existing conventions */
.your-new-component {
    /* Use existing patterns */
}
```

## 🧪 Testing Individual Modules

Each module can be tested independently:

```javascript
// Test Dashboard
const dataManager = new DataManager();
await dataManager.loadAllData();
const dashboard = new Dashboard(dataManager);
dashboard.init();
```

## 🚦 Development Workflow

1. **Choose your module** from the 4 independent tabs
2. **Modify module file** in `js/modules/`
3. **Update styles** in `css/styles.css` if needed
4. **Test with modular version** `index-modular.html`
5. **Use original version** `index.html` as reference

## 📈 Performance Considerations

- **Lazy loading**: Modules initialize on demand
- **Chart cleanup**: Proper destruction prevents memory leaks
- **Data sharing**: Single DataManager instance across modules
- **Event management**: Proper cleanup in destroy() methods

## 🔧 Debugging

```javascript
// Access any module from console
console.log(window.dashboard);
console.log(window.championPerformance);
console.log(window.matchHistory);
console.log(window.miniMap);

// Get application state
console.log(window.app.getData());
console.log(window.app.getCurrentTab());
```

This modular structure allows you to develop each tab independently while maintaining shared functionality and clean separation of concerns.