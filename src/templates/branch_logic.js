// --- Branch Strategy Module ---

function initBranches() {
    var bKeys = Object.keys(reportData.branches).sort();
    var waves = sortedWaves;
    var cur = waves[waves.length - 1];
    var prev = waves.length > 1 ? waves[waves.length - 2] : null;

    // 1. Data Processing
    var brData = bKeys.map(br => {
        var d = reportData.branches[br][cur];
        var dPrev = prev ? reportData.branches[br][prev] : null;
        var score = d ? d.sum / d.count : 0;
        var pScore = dPrev ? dPrev.sum / dPrev.count : 0;
        var momentum = score - pScore;
        var outletCount = Object.values(reportData.stores).filter(s => s.meta.branch === br && s.results[cur]).length;
        return { n: br, s: score, mom: momentum, count: outletCount, d: d };
    }); // Sorting happens in specific charts

    document.getElementById("branchCountDisplay").textContent = bKeys.length + " Units - " + brData.reduce((a, b) => a + b.count, 0) + " Outlets";

    // 2. Compute Statistics
    var topPerf = [...brData].sort((a, b) => b.s - a.s)[0];
    var fastImp = [...brData].sort((a, b) => b.mom - a.mom)[0];
    var scores = brData.map(b => b.s);
    var gap = Math.max(...scores) - Math.min(...scores);
    var hExc = scores.filter(s => s >= 95).length;
    var hWarn = scores.filter(s => s >= 84 && s < 95).length;
    var hCrit = scores.filter(s => s < 84).length;

    // 3. Render Components
    renderBranchKPIs(topPerf, fastImp, gap, hExc, hWarn, hCrit);
    renderBranchMomentumChart(brData);
    renderBranchMatrixChart(brData);
    renderBranchInsights(topPerf, fastImp, hCrit, brData);
    renderBranchCards(brData, waves);
}

function renderBranchKPIs(top, fast, gap, hExc, hWarn, hCrit) {
    var html = `
    <div class="col-xl-3 col-md-6">
        <div class="card border-0 shadow-sm h-100 kpi-card" style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);">
            <div class="card-body p-4">
                <div class="d-flex align-items-center mb-2"><span class="fs-4 me-2">🏆</span><span class="small fw-bold text-primary text-uppercase">Top Performer</span></div>
                <h5 class="fw-bold text-dark mb-1 text-truncate">${top.n}</h5>
                <div class="small text-muted">${top.s.toFixed(2)} pts</div>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="card border-0 shadow-sm h-100 kpi-card" style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);">
            <div class="card-body p-4">
                <div class="d-flex align-items-center mb-2"><span class="fs-4 me-2">🚀</span><span class="small fw-bold text-success text-uppercase">Momentum Leader</span></div>
                <h5 class="fw-bold text-dark mb-1 text-truncate">${fast.n}</h5>
                <div class="small text-muted">+${fast.mom.toFixed(2)} pts (Fastest Growth)</div>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="card border-0 shadow-sm h-100 kpi-card" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%);">
            <div class="card-body p-4">
                <div class="d-flex align-items-center mb-2"><span class="fs-4 me-2">⚠️</span><span class="small fw-bold text-warning text-uppercase" style="color: #B45309 !important;">Gap Analysis</span></div>
                <h5 class="fw-bold text-dark mb-1">${gap.toFixed(2)} pts</h5>
                <div class="small text-muted" style="color: #92400E !important;">Spread: High vs Low</div>
            </div>
        </div>
    </div>
    <div class="col-xl-3 col-md-6">
        <div class="card border-0 shadow-sm h-100 kpi-card" style="background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);">
            <div class="card-body p-4">
                 <div class="d-flex align-items-center mb-2"><span class="fs-4 me-2">📊</span><span class="small fw-bold text-purple text-uppercase" style="color: #6B21A8 !important;">Health Index</span></div>
                 <h5 class="fw-bold text-dark mb-1">${hExc} <span class="text-muted fw-light mx-1">/</span> ${hWarn} <span class="text-muted fw-light mx-1">/</span> ${hCrit}</h5>
                 <div class="small text-muted" style="color: #581C87 !important;">Exc / Warn / Crit</div>
            </div>
        </div>
    </div>`;
    document.getElementById("branchKPIs").innerHTML = html;
}

function renderBranchMomentumChart(brData) {
    // Sort by Momentum for clear bar chart
    var sorted = [...brData].sort((a, b) => a.mom - b.mom);
    var yNames = sorted.map(d => d.n);
    var xMom = sorted.map(d => d.mom);
    var xScore = sorted.map(d => d.s);

    var markerColors = xScore.map(s => s >= 95 ? '#10B981' : (s >= 84 ? '#F59E0B' : '#EF4444'));
    var momColors = xMom.map(m => m >= 0 ? '#34D399' : '#F87171');

    Plotly.newPlot("branchMomentumChart", [
        {
            y: yNames, x: xMom, type: 'bar', orientation: 'h', name: 'Growth',
            marker: { color: momColors, opacity: 0.9, line: { width: 0 } },
            text: xMom.map(m => (m > 0 ? "+" : "") + m.toFixed(2)), textposition: "inside",
            insidetextfont: { color: "white", family: "Inter", weight: "bold", size: 10 },
            xaxis: 'x1', hoverinfo: 'y+x'
        },
        {
            y: yNames, x: xScore, type: 'scatter', mode: 'markers+text', name: 'Score',
            marker: { color: markerColors, size: 14, line: { color: 'white', width: 2 }, symbol: 'circle' },
            text: xScore.map(s => s.toFixed(1)), textposition: 'right',
            textfont: { size: 11, family: "Inter", weight: "bold", color: "#374151" },
            xaxis: 'x2', hoverinfo: 'y+x'
        }
    ], {
        grid: { rows: 1, columns: 2, pattern: 'independent' },
        xaxis: { title: '<b>MOMENTUM (Pts)</b>', domain: [0, 0.45], zeroline: true, showgrid: true, tickfont: { size: 10, color: "#9CA3AF" } },
        xaxis2: { title: '<b>CURRENT SCORE</b>', domain: [0.55, 1], range: [60, 105], showgrid: true, gridcolor: '#F3F4F6', tickfont: { size: 10, color: "#9CA3AF" } },
        yaxis: { automargin: true, tickfont: { size: 11, family: 'Inter', weight: '600', color: "#111827" } },
        yaxis2: { showticklabels: false, matches: 'y' },
        margin: { l: 150, r: 20, t: 20, b: 40 },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        height: 550, font: { family: 'Inter' }
    }, config);
}

function renderBranchMatrixChart(brData) {
    var x = brData.map(d => d.s);
    var y = brData.map(d => d.mom);
    var text = brData.map(d => d.n);
    var size = brData.map(d => Math.max(12, Math.sqrt(d.count) * 10));
    var colors = x.map(s => s >= 84 ? '#002060' : '#DC2626');

    // Shapes: Q1 (Stars), Q2 (Rising), Q3 (Watch), Q4 (Critical)
    // assuming axis ranges: Score [60, 100], Mom [-15, 15]
    var shapes = [
        { type: 'rect', x0: 84, y0: 0, x1: 105, y1: 20, fillcolor: '#ECFDF5', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Stars
        { type: 'rect', x0: 50, y0: 0, x1: 84, y1: 20, fillcolor: '#EFF6FF', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Rising
        { type: 'rect', x0: 84, y0: -20, x1: 105, y1: 0, fillcolor: '#FFFBEB', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Watch
        { type: 'rect', x0: 50, y0: -20, x1: 84, y1: 0, fillcolor: '#FEF2F2', opacity: 0.4, line: { width: 0 }, layer: 'below' }  // Critical
    ];

    var divId = "branchMatrixChart";
    var chart = document.getElementById(divId);

    Plotly.newPlot(divId, [{
        x: x, y: y, text: text, mode: 'markers+text',
        marker: { size: size, color: colors, opacity: 0.8, line: { color: 'white', width: 1 }, sizemode: 'diameter' },
        textposition: 'top center', textfont: { size: 10, family: 'Inter', weight: 'bold', color: '#374151' },
        hovertemplate: '<b>%{text}</b><br>Score: %{x:.2f}<br>Momentum: %{y:.2f}<extra></extra>'
    }], {
        xaxis: { title: 'Current Score →', range: [60, 100], showgrid: true, gridcolor: 'white', zeroline: false },
        yaxis: { title: 'Momentum ↑', range: [-15, 15], showgrid: true, gridcolor: 'white', zeroline: true, zerolinecolor: '#9CA3AF' },
        shapes: [
            ...shapes,
            { type: 'line', x0: 84, x1: 84, y0: -20, y1: 20, line: { color: '#EF4444', width: 2, dash: 'dash' } },
            { type: 'line', x0: 50, x1: 105, y0: 0, y1: 0, line: { color: '#9CA3AF', width: 1 } }
        ],
        annotations: [
            { x: 97, y: 13, text: '⭐ STARS', showarrow: false, font: { color: '#059669', size: 14, weight: '900' } },
            { x: 65, y: 13, text: '⚡ RISING', showarrow: false, font: { color: '#2563EB', size: 14, weight: '900' } },
            { x: 97, y: -13, text: '👀 WATCH', showarrow: false, font: { color: '#D97706', size: 14, weight: '900' } },
            { x: 65, y: -13, text: '🛑 CRITICAL', showarrow: false, font: { color: '#DC2626', size: 14, weight: '900' } }
        ],
        margin: { t: 20, b: 40, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter' }, hovermode: 'closest'
    }, config);

    // Interaction
    chart.on('plotly_click', function (data) {
        var name = data.points[0].text;
        var inp = document.getElementById("branchSearch");
        inp.value = name;
        filterBranchCards();
        document.getElementById("branchContainer").scrollIntoView({ behavior: 'smooth' });
    });
}

function renderBranchInsights(top, fast, hCrit, brData) {
    var insights = [];
    insights.push(`<div>📌 <strong>${top.n}</strong> leads with <strong>${top.s.toFixed(2)}</strong>.`);
    if (hCrit > 0) {
        var names = brData.filter(b => b.s < 84).map(b => b.n).join(", ");
        insights.push(`<div>🚨 <strong>${hCrit} Critical Branches</strong> (<84): <span class="text-danger">${names}</span>.</div>`);
    }
    insights.push(`<div>📈 <strong>${fast.n}</strong> has the strongest momentum (<span class="text-success">+${fast.mom.toFixed(2)}</span>).</div>`);

    var stars = brData.filter(b => b.s >= 84 && b.mom > 0).length;
    var rising = brData.filter(b => b.s < 84 && b.mom > 0).length;
    insights.push(`<div>💡 <strong>Strategic Mix</strong>: ${stars} Stars (High/Growing), ${rising} Rising (Low/Growing).</div>`);

    document.getElementById("branchInsights").innerHTML = insights.join("");
}

function renderBranchCards(data, waves) {
    var cont = document.getElementById("branchContainer");
    cont.innerHTML = "";

    // Sort by Score Descending for lists
    var viewData = [...data].sort((a, b) => b.s - a.s);

    viewData.forEach((d, i) => {
        var rank = i + 1;
        var badge = d.s >= 95 ? '<span class="badge bg-primary-custom">EXCELLENT</span>' : (d.s >= 84 ? '<span class="badge bg-warning text-dark">WARNING</span>' : '<span class="badge bg-danger">CRITICAL</span>');

        var yTrend = waves.map(w => { var bd = reportData.branches[d.n][w]; return bd ? bd.sum / bd.count : null; });
        var sparkHTML = generateSparkline(yTrend);

        // Limit lists to top 3 items
        var getStores = (asc) => Object.values(reportData.stores)
            .filter(s => s.meta.branch === d.n && s.results[waves[waves.length - 1]])
            .map(s => ({ n: s.meta.name, s: s.results[waves[waves.length - 1]].totalScore }))
            .sort((a, b) => asc ? a.s - b.s : b.s - a.s) // asc = worst first
            .slice(0, 3);

        var getSecs = (asc) => Object.entries(d.d.sections)
            .map(([k, v]) => ({ k: k, s: v.sum / v.count }))
            .sort((a, b) => asc ? a.s - b.s : b.s - a.s)
            .slice(0, 3);

        var dragStores = getStores(true).map(s => `
            <div class="d-flex justify-content-between small mb-1 border-bottom border-light pb-1">
                <span class="text-truncate text-secondary" style="max-width:180px;" title="${s.n}">${s.n}</span>
                <span class="fw-bold ${s.s < 84 ? 'text-danger' : 'text-dark'}">${s.s.toFixed(1)}</span>
            </div>`).join("");

        var focusSecs = getSecs(true).map(s => `
            <div class="d-flex justify-content-between small mb-1 border-bottom border-light pb-1">
                <span class="text-truncate text-secondary" style="max-width:180px;" title="${s.k}">${s.k}</span>
                <span class="fw-bold ${s.s < 84 ? 'text-danger' : 'text-dark'}">${s.s.toFixed(1)}</span>
            </div>`).join("");

        var col = document.createElement("div");
        col.className = "col-12 branch-card-item";
        col.dataset.name = d.n.toLowerCase();

        col.innerHTML = `
        <div class="card border-0 shadow-sm hover-elevate" style="transition: all 0.2s ease-in-out;">
            <div class="card-body p-4">
                <div class="row align-items-center">
                    <div class="col-xl-3 col-lg-4 border-end">
                        <div class="d-flex align-items-center mb-2">
                            <span class="badge bg-white text-dark border me-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width:28px;height:28px;font-size:0.8rem;">${rank}</span>
                            <h5 class="fw-bold text-dark mb-0 text-truncate" title="${d.n}" style="font-family: 'Inter', sans-serif;">${d.n}</h5>
                        </div>
                        <div class="d-flex gap-2 mb-3">
                            <span class="badge bg-light text-secondary border">${d.count} Outlets</span>
                            ${badge}
                        </div>
                        <h2 class="display-4 fw-bold mb-0 ${d.s < 84 ? 'text-danger' : 'text-primary'}" style="letter-spacing:-1px;">${d.s.toFixed(2)}</h2>
                         <div class="small fw-bold ${d.mom >= 0 ? 'text-success' : 'text-danger'} mt-1">
                            ${d.mom >= 0 ? '▲ TREND UP' : '▼ TREND DOWN'} <span class="text-muted ms-1">(${Math.abs(d.mom).toFixed(2)})</span>
                        </div>
                    </div>
                    <div class="col-xl-3 col-lg-2 px-4 border-end d-none d-lg-block">
                        <div class="small text-uppercase fw-bold text-muted mb-3" style="font-size:0.7rem; letter-spacing:0.5px;">Momentum Trend</div>
                        <div style="height:50px;">${sparkHTML}</div>
                    </div>
                    <div class="col-xl-3 col-lg-3 px-4 border-end">
                         <div class="small text-uppercase fw-bold text-danger mb-2" style="font-size:0.7rem;">📉 Drag Stores (Bottom 3)</div>
                         ${dragStores || '<span class="small text-muted">No data</span>'}
                    </div>
                    <div class="col-xl-3 col-lg-3 px-4">
                         <div class="small text-uppercase fw-bold text-warning mb-2" style="font-size:0.7rem; color: #B45309 !important;">⚠ Focus Sections</div>
                         ${focusSecs || '<span class="small text-muted">No data</span>'}
                    </div>
                </div>
            </div>
        </div>`;
        cont.appendChild(col);
    });
}

function filterBranchCards() {
    var term = document.getElementById("branchSearch").value.toLowerCase();
    var cards = document.querySelectorAll(".branch-card-item");
    cards.forEach(c => {
        c.style.display = c.dataset.name.includes(term) ? "block" : "none";
    });
}
