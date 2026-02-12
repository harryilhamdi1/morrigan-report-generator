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

const THRESHOLD_SCORE = 84;

function normalizeString(str) {
    if (!str) return 'UNKNOWN';
    return str.trim().toUpperCase();
}

async function loadMasterData(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true });
        const masterMap = {};
        records.forEach(r => {
            if (r['Site Code']) {
                masterMap[r['Site Code']] = {
                    region: normalizeString(r['Region']),
                    branch: normalizeString(r['Branch']),
                    siteName: r['Site Name'],
                    city: r['City']
                };
            }
        });
        return masterMap;
    } catch (err) {
        console.warn("Warning: Could not load Master Data.");
        return {};
    }
}

async function processWave(filePath, waveName, year, masterMap) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, relax_column_count: true, trim: true, bom: true });

    const storeResults = [];
    records.forEach(record => {
        const siteCode = record['Site Code'];
        if (!siteCode) return;

        let masterInfo = masterMap[siteCode];
        if (!masterInfo) {
            masterInfo = {
                region: normalizeString(record['Regional']),
                branch: normalizeString(record['Branch']),
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

        if (storeData.region === 'CLOSED' || storeData.branch === 'CLOSED') return;

        const generalFeedbackKey = Object.keys(record).find(k => k.includes('(759291)'));
        if (generalFeedbackKey && record[generalFeedbackKey]) storeData.qualitative.push(record[generalFeedbackKey]);

        const finalScoreKey = Object.keys(record).find(k => k === 'Final Score' || k.trim() === 'Final Score');
        let finalScore = null;
        if (finalScoreKey && record[finalScoreKey]) {
            let rawVal = record[finalScoreKey];
            let val = parseFloat(rawVal.replace(',', '.'));
            if (!isNaN(val) && val > 0) finalScore = val;
        }

        const targetSections = [
            'A. Tampilan Tampak Depan Outlet', 'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
            'C. Suasana & Kenyamanan Outlet', 'D. Penampilan Retail Assistant',
            'E. Pelayanan Penjualan & Pengetahuan Produk', 'F. Pengalaman Mencoba Produk',
            'G. Rekomendasi untuk Membeli Produk', 'H. Pembelian Produk & Pembayaran di Kasir',
            'I. Penampilan Kasir', 'J. Toilet (Khusus Store yang memiliki toilet )',
            'K. Salam Perpisahan oleh Retail Asisstant'
        ];

        targetSections.forEach(fullSecName => {
            const key = Object.keys(record).find(k => k.includes(fullSecName) && !k.endsWith('- Text'));
            if (key) {
                let rawVal = record[key];
                let score = 0;
                if (typeof rawVal === 'string') {
                    if (rawVal.includes('(')) {
                        const match = rawVal.match(/\((\d+(\.\d+)?)\)/);
                        score = match ? parseFloat(match[1]) : 0;
                    } else {
                        score = parseFloat(rawVal.replace(',', '.'));
                    }
                } else score = rawVal;

                if (!isNaN(score) && score <= 5 && score > 0) score = score * 20;
                if (!isNaN(score)) storeData.sections[fullSecName] = score;
            }
        });

        if (finalScore !== null) storeData.totalScore = finalScore;
        else {
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
        } catch (err) { console.error(`Error processing ${wave.file}:`, err.message); }
    }

    const hierarchy = { all: {}, regions: {}, branches: {}, stores: {} };

    allStoreData.forEach(entry => {
        const waveKey = `${entry.year} ${entry.wave}`;
        if (!hierarchy.stores[entry.siteCode]) {
            hierarchy.stores[entry.siteCode] = {
                meta: { name: entry.siteName, region: entry.region, branch: entry.branch, code: entry.siteCode },
                results: {}
            };
        }
        hierarchy.stores[entry.siteCode].results[waveKey] = {
            sections: entry.sections, qualitative: entry.qualitative, totalScore: entry.totalScore
        };

        const addToHierarchy = (levelObj, record) => {
            if (!levelObj[waveKey]) levelObj[waveKey] = { sum: 0, count: 0, sections: {} };
            levelObj[waveKey].sum += record.totalScore;
            levelObj[waveKey].count++;
            Object.entries(record.sections).forEach(([secName, val]) => {
                if (!levelObj[waveKey].sections[secName]) levelObj[waveKey].sections[secName] = { sum: 0, count: 0, critical: 0 };
                levelObj[waveKey].sections[secName].sum += val;
                levelObj[waveKey].sections[secName].count++;
                if (val < 84) levelObj[waveKey].sections[secName].critical++;
            });
        };

        addToHierarchy(hierarchy.all, entry);
        if (!hierarchy.regions[entry.region]) hierarchy.regions[entry.region] = {};
        addToHierarchy(hierarchy.regions[entry.region], entry);
        if (!hierarchy.branches[entry.branch]) hierarchy.branches[entry.branch] = {};
        addToHierarchy(hierarchy.branches[entry.branch], entry);
    });

    const finalReport = {
        meta: { generatedAt: new Date().toISOString() },
        summary: hierarchy.all,
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
    const jsonString = JSON.stringify(data);
    var parts = [
        '<!DOCTYPE html>', '<html lang="en">', '<head>',
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<title>Morrigan Executive Dashboard</title>',
        '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">',
        '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">',
        '<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>',
        '<style>',
        ':root { --primary: #002060; --secondary: #4472C4; --light-bg: #F9FAFB; --white: #FFFFFF; --text-dark: #1F2937; --text-muted: #6B7280; --success: #10B981; --danger: #EF4444; }',
        'body { background-color: var(--light-bg); font-family: "Inter", sans-serif; color: var(--text-dark); overflow-x: hidden; }',
        '.sidebar { height: 100vh; position: fixed; top: 0; left: 0; background: linear-gradient(180deg, #001A4D 0%, #002060 100%); color: white; width: 280px; z-index: 1000; display: flex; flex-direction: column; box-shadow: 4px 0 20px rgba(0,0,0,0.15); }',
        '.main-content { margin-left: 280px; padding: 40px; }',
        '.sidebar-brand { padding: 40px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center; }',
        '.sidebar-brand h4 { font-size: 1.5rem; letter-spacing: 3px; font-weight: 800; margin: 0; background: linear-gradient(90deg, #FFFFFF 0%, #A5B4FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }',
        '.sidebar-nav { flex: 1; padding: 25px 15px; }',
        '.sidebar a { color: rgba(255,255,255,0.6); padding: 14px 20px; text-decoration: none; display: flex; align-items: center; gap: 15px; font-weight: 500; font-size: 0.95rem; transition: all 0.3s; border-radius: 12px; margin-bottom: 8px; }',
        '.sidebar a:hover, .sidebar a.active { color: white; background-color: rgba(255,255,255,0.1); }',
        '.sidebar a.active { font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }',
        '.sidebar a svg { width: 20px; height: 20px; opacity: 0.8; }',
        '.sidebar-footer { padding: 25px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; color: rgba(255,255,255,0.4); }',
        '.card { background: var(--white); border: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px; }',
        '.card-header-clean { padding: 20px 24px; border-bottom: 1px solid #E5E7EB; font-size: 1.1rem; font-weight: 600; color: var(--primary); background: transparent; }',
        '.text-primary-custom { color: var(--primary); }',
        '.kpi-card { padding: 24px; }',
        '.kpi-value { font-size: 2.5rem; font-weight: 700; color: var(--primary); margin: 10px 0; }',
        '.rank-badge { width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.75rem; font-weight: bold; background: #eee; }',
        '.rank-top-1 { background: #FFD700; color: #744210; }',
        '.rank-top-2 { background: #C0C0C0; color: #374151; }',
        '.rank-top-3 { background: #CD7F32; color: #744210; }',
        '/* Deep Dive Specifics */',
        '.score-box-large { padding: 40px; text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #002060 100%); color: white; border-radius: 12px; height: 100%; display: flex; flex-direction: column; justify-content: center; }',
        '.action-card { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 12px; position: relative; padding-left: 20px; }',
        '.action-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #EF4444; border-radius: 8px 0 0 8px; }',
        '.table-custom th { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; color: #6B7280; background: #F9FAFB; padding: 12px 24px; }',
        '.table-custom td { padding: 16px 24px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }',
        '</style>',
        '</head><body>',

        '<div class="sidebar">',
        '    <div class="sidebar-brand"><h4>MORRIGAN</h4><small>Insight Engine</small></div>',
        '    <div class="sidebar-nav">',
        '        <a href="#" onclick="showTab(\'summary\')" class="active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg><span>Executive Summary</span></a>',
        '        <a href="#" onclick="showTab(\'regions\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Regional Analysis</span></a>',
        '        <a href="#" onclick="showTab(\'branches\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 8 3 3-3 3"/></svg><span>Branch Performance</span></a>',
        '        <a href="#" onclick="showTab(\'stores\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>Store Deep Dive</span></a>',
        '    </div>',
        '    <div class="sidebar-footer">Version 3.2.0 &copy; 2025 Eigerindo MPI</div>',
        '</div>',

        '<div class="main-content">',
        '    <div id="tab-summary">',
        '        <div class="d-flex justify-content-between align-items-center mb-4">',
        '            <div><h2 class="text-primary-custom mb-1">Executive Summary</h2><p class="text-muted m-0">High-level performance overview across all waves.</p></div>',
        '            <div class="text-end"><small class="text-muted d-block">Generated On</small><strong>' + new Date(data.meta.generatedAt).toLocaleDateString() + '</strong></div>',
        '        </div>',
        '        <div class="row mb-4">',
        '            <div class="col-md-3"><div class="card h-100"><div class="kpi-card"><div><div class="kpi-label">Current Overall Score</div><div class="kpi-value" id="kpi-score">--</div></div><div class="kpi-trend" id="kpi-score-trend">--</div></div></div></div>',
        '            <div class="col-md-3"><div class="card h-100"><div class="kpi-card"><div><div class="kpi-label">Active Stores</div><div class="kpi-value" id="kpi-stores">--</div></div><div class="kpi-trend text-muted">Across All Regions</div></div></div></div>',
        '            <div class="col-md-3"><div class="card h-100"><div class="kpi-card"><div><div class="kpi-label">Critical Issues</div><div class="kpi-value text-danger" id="kpi-actions">--</div></div><div class="kpi-trend text-muted">Sections < ' + data.threshold + '</div></div></div></div>',
        '            <div class="col-md-3"><div class="card h-100"><div class="kpi-card"><div><div class="kpi-label">Best Performing Region</div><div class="kpi-value text-success" style="font-size: 1.8rem;" id="kpi-best-region">--</div></div><div class="kpi-trend text-muted">Leading</div></div></div></div>',
        '        </div>',
        '        <div class="card mb-4"><div class="card-header-clean">Historical Performance Trend</div><div class="card-body"><div id="summaryChart" style="height: 350px;"></div></div></div>',
        '        <h4 class="text-primary-custom mb-3">Section Analysis</h4><div class="row mb-5"><div class="col-12"><div id="sectionAnalysisGrid" class="row g-3"></div></div></div>',
        '        <h4 class="text-primary-custom mb-3">Ranking Logic</h4>',
        '        <div class="row mb-4">',
        '           <div class="col-md-6"><div class="card h-100"><div class="card-header-clean text-success">🏆 Top Performing Stores</div><div class="card-body p-0"><table class="table table-custom table-hover m-0"><thead><tr><th>Rank</th><th>Store Name</th><th class="text-end">Score</th></tr></thead><tbody id="topStoresList"></tbody></table></div></div></div>',
        '           <div class="col-md-6"><div class="card h-100"><div class="card-header-clean text-danger">⚠️ Lowest Performing Stores</div><div class="card-body p-0"><table class="table table-custom table-hover m-0"><thead><tr><th>Rank</th><th>Store Name</th><th class="text-end">Score</th></tr></thead><tbody id="bottomStoresList"></tbody></table></div></div></div>',
        '        </div>',
        '        <div class="row">',
        '           <div class="col-md-6"><div class="card h-100"><div class="card-header-clean bg-primary text-white">🏆 Regional Ranking</div><div class="card-body p-0"><table class="table table-custom table-hover m-0"><thead><tr><th>Rank</th><th>Region</th><th class="text-end">Avg Score</th></tr></thead><tbody id="regionRankList"></tbody></table></div></div></div>',
        '           <div class="col-md-6"><div class="card h-100"><div class="card-header-clean bg-primary text-white">🏆 Branch Ranking (Top 5)</div><div class="card-body p-0"><table class="table table-custom table-hover m-0"><thead><tr><th>Rank</th><th>Branch</th><th class="text-end">Avg Score</th></tr></thead><tbody id="branchRankList"></tbody></table></div></div></div>',
        '        </div>',
        '    </div>',

        '    <div id="tab-regions" style="display:none;">',
        '        <h2 class="text-primary-custom mb-4">Regional Analysis</h2>',
        '        <div class="card mb-4"><div class="card-header-clean">Regional Heatmap</div><div class="card-body"><div id="regionHeatmap" style="height: 400px;"></div></div></div>',
        '        <div class="row g-4" id="regionDetailCards"></div>',
        '    </div>',

        '    <div id="tab-branches" style="display:none;">',
        '        <h2 class="text-primary-custom mb-4">Branch Performance</h2>',
        '        <div class="card"><div class="card-header-clean d-flex justify-content-between align-items-center"><span>Branch Rankings</span><input type="text" id="branchSearch" class="form-control form-control-sm" style="width:200px" placeholder="Search..." onkeyup="filterBranches()"></div>',
        '        <div class="card-body"><div id="branchBarChart" style="height: 700px;"></div></div></div>',
        '        <div class="card mt-4"><div class="card-body p-0"><div id="branchContainer"></div></div></div>',
        '    </div>',

        '    <div id="tab-stores" style="display:none;">',
        '        <h2 class="text-primary-custom mb-4">Store Deep Dive</h2>',
        '        <div class="card p-4 mb-4"><div class="row align-items-end g-3">',
        '             <div class="col-md-4"><label class="form-label text-muted fw-bold small">SEARCH STORE</label><input type="text" class="form-control" id="storeSearch" placeholder="Enter store name or code..." onkeyup="renderStoreList()"></div>',
        '             <div class="col-md-3"><label class="form-label text-muted fw-bold small">SORT BY</label><select id="storeSort" class="form-select" onchange="renderStoreList()"><option value="name">Name (A-Z)</option><option value="score_asc">Score (Lowest First)</option><option value="score_desc">Score (Highest First)</option></select></div>',
        '             <div class="col-md-5"><label class="form-label text-muted fw-bold small">SELECT STORE</label><select id="storeSelect" class="form-select" onchange="loadStoreDetail()"><option value="">Select a Store...</option></select></div>',
        '        </div></div>',
        '        <div id="storeContent" style="display:none;">',
        '            <div class="row mb-4">',
        '                <div class="col-md-4"><div class="score-box-large"><div class="text-uppercase opacity-75 small mb-2" id="stMeta"></div><h3 class="mb-3" id="stName"></h3><div class="display-1 fw-bold" id="stScore"></div><div class="mt-3"><span class="badge bg-white text-dark px-3 py-2 rounded-pill shadow-sm">Latest Wave Score</span></div></div></div>',
        '                <div class="col-md-8"><div class="card h-100"><div class="card-header-clean">Performance Trend</div><div class="card-body"><div id="stTrendChart" style="height: 320px;"></div></div></div></div>',
        '            </div>',
        '            <div class="row">',
        '                <div class="col-md-7"><div class="card h-100"><div class="card-header-clean">Latest Section Analysis</div><div class="card-body p-0"><table class="table table-custom table-hover m-0" id="stSectionTable"><thead><tr><th>Section</th><th class="text-end">Score</th><th class="text-center">Status</th></tr></thead><tbody></tbody></table></div></div>',
        '                <div class="col-md-5"><div class="card h-100"><div class="card-header-clean text-danger">Recommended Action Plan</div><div class="card-body" id="stActions"></div></div></div>',
        '            </div>',
        '            <div class="card mt-4"><div class="card-header-clean">Qualitative Feedback</div><div class="card-body"><ul id="stFeedback" class="list-group list-group-flush"></ul></div></div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<script>',
        'var reportData = ' + jsonString + ';',
        'var sortedWaves = Object.keys(reportData.summary).sort();',
        'var config = { responsive: true, displayModeBar: false };',
        'function showTab(n){ document.querySelectorAll(".main-content > div").forEach(d=>d.style.display="none"); document.getElementById("tab-"+n).style.display="block"; document.querySelectorAll(".sidebar a").forEach(a=>a.classList.remove("active")); event.currentTarget.classList.add("active"); window.dispatchEvent(new Event("resize")); }',

        'function initSummary() {',
        '    var w = sortedWaves, cur = w[w.length - 1], prev = w.length > 1 ? w[w.length - 2] : null;',
        '    var dat = reportData.summary[cur];',
        '',
        '    // 1. KPI Scores',
        '    var s = dat.sum / dat.count;',
        '    var pS = prev ? reportData.summary[prev].sum / reportData.summary[prev].count : 0;',
        '    var diff = s - pS;',
        '    document.getElementById("kpi-score").textContent = s.toFixed(2);',
        '    document.getElementById("kpi-score-trend").innerHTML = (diff >= 0 ? "▲ +" : "▼ ") + Math.abs(diff).toFixed(2) + " vs last wave";',
        '    document.getElementById("kpi-score-trend").className = "kpi-trend " + (diff >= 0 ? "positive" : "negative");',
        '    document.getElementById("kpi-stores").textContent = dat.count;',
        '',
        '    // Best Region',
        '    var bestR = "", bestS = -1;',
        '    Object.keys(reportData.regions).forEach(r => {',
        '        var d = reportData.regions[r][cur];',
        '        if (d && d.sum / d.count > bestS) { bestS = d.sum / d.count; bestR = r; }',
        '    });',
        '    document.getElementById("kpi-best-region").textContent = bestR || "N/A";',
        '',
        '    // 2. Critical Issues (Total Count)',
        '    var totActions = 0;',
        '    Object.values(reportData.stores).forEach(st => {',
        '        if (st.results[cur]) {',
        '            Object.values(st.results[cur].sections).forEach(v => {',
        '                if (v < reportData.threshold) totActions++;',
        '            });',
        '        }',
        '    });',
        '    document.getElementById("kpi-actions").textContent = totActions;',
        '',
        '    // 3. Chart with Deltas',
        '    var scores = w.map(k => reportData.summary[k].sum / reportData.summary[k].count);',
        '    var ann = [];',
        '    for (var i = 1; i < w.length; i++) {',
        '        var p = scores[i - 1], c = scores[i];',
        '        if (!isNaN(p) && !isNaN(c)) {',
        '            var d = c - p;',
        '            var color = d >= 0 ? "#059669" : "#DC2626";',
        '            ann.push({',
        '                x: w[i], y: (p + c) / 2,',
        '                text: "<b>" + (d >= 0 ? "+" : "") + d.toFixed(1) + "</b>",',
        '                showarrow: false,',
        '                font: { size: 10, color: color },',
        '                bgcolor: d >= 0 ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",',
        '                bordercolor: color, borderwidth: 1, borderpad: 2',
        '            });',
        '        }',
        '    }',
        '    ann.push({ xref: "paper", yref: "y", x: 1.02, y: reportData.threshold, text: "<b>" + reportData.threshold + "</b>", showarrow: false, font: { size: 9, color: "#EF4444" } });',
        '',
        '    Plotly.newPlot("summaryChart", [',
        '        {',
        '            x: w, y: scores, type: "scatter", mode: "lines+markers+text",',
        '            line: { color: "#002060", width: 3, shape: "spline", smoothing: 1.2 },',
        '            marker: { size: 10, color: "#002060", line: { color: "#FFF", width: 2 } },',
        '            text: scores.map(v => v.toFixed(2)), textposition: "top center"',
        '        },',
        '        {',
        '            x: w, y: w.map(() => reportData.threshold), mode: "lines",',
        '            line: { color: "#EF4444", width: 1, dash: "dot" }, hoverinfo: "none"',
        '        }',
        '    ], {',
        '        margin: { t: 40, l: 40, r: 40, b: 40 },',
        '        annotations: ann,',
        '        xaxis: { fixedrange: true },',
        '        yaxis: { fixedrange: true, gridcolor: "#F3F4F6" },',
        '        showlegend: false,',
        '        paper_bgcolor: "rgba(0,0,0,0)",',
        '        plot_bgcolor: "rgba(0,0,0,0)"',
        '    }, config);',
        '',
        '    // 4. Section Analysis (Clickable)',
        '    var grid = document.getElementById("sectionAnalysisGrid");',
        '    grid.innerHTML = "";',
        '    Object.entries(dat.sections)',
        '        .sort((a, b) => (a[1].sum / a[1].count) - (b[1].sum / b[1].count))',
        '        .forEach(([k, v]) => {',
        '            var sc = v.sum / v.count, cr = v.critical || 0, isC = sc < 84;',
        '            var col = document.createElement("div");',
        '            col.className = "col-xl-2 col-md-4 col-sm-6";',
        '            col.innerHTML = `<div class="card h-100 p-3 text-center shadow-sm ${isC ? "bg-soft-danger" : "bg-white"}" style="cursor:pointer; transition:transform 0.2s;" onclick="alert(\'Detailed analysis for ${k} is available in Store Deep Dive tab.\')">',
        '                <div class="display-6 fw-bold mb-2 ${isC ? "text-danger" : "text-primary"}">${sc.toFixed(2)}</div>',
        '                <div class="small fw-semibold text-muted" style="min-height:36px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${k}</div>',
        '                <div class="mt-2 text-nowrap"><span class="badge rounded-pill ${cr > 0 ? "bg-danger" : "bg-secondary"}">${cr > 0 ? cr + " Critical" : "Safe"}</span></div></div>`;',
        '            grid.appendChild(col);',
        '        });',
        '',
        '    // 5. Store Rankings',
        '    var sList = Object.values(reportData.stores)',
        '        .filter(s => s.results[cur])',
        '        .map(s => ({ n: s.meta.name, s: s.results[cur].totalScore }))',
        '        .sort((a, b) => b.s - a.s);',
        '',
        '    var renderT = (l, id, top) => {',
        '        var h = "";',
        '        l.forEach((x, i) => {',
        '            var r = top ? i + 1 : sList.length - i;',
        '            var cls = top ? (i < 3 ? "rank-top-" + (i + 1) : "") : "";',
        '            h += `<tr><td style="padding-left:20px"><span class="rank-badge ${cls}">${r}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr>`;',
        '        });',
        '        document.getElementById(id).innerHTML = h;',
        '    };',
        '    renderT(sList.slice(0, 5), "topStoresList", true);',
        '    renderT(sList.slice(-5).reverse(), "bottomStoresList", false);',
        '',
        '    // 6. Hierarchy Rankings',
        '    var regList = Object.keys(reportData.regions).map(r => {',
        '        var d = reportData.regions[r][cur]; return { n: r, s: d ? d.sum / d.count : 0 };',
        '    }).sort((a, b) => b.s - a.s);',
        '    var brList = Object.keys(reportData.branches).map(b => {',
        '        var d = reportData.branches[b][cur]; return { n: b, s: d ? d.sum / d.count : 0 };',
        '    }).sort((a,b) => b.s - a.s);',
        '',
        '    var renderH = (l, id) => {',
        '        var h = "";',
        '        l.slice(0, 5).forEach((x, i) => {',
        '            var cls = i < 3 ? "rank-top-" + (i + 1) : "";',
        '            h += `<tr><td style="padding-left:20px"><span class="rank-badge ${cls}">${i + 1}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr>`;',
        '        });',
        '        document.getElementById(id).innerHTML = h;',
        '    };',
        '    renderH(regList, "regionRankList");',
        '    renderH(brList, "branchRankList");',
        '}',

        'function initRegions(){',
        '   var r=Object.keys(reportData.regions).sort(), w=sortedWaves;',
        '   var z=r.map(reg=>w.map(wav=>{var d=reportData.regions[reg][wav]; return d?d.sum/d.count:null}));',
        '   Plotly.newPlot("regionHeatmap", [{x:w,y:r,z:z,type:"heatmap",colorscale:"Blues"}], {margin:{l:150},xaxis:{fixedrange:true},yaxis:{fixedrange:true}}, config);',
        '}',

        'function initBranches(){',
        '   var b=Object.keys(reportData.branches).sort(), cur=sortedWaves[sortedWaves.length-1];',
        '   var dat=b.map(br=>{var d=reportData.branches[br][cur]; return {n:br,s:d?d.sum/d.count:0}}).sort((x,y)=>x.s-y.s);',
        '   var cols=dat.map(x=>x.s>=84?"#4A7FB5":"#DC3545");',
        '   Plotly.newPlot("branchBarChart", [{x:dat.map(x=>x.s),y:dat.map(x=>x.n),type:"bar",orientation:"h",marker:{color:cols},text:dat.map(x=>x.s.toFixed(2)),textposition:"outside"}], {margin:{l:200},xaxis:{range:[60,105]},yaxis:{automargin:true}}, config);',
        '}',

        'function renderStoreList(){',
        '   var s=document.getElementById("storeSearch").value.toLowerCase(), sel=document.getElementById("storeSelect"), sort=document.getElementById("storeSort").value;',
        '   sel.innerHTML="<option value=\'\'>Select a Store...</option>";',
        '   var list=Object.values(reportData.stores).filter(x=>x.meta.name.toLowerCase().includes(s)||x.meta.code.includes(s));',
        '   var w=sortedWaves[sortedWaves.length-1];',
        '   list.sort((a,b)=>{',
        '      if(sort==="name") return a.meta.name.localeCompare(b.meta.name);',
        '      var va=a.results[w]?a.results[w].totalScore:0, vb=b.results[w]?b.results[w].totalScore:0;',
        '      return sort==="score_asc"?va-vb:vb-va;',
        '   });',
        '   list.forEach(x=>{var sc=x.results[w]?x.results[w].totalScore.toFixed(2):"N/A"; var opt=document.createElement("option"); opt.value=x.meta.code; opt.textContent="["+sc+"] "+x.meta.name; sel.appendChild(opt);});',
        '}',

        'function loadStoreDetail(){',
        '   var c=document.getElementById("storeSelect").value; if(!c) return; document.getElementById("storeContent").style.display="block";',
        '   var s=reportData.stores[c], cur=s.results[sortedWaves[sortedWaves.length-1]];',
        '   document.getElementById("stName").textContent=s.meta.name; document.getElementById("stMeta").textContent=s.meta.region+" | "+s.meta.branch;',
        '   document.getElementById("stScore").textContent=cur.totalScore.toFixed(2);',
        '   // Trend',
        '   var y=sortedWaves.map(w=>s.results[w]?s.results[w].totalScore:null);',
        '   Plotly.newPlot("stTrendChart", [{x:sortedWaves,y:y,type:"scatter",mode:"lines+markers",line:{color:"#FFFFFF",width:3},marker:{size:8,color:"#FFFFFF"}}], {paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",margin:{t:20,l:30,r:30,b:30},xaxis:{color:"#FFF",showgrid:false},yaxis:{color:"#FFF",showgrid:true,gridcolor:"rgba(255,255,255,0.2)"}}, config);',
        '   // Table',
        '   var tb=document.querySelector("#stSectionTable tbody"), acts=document.getElementById("stActions"); tb.innerHTML=""; acts.innerHTML="";',
        '   Object.entries(cur.sections).forEach(([k,v])=>{',
        '       var isBad=v<84; tb.innerHTML+=`<tr><td>${k}</td><td class="text-end fw-bold ${isBad?"text-danger":""}">${v.toFixed(2)}</td><td class="text-center">${isBad?"<span class=\'badge bg-danger\'>⚠️</span>":"<span class=\'badge bg-success\'>✅</span>"}</td></tr>`;',
        '       if(isBad) acts.innerHTML+=`<div class="action-card"><strong>${k} (${v.toFixed(2)})</strong><p class="small text-muted m-0">${reportData.actionPlanConfig[k]||"Review Standards"}</p></div>`;',
        '   });',
        '   if(!acts.innerHTML) acts.innerHTML="<div class=\'alert alert-success\'>No critical issues found!</div>";',
        '   // Trend Chart (CORRECTED)',
        '   Plotly.newPlot("stTrendChart", [{x:sortedWaves,y:y,type:"scatter",mode:"lines+markers+text",text:y.map(v=>v?v.toFixed(2):""),textposition:"top center",line:{color:"#002060",width:3},marker:{color:"#002060",size:8,line:{color:"white",width:2}}}], {margin:{t:30,l:40,r:30,b:30},yaxis:{gridcolor:"#f3f4f6"},xaxis:{showgrid:false}}, config);',
        '}',

        'window.onload=function(){ initSummary(); initRegions(); initBranches(); renderStoreList(); };',
        '</script>',
        '</body></html>'
    ];
    return parts.join('\n');
}

processAll();
