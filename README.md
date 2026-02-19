# Morrigan In-Depth Report Generator

This project generates premium HTML executive summaries and detailed reports for Morrigan store performance data.

## 🚀 Key Features

### 📊 Executive Dashboard
- **High-level KPIs:** Real-time scoring, deltas, and trend graphs across waves.
- **Regional & Branch Analysis:** Heatmaps and comparative bar charts with interactive drilldowns.
- **Strategic Matrix:** Tornado charts and quadrant analysis for branch performance.

### ⚔️ Battle Mode (Store Comparison)
- **Side-by-Side Benchmarking:** Compare two stores directly to identify performance gaps.
- **Radar Chart:** Visual overlay of strength/weakness areas.
- **Gap Analysis:** Definition of winning/losing categories.

### 🏥 Branch Health Monitor
-   **Priority Focus Areas**: Interactive list of worst-performing sections with one-click access to affected stores.
-   **Critical Alerts**: Prominent badges highlighting the number of stores falling below the threshold (< 84).
-   **Deep Dive Modal**: Detailed breakdown of lowest-performing stores, including their top 3 worst sections for immediate context.

## 🐛 Troubleshooting & Logic Fixes (Feb 2026)

During the refactoring process to a modular architecture, the following critical issues were identified and resolved:

1. **Missing Action Plans in Report**:
   - **Symptom**: `actionPlanConfig` was missing from the generated JSON payload, causing client-side errors.
   - **Root Cause**: Invalid import in `src/build.js`. The `src/config/action_plans.js` module exports the object directly, but `build.js` attempted to destructure it as `{ ACTION_PLANS_MAP }`.
   - **Fix**: Updated import to `const ACTION_PLANS_MAP = require(...)`.

2. **Template Placeholder Corruption**:
   - **Symptom**: Placeholders like `{{ REPORT_DATA_JSON }}` and `{ { SCRIPTS } }` appeared in the final HTML instead of being replaced by data/scripts.
   - **Root Cause**: Encoding issues introduced extra spaces within the curly braces in `src/templates/base.html`, preventing the build script's regex from matching them.
   - **Fix**: Normalized all placeholders in the template to standard format (e.g., `{{SCRIPTS}}`) and updated the build script to use robust regex with callback functions.

3. **Data Injection Safety**:
   - **Symptom**: Syntax errors in browser console due to corrupted JSON.
   - **Root Cause**: The JS `replace()` function treats `$` characters in the replacement string as special tokens (e.g., `$&`). Since user data contains `$`, this corrupted the JSON injection.
   - **Fix**: Updated `src/build.js` to use `str.replace(regex, () => content)`, ensuring the content is treated as a raw literal string.

4. **Inconsistent Data Structures causing NaN**:
   - **Symptom**: Modal displayed `NaN` for section scores, and section-specific alerts found no stores.
   - **Root Cause**: Data aggregation stored branch-level sections as objects `{ sum, count }` but store-level sections as flat numbers. The frontend logic applied `.sum/.count` universally.
   - **Fix**: Implemented a helper `getStoreSecScore` to detect the data type and handle both structures correctly. Also added robust case-insensitive matching for section names.

The project has been refactored into a modular architecture for better maintainability and scalability.

```
/
├── .github/                # GitHub Actions workflows
├── CSV/                    # Input Data (Wave reports, Master Data)
├── src/                    # Source Code
│   ├── config/             # Configuration files (scoring, waves, action plans)
│   ├── modules/            # Core logic modules (scorer, aggregator, data_loader)
│   ├── templates/          # HTML templates for the report
│   └── build.js            # Main build script
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation
```

## 🚀 How to Run

### Automated Build (Recommended)
We have a unified build script that handles data loading, processing, and HTML generation in one go.

```bash
npm run build
```

This command executes `src/build.js`, which:
1. Loads configuration and master data.
2. Processes all CSV files defined in `src/config/waves.js`.
3. Aggregates data for regions, branches, and stores.
4. Generates the final `ESS Retail Analysis.html` using templates from `src/templates/`.

### Manual Execution (Deprecated)
The old monolithic scripts (`generate_report_v4.js`, etc.) have been archived (`.bak`) and replaced by the new modular system.

## 🛠️ Configuration & Customization
- **Waves**: Edit `src/config/waves.js` to add new waves or change years.
- **Scoring Logic**: Edit `src/config/scoring.js` for weights and thresholds.
- **Action Plans**: Edit `src/config/action_plans.js` to update recommendations.
- **HTML/CSS**: Edit files in `src/templates/` to change the report's look and feel.

## 🤖 AI VoC Engine (Offline Enhanced)

The report features an AI-enhanced Voice of Customer (VoC) analysis engine that is **100% offline** and requires no API keys.

### 🧠 Analysis Strategy: "Golden Cache"
To ensure privacy, speed, and visual excellence, the system uses a pre-seeded intelligence layer:
1.  **Golden Cache (`src/cache/voc_ai_cache.json`)**: Pre-populated with high-quality analysis for **2,000+ top items**. 
2.  **Manager's Tips (`aiInsight`)**: Every analyzed item includes a specific operational tip (e.g., "Enforce grooming SOP", "Repair lighting").
3.  **Smart Categorization**: Replaces manual themes with accurate categories (Staffing, Ambiance, Hygiene, etc.).
4.  **Zero-Latency**: Because it's cache-driven, the build process is instantaneous and works without an internet connection.

### ⚙️ Configuration
- **Intelligence Layer**: The system automatically matches feedback against the cache during the build.
- **Cache File**: `src/cache/voc_ai_cache.json` stores all analyzed insights.
- **Enricher Module**: `src/modules/ai_voc.js` handles the local matching logic.

## 🐛 Troubleshooting & Logic Fixes (Feb 2026)

During the refactoring process to a modular architecture, the following critical issues were identified and resolved:

1. **Missing Action Plans in Report**:
   - **Symptom**: `actionPlanConfig` was missing from the generated JSON payload, causing client-side errors.
   - **Root Cause**: Invalid import in `src/build.js`. The `src/config/action_plans.js` module exports the object directly, but `build.js` attempted to destructure it as `{ ACTION_PLANS_MAP }`.
   - **Fix**: Updated import to `const ACTION_PLANS_MAP = require(...)`.

2. **Template Placeholder Corruption**:
   - **Symptom**: Placeholders like `{{ REPORT_DATA_JSON }}` and `{ { SCRIPTS } }` appeared in the final HTML instead of being replaced by data/scripts.
   - **Root Cause**: Encoding issues introduced extra spaces within the curly braces in `src/templates/base.html`, preventing the build script's regex from matching them.
   - **Fix**: Normalized all placeholders in the template to standard format (e.g., `{{SCRIPTS}}`) and updated the build script to use robust regex with callback functions.

3. **Data Injection Safety**:
   - **Symptom**: Syntax errors in browser console due to corrupted JSON.
   - **Root Cause**: The JS `replace()` function treats `$` characters in the replacement string as special tokens (e.g., `$&`). Since user data contains `$`, this corrupted the JSON injection.
   - **Fix**: Updated `src/build.js` to use `str.replace(regex, () => content)`, ensuring the content is treated as a raw literal string.

