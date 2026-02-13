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
- [x] **Phase 1: Project Restructuring & Build System**
  - [x] Extract HTML templates into `src/templates/`.
  - [x] Create modular JS logic in `src/modules/`.
  - [x] Implement `src/build.js` for robust report generation.
  - [x] Verify build process stability.

- [x] **Phase 2: Core Analysis Modules**
  - [x] **Regional/Branch Analysis**:
    - [x] Implement Branch vs Section Heatmap.
    - [x] Add Branch Performance Cards with Sparklines.
    - [x] Add "Focus Stores" list for managers.
  - [x] **Store Deep Dive**:
    - [x] Implement Radar Chart (Spider Web) for Gap Analysis.
    - [x] Add Context Badges (+/- vs Region).
    - [x] **Premium Layout**:
      - [x] "Luxury" Dark Header with Trend Spline Chart.
      - [x] Critical Issues Banner.
      - [x] SVG Sparklines in Section Analysis Table.

- [ ] **Phase 3: Visual & UX Polish (Current)**
  - [ ] **Store List Master View**: (New Request)
    - [ ] Replace simple dropdown with a full "Master Table" of stores.
    - [ ] Implement filters: Search, Region, Branch, Sort.
    - [ ] "Luxury" Table Styling: Badges, Pills, Hover effects.
    - [ ] Master-Detail navigation (List <-> Detail).
  - [ ] Final Design Review & Micro-interactions.

- [ ] **Phase 4: Advanced Features (Future)**
  - [ ] "Battle Mode" (Compare 2 Stores Side-by-Side).
  - [ ] PDF Export Optimization.ts from unstructured qualitative text.
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
