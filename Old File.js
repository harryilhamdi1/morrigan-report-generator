const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const path = require('path');

// Configuration for Action Plans based on Section Scores
const ACTION_PLANS = {
    'A. Tampilan Tampak Depan Outlet': 'Inspect facade cleanliness, signage lighting, and window displays. Schedule immediate maintenance for any broken fixtures.',
    'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet': ' conduct morning briefing on Greetings standard (Sapa, Senyum, Tatap Mata). Roleplay greeting scenarios.',
    'C. Suasana & Kenyamanan Outlet': 'Check AC temperature, music volume, and overall store cleanliness. Ensure store ambiance aligns with brand standards.',
    'D. Penampilan Retail Assistant': 'Review grooming standards (Uniform, ID Card, Shoes, Hair). Conduct spot checks during shifts.',
    'E. Pelayanan Penjualan & Pengetahuan Produk': 'Refresh product knowledge training, focusing on key features and benefits. Practice "Selling Skills".',
    'F. Pengalaman Mencoba Produk': 'Encourage staff to proactively offer fitting rooms and assistance. Ensure fitting rooms are clean and ready.',
    'G. Rekomendasi untuk Membeli Produk': 'Train staff on Cross-selling and Up-selling techniques. Focus on suggesting complementary items.',
    'H. Pembelian Produk & Pembayaran di Kasir': 'Review cashier (POS) procedures to ensure speed and accuracy. Remind cashiers to thank customers by name if possible.',
    'I. Penampilan Kasir': 'Ensure cashiers adhere to the same high grooming standards as floor staff.',
    'J. Toilet (Khusus Store yang memiliki toilet )': 'Implement an hourly toilet cleaning checklist. Ensure amenities (soap, tissue) are always stocked.',
    'K. Salam Perpisahan oleh Retail Asisstant': 'Remind staff to thank customers and invite them back when they leave, regardless of purchase.'
};

const THRESHOLD_SCORE = 84; // Score below this triggers an action plan

// Helper to normalize strings (trim, uppercase)
function normalizeString(str) {
    if (!str) return 'UNKNOWN';
    return str.trim().toUpperCase();
}

async function loadMasterData(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        trim: true, // Trim whitespace from headers and values
        bom: true // Handle Byte Order Mark
    });

    if (records.length > 0) {
        console.log("DEBUG: First Master Record Keys:", Object.keys(records[0]));
        console.log("DEBUG: First Master Record Region:", records[0]['Region']);
    }

    // Map Site Code to details
    const masterMap = {};
    records.forEach(r => {
        if (r['Site Code']) {
            masterMap[r['Site Code']] = {
                // If 'Region' key is missing/mispelled due to parser issues, this will be UNKNOWN
                region: normalizeString(r['Region']),
                branch: normalizeString(r['Branch']),
                siteName: r['Site Name'],
                city: r['City']
            };
        }
    });
    return masterMap;
}

async function processWave(filePath, waveName, year, masterMap) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true,
        bom: true
    });

    const storeResults = [];

    records.forEach(record => {
        const siteCode = record['Site Code'];
        if (!siteCode) return; // Skip empty rows

        let masterInfo = masterMap[siteCode];

        // If not in master, try to construct from record
        if (!masterInfo) {
            masterInfo = {
                region: normalizeString(record['Regional']), // Use 'Regional' column from wave
                branch: normalizeString(record['Branch']),   // Use 'Branch' column from wave
                siteName: record['Site Name'] || 'Unknown Store'
            };
        }

        const storeData = {
            siteCode: siteCode,
            siteName: masterInfo.siteName,
            region: masterInfo.region,
            branch: masterInfo.branch,
            wave: waveName,
            year: year,
            sections: {},
            qualitative: []
        };

        // Filter out CLOSED stores as they are not part of the active reporting hierarchy
        if (storeData.region === 'CLOSED' || storeData.branch === 'CLOSED') return;

        // Extract Qualitative Feedback (General)
        const generalFeedbackKey = Object.keys(record).find(k => k.includes('(759291)'));
        if (generalFeedbackKey && record[generalFeedbackKey]) {
            storeData.qualitative.push(record[generalFeedbackKey]);
        }

        // Extract Final Score (Strict Reference per User Request)
        // Look for column named "Final Score" which is to the left of KPI column
        const finalScoreKey = Object.keys(record).find(k => k === 'Final Score' || k.trim() === 'Final Score');
        let finalScore = null;

        if (finalScoreKey && record[finalScoreKey]) {
            let rawVal = record[finalScoreKey];
            let val = parseFloat(rawVal.replace(',', '.'));
            if (!isNaN(val) && val > 0) {
                finalScore = val;
            }
        }

        // Extract Metrics for Specific Sections
        const targetSections = [
            'A. Tampilan Tampak Depan Outlet',
            'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
            'C. Suasana & Kenyamanan Outlet',
            'D. Penampilan Retail Assistant',
            'E. Pelayanan Penjualan & Pengetahuan Produk',
            'F. Pengalaman Mencoba Produk',
            'G. Rekomendasi untuk Membeli Produk',
            'H. Pembelian Produk & Pembayaran di Kasir',
            'I. Penampilan Kasir',
            'J. Toilet (Khusus Store yang memiliki toilet )',
            'K. Salam Perpisahan oleh Retail Asisstant'
        ];

        targetSections.forEach(fullSecName => {
            // Find key that contains this section title
            // Note: Use simple includes, but be careful of overlapping names if any (none here)
            const key = Object.keys(record).find(k => k.includes(fullSecName) && !k.endsWith('- Text'));

            if (key) {
                let rawVal = record[key];
                let score = 0;

                // Handle various CSV number formats
                // 1. "Yes (100.00)"
                // 2. "4.00"
                // 3. "4,00"

                if (typeof rawVal === 'string') {
                    if (rawVal.includes('(')) {
                        const match = rawVal.match(/\((\d+(\.\d+)?)\)/);
                        score = match ? parseFloat(match[1]) : 0;
                    } else {
                        score = parseFloat(rawVal.replace(',', '.'));
                    }
                } else {
                    score = rawVal;
                }

                // Convert 5-scale to 100-scale if needed
                if (!isNaN(score) && score <= 5 && score > 0) {
                    score = score * 20;
                }

                if (!isNaN(score)) {
                    // Use the canonical name from the list
                    storeData.sections[fullSecName] = score;
                }
            }
        });

        // Finalize Store Data with Score Strategy
        // STRICTLY use 'Final Score' column if available (User Request: 97.78 etc)
        // Fallback to calculation only if Final Score is missing
        if (finalScore !== null) {
            storeData.totalScore = finalScore;
        } else {
            const vals = Object.values(storeData.sections);
            storeData.totalScore = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        }

        storeResults.push(storeData);
    });

    return storeResults;
}

async function processAll() {
    const masterMap = await loadMasterData(path.join(__dirname, 'CSV', 'Master Site Morrigan.csv'));

    const waves = [
        { file: 'Wave 1 2024.csv', name: 'Wave 1', year: 2024 },
        { file: 'Wave 2 2024.csv', name: 'Wave 2', year: 2024 },
        { file: 'Wave 3 2024.csv', name: 'Wave 3', year: 2024 },
        { file: 'Wave 1 2025.csv', name: 'Wave 1', year: 2025 },
        { file: 'Wave 2 2025.csv', name: 'Wave 2', year: 2025 }
    ];

    let allStoreData = [];

    for (const wave of waves) {
        try {
            const data = await processWave(path.join(__dirname, 'CSV', wave.file), wave.name, wave.year, masterMap);
            allStoreData = allStoreData.concat(data);
            console.log(`Processed ${wave.file}: ${data.length} records`);
        } catch (err) {
            console.error(`Error processing ${wave.file}:`, err.message);
        }
    }

    // Aggregations
    const hierarchy = {
        all: {}, // Key: WaveID -> { sum: 0, count: 0, sections: {name: {sum, count}} }
        regions: {}, // Key: Region -> WaveID -> ...
        branches: {}, // Key: Branch -> WaveID -> ...
        stores: {} // Key: SiteCode -> { meta: {}, waves: { WaveID -> { sections: {}, qualitative: [] } } }
    };

    allStoreData.forEach(entry => {
        const waveKey = `${entry.year} ${entry.wave}`;

        // --- 1. Store Level Helper ---
        if (!hierarchy.stores[entry.siteCode]) {
            hierarchy.stores[entry.siteCode] = {
                meta: {
                    name: entry.siteName,
                    region: entry.region,
                    branch: entry.branch,
                    code: entry.siteCode
                },
                results: {}
            };
        }
        hierarchy.stores[entry.siteCode].results[waveKey] = {
            sections: entry.sections,
            qualitative: entry.qualitative,
            totalScore: entry.totalScore
        };

        // --- 2. Hierarchical Aggregation Helper ---
        const addToHierarchy = (levelObj, record) => {
            if (!levelObj[waveKey]) levelObj[waveKey] = { sum: 0, count: 0, sections: {} };

            // Use the authoritative Total Score for aggregation
            levelObj[waveKey].sum += record.totalScore;
            levelObj[waveKey].count++;

            Object.entries(record.sections).forEach(([secName, val]) => {
                if (!levelObj[waveKey].sections[secName]) levelObj[waveKey].sections[secName] = { sum: 0, count: 0, critical: 0 };
                levelObj[waveKey].sections[secName].sum += val;
                levelObj[waveKey].sections[secName].count++;
                if (val < 84) levelObj[waveKey].sections[secName].critical++;
            });
        };

        // All Sites
        addToHierarchy(hierarchy.all, entry);

        // Region
        if (!hierarchy.regions[entry.region]) hierarchy.regions[entry.region] = {};
        addToHierarchy(hierarchy.regions[entry.region], entry);

        // Branch
        if (!hierarchy.branches[entry.branch]) hierarchy.branches[entry.branch] = {};
        addToHierarchy(hierarchy.branches[entry.branch], entry);
    });

    // Generate Final Struct for Frontend
    const finalReport = {
        meta: { generatedAt: new Date().toISOString() },
        summary: hierarchy.all, // Averages needs calculating
        regions: hierarchy.regions,
        branches: hierarchy.branches,
        stores: hierarchy.stores,
        actionPlanConfig: ACTION_PLANS,
        threshold: THRESHOLD_SCORE
    };

    const htmlContent = generateHTML(finalReport);
    await fs.writeFile('report_v3.html', htmlContent);
    console.log('Dashboard generated: report_v3.html');
}

function generateHTML(data) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Morrigan Executive Dashboard</title>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Plotly -->
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        :root {
            --primary: #002060; /* McKinsey Navy */
            --secondary: #4472C4; /* Bright Blue */
            --light-bg: #F3F4F6;
            --white: #FFFFFF;
            --text-dark: #1F2937;
            --text-muted: #6B7280;
            --success: #10B981;
            --danger: #EF4444;
            --warning: #F59E0B;
        }
        body { 
            background-color: var(--light-bg); 
            font-family: 'Inter', sans-serif; 
            color: var(--text-dark);
            overflow-x: hidden;
        }
        
        /* Layout */
        .sidebar { 
            height: 100vh; 
            position: fixed; 
            top: 0; 
            left: 0; 
            background: linear-gradient(180deg, #001A4D 0%, #002060 100%);
            color: white; 
            width: 280px; 
            z-index: 1000;
            display: flex;
            flex-direction: column;
            box-shadow: 4px 0 20px rgba(0,0,0,0.15);
        }
        .main-content { margin-left: 280px; padding: 40px; }

        /* Sidebar Branding */
        .sidebar-brand { 
            padding: 40px 25px; 
            border-bottom: 1px solid rgba(255,255,255,0.05); 
            text-align: center;
        }
        .sidebar-brand h4 { 
            font-size: 1.5rem; 
            letter-spacing: 3px; 
            font-weight: 800;
            margin: 0;
            background: linear-gradient(90deg, #FFFFFF 0%, #A5B4FC 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .sidebar-brand small { 
            color: rgba(255,255,255,0.5); 
            text-transform: uppercase; 
            letter-spacing: 2px;
            font-weight: 600;
            font-size: 0.65rem;
        }

        /* Sidebar Navigation */
        .sidebar-nav { flex: 1; padding: 25px 15px; }
        .sidebar a { 
            color: rgba(255,255,255,0.6); 
            padding: 14px 20px; 
            text-decoration: none; 
            display: flex; 
            align-items: center; 
            gap: 15px;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 12px;
            margin-bottom: 8px;
        }
        .sidebar a:hover { 
            color: white; 
            background-color: rgba(255,255,255,0.08); 
            transform: translateX(4px);
        }
        .sidebar a.active { 
            color: white; 
            background: rgba(255,255,255,0.15); 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            font-weight: 600;
        }
        .sidebar a svg { width: 20px; height: 20px; opacity: 0.8; transition: transform 0.3s ease; }
        .sidebar a.active svg { opacity: 1; color: #A5B4FC; transform: scale(1.1); }

        /* Sidebar Footer */
        .sidebar-footer {
            padding: 25px;
            border-top: 1px solid rgba(255,255,255,0.05);
            font-size: 0.75rem;
            color: rgba(255,255,255,0.4);
        }

        /* Cards */
        .card { 
            background: var(--white);
            border: none; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            margin-bottom: 24px;
            transition: transform 0.2s ease-in-out;
        }
        .card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .card-header-clean {
            padding: 20px 24px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--primary);
            background: transparent;
        }

        /* KPI Cards */
        .kpi-card { padding: 24px; display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
        .kpi-label { font-size: 0.875rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        .kpi-value { font-size: 2.5rem; font-weight: 700; color: var(--primary); line-height: 1.2; margin: 10px 0; }
        .kpi-trend { font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 4px; }
        .kpi-trend.positive { color: var(--success); }
        .kpi-trend.negative { color: var(--danger); }
        
        /* Tables */
        .table-custom th { 
            font-size: 0.75rem; 
            text-transform: uppercase; 
            color: var(--text-muted); 
            font-weight: 600; 
            border-bottom: 2px solid #E5E7EB;
        }
        .table-custom td { vertical-align: middle; color: var(--text-dark); border-bottom: 1px solid #F3F4F6; padding: 12px 8px; }
        .rank-badge { 
             width: 24px; height: 24px; 
             display: inline-flex; align-items: center; justify-content: center; 
             border-radius: 50%; 
             font-size: 0.75rem; font-weight: bold;
             background: var(--light-bg); color: var(--text-muted);
        }
        .rank-top-1 { background: #FFD700; color: #744210; }
        .rank-top-2 { background: #C0C0C0; color: #374151; }
        .rank-top-3 { background: #CD7F32; color: #744210; }

        /* Store Detail */
        .score-box-large {
            padding: 30px;
            text-align: center;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            color: white;
            border-radius: 12px;
        }
        .action-plan-item {
            padding: 16px;
            border: 1px solid #FECACA;
            background-color: #FEF2F2;
            border-radius: 8px;
            margin-bottom: 12px;
            position: relative;
            padding-left: 16px;
        }
        .action-plan-item::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            background-color: var(--danger);
            border-top-left-radius: 8px;
            border-bottom-left-radius: 8px;
        }
        
    </style>
</head>
<body>

<div class="sidebar">
    <div class="sidebar-brand">
        <h4>MORRIGAN</h4>
        <small>Insight Engine</small>
    </div>
    <div class="sidebar-nav">
        <a href="#" onclick="showTab('summary')" class="active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <span>Executive Summary</span>
        </a>
        <a href="#" onclick="showTab('regions')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span>Regional Analysis</span>
        </a>
        <a href="#" onclick="showTab('branches')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 8 3 3-3 3"/></svg>
            <span>Branch Performance</span>
        </a>
        <a href="#" onclick="showTab('stores')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Store Deep Dive</span>
        </a>
    </div>
    <div class="sidebar-footer">
        <div class="mb-1">Version 3.2.0</div>
        <div>&copy; 2025 Eigerindo MPI</div>
    </div>
</div>

<div class="main-content">
    
    <!-- Executive Summary Tab -->
    <div id="tab-summary">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="text-primary-custom mb-1">Executive Summary</h2>
                <p class="text-muted m-0">High-level performance overview across all waves.</p>
            </div>
            <div class="text-end">
                <small class="text-muted d-block">Generated On</small>
                <strong>${new Date(data.meta.generatedAt).toLocaleDateString()}</strong>
            </div>
        </div>

        <!-- KPI Row -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Current Overall Score</div>
                            <div class="kpi-value" id="kpi-score">--</div>
                        </div>
                        <div class="kpi-trend" id="kpi-score-trend">-- vs last wave</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Active Stores</div>
                            <div class="kpi-value" id="kpi-stores">--</div>
                        </div>
                        <div class="kpi-trend text-muted">Across 5 Regions</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Critical Action Items</div>
                            <div class="kpi-value text-danger" id="kpi-actions">--</div>
                        </div>
                        <div class="kpi-trend text-muted">Sections scoring < ${data.threshold}</div>
                    </div>
                </div>
            </div>
             <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div>
                            <div class="kpi-label">Best Performing Region</div>
                            <div class="kpi-value text-success" style="font-size: 1.8rem;" id="kpi-best-region">--</div>
                        </div>
                        <div class="kpi-trend text-muted">Leading the chart</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card h-100">
                    <div class="card-header-clean">Historical Performance Trend</div>
                    <div class="card-body">
                        <div id="summaryChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Section Analysis Grid (New Button Style) -->
        <h4 class="text-primary-custom mb-3">Section Breakdown & Critical Issues</h4>
        <div class="row mb-5">
            <div class="col-12">
                <div id="sectionAnalysisGrid" class="row g-3"></div>
            </div>
        </div>

        <!-- Leaderboard (Stores) -->
        <h4 class="text-primary-custom mb-3">Store Rankings</h4>
        <div class="row mb-5">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header-clean text-success">🏆 Top Performing Stores</div>
                    <div class="card-body p-0">
                        <table class="table table-custom table-hover m-0">
                            <thead><tr><th style="padding-left: 20px;">Rank</th><th>Store Name</th><th class="text-end" style="padding-right: 20px;">Score</th></tr></thead>
                            <tbody id="topStoresList"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header-clean text-danger">⚠️ Lowest Performing Stores</div>
                    <div class="card-body p-0">
                        <table class="table table-custom table-hover m-0">
                            <thead><tr><th style="padding-left: 20px;">Rank</th><th>Store Name</th><th class="text-end" style="padding-right: 20px;">Score</th></tr></thead>
                            <tbody id="bottomStoresList"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Hierarchy Performance -->
        <h4 class="text-primary-custom mb-3">Structure Performance</h4>
        <div class="row">
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header-clean bg-primary text-white">🏆 Regional Ranking</div>
                    <div class="card-body p-0">
                        <table class="table table-custom table-hover m-0">
                            <thead><tr><th style="padding-left: 20px;">Rank</th><th>Region</th><th class="text-center">Critical Issues</th><th class="text-end" style="padding-right: 20px;">Avg Score</th></tr></thead>
                            <tbody id="regionRankList"></tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header-clean bg-primary text-white">🏆 Branch Ranking (Top 5)</div>
                    <div class="card-body p-0">
                        <table class="table table-custom table-hover m-0">
                            <thead><tr><th style="padding-left: 20px;">Rank</th><th>Branch</th><th class="text-center">Critical Issues</th><th class="text-end" style="padding-right: 20px;">Avg Score</th></tr></thead>
                            <tbody id="branchRankList"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Regions Tab -->
    <div id="tab-regions" style="display:none;">
        <h2 class="text-primary-custom mb-4">Regional Analysis</h2>
        
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header-clean">Regional Heatmap (Performance over Time)</div>
                    <div class="card-body">
                         <div id="regionHeatmap" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row g-4" id="regionDetailCards">
            <!-- Cards injected via JS -->
        </div>
    </div>

    <!-- Branches Tab -->
    <div id="tab-branches" style="display:none;">
        <h2 class="text-primary-custom mb-1">Branch Performance</h2>
        <p class="text-muted mb-4">Comparative analysis of all branches against global average and threshold.</p>
        
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Branches</div>
                        <div class="kpi-value" id="branchKpiTotal">--</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div class="kpi-label">Above Average</div>
                        <div class="kpi-value text-success" id="branchKpiAbove">--</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div class="kpi-label">Below Threshold</div>
                        <div class="kpi-value text-danger" id="branchKpiCritical">--</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="kpi-card">
                        <div class="kpi-label">Score Spread</div>
                        <div class="kpi-value" id="branchKpiSpread" style="font-size: 1.8rem;">--</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
             <div class="card-header-clean d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">Branch Ranking</span>
                    <small class="text-muted ms-2">Sorted by score (highest at top)</small>
                </div>
                <input type="text" class="form-control form-control-sm" style="width: 200px;" id="branchSearch" placeholder="Filter Branches..." onkeyup="filterBranches()">
             </div>
             <div class="card-body" style="padding: 16px 8px;">
                <div id="branchBarChart" style="height: 750px;"></div>
                <div class="d-flex justify-content-center gap-4 mt-2" style="font-size: 0.8rem;">
                    <span><span style="display:inline-block;width:12px;height:12px;background:#002060;border-radius:2px;margin-right:4px;"></span> Above Global Avg</span>
                    <span><span style="display:inline-block;width:12px;height:12px;background:#6c757d;border-radius:2px;margin-right:4px;"></span> Below Avg but Safe</span>
                    <span><span style="display:inline-block;width:12px;height:12px;background:#DC3545;border-radius:2px;margin-right:4px;"></span> Below Threshold (84)</span>
                    <span><span style="display:inline-block;width:12px;height:1px;border-top:2px dashed #FFD700;margin-right:4px;"></span> Global Avg</span>
                    <span><span style="display:inline-block;width:12px;height:1px;border-top:2px solid #EF4444;margin-right:4px;"></span> Threshold (84)</span>
                </div>
             </div>
        </div>
        <div class="row mt-4">
             <div class="col-12">
                 <div class="card">
                    <div class="card-header-clean">Branch Detail Table</div>
                    <div class="card-body p-0">
                         <div id="branchContainer"></div>
                    </div>
                 </div>
             </div>
        </div>
    </div>

    <!-- Store Details Tab -->
    <div id="tab-stores" style="display:none;">
        <h2 class="text-primary-custom mb-4">Store Deep Dive</h2>
        <div class="card p-3 mb-4">
            <div class="row align-items-end">
                <div class="col-md-4">
                    <label class="form-label text-muted small fw-bold">SEARCH STORE</label>
                    <input type="text" class="form-control" id="storeSearch" placeholder="Type name or code..." onkeyup="renderStoreList()">
                </div>
                <div class="col-md-3">
                     <label class="form-label text-muted small fw-bold">SORT BY</label>
                     <select id="storeSort" class="form-select" onchange="renderStoreList()">
                        <option value="name">Name (A-Z)</option>
                        <option value="score_asc">Score (Lowest First)</option>
                        <option value="score_desc">Score (Highest First)</option>
                    </select>
                </div>
                <div class="col-md-5">
                    <label class="form-label text-muted small fw-bold">SELECT STORE</label>
                    <select id="storeSelect" class="form-select" onchange="loadStoreDetail()">
                        <option value="">Select a Store...</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="storeContent" style="display:none;">
            <div class="row mb-4">
                <div class="col-md-4">
                    <div class="score-box-large h-100 d-flex flex-column justify-content-center">
                        <div class="text-uppercase" style="opacity: 0.8; font-size: 0.9rem;" id="stMeta">REGION | BRANCH</div>
                        <h2 class="mt-2 mb-1" id="stName" style="font-size: 1.5rem;">Store Name</h2>
                        <div class="display-1 fw-bold my-3" id="stScore">--</div>
                        <div class="badge bg-white text-dark px-3 py-2 rounded-pill">Latest Wave Score</div>
                    </div>
                </div>
                <div class="col-md-8">
                     <div class="card h-100 mb-0">
                         <div class="card-header-clean">Performance Trend</div>
                         <div class="card-body" style="padding: 20px 20px 10px;">
                            <div id="stTrendChart" style="height: 320px;"></div>
                         </div>
                     </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header-clean">Latest Section Analysis</div>
                        <div class="card-body p-0">
                            <table class="table table-custom table-striped m-0" id="stSectionTable">
                                <thead><tr><th>Section</th><th>Score</th><th>Status</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card h-100">
                        <div class="card-header-clean text-danger">Recommended Action Plan</div>
                        <div class="card-body">
                             <div id="stActions"></div>
                        </div>
                    </div>
                </div>
            </div>
            
             <div class="card mt-4">
                <div class="card-header-clean">Qualitative Feedback</div>
                <div class="card-body">
                    <ul id="stFeedback" class="list-group list-group-flush"></ul>
                </div>
            </div>
        </div>
    </div>

</div>

<script>
    const reportData = ${JSON.stringify(data)};
    const sortedWaves = Object.keys(reportData.summary).sort();
    const config = { responsive: true, displayModeBar: false };
    const chartLayoutBase = {
        font: { family: 'Inter, sans-serif' },
        showlegend: false,
        margin: { t: 20, r: 20, l: 40, b: 40 },
        xaxis: { gridcolor: '#F3F4F6' },
        yaxis: { gridcolor: '#F3F4F6' },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    };

    function showTab(tabName) {
        document.querySelectorAll('.main-content > div').forEach(d => d.style.display = 'none');
        document.getElementById('tab-' + tabName).style.display = 'block';
        document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
        event.target.classList.add('active');
        window.dispatchEvent(new Event('resize'));
    }

    // --- Tab 1: Executive Summary ---
    function initSummary() {
        // 1. Calculations
        const waves = sortedWaves;
        const currentWave = waves[waves.length - 1];
        const prevWave = waves.length > 1 ? waves[waves.length - 2] : null;
        
        const currentSummary = reportData.summary[currentWave];
        const currentScore = currentSummary.sum / currentSummary.count;
        const prevScore = prevWave ? (reportData.summary[prevWave].sum / reportData.summary[prevWave].count) : 0;
        
        // KPI Cards
        document.getElementById('kpi-score').textContent = currentScore.toFixed(2);
        
        const trendEl = document.getElementById('kpi-score-trend');
        const diff = currentScore - prevScore;
        if(prevWave) {
            trendEl.innerHTML = (diff >= 0 ? '▲ +' : '▼ ') + Math.abs(diff).toFixed(2) + ' vs last wave';
            trendEl.className = 'kpi-trend ' + (diff >= 0 ? 'positive' : 'negative');
        }

        document.getElementById('kpi-stores').textContent = currentSummary.count;
        
        // Best Region
        let bestReg = ''; let bestScore = -1;
        Object.keys(reportData.regions).forEach(r => {
            const rd = reportData.regions[r][currentWave];
            if(rd) {
                const s = rd.sum/rd.count;
                if(s > bestScore) { bestScore = s; bestReg = r; }
            }
        });
        document.getElementById('kpi-best-region').textContent = bestReg || 'N/A';

        // 2. Trend Chart
        // 2. Trend Chart - McKinsey Style
        const scores = waves.map(w => reportData.summary[w].sum / reportData.summary[w].count);
        
        // Dynamic Range
        const validSummaryScores = scores.filter(s => !isNaN(s));
        const sMin = validSummaryScores.length ? Math.min.apply(null, validSummaryScores) : 0;
        const sMax = validSummaryScores.length ? Math.max.apply(null, validSummaryScores) : 100;
        const sPad = Math.max(2, (sMax - sMin) * 0.3);

        // Delta Annotations
        const summaryAnnotations = [];
        for(let i = 1; i < waves.length; i++) {
            let prev = scores[i-1];
            let curr = scores[i];
            if(!isNaN(prev) && !isNaN(curr)) {
                let delta = curr - prev;
                let deltaText = (delta >= 0 ? '+' : '') + delta.toFixed(1);
                let deltaColor = delta >= 0 ? '#059669' : '#DC2626';
                let midY = (prev + curr) / 2;
                summaryAnnotations.push({
                    x: waves[i],
                    y: midY,
                    xanchor: 'center',
                    yanchor: 'bottom',
                    text: '<b>' + deltaText + '</b>',
                    showarrow: false,
                    font: { size: 10, color: deltaColor, family: 'Inter, sans-serif' },
                    bgcolor: delta >= 0 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    borderpad: 2,
                    bordercolor: deltaColor,
                    borderwidth: 1
                });
            }
        }
        // Threshold Annotation
        summaryAnnotations.push({
            xref: 'paper', yref: 'y',
            x: 1.02, y: reportData.threshold,
            xanchor: 'left', yanchor: 'middle',
            text: '<b>' + reportData.threshold + '</b>',
            showarrow: false,
            font: { size: 9, color: '#EF4444', family: 'Inter, sans-serif' }
        });

        Plotly.newPlot('summaryChart', [
            {
                x: waves, y: scores,
                type: 'scatter', mode: 'lines+markers+text',
                line: {color: '#002060', width: 3, shape: 'spline', smoothing: 1.2},
                marker: {size: 9, color: '#002060', symbol: 'circle', line: {color: '#FFFFFF', width: 2}},
                text: scores.map(s => s.toFixed(2)),
                textposition: 'top center',
                textfont: { family: 'Inter, sans-serif', size: 12, color: '#1F2937' },
                hovertemplate: '<b>%{x}</b><br>Score: %{y:.2f}<extra></extra>' 
            },
            {
                x: waves,
                y: waves.map(() => reportData.threshold),
                mode: 'lines',
                line: { color: '#EF4444', width: 1, dash: 'dot' },
                hoverinfo: 'none'
            }
        ], { 
            font: { family: 'Inter, sans-serif' },
            showlegend: false,
            margin: { t: 30, r: 40, l: 40, b: 40 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: { 
                gridcolor: 'transparent',
                linecolor: '#E5E7EB',
                linewidth: 1,
                tickfont: { size: 11, color: '#6B7280' },
                fixedrange: true
            },
            yaxis: { 
                gridcolor: '#F3F4F6', 
                autorange: false, 
                range: [Math.max(0, sMin - sPad), Math.min(105, sMax + sPad)], 
                tickformat: '.0f',
                zeroline: false,
                fixedrange: true
            },
            annotations: summaryAnnotations
        }, config);

        // 3. Section Analysis (Grid Cards instead of Chart)
        const secData = currentSummary.sections;
        const secLabels = Object.keys(secData);
        // Calculate scores and attach critical count
        const secObjs = secLabels.map(k => ({
            label: k,
            score: secData[k].sum / secData[k].count,
            critical: secData[k].critical || 0
        }));
        
        // Sort by score (lowest first to highlight issues)
        secObjs.sort((a,b) => a.score - b.score);

        const secGrid = document.getElementById('sectionAnalysisGrid');
        secGrid.innerHTML = '';
        
        secObjs.forEach(item => {
            const isCritical = item.score < reportData.threshold;
            const scoreColor = isCritical ? 'text-danger' : 'text-primary-custom';
            const cardBorder = isCritical ? 'border-danger' : 'border-light';
            const bgClass = isCritical ? 'bg-soft-danger' : 'bg-white';
            const displayScore = isNaN(item.score) ? '0.00' : item.score.toFixed(2);
            
            // Highlight critical count if significant
            const criticalBadge = item.critical > 0 
                ? `< div class="badge bg-danger rounded-pill px-3 py-2 mt-2" style = "font-weight: 500;" > ${ item.critical } Stores Critical(< 84)</div > `
                : `< div class="badge bg-light text-muted rounded-pill px-3 py-2 mt-2" style = "font-weight: 500;" > ${ item.critical } Stores Critical</div > `;

            // Shorten Label for card if needed (Regex to get letter code to emphasize it)
            const labelMatch = item.label.match(/^([A-Z]\.)\s*(.*)/);
            const shortLabel = labelMatch ? `< span class="fw-bold text-dark me-1" > ${ labelMatch[1] }</span > ${ labelMatch[2] } ` : item.label;

            const col = document.createElement('div');
            col.className = 'col-xl-2 col-lg-3 col-md-4 col-sm-6'; // Responsive grid (xl-2 = 6 per row)
            col.innerHTML = `
        < div class="card h-100 ${bgClass} ${cardBorder} shadow-sm text-center p-3" style = "transition: transform 0.2s; border-width: 1px;" >
                    <div class="display-6 fw-bold mb-2 ${scoreColor}" style="font-size: 2rem;">${displayScore}</div>
                    <div class="small text-secondary mb-auto fw-semibold" style="font-size: 0.8rem; line-height: 1.3;">${shortLabel}</div>
                    ${ criticalBadge }
                </div >
        `;
            secGrid.appendChild(col);
        });

        // 4. Action Items Counting
        let totalActions = 0;
        // Need to loop stores for this as summary doesn't hold distribution
        const stores = Object.values(reportData.stores);
        stores.forEach(s => {
            if(s.results[currentWave]) {
                Object.values(s.results[currentWave].sections).forEach(val => {
                    if(val < reportData.threshold) totalActions++;
                });
            }
        });
        document.getElementById('kpi-actions').textContent = totalActions;

        // 5. Leaderboards
        // 5. Store Leaderboards & Hierarchy Stats
        const storeList = [];
        const regionIssues = {};
        const branchIssues = {};

        stores.forEach(s => {
            if(s.results[currentWave]) {
                const score = s.results[currentWave].totalScore;
                storeList.push({ name: s.meta.name, score: score });

                // Count issues (< 84)
                let issues = 0;
                Object.values(s.results[currentWave].sections).forEach(v => {
                    if(v < 84) issues++;
                });

                // Aggregate Issues
                if(s.meta.region) {
                    regionIssues[s.meta.region] = (regionIssues[s.meta.region] || 0) + issues;
                }
                if(s.meta.branch) {
                    branchIssues[s.meta.branch] = (branchIssues[s.meta.branch] || 0) + issues;
                }
            }
        });
        
        // Precise sorting (float comparison)
        storeList.sort((a,b) => b.score - a.score);

        const renderTable = (list, containerId, isTop) => {
            const tbody = document.getElementById(containerId);
            tbody.innerHTML = '';
            list.forEach((item, idx) => {
                const globalRank = isTop ? idx + 1 : storeList.length - idx;
                const tr = document.createElement('tr');
                tr.innerHTML = \`<td style="padding-left: 20px;"><span class="rank-badge rank-top-\${isTop ? (idx+1) : 'none'}">\${globalRank}</span></td>
                                <td>\${item.name}</td>
                                <td class="text-end fw-bold" style="padding-right: 20px;">\${item.score.toFixed(2)}</td>\`;
                tbody.appendChild(tr);
            });
        };

        renderTable(storeList.slice(0, 5), 'topStoresList', true);
        renderTable(storeList.slice(-5).reverse(), 'bottomStoresList', false);

        // 6. Hierarchy Rankings
        const getHierarchyList = (sourceObj, issuesMap) => {
            return Object.keys(sourceObj).map(k => {
                const d = sourceObj[k][currentWave];
                return {
                    name: k,
                    score: d ? d.sum / d.count : 0,
                    issues: issuesMap[k] || 0
                };
            }).sort((a,b) => b.score - a.score);
        };

        const regionList = getHierarchyList(reportData.regions, regionIssues);
        const branchList = getHierarchyList(reportData.branches, branchIssues);

        const renderHierarchyTable = (list, containerId) => {
            const tbody = document.getElementById(containerId);
            tbody.innerHTML = '';
            list.forEach((item, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = \`<td style="padding-left: 20px;"><span class="rank-badge rank-top-\${idx < 3 ? (idx+1) : 'none'}">\${idx+1}</span></td>
                                <td>\${item.name}</td>
                                <td class="text-center"><span class="badge bg-danger">\${item.issues}</span></td>
                                <td class="text-end fw-bold" style="padding-right: 20px;">\${item.score.toFixed(2)}</td>\`;
                tbody.appendChild(tr);
            });
        };
        
        renderHierarchyTable(regionList, 'regionRankList'); 
        renderHierarchyTable(branchList.slice(0, 5), 'branchRankList');
    }

    // --- Tab 2: Regional ---
    function initRegions() {
         const regions = Object.keys(reportData.regions).sort();
         const waves = sortedWaves;
         const currentWave = waves[waves.length - 1];
         const prevWave = waves.length > 1 ? waves[waves.length - 2] : null;

         // 1. Heatmap Data
         const zData = regions.map(r => {
             return waves.map(w => {
                 const d = reportData.regions[r][w];
                 return d ? d.sum / d.count : null;
             });
         });
         
         Plotly.newPlot('regionHeatmap', [{
             z: zData,
             x: waves,
             y: regions,
             type: 'heatmap',
             colorscale: 'Blues',
             showscale: true,
             hovertemplate: 'Region: %{y}<br>Wave: %{x}<br>Score: %{z:.2f}<extra></extra>'
         }], { 
            font: { family: 'Inter, sans-serif' },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: {l: 150, t: 30, b: 30},
            xaxis: { gridcolor: '#F3F4F6' },
            yaxis: { gridcolor: '#F3F4F6' }
         }, config)
         .then(gd => {
            gd.on('plotly_click', function(data){
                const point = data.points[0];
                const regionName = point.y;
                const el = document.getElementById('region-' + regionName.replace(/\s+/g, '-'));
                if(el) {
                    el.scrollIntoView({behavior: 'smooth', block: 'center'});
                    el.classList.add('shadow-lg'); // Highlight briefly
                    setTimeout(() => el.classList.remove('shadow-lg'), 2000);
                }
            });
         });
         
         // 2. Regional Insights Cards (Action Plans)
         const cardContainer = document.getElementById('regionDetailCards');
         cardContainer.innerHTML = '';
         
         // Prepare data
         const regionStats = regions.map(r => {
             const d = reportData.regions[r][currentWave];
             if(!d) return null;
             const score = d.sum / d.count;
             
             // Trend
             let trendHtml = '<span class="text-muted">-</span>';
             if(prevWave && reportData.regions[r][prevWave]) {
                  const pData = reportData.regions[r][prevWave];
                  const pScore = pData.sum / pData.count;
                  const diff = score - pScore;
                  const color = diff >= 0 ? 'text-success' : 'text-danger';
                  const arrow = diff >= 0 ? '▲' : '▼';
                  trendHtml = \`<span class="\${color} small fw-bold">\${arrow} \${Math.abs(diff).toFixed(2)}</span>\`;
             }
             
             // Weaknesses
             const weaknesses = [];
             Object.entries(d.sections).forEach(([sec, val]) => {
                  const sScore = val.sum / val.count;
                  if(sScore < reportData.threshold) {
                      weaknesses.push({ sec, score: sScore });
                  }
             });
             weaknesses.sort((a,b) => a.score - b.score);
             
             return { r, score, trendHtml, weaknesses };
         }).filter(x => x);
         
         // Sort by Score Descending
         regionStats.sort((a,b) => b.score - a.score);
         
         // Render
         regionStats.forEach(stat => {
             const col = document.createElement('div');
             col.className = 'col-md-6 col-lg-4';
             col.id = 'region-' + stat.r.replace(/\s+/g, '-');
             
             let actionList = '';
             if(stat.weaknesses.length === 0) {
                 actionList = '<li class="list-group-item text-success"><small>Performing well in all sections!</small></li>';
             } else {
                 stat.weaknesses.slice(0, 3).forEach(w => {
                      const plan = reportData.actionPlanConfig[w.sec] || "Review operational standards.";
                      actionList += \`<li class="list-group-item d-flex justify-content-between align-items-center">
                        <div style="line-height: 1.2;">
                            <strong style="font-size: 0.75rem; display: block;">\${w.sec}</strong>
                            <small class="text-muted" style="font-size: 0.7rem;">\${plan}</small>
                        </div>
                        <span class="badge bg-danger rounded-pill">\${w.score.toFixed(2)}</span>
                      </li>\`;
                 });
             }
             
             col.innerHTML = \`
                <div class="card h-100 shadow-sm" style="border-top: 4px solid var(--primary); transition: all 0.3s ease;">
                    <div class="card-body">
                         <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title text-primary-custom mb-0">\${stat.r}</h5>
                            \${stat.trendHtml}
                        </div>
                        <div class="mb-3">
                            <span class="display-6 fw-bold text-dark">\${stat.score.toFixed(2)}</span>
                            <span class="text-muted small ms-1">Avg Score</span>
                        </div>
                        <h6 class="text-uppercase text-muted small fw-bold border-bottom pb-1 mb-2">Priority Actions</h6>
                        <ul class="list-group list-group-flush section-list">
                            \${actionList}
                        </ul>
                    </div>
                </div>
             \`;
             cardContainer.appendChild(col);
         });
    }

    // --- Tab 3: Branches ---
    function initBranches() {
        var branches = Object.keys(reportData.branches).sort();
        var currentWave = sortedWaves[sortedWaves.length - 1];
        
        var branchScores = [];
        var branchNames = [];
        
        branches.forEach(function(br) {
             var d = reportData.branches[br][currentWave];
             if(d) {
                 branchNames.push(br);
                 branchScores.push(d.sum / d.count);
             }
        });

        var globalAvg = reportData.summary[currentWave].sum / reportData.summary[currentWave].count;
        
        // Sort Ascending (Plotly draws index 0 at bottom => highest at top)
        var zipped = branchNames.map(function(n, i) { return {n: n, s: branchScores[i]}; });
        zipped.sort(function(a,b) { return a.s - b.s; }); 

        // Dynamic range: find min/max, pad by 3 points
        var allScores = zipped.map(function(z){return z.s;});
        var dataMin = Math.min.apply(null, allScores);
        var dataMax = Math.max.apply(null, allScores);
        var rangeMin = Math.floor(dataMin - 3);
        var rangeMax = Math.ceil(dataMax + 4);
        if(rangeMin < 0) rangeMin = 0;

        // 3-tier colors
        var colors = zipped.map(function(z) {
            if (z.s >= globalAvg) return '#1B3A5C';
            if (z.s >= 84) return '#4A7FB5';
            return '#DC3545';
        });

        // KPI Cards
        var aboveAvg = zipped.filter(function(z){return z.s >= globalAvg;}).length;
        var belowThreshold = zipped.filter(function(z){return z.s < 84;}).length;
        document.getElementById('branchKpiTotal').textContent = zipped.length;
        document.getElementById('branchKpiAbove').textContent = aboveAvg;
        document.getElementById('branchKpiCritical').textContent = belowThreshold;
        document.getElementById('branchKpiSpread').textContent = (dataMax - dataMin).toFixed(2) + ' pts';

        Plotly.newPlot('branchBarChart', [{
            y: zipped.map(function(z){return z.n;}),
            x: zipped.map(function(z){return z.s;}),
            type: 'bar',
            orientation: 'h',
            marker: { 
                color: colors, 
                opacity: 0.92,
                line: { color: 'rgba(0,0,0,0.05)', width: 1 }
            },
            text: zipped.map(function(z){return z.s.toFixed(2);}),
            textposition: 'outside',
            textfont: { size: 11, color: '#374151', family: 'Inter, sans-serif' },
            hovertemplate: '<b>%{y}</b><br>Score: %{x:.2f}<br>Global Avg: ' + globalAvg.toFixed(2) + '<extra></extra>',
            cliponaxis: false
        }], { 
            font: { family: 'Inter, sans-serif', size: 12 },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            margin: {l: 160, r: 70, t: 10, b: 40},
            bargap: 0.35,
            xaxis: { 
                gridcolor: '#E5E7EB',
                gridwidth: 1,
                zeroline: false,
                autorange: false, 
                range: [rangeMin, rangeMax],
                tickformat: '.0f',
                dtick: 2,
                tickfont: { size: 11, color: '#6B7280' },
                title: { text: 'Score', font: { size: 11, color: '#9CA3AF' }, standoff: 10 }
            },
            yaxis: { 
                gridcolor: 'transparent',
                autorange: true,
                tickfont: { size: 11, color: '#374151' },
                automargin: true
            },
            shapes: [
                {
                    type: 'line',
                    x0: globalAvg, x1: globalAvg,
                    y0: -0.5, y1: zipped.length - 0.5,
                    line: { color: '#F59E0B', width: 2, dash: 'dash' }
                },
                {
                    type: 'line',
                    x0: 84, x1: 84,
                    y0: -0.5, y1: zipped.length - 0.5,
                    line: { color: '#EF4444', width: 1.5, dash: 'dot' }
                }
            ],
            annotations: [
                {
                    x: globalAvg, y: zipped.length - 0.3,
                    text: 'Avg ' + globalAvg.toFixed(1),
                    showarrow: false,
                    font: { size: 10, color: '#F59E0B', family: 'Inter' },
                    xanchor: 'left', xshift: 4
                },
                {
                    x: 84, y: zipped.length - 0.3,
                    text: 'Threshold',
                    showarrow: false,
                    font: { size: 10, color: '#EF4444', family: 'Inter' },
                    xanchor: 'right', xshift: -4
                }
            ]
        }, config)
        .then(function(gd) {
            gd.on('plotly_click', function(data){
                var point = data.points[0];
                var branchName = point.y;
                document.getElementById('branchSearch').value = branchName;
                filterBranches(); 
            });
        });
        
        // Table: Descending (Best First)
        renderBranchTable(zipped.slice().reverse(), currentWave);
    }

    function renderBranchTable(zippedData, wave) {
        var container = document.getElementById('branchContainer');
        var globalAvg = reportData.summary[wave].sum / reportData.summary[wave].count;
        var allScores = zippedData.map(function(z){return z.s;});
        var maxScore = Math.max.apply(null, allScores);
        var minScore = Math.min.apply(null, allScores);
        var range = maxScore - minScore;
        
        var html = '<table class="table table-custom table-hover align-middle m-0">';
        html += '<thead><tr>';
        html += '<th style="padding-left:20px; width: 5%;">#</th>';
        html += '<th style="width: 25%;">Branch</th>';
        html += '<th style="width: 30%;">Score</th>';
        html += '<th style="width: 15%;">Status</th>';
        html += '<th style="width: 25%;">vs Global Avg (' + globalAvg.toFixed(2) + ')</th>';
        html += '</tr></thead><tbody>';
        
        zippedData.forEach(function(z, idx) {
             var diff = z.s - globalAvg;
             var diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
             var isHigh = diff >= 0;
             var diffClass = isHigh ? 'text-success' : 'text-danger';
             var icon = isHigh ? '\u25b2' : '\u25bc';
             
             var pct = range > 0 ? ((z.s - minScore) / range) * 100 : 50;
             var barColor = z.s >= globalAvg ? '#1B3A5C' : (z.s >= 84 ? '#4A7FB5' : '#DC3545');
             
             var rankClass = '';
             if(idx === 0) rankClass = 'rank-top-1';
             else if(idx === 1) rankClass = 'rank-top-2';
             else if(idx === 2) rankClass = 'rank-top-3';
             
             html += '<tr data-branch="' + z.n.toLowerCase() + '" style="cursor:pointer;">';
             html += '<td style="padding-left:20px;"><span class="rank-badge ' + rankClass + '">' + (idx+1) + '</span></td>';
             html += '<td><span class="fw-bold">' + z.n + '</span></td>';
             html += '<td>';
             html += '<div class="d-flex align-items-center gap-2">';
             html += '<span class="fw-bold" style="min-width: 50px;">' + z.s.toFixed(2) + '</span>';
             html += '<div style="flex:1; height:8px; background:#E5E7EB; border-radius:4px; overflow:hidden;">';
             html += '<div style="width:' + pct + '%; height:100%; background:' + barColor + '; border-radius:4px; transition: width 0.5s ease;"></div>';
             html += '</div>';
             html += '</div>';
             html += '</td>';
             html += '<td><span class="badge ' + (z.s >= 84 ? 'bg-success' : 'bg-danger') + '" style="font-size:0.75rem;">' + (z.s >= 84 ? '\u2713 Safe' : '\u2717 Critical') + '</span></td>';
             html += '<td class="' + diffClass + ' fw-bold">' + icon + ' ' + diffStr + '</td>';
             html += '</tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    function filterBranches() {
        var term = document.getElementById('branchSearch').value.toLowerCase();
        var rows = document.querySelectorAll('#branchContainer tr[data-branch]');
        
        rows.forEach(function(row) {
            var branch = row.getAttribute('data-branch');
            if(branch.indexOf(term) !== -1) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }


    // --- Tab 4: Stores (Logic reused and styled) ---
    function renderStoreList() {
        const select = document.getElementById('storeSelect');
        const sortType = document.getElementById('storeSort').value;
        const searchTerm = document.getElementById('storeSearch').value.toLowerCase();
        
        select.innerHTML = '<option value="">Select a Store...</option>';
        let stores = Object.values(reportData.stores);

        if (searchTerm) {
            stores = stores.filter(s => s.meta.name.toLowerCase().includes(searchTerm) || s.meta.code.includes(searchTerm));
        }

        stores.sort((a, b) => {
            if (sortType === 'name') return a.meta.name.localeCompare(b.meta.name);
            const getScore = (s) => {
                const w = Object.keys(s.results).sort();
                return w.length ? s.results[w[w.length-1]].totalScore : 0;
            };
            return sortType === 'score_asc' ? getScore(a) - getScore(b) : getScore(b) - getScore(a);
        });

        stores.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.meta.code;
            const w = Object.keys(s.results).sort();
            const latestScore = w.length ? s.results[w[w.length-1]].totalScore.toFixed(2) : 'N/A';
            opt.textContent = \`[\${latestScore}] \${s.meta.code} - \${s.meta.name}\`;
            select.appendChild(opt);
        });
    }

    function loadStoreDetail() {
        const code = document.getElementById('storeSelect').value;
        if(!code) return;
        
        const store = reportData.stores[code];
        document.getElementById('storeContent').style.display = 'block';
        document.getElementById('stName').textContent = store.meta.name;
        document.getElementById('stMeta').textContent = \`\${store.meta.region} | \${store.meta.branch}\`;

        const waves = Object.keys(store.results).sort();
        const latestWave = waves[waves.length - 1];
        const latestRes = store.results[latestWave];

        document.getElementById('stScore').textContent = latestRes.totalScore.toFixed(2);

        // Trend - USE GLOBAL SORTED WAVES
        const yVals = sortedWaves.map(w => store.results[w] ? store.results[w].totalScore : null);
        
        // Calculate dynamic range for better visualization
        const validScores = yVals.filter(v => v !== null);
        const trendMin = validScores.length ? Math.min.apply(null, validScores) : 0;
        const trendMax = validScores.length ? Math.max.apply(null, validScores) : 100;
        const yPad = Math.max(5, (trendMax - trendMin) * 0.3);

        // Build delta annotations between consecutive waves
        const deltaAnnotations = [];
        for(var i = 1; i < sortedWaves.length; i++) {
            var prev = store.results[sortedWaves[i-1]] ? store.results[sortedWaves[i-1]].totalScore : null;
            var curr = store.results[sortedWaves[i]] ? store.results[sortedWaves[i]].totalScore : null;
            if(prev !== null && curr !== null) {
                var delta = curr - prev;
                var deltaText = (delta >= 0 ? '+' : '') + delta.toFixed(1);
                var deltaColor = delta >= 0 ? '#059669' : '#DC2626';
                var midY = (prev + curr) / 2;
                deltaAnnotations.push({
                    x: sortedWaves[i],
                    y: midY,
                    xanchor: 'center',
                    yanchor: 'bottom',
                    text: '<b>' + deltaText + '</b>',
                    showarrow: false,
                    font: { size: 10, color: deltaColor, family: 'Inter, sans-serif' },
                    bgcolor: delta >= 0 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                    borderpad: 3,
                    bordercolor: delta >= 0 ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)',
                    borderwidth: 1
                });
            }
        }

        // Threshold annotation
        deltaAnnotations.push({
            xref: 'paper', yref: 'y',
            x: 1.02, y: reportData.threshold,
            xanchor: 'left', yanchor: 'middle',
            text: '<b>' + reportData.threshold + '</b>',
            showarrow: false,
            font: { size: 9, color: '#EF4444', family: 'Inter, sans-serif' }
        });

        Plotly.newPlot('stTrendChart', [
            // Main performance line
            {
                x: sortedWaves, 
                y: yVals, 
                type: 'scatter', 
                mode: 'lines+markers+text',
                connectgaps: true,
                line: {color: '#002060', width: 3, shape: 'spline', smoothing: 1.2}, 
                marker: {color: '#002060', size: 9, symbol: 'circle',
                    line: {color: '#FFFFFF', width: 2}},
                text: yVals.map(v => v !== null ? v.toFixed(2) : ''),
                textposition: 'top center',
                textfont: { family: 'Inter, sans-serif', size: 13, color: '#1F2937' },
                hovertemplate: '<b>%{x}</b><br>Score: %{y:.2f}<extra></extra>'
            },
            // Threshold reference line
            {
                x: sortedWaves,
                y: sortedWaves.map(() => reportData.threshold),
                mode: 'lines',
                line: { color: '#EF4444', width: 1, dash: 'dot' },
                hoverinfo: 'none'
            }
        ], { 
            font: { family: 'Inter, sans-serif', size: 12 },
            showlegend: false,
            margin: { t: 35, r: 40, l: 45, b: 50 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            xaxis: { 
                gridcolor: 'transparent',
                linecolor: '#E5E7EB',
                linewidth: 1,
                tickfont: { size: 11, color: '#6B7280' },
                tickangle: 0,
                automargin: true,
                fixedrange: true
            },
            yaxis: { 
                gridcolor: '#F3F4F6',
                gridwidth: 1,
                zeroline: false,
                autorange: false, 
                range: [Math.max(0, trendMin - yPad), Math.min(105, trendMax + yPad)], 
                tickformat: '.0f',
                tickfont: { size: 11, color: '#9CA3AF' },
                fixedrange: true
            },
            annotations: deltaAnnotations
        }, config);

        // Sections
        const tbody = document.querySelector('#stSectionTable tbody');
        tbody.innerHTML = '';
        const actionsDiv = document.getElementById('stActions');
        actionsDiv.innerHTML = '';
        const actions = [];

        Object.entries(latestRes.sections).forEach(([sec, val]) => {
            const tr = document.createElement('tr');
            let icon = val >= 85 ? '✅' : '⚠️';
            let cls = val < 84 ? 'text-danger fw-bold' : '';
            tr.innerHTML = \`<td>\${sec}</td><td class="\${cls}">\${val.toFixed(2)}</td><td>\${icon}</td>\`;
            tbody.appendChild(tr);

            if (val < reportData.threshold) {
                const plan = reportData.actionPlanConfig[sec] || "Focus on retraining stats.";
                actions.push(\`<div class="action-plan-item"><strong>\${sec} (\${val.toFixed(2)})</strong><p class="m-0 text-muted small">\${plan}</p></div>\`);
            }
        });

        if(actions.length === 0) actionsDiv.innerHTML = '<div class="alert alert-success">No critical actions. Store is performing well!</div>';
        else actionsDiv.innerHTML = actions.join('');

        // Feedback
        const fbList = document.getElementById('stFeedback');
        fbList.innerHTML = '';
        if(latestRes.qualitative.length === 0) {
             fbList.innerHTML = '<li class="list-group-item text-muted fst-italic">No feedback captured.</li>';
        } else {
             latestRes.qualitative.forEach(q => {
                 const li = document.createElement('li');
                 li.className = 'list-group-item';
                 li.textContent = q;
                 fbList.appendChild(li);
             });
        }
    }

    // Init
    initSummary();
    initRegions();
    initBranches();
    renderStoreList();

</script>
</body>
</html>
    `;
}

processAll();
