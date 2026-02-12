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

        // Extract Official KPI Score
        // Target specific column: (760869) KPI (using includes for partial match safety)
        const kpiKey = Object.keys(record).find(k => k.includes('(760869) KPI'));
        let officialScore = null;

        if (kpiKey && record[kpiKey]) {
            let rawVal = record[kpiKey];
            // Handle "4.2" or "4,2"
            let val = parseFloat(rawVal.replace(',', '.'));

            if (!isNaN(val) && val > 0) {
                // Heuristic: If score is small (<= 5), assume it's on 5-point scale and convert to 100
                if (val <= 5) {
                    val = val * 20;
                }
                officialScore = val;
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
        // If official KPI exists, use it. Otherwise calculate average of sections.
        if (officialScore !== null && !isNaN(officialScore)) {
            storeData.totalScore = officialScore;
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
                if (!levelObj[waveKey].sections[secName]) levelObj[waveKey].sections[secName] = { sum: 0, count: 0 };
                levelObj[waveKey].sections[secName].sum += val;
                levelObj[waveKey].sections[secName].count++;
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
    await fs.writeFile('report_v2.html', htmlContent);
    console.log('Dashboard generated: report_v2.html');
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
            padding-top: 30px; 
            background-color: var(--primary); 
            color: white; 
            width: 260px; 
            z-index: 1000;
            box-shadow: 4px 0 10px rgba(0,0,0,0.1);
        }
        .main-content { margin-left: 260px; padding: 40px; }

        /* Typography */
        h1, h2, h3, h4, h5 { font-weight: 700; letter-spacing: -0.02em; }
        .text-primary-custom { color: var(--primary); }

        /* Sidebar Links */
        .sidebar-brand { padding: 0 25px 30px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; }
        .sidebar a { 
            color: rgba(255,255,255,0.7); 
            padding: 12px 25px; 
            text-decoration: none; 
            display: flex; 
            align-items: center; 
            font-weight: 500;
            transition: all 0.2s;
            border-left: 4px solid transparent;
        }
        .sidebar a:hover { color: white; background-color: rgba(255,255,255,0.05); }
        .sidebar a.active { 
            color: white; 
            background-color: rgba(255,255,255,0.1); 
            border-left-color: var(--secondary);
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
        <h4 class="m-0">MORRIGAN</h4>
        <small style="opacity: 0.6; letter-spacing: 1px;">ANALYTICS</small>
    </div>
    <a href="#" onclick="showTab('summary')" class="active">
        <span>📊 Executive Summary</span>
    </a>
    <a href="#" onclick="showTab('regions')">
        <span>🌍 Regional Analysis</span>
    </a>
    <a href="#" onclick="showTab('branches')">
        <span>🏢 Branch Performance</span>
    </a>
    <a href="#" onclick="showTab('stores')">
        <span>🏪 Store Deep Dive</span>
    </a>
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

        <!-- Charts Row 1 -->
        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-header-clean">Historical Performance Trend</div>
                    <div class="card-body">
                        <div id="summaryChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-header-clean">Section Strengths & Weaknesses</div>
                    <div class="card-body">
                         <div id="sectionBarChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Leaderboard Row -->
        <div class="row">
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
        <h2 class="text-primary-custom mb-4">Branch Performance</h2>
        <div class="card">
             <div class="card-header-clean d-flex justify-content-between align-items-center">
                <span>Branch Performance Overview</span>
                <input type="text" class="form-control form-control-sm" style="width: 200px;" id="branchSearch" placeholder="Filter Branches..." onkeyup="filterBranches()">
             </div>
             <div class="card-body">
                <div id="branchBarChart" style="height: 500px;"></div>
             </div>
        </div>
        <div class="row mt-4">
             <div class="col-12">
                 <div class="card">
                    <div class="card-header-clean">Branch Data Table</div>
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
                         <div class="card-body">
                            <div id="stTrendChart" style="height: 250px;"></div>
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
        const scores = waves.map(w => reportData.summary[w].sum / reportData.summary[w].count);
        Plotly.newPlot('summaryChart', [{
            x: waves, y: scores,
            type: 'scatter', mode: 'lines+markers',
            line: {color: '#002060', width: 4, shape: 'spline'},
            marker: {size: 8, color: '#4472C4'},
            hovertemplate: 'Score: %{y:.2f}<extra></extra>' 
        }], { ...chartLayoutBase, yaxis: { ...chartLayoutBase.yaxis, range: [60, 105], tickformat: '.2f' } }, config);

        // 3. Section Performance (Horizontal Bar)
        const secData = currentSummary.sections;
        const secLabels = Object.keys(secData);
        const secScores = secLabels.map(k => secData[k].sum / secData[k].count);
        
        // Sort for chart
        const zipped = secLabels.map((l, i) => ({l, s: secScores[i]}));
        zipped.sort((a,b) => a.s - b.s); // Ascending for horizontal bar

        Plotly.newPlot('sectionBarChart', [{
            y: zipped.map(z => z.l), // Full labels
            x: zipped.map(z => z.s),
            type: 'bar', orientation: 'h',
            marker: { color: zipped.map(z => z.s < 84 ? '#EF4444' : '#002060') },
            text: zipped.map(z => z.s.toFixed(2)),
            textposition: 'auto',
            hovertemplate: '%{y}<br>Score: %{x:.2f}<extra></extra>'
        }], { 
            ...chartLayoutBase, 
            margin: {l: 380, t: 20, r:20, b:30}, // Increased margin to prevent clipping
            xaxis: { ...chartLayoutBase.xaxis, tickformat: '.2f' }
        }, config);

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
        const storeList = [];
        stores.forEach(s => {
            if(s.results[currentWave]) {
                storeList.push({ name: s.meta.name, score: s.results[currentWave].totalScore });
            }
        });
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
         }], { ...chartLayoutBase, margin: {l: 150, t: 30, b: 30} }, config)
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
    // --- Tab 3: Branches ---
    function initBranches() {
        const branches = Object.keys(reportData.branches).sort();
        const currentWave = sortedWaves[sortedWaves.length - 1];
        
        const branchScores = [];
        const branchNames = [];
        
        branches.forEach(br => {
             const d = reportData.branches[br][currentWave];
             if(d) {
                 branchNames.push(br);
                 branchScores.push(d.sum / d.count);
             }
        });

        // Global Average for Benchmark
        const globalAvg = reportData.summary[currentWave].sum / reportData.summary[currentWave].count;
        
        // Sort for Horizontal Chart (Highest at Top means Lowest index in Plotly usually, but let's sort Ascending so Plotly draws bottom-up? Wait, Plotly bars: index 0 at bottom. So to have Best at Top, we need Best at index N-1? No, we want descending visual. 
        // Let's sort Ascending (Lowest -> Highest). Plotly draws index 0 at bottom. So Highest will be at top.
        const zipped = branchNames.map((n, i) => ({n, s: branchScores[i]}));
        zipped.sort((a,b) => a.s - b.s); 

        // Colors based on benchmark
        const colors = zipped.map(z => z.s >= globalAvg ? '#002060' : (z.s >= 84 ? '#6c757d' : '#DC3545'));

        Plotly.newPlot('branchBarChart', [{
            y: zipped.map(z => z.n),
            x: zipped.map(z => z.s),
            type: 'bar',
            orientation: 'h',
            marker: { color: colors, opacity: 0.9, line: {width: 0} },
            text: zipped.map(z => z.s.toFixed(2)),
            textposition: 'auto',
            hovertemplate: 'Branch: %{y}<br>Score: %{x:.2f}<extra></extra>'
        }], { 
            ...chartLayoutBase, 
            title: { 
                text: 'Branch Performance vs Global Avg (' + globalAvg.toFixed(2) + ')',
                font: { size: 14, color: '#6c757d' },
                x: 0, xanchor: 'left'
            },
            margin: {l: 220, r: 20, t: 40, b: 30}, // Large left margin for names
            xaxis: { ...chartLayoutBase.xaxis, tickformat: '.2f', range: [45, 100] }, // Fix range to highlight diffs
            shapes: [{
                type: 'line',
                x0: globalAvg, x1: globalAvg,
                y0: -0.5, y1: zipped.length - 0.5,
                line: { color: '#FFD700', width: 2, dash: 'dot' }
            }]
        }, config)
        .then(gd => {
            gd.on('plotly_click', function(data){
                const point = data.points[0];
                const branchName = point.y; // Y-axis has names now
                document.getElementById('branchSearch').value = branchName;
                filterBranches(); 
            });
        });
        
        // Render Initial Table
        // For table, we want Descending (Best First)
        renderBranchTable([...zipped].reverse(), currentWave);
    }

    function renderBranchTable(zippedData, wave) {
        const container = document.getElementById('branchContainer');
        const globalAvg = reportData.summary[wave].sum / reportData.summary[wave].count;
        
        let html = '<table class="table table-custom table-hover align-middle m-0"><thead><tr><th style="padding-left:20px;">Branch</th><th>Latest Score</th><th>Status</th><th>Vs Global Avg</th></tr></thead><tbody>';
        
        zippedData.forEach(z => {
             const diff = z.s - globalAvg;
             const diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(2);
             const isHigh = diff >= 0;
             const diffClass = isHigh ? 'text-success' : 'text-danger';
             const icon = isHigh ? '▲' : '▼';
             
             // Data Bar visualization in table
             // Scale bar relative to range (say 70-100) -> 30 pts range
             const pct = Math.max(0, Math.min(100, (z.s - 60) * 2.5)); // rough scaling
             const barColor = z.s >= 84 ? 'var(--primary)' : 'var(--danger)';
             
             html += \`<tr data-branch="\${z.n.toLowerCase()}" style="cursor: pointer;" onclick="document.getElementById('branchSearch').value='\${z.n}'; filterBranches();">
                <td style="padding-left:20px;">
                    <span class="fw-bold">\${z.n}</span>
                    <div style="height: 4px; width: 100%; background: #e9ecef; margin-top: 4px; border-radius: 2px;">
                        <div style="width: \${pct}%; height: 100%; background: \${barColor}; border-radius: 2px;"></div>
                    </div>
                </td>
                <td class="fw-bold" style="font-size: 1.1em;">\${z.s.toFixed(2)}</td>
                <td><span class="badge \${z.s >= 84 ? 'bg-success' : 'bg-danger'}">\${z.s >= 84 ? 'Safe' : 'Critical'}</span></td>
                <td class="\${diffClass} fw-bold">\${icon} \${diffStr}</td>
             </tr>\`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    function filterBranches() {
        const term = document.getElementById('branchSearch').value.toLowerCase();
        const rows = document.querySelectorAll('#branchContainer tr[data-branch]');
        
        rows.forEach(row => {
            const branch = row.getAttribute('data-branch');
            if(branch.includes(term)) {
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
        
        Plotly.newPlot('stTrendChart', [{
            x: sortedWaves, 
            y: yVals, 
            type: 'scatter', 
            mode: 'lines+markers',
            connectgaps: true,
            line: {color: '#002060', width: 3}, marker: {color: '#4472C4', size: 8},
            fill: 'tozeroy', fillcolor: 'rgba(68, 114, 196, 0.1)',
            hovertemplate: 'Wave: %{x}<br>Score: %{y:.2f}<extra></extra>'
        }], { ...chartLayoutBase, yaxis: { ...chartLayoutBase.yaxis, range: [50, 105], tickformat: '.2f' } }, config);

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
