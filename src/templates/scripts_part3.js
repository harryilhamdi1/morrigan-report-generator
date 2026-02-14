
// --- Master Store List Logic ---
var storeListState = { page: 1, limit: 15, total: 0, filteredData: [] };

function initStoreTable() {
    // Populate Region Filter
    var regSel = document.getElementById("storeListRegion");
    if (!regSel) return;
    var regs = Object.keys(reportData.regions).sort();
    regs.forEach(r => { var opt = document.createElement("option"); opt.value = r; opt.textContent = r; regSel.appendChild(opt); });
    renderStoreTable();
}

function updateBranchFilter() {
    var reg = document.getElementById("storeListRegion").value;
    var brSel = document.getElementById("storeListBranch");
    brSel.innerHTML = "<option value=''>All Branches</option>";
    brSel.disabled = !reg;

    if (reg) {
        var branches = Object.keys(reportData.branches).filter(b => {
            // Find a store in this branch and check its region (approximation, or check branch map)
            // Better: Iterate all stores to map branch -> region
            return Object.values(reportData.stores).some(s => s.meta.region === reg && s.meta.branch === b);
        }).sort();

        branches.forEach(b => { var opt = document.createElement("option"); opt.value = b; opt.textContent = b; brSel.appendChild(opt); });
    }
}

function resetStoreFilters() {
    document.getElementById("storeListSearch").value = "";
    document.getElementById("storeListRegion").value = "";
    updateBranchFilter();
    renderStoreTable();
}

function renderStoreTable() {
    var search = document.getElementById("storeListSearch").value.toLowerCase();
    var reg = document.getElementById("storeListRegion").value;
    var br = document.getElementById("storeListBranch").value;
    var cur = sortedWaves[sortedWaves.length - 1];

    // Filter
    var list = Object.values(reportData.stores).filter(s => {
        var m = s.meta;
        return (m.name.toLowerCase().includes(search) || m.code.includes(search)) &&
            (!reg || m.region === reg) &&
            (!br || m.branch === br);
    });

    // Sort by Score Descending
    list.sort((a, b) => {
        var sa = a.results[cur] ? a.results[cur].totalScore : 0;
        var sb = b.results[cur] ? b.results[cur].totalScore : 0;
        return sb - sa;
    });

    storeListState.total = list.length;
    storeListState.filteredData = list;

    // Pagination
    var totalPages = Math.ceil(list.length / storeListState.limit);
    if (storeListState.page > totalPages) storeListState.page = totalPages || 1;

    var start = (storeListState.page - 1) * storeListState.limit;
    var end = start + storeListState.limit;
    var pageData = list.slice(start, end);

    var tbody = document.getElementById("storeMasterBody");
    tbody.innerHTML = "";

    pageData.forEach((s, idx) => {
        var rank = start + idx + 1;
        var d = s.results[cur];
        var score = d ? d.totalScore : 0;

        // Luxury Badge Logic
        var scoreBadge = "";
        if (score < 84) scoreBadge = `<span class="badge bg-danger rounded-pill px-3">${score.toFixed(2)}</span>`;
        else if (score >= 95) scoreBadge = `<span class="badge bg-success rounded-pill px-3">${score.toFixed(2)}</span>`;
        else scoreBadge = `<span class="fw-bold text-dark">${score.toFixed(2)}</span>`;

        var row = `<tr>
            <td class="ps-4 fw-bold text-secondary">#${rank}</td>
            <td><span class="badge bg-light text-dark border">${s.meta.code}</span></td>
            <td><div class="fw-bold text-dark">${s.meta.name}</div></td>
            <td><span class="badge bg-soft-primary text-primary-custom border-0">${s.meta.branch}</span></td>
            <td><span class="small text-secondary fw-bold text-uppercase">${s.meta.region}</span></td>
            <td class="text-end text-dark">${scoreBadge}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="viewStore('${s.meta.code}')">See Details</button>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });

    document.getElementById("storeListCount").textContent = `Showing ${start + 1}-${Math.min(end, list.length)} of ${list.length} stores`;
}

function changePage(dir) {
    var max = Math.ceil(storeListState.filteredData.length / storeListState.limit);
    var next = storeListState.page + dir;
    if (next > 0 && next <= max) {
        storeListState.page = next;
        renderStoreTable();
    }
}

function viewStore(id) {
    // Switch Views
    document.getElementById("storeListContainer").style.display = "none";
    document.getElementById("storeContent").style.display = "block";

    // Populate dropdown for compatibility (hidden but functional)
    var sel = document.getElementById("storeSelect");
    if (sel) sel.value = id;

    loadStoreDetail(id);
    window.scrollTo(0, 0);
}

function showStoreList() {
    document.getElementById("storeContent").style.display = "none";
    document.getElementById("storeListContainer").style.display = "block";
}


var radarMode = 'region'; // Default

function toggleRadar(mode) {
    radarMode = mode;
    var btnReg = document.querySelector("button[onclick=\"toggleRadar('region')\"]");
    var btnBr = document.querySelector("button[onclick=\"toggleRadar('branch')\"]");
    if (mode === 'region') {
        btnReg.classList.add('active'); btnBr.classList.remove('active');
    } else {
        btnBr.classList.add('active'); btnReg.classList.remove('active');
    }
    loadStoreDetail(); // Re-render logic (or just update chart, but re-render is safe)
}

function generateSparkline(data) {
    if (!data || data.length < 2) return "";
    var w = 100, h = 30;
    var max = 100, min = 60; // Fixed scale for consistency
    var step = w / (data.length - 1);
    var path = "M 0 " + (h - ((data[0] - min) / (max - min) * h));

    for (var i = 1; i < data.length; i++) {
        var val = data[i];
        if (val === null) continue;
        var x = i * step;
        var y = h - ((val - min) / (max - min) * h);
        path += " L " + x + " " + y;
    }

    var last = data[data.length - 1], first = data[0];
    var color = last >= first ? "#059669" : "#DC2626"; // Green if up, Red if down

    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="${color}" stroke-width="2" style="overflow:visible">
        <path d="${path}" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${w}" cy="${h - ((last - min) / (max - min) * h)}" r="2" fill="${color}"/>
    </svg>`;
}

function loadStoreDetail(idOverride) {
    var c = idOverride || document.getElementById("storeSelect").value;
    // Fallback if accessed via dropdown (rare now)
    if (!c) c = document.getElementById("storeSelect").value;

    if (!c) return;

    var s = reportData.stores[c], cur = s.results[sortedWaves[sortedWaves.length - 1]];
    var currentWaveKey = sortedWaves[sortedWaves.length - 1];

    // 1. Basic Info
    document.getElementById("stName").textContent = s.meta.name;
    document.getElementById("stMeta").textContent = s.meta.region + " | " + s.meta.branch;
    var stScore = cur.totalScore;
    document.getElementById("stScore").textContent = stScore.toFixed(2);
    document.getElementById("stScore").className = "display-3 fw-bold " + (stScore < 84 ? "text-danger" : "text-white");

    // 2. Trend Line (Main Chart) - Luxury Style
    var y = sortedWaves.map(w => s.results[w] ? s.results[w].totalScore : null);
    Plotly.newPlot("stTrendChart", [{
        x: sortedWaves, y: y, type: "scatter", mode: "lines+markers",
        line: { color: "#1E3A8A", width: 4, shape: 'spline', smoothing: 1.3 },
        marker: { size: 10, color: "#1E3A8A", line: { color: "white", width: 2 } },
        fill: 'tozeroy', fillcolor: 'rgba(59, 130, 246, 0.1)' // Soft blue gradient fill
    }], {
        margin: { t: 20, l: 30, r: 20, b: 30 },
        yaxis: { gridcolor: "#F3F4F6", range: [60, 105], zeroline: false },
        xaxis: { showgrid: false, zeroline: false },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        hoverlabel: { bgcolor: "#1E3A8A", font: { color: "white", family: "Inter" } }
    }, config);

    // 3. Radar Chart with Toggle Logic - Luxury Style
    var secKeys = Object.keys(cur.sections).sort();
    var stVals = secKeys.map(k => cur.sections[k]);
    var radarKeys = [...secKeys, secKeys[0]];
    var rSt = [...stVals, stVals[0]];

    var regData = reportData.regions[s.meta.region][currentWaveKey];
    var brData = reportData.branches[s.meta.branch][currentWaveKey];

    var compVals = [];
    var compName = "";
    var compColor = "";

    if (radarMode === 'region') {
        compVals = secKeys.map(k => regData && regData.sections[k] ? regData.sections[k].sum / regData.sections[k].count : 0);
        compName = "Region Avg";
        compColor = "#9CA3AF";
    } else {
        compVals = secKeys.map(k => brData && brData.sections[k] ? brData.sections[k].sum / brData.sections[k].count : 0);
        compName = "Branch Avg";
        compColor = "#F59E0B";
    }
    var rComp = [...compVals, compVals[0]];

    Plotly.newPlot("stRadarChart", [
        {
            type: 'scatterpolar', r: rSt, theta: radarKeys.map(k => k.split(' ')[0]),
            fill: 'toself', fillcolor: 'rgba(37, 99, 235, 0.2)', // Transparent blue fill
            name: 'Store', line: { color: '#2563EB', width: 3 }, marker: { size: 1 }
        },
        {
            type: 'scatterpolar', r: rComp, theta: radarKeys.map(k => k.split(' ')[0]),
            name: compName, line: { color: compColor, dash: 'dot', width: 2 }, marker: { size: 1 }, hoverinfo: 'skip'
        }
    ], {
        polar: {
            radialaxis: { visible: true, range: [0, 100], tickfont: { size: 9, color: "#9CA3AF" }, gridcolor: "#E5E7EB", linecolor: "rgba(0,0,0,0)" },
            angularaxis: { tickfont: { size: 10, family: "Inter, sans-serif", weight: "bold" }, gridcolor: "#E5E7EB", linecolor: "#E5E7EB" },
            bgcolor: 'rgba(0,0,0,0)'
        },
        showlegend: true, legend: { orientation: "h", y: -0.15, font: { family: "Inter", size: 11 } },
        margin: { t: 20, l: 40, r: 40, b: 20 },
        font: { family: "Inter, sans-serif" },
        paper_bgcolor: 'rgba(0,0,0,0)'
    }, config);

    // 4. Section Table with Sparklines
    var tb = document.querySelector("#stSectionTable tbody");
    tb.innerHTML = "";

    Object.entries(cur.sections).forEach(([k, v]) => {
        var isBad = v < 84;

        // Calculate Gap
        var avg = radarMode === 'region' ?
            (regData && regData.sections[k] ? regData.sections[k].sum / regData.sections[k].count : 0) :
            (brData && brData.sections[k] ? brData.sections[k].sum / brData.sections[k].count : 0);
        var gap = v - avg;
        var gapHTML = `<span class="small fw-bold ${gap >= 0 ? 'text-success' : 'text-danger'}">${gap >= 0 ? '+' : ''}${gap.toFixed(1)}</span>`;

        // Generate Sparkline Data
        var sparkData = sortedWaves.map(w => s.results[w] && s.results[w].sections[k] !== undefined ? s.results[w].sections[k] : null);
        var sparkHTML = generateSparkline(sparkData);

        tb.innerHTML += `<tr>
            <td class="fw-bold text-dark" style="font-size:0.9rem;">${k}</td>
            <td>${sparkHTML}</td>
            <td class="text-end fw-bold ${isBad ? "text-danger" : "text-dark"}">${v.toFixed(2)}</td>
            <td class="text-center">${gapHTML}</td>
            <td class="text-center">${isBad ? "<span class='badge bg-soft-danger text-danger'>⚠️ CRITICAL</span>" : "<span class='badge bg-soft-success text-success'>OK</span>"}</td>
        </tr>`;
    });

    // 5. Qualitative Feedback
    var fbList = document.getElementById("stFeedback"); fbList.innerHTML = "";
    if (cur.qualitative && cur.qualitative.length > 0) {
        cur.qualitative.forEach(q => {
            var badge = q.sentiment === 'positive' ? '<span class="badge bg-success">POS</span>' : (q.sentiment === 'negative' ? '<span class="badge bg-danger">NEG</span>' : '<span class="badge bg-secondary">NEU</span>');
            fbList.innerHTML += `<div class="p-3 bg-white rounded shadow-sm border-start border-4 ${q.sentiment === 'negative' ? 'border-danger' : 'border-success'}">
                <div class="d-flex justify-content-between mb-1"><span class="fw-bold small text-uppercase text-muted">${q.category}</span>${badge}</div>
                <p class="mb-0 small text-dark">"${q.text}"</p>
            </div>`;
        });
    } else {
        fbList.innerHTML = "<div class='text-center text-muted py-4 small'>No feedback recorded</div>";
    }
}

window.onload = function () { initSummary(); initRegions(); initBranches(); initStoreTable(); };
