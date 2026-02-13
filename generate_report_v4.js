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

// Validated Section Item Codes (from scoring_logic_vFinal.js)
const SECTION_ITEMS = {
        'A': { codes: [759166, 759167, 759168, 759169, 759170, 759171], exclude: [] },
        'B': { codes: [759174, 759175, 759176, 759177, 759178, 759179], exclude: [] },
        'C': { codes: [759181, 759182, 759183, 759184, 759185, 759186, 759187, 759188, 759189, 759190, 759191, 759192], exclude: [] },
        'D': { codes: [759194, 759195, 759196, 759197, 759198, 759199, 759200, 759201], exclude: [] },
        'E': { codes: [759204, 759206, 759207, 759208, 759209, 759210, 759212, 759213, 759214, 759215], exclude: [] },
        'F': { codes: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], exclude: [759221] },
        'G': { codes: [759231, 759233, 759211, 759569, 759235, 759236, 759237, 759243, 759239], exclude: [759211] },
        'H': { codes: [759247, 759248, 759249, 759250, 759251, 759252, 759253, 759254, 759255, 759256, 759257, 759258, 759259, 759260, 759261, 759267, 759262, 759263, 759265, 759266], exclude: [] },
        'I': { codes: [759270, 759271, 759272, 759273, 759274, 759275, 759276, 759277], exclude: [] },
        'J': { codes: [759280, 759281, 759282, 759283, 759284], exclude: [759282, 759283] },
        'K': { codes: [759287, 759288, 759289], exclude: [] }
};

let SECTION_WEIGHTS = {};

async function loadSectionWeights() {
        try {
                const weightPath = path.join(__dirname, 'CSV', 'Section Weight.csv');
                const content = await require('fs').readFileSync(weightPath, 'utf8');
                const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true });
                records.forEach(r => {
                        const vals = Object.values(r);
                        const name = (vals[0] || '').trim();
                        const weight = parseInt(vals[1]);
                        if (name && weight) {
                                const letterMatch = name.match(/([A-K])\./);
                                if (letterMatch) SECTION_WEIGHTS[letterMatch[1]] = weight;
                        }
                });
                console.log('Loaded Section Weights:', SECTION_WEIGHTS);
        } catch (err) {
                console.error('Error loading Section Weights:', err.message);
        }
}

function parseItemScore(val) {
        if (!val) return null;
        const s = String(val);
        if (s.includes('(1/1)') || s.includes('100.00')) return 1;
        if (s.includes('(0/1)') || s.includes('0.00')) return 0;
        return null;
}

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
                        qualitative: [],
                        failedItems: []
                };

                if (storeData.region === 'CLOSED' || storeData.branch === 'CLOSED') return;

                // Improved Feedback Key Search
                const feedbackCandidates = Object.keys(record).filter(k => k.includes('759291') || k.toLowerCase().includes('informasikan hal-hal'));

                if (storeData.wave === 'Wave 2' && storeData.year === '2025' && feedbackCandidates.length > 0 && record === records[0]) {
                        console.log(`[DEBUG] Found feedback column candidates: ${feedbackCandidates.join(', ')}`);
                }

                feedbackCandidates.forEach(key => {
                        if (record[key] && record[key].length > 3) {
                                storeData.qualitative.push(record[key]);
                        }
                });

                // const generalFeedbackKey = Object.keys(record).find(k => k.includes('(759291)'));
                // if (generalFeedbackKey && record[generalFeedbackKey]) storeData.qualitative.push(record[generalFeedbackKey]);

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

                // Item-level drill-down: identify failed items
                const headers = Object.keys(record);
                const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));
                Object.entries(SECTION_ITEMS).forEach(([letter, config]) => {
                        config.codes.forEach(code => {
                                if (config.exclude.includes(code)) return;
                                const col = getCol(code);
                                if (!col) return;
                                const val = record[col];
                                const score = parseItemScore(val);
                                if (score === 0) {
                                        const itemName = col.replace(/^\(\d+\)\s*/, '').substring(0, 80);
                                        storeData.failedItems.push({ section: letter, code: code, item: itemName });
                                }
                        });
                });

                // CSV Final Score = source of truth
                if (finalScore !== null) storeData.totalScore = finalScore;
                else {
                        const vals = Object.values(storeData.sections);
                        storeData.totalScore = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                }
                storeResults.push(storeData);
        });

        // DEBUG: Check how many stores captured qualitative feedback
        var feedbackCount = storeResults.filter(s => s.qualitative && s.qualitative.length > 0).length;
        console.log(`[DEBUG] Captured qualitative feedback for ${feedbackCount} / ${storeResults.length} records in ${waveName} ${year}`);

        return storeResults;
}

const { analyzeFeedback } = require('./voc_analysis');

async function processAll() {
        await loadSectionWeights();
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

        // Voice of Customer Aggregation
        const latestWaveConfig = waves[waves.length - 1];
        const latestWaveKeyForCheck = `${latestWaveConfig.year} ${latestWaveConfig.name}`;
        const allQualitative = [];

        allStoreData.forEach(entry => {
                const waveKey = `${entry.year} ${entry.wave}`;

                // Collect VOC Data for Latest Wave
                if (waveKey === latestWaveKeyForCheck && entry.qualitative && entry.qualitative.length > 0) {
                        allQualitative.push(...entry.qualitative);
                }

                if (!hierarchy.stores[entry.siteCode]) {
                        hierarchy.stores[entry.siteCode] = {
                                meta: { name: entry.siteName, region: entry.region, branch: entry.branch, code: entry.siteCode },
                                results: {}
                        };
                }
                hierarchy.stores[entry.siteCode].results[waveKey] = {
                        sections: entry.sections, qualitative: entry.qualitative, totalScore: entry.totalScore,
                        failedItems: entry.failedItems || []
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

        // Perform VOC Analysis
        console.log(`Analyzing ${allQualitative.length} feedback items for Voice of Customer...`);
        const vocResults = analyzeFeedback(allQualitative);

        const finalReport = {
                meta: { generatedAt: new Date().toISOString() },
                summary: hierarchy.all,
                regions: hierarchy.regions,
                branches: hierarchy.branches,
                stores: hierarchy.stores,
                actionPlanConfig: ACTION_PLANS,
                threshold: THRESHOLD_SCORE,
                voc: vocResults
        };

        const htmlContent = generateHTML(finalReport);
        await fs.writeFile('ESS Retail In Depth Analysis.html', htmlContent);
        console.log('Dashboard generated: ESS Retail In Depth Analysis.html');
}

function generateHTML(data) {
        const jsonString = JSON.stringify(data);
        var parts = [
                '<!DOCTYPE html>', '<html lang="en">', '<head>',
                '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">',
                '<title>ESS Retail In Depth Analysis</title>',
                '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">',
                '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">',
                '<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>',
                '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>',
                '<style>',
                ':root { --primary: #002060; --secondary: #4472C4; --light-bg: #F0F2F5; --white: #FFFFFF; --text-dark: #1F2937; --text-muted: #6B7280; --success: #10B981; --danger: #EF4444; }',
                'body { background-color: var(--light-bg); font-family: "Inter", sans-serif; color: var(--text-dark); overflow-x: hidden; }',
                '.sidebar { height: 100vh; position: fixed; top: 0; left: 0; background: linear-gradient(180deg, #001A4D 0%, #002060 100%); color: white; width: 280px; z-index: 1000; display: flex; flex-direction: column; box-shadow: 4px 0 20px rgba(0,0,0,0.15); }',
                '.main-content { margin-left: 280px; padding: 40px; }',
                '.sidebar-brand { padding: 40px 25px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center; }',
                '.sidebar-brand h4 { font-size: 1.35rem; letter-spacing: 2px; font-weight: 800; margin: 0; background: linear-gradient(90deg, #FFFFFF 0%, #A5B4FC 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }',
                '.sidebar-nav { flex: 1; padding: 25px 15px; }',
                '.sidebar a { color: rgba(255,255,255,0.6); padding: 14px 20px; text-decoration: none; display: flex; align-items: center; gap: 15px; font-weight: 500; font-size: 0.95rem; transition: all 0.3s; border-radius: 12px; margin-bottom: 8px; }',
                '.sidebar a:hover, .sidebar a.active { color: white; background-color: rgba(255,255,255,0.1); }',
                '.sidebar a.active { font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }',
                '.sidebar a svg { width: 20px; height: 20px; opacity: 0.8; }',
                '.sidebar-footer { padding: 25px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 0.75rem; color: rgba(255,255,255,0.4); }',
                '.card { background: var(--white); border: none; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); margin-bottom: 24px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }',
                '.card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); }',
                '.card-header-clean { padding: 20px 24px; border-bottom: 1px solid #E5E7EB; font-size: 1.1rem; font-weight: 600; color: var(--primary); background: transparent; }',
                '.text-primary-custom { color: var(--primary); }',
                '.kpi-card { padding: 24px; }',
                '.kpi-value { font-size: 2.5rem; font-weight: 800; color: var(--primary); margin: 10px 0; letter-spacing: -1px; }',
                '.rank-badge { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.8rem; font-weight: bold; background: #f0f0f0; }',
                '.rank-top-1 { background: linear-gradient(135deg, #FFD700 0%, #F59E0B 100%); color: white; }',
                '.rank-top-2 { background: linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%); color: white; }',
                '.rank-top-3 { background: linear-gradient(135deg, #FDBA74 0%, #CD7F32 100%); color: white; }',
                '/* Section Analysis Grid */',
                '.section-tile { position: relative; overflow: hidden; border: 1px solid rgba(229, 231, 235, 0.5); }',
                '.section-icon-wrapper { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; background: #F3F4F6; color: var(--primary); transition: all 0.3s; }',
                '.section-tile:hover .section-icon-wrapper { background: var(--primary); color: white; transform: scale(1.1) rotate(-5deg); }',
                '.section-score { font-size: 1.75rem; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.5px; }',
                '.section-label { font-size: 0.8rem; line-height: 1.4; color: var(--text-muted); font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8rem; }',
                '.bg-soft-danger { background: linear-gradient(135deg, #FFF5F5 0%, #FED7D7 100%); }',
                '.bg-soft-danger .section-icon-wrapper { color: var(--danger); }',
                '.bg-soft-danger:hover .section-icon-wrapper { background: var(--danger); color: white; }',
                '/* Deep Dive Specifics */',
                '.score-box-large { padding: 40px; text-align: center; background: linear-gradient(135deg, #1e3a8a 0%, #002060 100%); color: white; border-radius: 12px; height: 100%; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }',
                '.action-card { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 12px; position: relative; padding-left: 20px; transition: transform 0.2s; }',
                '.action-card:hover { transform: scale(1.02); }',
                '.action-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #EF4444; border-radius: 8px 0 0 8px; }',
                '.table-custom th { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; color: #6B7280; background: #F9FAFB; padding: 16px 24px; border-top: none; }',
                '.table-custom td { padding: 16px 24px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; font-size: 0.95rem; }',
                '</style>',
                '</head><body>',

                '<div class="sidebar">',
                '    <div class="sidebar-brand"><h4>ESS RETAIL</h4><small style="letter-spacing:1px;font-size:0.65em;text-transform:uppercase;opacity:0.7">In Depth Analysis</small></div>',
                '    <div class="sidebar-nav">',
                '        <a href="#" onclick="showTab(\'summary\')" class="active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg><span>Executive Summary</span></a>',
                '        <a href="#" onclick="showTab(\'regions\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>Regional Analysis</span></a>',
                '        <a href="#" onclick="showTab(\'branches\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 8 3 3-3 3"/></svg><span>Branch Performance</span></a>',
                '        <a href="#" onclick="showTab(\'stores\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>Store Deep Dive</span></a>',
                '    </div>',
                '    <div class="sidebar-footer">2026, Harry Ilhamdi Iskandar<br><span style="opacity:0.7">HCBP Dept</span></div>',
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

                '<div id="tab-regions" style="display:none;">',
                '    <div class="d-flex justify-content-between align-items-center mb-4">',
                '         <div><h2 class="text-primary-custom mb-0">Regional Analysis</h2><p class="text-muted m-0">Strategic comparison and focus areas</p></div>',
                '    </div>',
                '    <!-- Row 1: Performance Trends -->',
                '    <div class="card mb-4 border-0 shadow-sm">',
                '        <div class="card-header-clean bg-white">📈 Historical Performance Trends</div>',
                '        <div class="card-body"><div id="regionTrendChart" style="height: 400px;"></div></div>',
                '    </div>',
                '    <!-- Row 2: Leaderboard & Focus Areas -->',
                '    <h4 class="text-primary-custom mb-3">🏆 Regional Leaderboard & Focus Areas</h4>',
                '    <div class="row g-4 mb-5" id="regionDetailCards"></div>',
                '    <!-- Row 3: Premium Heatmap -->',
                '    <div class="card mb-4 border-0 shadow-sm">',
                '        <div class="card-header-clean bg-white">🧩 Strategic Heatmap: Region vs Section Performance</div>',
                '        <div class="card-body"><div id="regionSectionHeatmap" style="height: 500px;"></div></div>',
                '    </div>',
                '</div>',

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
                '    // 4. Section Analysis (Clickable - Sexy Tiles)',
                '    var grid = document.getElementById("sectionAnalysisGrid");',
                '    grid.innerHTML = "";',
                '    var iconMap = {',
                '        "A.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>\',',
                '        "B.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\',',
                '        "C.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>\',',
                '        "D.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>\',',
                '        "E.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\',',
                '        "F.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\',',
                '        "G.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>\',',
                '        "H.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>\',',
                '        "I.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>\',',
                '        "J.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>\',',
                '        "K.": \'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>\'',
                '    };',
                '    Object.entries(dat.sections)',
                '        .sort((a, b) => (a[1].sum / a[1].count) - (b[1].sum / b[1].count))',
                '        .forEach(([k, v], i) => {',
                '            var sc = v.sum / v.count, cr = v.critical || 0, isC = sc < 84;',
                '            var prefix = k.split(" ")[0]; var icon = iconMap[prefix] || iconMap["A."];',
                '            var isTopLow = i < 3;',
                '            var col = document.createElement("div");',
                '            col.className = isTopLow ? "col-xl-4 col-md-6" : "col-xl-2 col-md-4 col-sm-6";',
                '            col.innerHTML = `<div class="card h-100 p-4 shadow-sm section-tile ${isC ? \'bg-soft-danger\' : \'bg-white\'}" ',
                '                     style="cursor:pointer; ${isTopLow ? \'border: 2px solid #EF4444;\' : \'\'}" ',
                '                     onclick="showTab(\'stores\'); document.getElementById(\'storeSearch\').value=\'\'; renderStoreList();">',
                '                ${isTopLow ? \'<div class="position-absolute top-0 end-0 m-3"><span class="badge bg-danger">PRIORITY IMPROVEMENT</span></div>\' : \'\'}',
                '                <div class="section-icon-wrapper"><div style="width:24px; height:24px;">${icon}</div></div>',
                '                <div class="${isTopLow ? \'display-5\' : \'section-score\'} fw-bold ${isC ? \'text-danger\' : \'text-primary-custom\'}">${sc.toFixed(1)}</div>',
                '                <div class="${isTopLow ? \'h5 fw-bold\' : \'section-label\'} mb-3" title="${k}">${k}</div>',
                '                <div class="d-flex align-items-center justify-content-between mt-auto">',
                '                    <span class="badge rounded-pill ${cr > 0 ? \'bg-danger\' : \'bg-success\'}">${cr > 0 ? cr + " Critical" : "All Clean"}</span>',
                '                    <svg style="width:16px; height:16px; opacity:0.3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>',
                '                </div></div>`;',
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

                'function initRegions() {',
                '    var regKeys = Object.keys(reportData.regions).sort();',
                '    var waves = sortedWaves;',
                '    var curWave = waves[waves.length - 1];',
                '',
                '    // 1. Heatmap Data Preparation (Categorical for Clean Styles)',
                '    var secKeys = Object.keys(reportData.summary[curWave].sections).sort();',
                '',
                '    // Matrices for Plotly',
                '    var z_cat = [], z_val = [], z_txt_col = [];',
                '',
                '    regKeys.forEach(r => {',
                '        var row_cat = [], row_val = [], row_col = [];',
                '        secKeys.forEach(s => {',
                '            var d = reportData.regions[r][curWave];',
                '            if (!d || !d.sections[s]) {',
                '                row_cat.push(null); row_val.push(""); row_col.push("black");',
                '            } else {',
                '                var sc = d.sections[s].sum / d.sections[s].count;',
                '                row_val.push(sc.toFixed(1)); // Display Text',
                '',
                '                // Bucket Logic',
                '                if (sc < 84) {',
                '                    row_cat.push(0); row_col.push("#991B1B"); // Dark Red',
                '                } else if (sc < 90) {',
                '                    row_cat.push(1); row_col.push("#92400E"); // Dark Amber',
                '                } else if (sc < 95) {',
                '                    row_cat.push(2); row_col.push("#1e3a8a"); // Dark Blue',
                '                } else {',
                '                    row_cat.push(3); row_col.push("#312E81"); // Dark Indigo',
                '                }',
                '            }',
                '        });',
                '        z_cat.push(row_cat);',
                '        z_val.push(row_val);',
                '        z_txt_col.push(row_col);',
                '    });',
                '',
                '    // Custom Legend HTML (Top Only)',
                '    var legendHTML = `',
                '           <div class="d-flex justify-content-center gap-4 small text-muted text-uppercase fw-bold" style="letter-spacing:1px; margin: 15px 0;">',
                '               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FECACA;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Critical (<84)</div>',
                '               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FDE68A;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Warning (84-90)</div>',
                '               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#BFDBFE;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Good (90-95)</div>',
                '               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#A5B4FC;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Excellent (>95)</div>',
                '           </div>`;',
                '',
                '    var container = document.getElementById("regionSectionHeatmap").parentElement;',
                '',
                '    // Clear old custom legends',
                '    container.querySelectorAll(".hm-legend-custom").forEach(e => e.remove());',
                '',
                '    // Inject Top Legend',
                '    var topLeg = document.createElement("div");',
                '    topLeg.className = "hm-legend-custom";',
                '    topLeg.innerHTML = legendHTML;',
                '    container.insertBefore(topLeg, document.getElementById("regionSectionHeatmap"));',
                '',
                '    // Modern Soft Pastel Colors (0,1,2,3)',
                '    var colors = [',
                '        [0, "#FECACA"], [0.25, "#FECACA"], // Soft Red',
                '        [0.25, "#FDE68A"], [0.5, "#FDE68A"], // Soft Amber',
                '        [0.5, "#BFDBFE"], [0.75, "#BFDBFE"], // Soft Blue',
                '        [0.75, "#A5B4FC"], [1, "#A5B4FC"]    // Soft Indigo',
                '    ];',
                '',
                '    var hmDiv = document.getElementById("regionSectionHeatmap");',
                '',
                '    Plotly.newPlot(hmDiv, [{',
                '        x: secKeys, // FULL NAMES NOW',
                '        y: regKeys,',
                '        z: z_cat,',
                '        text: z_val,',
                '        customdata: z_val,',
                '        type: "heatmap",',
                '        colorscale: colors,',
                '        zmin: 0, zmax: 3,',
                '        xgap: 5, ygap: 5,',
                '        texttemplate: "<b>%{text}</b>",',
                '        textfont: { color: z_txt_col, family: "Inter", size: 11 },',
                '        hovertemplate: "<b>%{y}</b><br>%{x}<br>Score: <b>%{text}</b><extra></extra>",',
                '        showscale: false',
                '    }], {',
                '        margin: { l: 120, b: 120, t: 10 }, // Increased bottom margin for rotated labels',
                '        xaxis: {',
                '            side: "bottom",',
                '            tickfont: { size: 10, color: "#4B5563", family: "Inter", weight: "600" },',
                '            tickangle: -25 // Slanted for readability',
                '        },',
                '        yaxis: { tickfont: { size: 11, color: "#6B7280", family: "Inter", weight: "bold" } },',
                '        font: { family: "Inter, sans-serif" },',
                '        height: 600, // Taller to accommodate labels',
                '        paper_bgcolor: \'rgba(0,0,0,0)\',',
                '        plot_bgcolor: \'rgba(0,0,0,0)\'',
                '    }, config);',
                '',
                '    // Interactivity: Click to Deep Dive',
                '    hmDiv.on("plotly_click", function (data) {',
                '        var pt = data.points[0];',
                '        var r = pt.y, fullSec = pt.x; // Now pt.x IS the full section name',
                '',
                '        var d = reportData.regions[r][curWave], secData = d.sections[fullSec];',
                '        var score = secData.sum / secData.count;',
                '        var natData = reportData.summary[curWave].sections[fullSec], natScore = natData.sum / natData.count, diff = score - natScore;',
                '',
                '        // Inject Modal if missing',
                '        if (!document.getElementById("heatmapModal")) {',
                '            var m = document.createElement("div");',
                '            m.innerHTML = `',
                '           <div class="modal fade" id="heatmapModal" tabindex="-1"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content border-0 shadow-lg" style="border-radius:12px;overflow:hidden;">',
                '               <div class="modal-header border-0 bg-white pb-0">',
                '                    <div><h5 class="modal-title fw-bold text-primary-custom" id="hmModalTitle">Analysis</h5><div class="text-muted small text-uppercase fw-bold" id="hmModalSubtitle" style="letter-spacing:1px;">Detail</div></div>',
                '                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>',
                '               </div>',
                '               <div class="modal-body p-4 bg-white"><div class="row g-4">',
                '                   <div class="col-md-5">',
                '                       <div class="p-4 bg-light rounded-3 h-100 text-center d-flex flex-column justify-content-center">',
                '                            <div class="text-uppercase text-muted small fw-bold mb-1">Score</div>',
                '                            <div class="display-3 fw-bold mb-2" id="hmScore" style="letter-spacing:-2px;">--</div>',
                '                            <div id="hmBadge"></div>',
                '                            <div class="mt-4 pt-3 border-top"><div class="small text-muted mb-1">vs National</div><div class="h5 fw-bold" id="hmVsNat">--</div></div>',
                '                       </div>',
                '                   </div>',
                '                   <div class="col-md-7">',
                '                        <div class="h-100">',
                '                            <div class="d-flex align-items-center mb-3"><span class="me-2">📉</span><span class="fw-bold text-danger">Bottom Performing Stores</span></div>',
                '                            <div class="table-responsive"><table class="table table-sm table-borderless mb-0" style="font-size:0.9rem;"><thead class="text-muted small text-uppercase"><tr><th>Store</th><th class="text-end">Score</th></tr></thead><tbody id="hmCulprits"></tbody></table></div>',
                '                        </div>',
                '                   </div>',
                '                   <div class="col-12"><div class="p-3 bg-light rounded-3 border-start border-4 border-primary"><div class="d-flex"><div class="me-3 fs-4">💡</div><div><h6 class="fw-bold mb-1">Recommended Action</h6><p class="mb-0 text-muted small" id="hmAction">--</p></div></div></div></div>',
                '                   <div class="col-12"><div class="pt-3 border-top"><div class="small text-muted text-uppercase fw-bold mb-2">Historical Trend</div><div id="hmTrendChart" style="height:120px;"></div></div></div>',
                '               </div></div>',
                '           </div></div></div>`;',
                '            document.body.insertAdjacentHTML(\'beforeend\', m.innerHTML);',
                '        }',
                '',
                '        // Populate Modal',
                '        document.getElementById("hmModalTitle").textContent = r;',
                '        document.getElementById("hmModalSubtitle").textContent = fullSec;',
                '        var scEl = document.getElementById("hmScore"); scEl.textContent = score.toFixed(2);',
                '        scEl.className = "display-3 fw-bold mb-2 " + (score < 84 ? "text-danger" : "text-primary-custom");',
                '        document.getElementById("hmBadge").innerHTML = score < 84 ? `<span class="badge bg-danger px-3 py-2 rounded-pill">CRITICAL</span>` : (score < 90 ? `<span class="badge bg-warning text-dark px-3 py-2 rounded-pill">WARNING</span>` : `<span class="badge bg-success px-3 py-2 rounded-pill">GOOD</span>`);',
                '        document.getElementById("hmVsNat").innerHTML = (diff >= 0 ? `<span class="text-success">▲ +` : `<span class="text-danger">▼ `) + diff.toFixed(2) + "</span>";',
                '        document.getElementById("hmAction").textContent = reportData.actionPlanConfig[fullSec] || "Review operational standards and compliance.";',
                '',
                '        var culprits = Object.values(reportData.stores).filter(s => s.meta.region === r && s.results[curWave]).map(s => ({ n: s.meta.name, s: s.results[curWave].sections[fullSec] || 0 })).sort((a, b) => a.s - b.s).slice(0, 5);',
                '        document.getElementById("hmCulprits").innerHTML = culprits.map(c => `<tr><td>${c.n}</td><td class="text-end fw-bold ${c.s < 84 ? "text-danger" : ""}">${c.s.toFixed(2)}</td></tr>`).join("");',
                '',
                '        var yTrend = waves.map(w => { var rd = reportData.regions[r][w]; return rd && rd.sections[fullSec] ? rd.sections[fullSec].sum / rd.sections[fullSec].count : null; });',
                '        Plotly.newPlot("hmTrendChart", [{ x: waves, y: yTrend, type: "scatter", mode: "lines+markers", line: { color: "#002060", width: 2, shape: "spline" }, marker: { color: "#002060", size: 6 } }], { margin: { t: 10, l: 30, r: 10, b: 20 }, height: 120, xaxis: { showgrid: false, tickfont: { size: 10 } }, yaxis: { showgrid: true, gridcolor: "#eee", tickfont: { size: 10 } } }, config);',
                '',
                '        var modalEl = document.getElementById("heatmapModal");',
                '        var modal = bootstrap.Modal.getInstance(modalEl);',
                '        if (!modal) modal = new bootstrap.Modal(modalEl);',
                '        modal.show();',
                '    });',
                '',
                '    // 2. Performance Trends - UNCHANGED',
                '    var traces = regKeys.map(r => {',
                '        var y = waves.map(w => { var d = reportData.regions[r][w]; return d ? d.sum / d.count : null; });',
                '        return { x: waves, y: y, mode: "lines+markers", name: r, line: { shape: "spline", width: 3 }, marker: { size: 8 }, visible: true };',
                '    });',
                '    Plotly.newPlot("regionTrendChart", traces, {',
                '        margin: { t: 20, l: 40, r: 20, b: 40 },',
                '        showlegend: true, legend: { orientation: "h", y: -0.15 },',
                '        xaxis: { showgrid: false }, yaxis: { gridcolor: "#F3F4F6", showgrid: true }',
                '    }, config);',
                '',
                '    // 3. Leaderboard - UNCHANGED',
                '    var cont = document.getElementById("regionDetailCards");',
                '    cont.innerHTML = "";',
                '    // Sort regions by score',
                '    var sortedRegs = regKeys.map(r => {',
                '        var d = reportData.regions[r][curWave]; return { n: r, s: d ? d.sum / d.count : 0, d: d };',
                '    }).sort((a, b) => b.s - a.s);',
                '',
                '    sortedRegs.forEach((item, idx) => {',
                '        var d = item.d; if (!d) return;',
                '        var score = item.s;',
                '        var prevW = waves.length > 1 ? waves[waves.length - 2] : null;',
                '        var prevD = prevW ? reportData.regions[item.n][prevW] : null;',
                '        var prevS = prevD ? prevD.sum / prevD.count : 0;',
                '        var diff = score - prevS;',
                '',
                '        var secs = Object.entries(d.sections).map(([k, v]) => ({ k: k, v: v.sum / v.count })).sort((a, b) => a.v - b.v).slice(0, 3);',
                '        var weakHTML = secs.map(x => `<div class="d-flex justify-content-between align-items-center mb-1 text-danger small"><span class="text-truncate" style="max-width:180px">${x.k}</span><strong>${x.v.toFixed(1)}</strong></div>`).join("");',
                '',
                '        var rankBadge = idx < 3 ? `<span class="rank-badge rank-top-${idx + 1} shadow-sm" style="width:32px;height:32px;font-size:1rem;">${idx + 1}</span>` : `<span class="badge bg-light text-dark border">#${idx + 1}</span>`;',
                '',
                '        var col = document.createElement("div");',
                '        col.className = "col-lg-4 col-md-6";',
                '        col.innerHTML = `',
                '           <div class="card h-100 shadow-hover border-0" style="transition: transform 0.2s;">',
                '               <div class="card-body p-4 position-relative">',
                '                   <div class="position-absolute top-0 end-0 m-3">${rankBadge}</div>',
                '                   <h5 class="fw-bold text-primary-custom mb-1">${item.n}</h5>',
                '                   <div class="text-muted small mb-3">${d.count} Outlet Aktif</div>',
                '                   <div class="d-flex align-items-center mb-4">',
                '                        <h2 class="display-5 fw-bold mb-0 me-3 ${score < 84 ? "text-danger" : "text-primary-custom"}">${score.toFixed(2)}</h2>',
                '                        <div class="${diff >= 0 ? "text-success" : "text-danger"} fw-bold small">',
                '                            ${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)}',
                '                        </div>',
                '                   </div>',
                '                   <div class="p-3 bg-light rounded-3 mb-3 border-start border-3 border-danger">',
                '                       <div class="text-uppercase fw-bold text-muted small mb-2" style="font-size:0.7rem; letter-spacing:1px;">Focus Areas (Lowest 3)</div>',
                '                       ${weakHTML}',
                '                   </div>',
                '                   <button class="btn btn-outline-primary w-100 btn-sm" onclick="showTab(\'stores\'); document.getElementById(\'storeSearch\').value=\'${item.n}\'; renderStoreList();">Deep Dive</button>',
                '               </div>',
                '           </div>`;',
                '        cont.appendChild(col);',
                '    });',
                '}',
                '',

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
