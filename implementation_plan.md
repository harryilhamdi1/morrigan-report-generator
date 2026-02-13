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

## 🛠️ Technical Debt & Refactoring
- [ ] **Modularization:** Move heavily injected HTML strings from JS files into separate Template Literals or JSON config.
- [ ] **Performance:** Optimize Plotly rendering for slower devices when loading 1000+ stores.
