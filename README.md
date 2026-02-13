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

### 🗣️ Voice of Customer (VoC) Engine
- **Sentiment Analysis:** Automated classification of customer feedback (Positive/Negative/Neutral).
- **Word Cloud:** Visualization of frequently mentioned topics.
- **Theme Breakdown:** Correlation of sentiment with operational areas (Service, Product, Ambience).

### 🔍 Diagnostic Granularity
- **Failed Items Drill-Down:** Identifies specific checklist items that caused a low section score (e.g., "Toilet Tisu Habis" vs just "Toilet Score: 50").
- **Weighted Scoring:** Accurate calculation based on official Section Weights.

---

## 🛠️ Usage

### Quick Start (Automated Workflow)
We have a comprehensive build script that runs the generator and all injection modules in the correct order:

1.  **Run the Build Workflow:**
    ```bash
    npm run build
    ```
    *(Note: You can add `"build": "node generate_report_v4.js && node inject_branches.js && node inject_store_list.js && node inject_voc.js"` to `package.json` scripts)*

    **OR run manually in sequence:**
    ```bash
    # 1. Generate Base Report
    node generate_report_v4.js

    # 2. Inject Branch Analysis
    node inject_branches.js

    # 3. Inject Store Deep Dive & Battle Mode
    node inject_store_list.js

    # 4. Inject Voice of Customer Module
    node inject_voc.js
    ```

2.  **Open the Report:**
    Open `ESS Retail In Depth Analysis.html` in your browser.

---

## 📂 Project Structure

| File | Purpose |
|------|---------|
| `generate_report_v4.js` | Main logic for data processing & base HTML generation |
| `scoring_logic_vFinal.js` | Reference for validated scoring rules |
| `item_drilldown.js` | Logic to identify specific failed checklist items |
| `voc_analysis.js` | Engine for processing qualitative customer feedback |
| `inject_*.js` | Post-processors that inject enhanced UI modules into the HTML |
| `CSV/` | Raw data source (Waves + Master Data + Weights) |

---

## ⚠️ Important Notes
- **Source of Truth:** The Final Score in the CSV is treated as the absolute truth. Our internal logic mimicsit but prioritizes the CSV value if available.
- **Injection Logic:** The system uses a "Post-Processing Injection" pattern. We generate a base HTML file first, then use regex/string replacement to swap out simplified placeholder functions with complex, interactive modules. This avoids escaping hell in the main generator script.
