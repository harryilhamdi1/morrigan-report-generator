const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const path = require('path');

const ACTION_PLANS = {
    'A. Tampilan Tampak Depan Outlet': 'Inspect facade cleanliness, signage lighting, and window displays.',
    'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet': 'Greeting standard briefing.',
    'C. Suasana & Kenyamanan Outlet': 'Check AC and music.',
    'D. Penampilan Retail Assistant': 'Grooming check.',
    'E. Pelayanan Penjualan & Pengetahuan Produk': 'Product knowledge training.',
    'F. Pengalaman Mencoba Produk': 'Offer fitting room.',
    'G. Rekomendasi untuk Membeli Produk': 'Up-selling training.',
    'H. Pembelian Produk & Pembayaran di Kasir': 'POS speed check.',
    'I. Penampilan Kasir': 'Cashier grooming.',
    'J. Toilet (Khusus Store yang memiliki toilet )': 'Cleaning checklist.',
    'K. Salam Perpisahan oleh Retail Asisstant': 'Thank and invite back.'
};

async function processWave(filePath, waveName, year) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, relax_column_count: true, trim: true, bom: true });

    return records.map(record => {
        const siteCode = record['Site Code'];
        if (!siteCode) return null;

        let score = 0;
        const scoreKey = Object.keys(record).find(k => k.trim() === 'Final Score');
        if (scoreKey) score = parseFloat(record[scoreKey].replace(',', '.')) || 0;

        const sections = {};
        Object.keys(ACTION_PLANS).forEach(s => {
            const val = parseFloat((record[s] || "0").replace(',', '.')) || 0;
            sections[s] = val;
        });

        return {
            siteCode,
            siteName: record['Site Name'],
            region: (record['Regional'] || "UNKNOWN").toUpperCase(),
            branch: (record['Branch'] || "UNKNOWN").toUpperCase(),
            totalScore: score,
            sections,
            wave: waveName,
            year: year
        };
    }).filter(x => x && x.region !== 'CLOSED');
}

async function processAll() {
    const waves = [
        { file: 'Wave 1 2024.csv', name: 'Wave 1', year: 2024 },
        { file: 'Wave 2 2024.csv', name: 'Wave 2', year: 2024 },
        { file: 'Wave 3 2024.csv', name: 'Wave 3', year: 2024 },
        { file: 'Wave 1 2025.csv', name: 'Wave 1', year: 2025 },
        { file: 'Wave 2 2025.csv', name: 'Wave 2', year: 2025 }
    ];

    let allData = [];
    for (const w of waves) {
        try {
            const data = await processWave(path.join(__dirname, 'CSV', w.file), w.name, w.year);
            allData = allData.concat(data);
            console.log(`Loaded ${w.file}: ${data.length} records`);
        } catch (e) { console.error(e); }
    }

    const hierarchy = { summary: {}, regions: {}, branches: {}, stores: {} };
    allData.forEach(entry => {
        const wKey = `${entry.year} ${entry.wave}`;
        if (!hierarchy.summary[wKey]) hierarchy.summary[wKey] = { sum: 0, count: 0, sections: {} };
        hierarchy.summary[wKey].sum += entry.totalScore;
        hierarchy.summary[wKey].count++;

        if (!hierarchy.regions[entry.region]) hierarchy.regions[entry.region] = {};
        if (!hierarchy.regions[entry.region][wKey]) hierarchy.regions[entry.region][wKey] = { sum: 0, count: 0, sections: {} };
        hierarchy.regions[entry.region][wKey].sum += entry.totalScore;
        hierarchy.regions[entry.region][wKey].count++;

        if (!hierarchy.branches[entry.branch]) hierarchy.branches[entry.branch] = {};
        if (!hierarchy.branches[entry.branch][wKey]) hierarchy.branches[entry.branch][wKey] = { sum: 0, count: 0, sections: {} };
        hierarchy.branches[entry.branch][wKey].sum += entry.totalScore;
        hierarchy.branches[entry.branch][wKey].count++;

        Object.entries(entry.sections).forEach(([s, v]) => {
            if (!hierarchy.summary[wKey].sections[s]) hierarchy.summary[wKey].sections[s] = { sum: 0, count: 0 };
            hierarchy.summary[wKey].sections[s].sum += v;
            hierarchy.summary[wKey].sections[s].count++;
        });

        if (!hierarchy.stores[entry.siteCode]) hierarchy.stores[entry.siteCode] = { meta: { name: entry.siteName, code: entry.siteCode, region: entry.region, branch: entry.branch }, results: {} };
        hierarchy.stores[entry.siteCode].results[wKey] = { totalScore: entry.totalScore, sections: entry.sections };
    });

    const reportData = { summary: hierarchy.summary, regions: hierarchy.regions, branches: hierarchy.branches, stores: hierarchy.stores, actionPlanConfig: ACTION_PLANS, threshold: 84 };
    const newInitCode = require('fs').readFileSync(path.join(__dirname, 'new_init_branches_matrix.js'), 'utf8');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Morrigan Executive Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; background: #F8F9FA; color: #1F2937; }
        .sidebar { width: 280px; position: fixed; height: 100vh; background: #002060; color: white; padding: 30px; z-index: 100; }
        .main { margin-left: 280px; padding: 40px; }
        .nav-link { color: rgba(255,255,255,0.6); margin-bottom: 12px; cursor: pointer; padding: 12px 20px; border-radius: 10px; transition: all 0.2s; }
        .nav-link:hover, .nav-link.active { color: white; background: rgba(255,255,255,0.1); }
        .card { border: none; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    </style>
</head>
<body>
    <div class="sidebar">
        <h3 class="fw-bold mb-5" style="letter-spacing:2px">MORRIGAN</h3>
        <div class="nav-link active" onclick="showTab('summary')">Summary</div>
        <div class="nav-link" onclick="showTab('regions')">Regions</div>
        <div class="nav-link" onclick="showTab('branches')">Branches</div>
        <div class="nav-link" onclick="showTab('stores')">Stores</div>
    </div>
    <div class="main">
        <div id="tab-summary"><h2>Executive Summary</h2><div class="card p-4"><div id="summaryChart" style="height:400px"></div></div></div>
        <div id="tab-regions" style="display:none"><h2>Regional Trends</h2><div class="card p-4"><div id="regionTrendChart" style="height:400px"></div></div></div>
        <div id="tab-branches" style="display:none">
            <div id="branchDashboardContainer"></div>
            <div id="branchBarChart" style="display:none"></div>
        </div>
        <div id="tab-stores" style="display:none"><h2>Store Deep Dive</h2>
            <div class="card p-4 mb-4"><div class="row g-3">
                <div class="col-md-6"><input id="storeSearch" class="form-control" onkeyup="renderStoreList()" placeholder="Search Store Name..."></div>
                <div class="col-md-6"><select id="storeSelect" class="form-select" onchange="loadStoreDetail()"><option value="">Select a Store...</option></select></div>
            </div></div>
            <div id="storeContent" style="display:none" class="card p-4"><h3 id="stName" class="text-primary-custom mb-4"></h3><div id="stTrendChart" style="height:350px"></div></div>
        </div>
    </div>
    <script>
        var reportData = ${JSON.stringify(reportData)};
        var sortedWaves = Object.keys(reportData.summary).sort();
        var config = { responsive: true, displayModeBar: false };

        function showTab(t) {
            document.querySelectorAll('.main > div').forEach(d => d.style.display = 'none');
            document.getElementById('tab-' + t).style.display = 'block';
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            event.target.classList.add('active');
            window.dispatchEvent(new Event('resize'));
        }

        function initSummary() {
            var traces = [{ x: sortedWaves, y: sortedWaves.map(w => reportData.summary[w].sum / reportData.summary[w].count), type: 'scatter', mode: 'lines+markers', line: {color:'#002060', width:3} }];
            Plotly.newPlot('summaryChart', traces, { margin: { t: 20 }, yaxis: { range: [70, 100] } }, config);
        }
        
        function initRegions() {
             var traces = Object.keys(reportData.regions).map(r => ({ x: sortedWaves, y: sortedWaves.map(w => reportData.regions[r][w] ? reportData.regions[r][w].sum / reportData.regions[r][w].count : null), name: r, type: 'scatter', mode: 'lines+markers' }));
             Plotly.newPlot('regionTrendChart', traces, { margin: { t: 20 }, yaxis: { range: [70, 100] } }, config);
        }

        ${newInitCode}

        function renderStoreList() {
            var val = document.getElementById('storeSearch').value.toLowerCase();
            var sel = document.getElementById('storeSelect');
            sel.innerHTML = '<option value="">Select Store...</option>';
            var list = Object.values(reportData.stores).filter(s => s.meta.name.toLowerCase().includes(val));
            list.slice(0, 100).forEach(s => {
                var opt = document.createElement('option'); opt.value = s.meta.code; opt.textContent = s.meta.name; sel.appendChild(opt);
            });
        }

        function loadStoreDetail() {
            var c = document.getElementById('storeSelect').value; if(!c) return;
            var s = reportData.stores[c]; document.getElementById('stName').textContent = s.meta.name; document.getElementById('storeContent').style.display='block';
            var traces = [{ x: sortedWaves, y: sortedWaves.map(w => s.results[w] ? s.results[w].totalScore : null), type: 'scatter', mode: 'lines+markers', line: {color:'#002060'} }];
            Plotly.newPlot('stTrendChart', traces, { margin: { t: 20 }, yaxis: { range: [60, 105] } }, config);
        }

        window.onload = function() { initSummary(); initRegions(); initBranches(); renderStoreList(); };
    </script>
</body>
</html>
    `;

    await fs.writeFile('ESS Retail In Depth Analysis.html', html);
    console.log("Report Re-Generated: ESS Retail In Depth Analysis.html");
}

processAll();
