# ESS Retail Report - Forward Roadmap & Implementation Plan

## 📊 Current Status
- **System:** ESS Retail In Depth Analysis (v2.1)
- **Architecture:** Single-file HTML Generator with Embedded Data
- **Key Features:** 
  - National/Region/Branch Hierarchy
  - Independent Window Store Deep Dive
  - Qualitative Feedback Integration
  - Soft Pastel Heatmaps & Sparklines

---

## 🚀 Phase 3: Analytical Intelligence Roadmap

### Sprint 1: "Battle Mode" (Store Comparison Module) ⚔️
**Objective:** Enable Area Managers to benchmark two stores side-by-side to identify gaps.
- [x] **Comparison UI:** Add "Compare with..." dropdown in Store Deep Dive view.
- [x] **Visual Benchmarking:** Implement a **Radar Chart (Spider Web)** overlaying Store A vs Store B performance.
- [x] **Gap Analysis Table:** Highlight sections where the gap is meaningful (>5 points).
- [x] **"Who Wins" Badges:** Visual indicators for superior performance in specific categories.

### Sprint 2: Field Utility Pack (PDF & Action Logic) 📄
**Objective:** Make the dashboard printable and strictly actionable for physical field visits.
- [x] **Automated "Rapor Toko" (PDF):** 
    - Implement precise CSS `@media print` styling.
    - Format Deep Dive view into a clean single-page A4 report (Score + Trends + Issues).
- [x] **Managerial Action Checklist:**
    - Develop a logic mapper (e.g., *If 'Toilet' < 84 -> Suggest "Check hourly cleaning log"*).
    - Generate a printable "To-Do List" for Supervisors based on low scores.

### Sprint 3: "Voice of Customer" Engine 🗣️
**Objective:** Extract structured insights from unstructured qualitative text.
- [x] **Keyword Frequency Analysis:** Implement lightweight JavaScript logic to count repetitive words in feedback (e.g., "Panas", "Lama", "Kotor").
- [x] **Word Cloud Visualization:** Visualize top customer complaints/compliments.
- [x] **Sentiment Association:** Correlate specific keywords with low section scores (e.g., Link word "Kasar" to "Service").

---

## 🌟 Feature Roadmap (Phase 4: Granularity & Diagnostics)

### Sprint 4: "The Culprit Finder" (Failed Items UI) 🚨
**Objective:** Visualize the specific checklist items that caused a low score.
- [ ] **Failed Items Drill-Down:** In Store Deep Dive, make section rows expandable to show list of failed checklist items (e.g., "Toilet Tisu Habis", "Lampu Mati").
- [ ] **Recurring Issue Tag:** Highlight items that failed in multiple consecutive waves.
- [ ] **Comparative Diagnostics:** In Battle Mode, side-by-side comparison of specific failed checkpoints.

### Sprint 5: Trend & Anomaly Detection 📉
**Objective:** Proactively identify stores with degrading performance or chronic issues.
- [ ] **Drop Alert:** Flag stores with >10 point drop between waves.
- [ ] **Chronic Issue Flag:** Identify sections that have remained red (<84) for 3 consecutive waves.

---

## 🛠️ Technical Roadmap (Stability & Future-Proofing)

### Architecture Refactoring (The Great Refactor)
**Objective:** Transform the monolithic script into a modular, maintainable build system.
- [ ] **De-coupling HTML:** Move HTML strings from JS to separate `.html` template files in `templates/` directory.
- [ ] **Config Extraction:** Move hardcoded configurations (weights, action plans, wave definitions) to `config/` JSON/JS files.
- [ ] **Module Separation:** Split `generate_report_v4.js` into focused modules: `data_loader.js`, `scorer.js`, `aggregator.js`.
- [ ] **Build System:** Create a robust `build.js` script that assembles modules and templates cleanly, replacing fragile string injection.

### Performance Optimization
- [ ] **Lazy Loading:** Implement lazy loading for heavy chart data to speed up initial dashboard load.
- [ ] **Data Minification:** Minify the JSON payload embedded in the HTML to reduce file size.
