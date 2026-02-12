# Morrigan In-Depth Report Generator

This project generates premium HTML executive summaries and detailed reports for Morrigan store performance data.

## Features
- **Executive Summary:** High-level KPIs, deltas, and trend graphs.
- **Regional & Branch Analysis:** Heatmaps and comparative bar charts.
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
3.  Run the generation script:
    ```bash
    node generate_report_v3.js
    ```
4.  Open the generated `report_v3.html` in your browser.

## Technologies
- Node.js
- CSV Parse
- Plotly.js (CDN)
- Bootstrap 5 (CDN)
