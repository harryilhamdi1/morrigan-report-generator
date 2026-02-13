# Morrigan In-Depth Report Generator

This project generates premium HTML executive summaries and detailed reports for Morrigan store performance data.

## Features
- **Executive Summary:** High-level KPIs, deltas, and trend graphs.
- **Regional & Branch Analysis:** Heatmaps and comparative bar charts with interactive drilldowns.
- **Branch Strategic Dashboard:** Tornado chart, quadrant matrix, auto-generated insights, and health monitor cards.
- **Store Deep Dive:** Individual store performance with trend analysis, critical issue tracking, and action plans.
- **Automated Processing:** Reads from CSV data sources (Waves) and Master Data.

## Usage

1.  Place your source `.csv` files in the `CSV/` directory:
    - `Master Site Morrigan.csv`
    - `Wave [1-3] [2024-2025].csv`
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Generate the base report:
    ```bash
    node generate_report_v4.js
    ```
4.  Inject the enhanced Branch Performance dashboard:
    ```bash
    node inject_branches.js
    ```
5.  Inject the modernized Store Deep Dive table:
    ```bash
    node inject_store_list.js
    ```
6.  Open the generated `report_v4.html` in your browser.

> **Important:** Run steps 3 → 4 → 5 in order. Step 4 relies on anchors that Step 5 replaces.

## Technologies
- Node.js
- CSV Parse
- Plotly.js (CDN)
- Bootstrap 5 (CDN)

---

## Known Issues & Root Cause Analysis

### Blank Dashboard After Patching (Resolved 2025-02-12)

**Symptom:** After patching `generate_report_v4.js` with updated code, the generated `report_v4.html` displayed a completely blank dashboard — all KPIs showed `--`, charts were empty, and no data loaded.

**Root Cause: String-Array Architecture + Escape Chain Corruption**

The `generate_report_v4.js` file generates HTML using a **string array pattern**:
```javascript
var parts = [
    '<html>',
    '<script>',
    'function initBranches(){',
    '   var x = "hello";',   // ← each line of JS is a string element
    '}',
    '</script>'
];
return parts.join('\n');
```

The old patching approach (`patch_report_v4.js`) would:
1. Read each line of new JS code from `new_init_branches_matrix.js`
2. Escape single quotes (`'` → `\'`)
3. Wrap each line in single quotes: `'escaped line content',`
4. Splice these into the `parts` array in `generate_report_v4.js`

**This broke because:**
- **Template literals** (backtick strings with `${}`) inside the new code got double-escaped or misaligned.
- **HTML content** inside JS strings (e.g. `innerHTML = "<div>..."`) introduced nested quote conflicts.
- **The `parts.join('\n')` output** would concatenate corrupted strings, producing malformed HTML where multiple lines merged into one, breaking the `<script>` tag entirely.
- Once the `<script>` tag had invalid syntax, **all JavaScript** on the page failed — not just `initBranches`, but also `initSummary`, `initRegions`, etc. This caused the fully blank page.

**Solution:** Created `inject_branches.js` — a **post-processor** that:
1. First generates the clean, working `report_v4.html` using the original `generate_report_v4.js`
2. Then directly replaces the `initBranches` function in the **already-generated HTML** using simple string replacement
3. This completely bypasses the fragile escape chain

**Key files:**
| File | Purpose |
|------|---------|
| `generate_report_v4.js` | Base report generator (DO NOT patch this file) |
| `new_init_branches_matrix.js` | The enhanced `initBranches()` source code |
| `inject_branches.js` | Post-processor that injects the new function into HTML |
| `patch_report_v4.js` | ⚠️ Old approach — DO NOT USE (causes corruption) |

**Lesson Learned:** When a code generator uses a string-array-to-join pattern for HTML output, avoid patching the generator itself. Instead, post-process the generated output directly.
