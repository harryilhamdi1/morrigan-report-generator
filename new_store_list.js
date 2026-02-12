// Enhanced Store Deep Dive Logic v2.0
// Features: Independent Window Mode, Detailed Trends per Section, Qualitative Analysis, Clean UI

var storeListState = {
    page: 1,
    perPage: 15,
    search: "",
    region: "",
    branch: "",
    sort: "score_desc"
};

// --- MAIN ENTRY POINT ---
function initStoreTable() {
    // Check for Independent Mode (URL ?store=CODE)
    var urlParams = new URLSearchParams(window.location.search);
    var targetStore = urlParams.get('store');

    if (targetStore) {
        activateStoreWindowMode(targetStore);
        return;
    }

    // Normal Dashboard Mode
    var container = document.getElementById("tab-stores");
    if (!container) return;

    injectStoreListUI(container);
    populateStoreDropdowns();
    renderStoreTable();
}

// --- UI INJECTION ---
function injectStoreListUI(container) {
    // Inject Custom Styles for Deep Dive to override global animations
    var style = document.createElement('style');
    style.innerHTML = `
        #storeDetailPanel .card, #storeFullscreenContainer .card {
            transition: none !important;
            transform: none !important;
        }
        #storeDetailPanel .card:hover, #storeFullscreenContainer .card:hover {
            transform: none !important;
            box-shadow: 0 .125rem .25rem rgba(0,0,0,.075) !important; /* Reset to Bootstrap default or light shadow */
        }
    `;
    document.head.appendChild(style);

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="text-primary-custom mb-1" style="font-weight:800">Store Deep Dive</h2>
                <p class="text-muted m-0">Detailed performance metrics per store with trend analysis & issue tracking.</p>
            </div>
        </div>

        <div class="card border-0 shadow-sm mb-4">
            <div class="card-body p-3 bg-light rounded-3">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <label class="small text-muted fw-bold mb-1">SEARCH</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0">🔍</span>
                            <input type="text" id="filterSearch" class="form-control border-start-0 ps-0" placeholder="Store Name or ID..." onkeyup="updateStoreState('search', this.value)">
                        </div>
                    </div>
                    <div class="col-md-2">
                        <label class="small text-muted fw-bold mb-1">REGION</label>
                        <select id="filterRegion" class="form-select form-select-sm" onchange="updateStoreState('region', this.value)">
                            <option value="">All Regions</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="small text-muted fw-bold mb-1">BRANCH</label>
                        <select id="filterBranch" class="form-select form-select-sm" onchange="updateStoreState('branch', this.value)">
                            <option value="">All Branches</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                         <label class="small text-muted fw-bold mb-1">SORT BY</label>
                         <select id="filterSort" class="form-select form-select-sm" onchange="updateStoreState('sort', this.value)">
                             <option value="score_desc">Score (Highest)</option>
                             <option value="score_asc">Score (Lowest)</option>
                             <option value="name_asc">Name (A-Z)</option>
                         </select>
                    </div>
                    <div class="col-md-3 text-end">
                        <button class="btn btn-primary-custom btn-sm px-4" onclick="resetStoreFilters()">Reset Filters</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="storeDetailPanel" style="display:none;" class="mb-4">
             <!-- Detail View Injected Here -->
        </div>

        <div class="card border-0 shadow-sm">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0" style="font-size:0.9rem">
                    <thead class="bg-light text-muted text-uppercase small">
                        <tr>
                            <th class="ps-4" style="width:50px">Rank</th>
                            <th style="width:100px">Store ID</th>
                            <th>Store Name</th>
                            <th>Branch</th>
                            <th>Region</th>
                            <th class="text-end">Last Score</th>
                            <th class="text-end pe-4" style="width:150px">Action</th>
                        </tr>
                    </thead>
                    <tbody id="storeTableBody"></tbody>
                </table>
            </div>
            <div class="card-footer bg-white py-3 border-0">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="text-muted small" id="paginationInfo">Showing 0-0 of 0</div>
                    <nav>
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item"><button class="page-link border-0 text-dark" onclick="changeStorePage(-1)">Previous</button></li>
                            <li class="page-item"><span class="page-link border-0 bg-transparent fw-bold" id="pageNumberDisplay">1</span></li>
                            <li class="page-item"><button class="page-link border-0 text-dark" onclick="changeStorePage(1)">Next</button></li>
                        </ul>
                    </nav>
                </div>
            </div>
        </div>
    `;
}

// --- INDEPENDENT WINDOW MODE LOGIC ---
function activateStoreWindowMode(siteCode) {
    // Hide UI elements not needed
    var sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';

    var mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.marginLeft = '0';
        mainContent.style.padding = '0';
        mainContent.style.display = 'none'; // Hide default content
    }

    // Create Fullscreen Container
    var fsContainer = document.createElement('div');
    fsContainer.id = 'storeFullscreenContainer';
    fsContainer.className = 'container-fluid p-0 bg-light';
    fsContainer.style.minHeight = '100vh';
    document.body.appendChild(fsContainer);

    var s = reportData.stores[siteCode];
    if (!s) {
        fsContainer.innerHTML = `<div class="d-flex align-items-center justify-content-center vh-100"><div class="text-center"><h3 class="text-muted">Store ${siteCode} not found</h3><button class="btn btn-primary mt-3" onclick="window.close()">Close Window</button></div></div>`;
        return;
    }

    renderModernStoreDetail(s, fsContainer, true);
}

// --- HELPER FUNCTIONS ---
function populateStoreDropdowns() {
    var regions = Object.keys(reportData.regions).sort();
    var branches = Object.keys(reportData.branches).sort();

    var rSel = document.getElementById("filterRegion");
    if (rSel) regions.forEach(r => { var opt = document.createElement("option"); opt.value = r; opt.textContent = r; rSel.appendChild(opt); });

    var bSel = document.getElementById("filterBranch");
    if (bSel) branches.forEach(b => { var opt = document.createElement("option"); opt.value = b; opt.textContent = b; bSel.appendChild(opt); });
}

function updateStoreState(key, val) {
    if (key === 'search') storeListState.search = val.toLowerCase();
    if (key === 'region') storeListState.region = val;
    if (key === 'branch') storeListState.branch = val;
    if (key === 'sort') storeListState.sort = val;
    storeListState.page = 1;
    renderStoreTable();
}

function resetStoreFilters() {
    storeListState = { page: 1, perPage: 15, search: "", region: "", branch: "", sort: "score_desc" };
    document.getElementById("filterSearch").value = "";
    document.getElementById("filterRegion").value = "";
    document.getElementById("filterBranch").value = "";
    document.getElementById("filterSort").value = "score_desc";
    document.getElementById("storeDetailPanel").style.display = 'none';
    renderStoreTable();
}

function changeStorePage(delta) {
    var filtered = getFilteredStores();
    var maxPage = Math.ceil(filtered.length / storeListState.perPage);
    var newPage = storeListState.page + delta;
    if (newPage >= 1 && newPage <= maxPage) {
        storeListState.page = newPage;
        renderStoreTable();
    }
}

function getFilteredStores() {
    var allStores = Object.values(reportData.stores);
    var curWave = sortedWaves[sortedWaves.length - 1];

    var filtered = allStores.filter(function (s) {
        var matchesSearch = storeListState.search === "" || s.meta.name.toLowerCase().includes(storeListState.search) || s.meta.code.toLowerCase().includes(storeListState.search);
        var matchesRegion = storeListState.region === "" || s.meta.region === storeListState.region;
        var matchesBranch = storeListState.branch === "" || s.meta.branch === storeListState.branch;
        return matchesSearch && matchesRegion && matchesBranch;
    });

    filtered.sort(function (a, b) {
        var scoreA = (a.results[curWave] && a.results[curWave].totalScore) || 0;
        var scoreB = (b.results[curWave] && b.results[curWave].totalScore) || 0;
        if (storeListState.sort === "score_desc") return scoreB - scoreA;
        if (storeListState.sort === "score_asc") return scoreA - scoreB;
        if (storeListState.sort === "name_asc") return a.meta.name.localeCompare(b.meta.name);
        return 0;
    });
    return filtered;
}

function renderStoreTable() {
    var filtered = getFilteredStores();
    var curWave = sortedWaves[sortedWaves.length - 1];
    var total = filtered.length;
    var start = (storeListState.page - 1) * storeListState.perPage;
    var end = Math.min(start + storeListState.perPage, total);
    var pageData = filtered.slice(start, end);

    document.getElementById("paginationInfo").textContent = "Showing " + (total === 0 ? 0 : start + 1) + "-" + end + " of " + total;
    document.getElementById("pageNumberDisplay").textContent = storeListState.page;

    var tbody = document.getElementById("storeTableBody");
    tbody.innerHTML = "";

    if (total === 0) {
        tbody.innerHTML = "<tr><td colspan='7' class='text-center py-5 text-muted'>No stores found matching your criteria</td></tr>";
        return;
    }

    pageData.forEach(function (s, idx) {
        var absRank = start + idx + 1;
        var score = (s.results[curWave] && s.results[curWave].totalScore) ? s.results[curWave].totalScore : 0;
        var badgeClass = score >= 90 ? "bg-primary-custom text-white" : (score < 84 ? "bg-danger text-white" : "bg-warning text-dark");
        var badgeStyle = score >= 90 ? "background-color:#002060 !important" : "";

        var tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.onclick = function () { loadModernStoreDetail(s.meta.code); };

        tr.innerHTML = `
            <td class="ps-4 fw-bold text-muted small">#${absRank}</td>
            <td><span class="badge bg-light text-dark border font-monospace">${s.meta.code}</span></td>
            <td class="fw-bold text-primary-custom">${s.meta.name}</td>
            <td><span class="badge bg-light text-muted border">${s.meta.branch}</span></td>
            <td><span class="badge bg-light text-muted border">${s.meta.region}</span></td>
            <td class="text-end"><span class="badge ${badgeClass} fs-6" style="${badgeStyle}">${score.toFixed(2)}</span></td>
            <td class="text-end pe-4">
                <div class="btn-group btn-group-sm shadow-sm">
                    <button class="btn btn-outline-secondary" onclick="event.stopPropagation(); loadModernStoreDetail('${s.meta.code}')" title="View details below">See Details</button>
                    <button class="btn btn-light text-primary border" onclick="event.stopPropagation(); window.open('?store=${s.meta.code}', '_blank')" title="Open in new Independent Window">🔗</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function loadModernStoreDetail(siteCode) {
    var s = reportData.stores[siteCode];
    if (!s) return;

    var container = document.getElementById("storeDetailPanel");
    container.style.display = "block";
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderModernStoreDetail(s, container, false);
}

// --- UNIFIED DETAIL RENDERER (The Core Logic) ---
function renderModernStoreDetail(s, container, isFullscreen) {
    var curWave = sortedWaves[sortedWaves.length - 1];
    var curData = s.results[curWave];
    var score = curData ? curData.totalScore : 0;

    // Header Buttons
    var backBtn = isFullscreen
        ? `<button class="btn btn-sm btn-light text-danger fw-bold px-3 py-1 rounded-pill shadow-sm bg-white border-0" onclick="window.close()">✕ Close Window</button>`
        : `<button class="btn btn-sm btn-light text-primary-custom fw-bold px-3 py-1 rounded-pill shadow-sm bg-white border-0" onclick="document.getElementById('storeDetailPanel').style.display='none'; window.scrollTo({top: 0, behavior: 'smooth'});">← Back to List</button>`;

    var openWindowBtn = !isFullscreen
        ? `<button class="btn btn-sm btn-outline-light rounded-pill px-3" onclick="window.open('?store=${s.meta.code}', '_blank')">🔗 Open Independent Window</button>`
        : "";

    // Qualitative Feedback (Found in last column of CSV usually)
    var qualitativeText = "No specific qualitative feedback recorded for this wave.";
    if (curData && curData.qualitative && curData.qualitative.length > 0) {
        // Join multiple feedbacks if any
        qualitativeText = curData.qualitative.map(t => `<p class="mb-2">“${t}”</p>`).join("");
    } else {
        qualitativeText = `<p class="text-muted fst-italic">${qualitativeText}</p>`;
    }

    container.innerHTML = `
        <div class="card border-0 shadow-lg overflow-hidden ${isFullscreen ? 'rounded-0 min-vh-100' : ''}">
            <!-- PREMIUM HEADER -->
            <div class="card-header bg-primary-custom text-white p-4 position-relative" style="background: linear-gradient(135deg, #002060 0%, #1e3a8a 100%);">
                <div class="d-flex justify-content-between align-items-center mb-3 position-relative" style="z-index:2">
                    <div>${backBtn}</div>
                    <div>${openWindowBtn}</div>
                </div>
                <div class="d-flex justify-content-between align-items-end position-relative" style="z-index:2">
                    <div>
                        <h1 class="fw-bold mb-1 text-white display-6">${s.meta.name}</h1>
                        <div class="opacity-75 fs-5">${s.meta.region} &middot; ${s.meta.branch} &middot; <span class="badge bg-white text-primary border-0">${s.meta.code}</span></div>
                    </div>
                    <div class="text-end">
                         <div class="display-3 fw-bold" style="text-shadow: 0 2px 10px rgba(0,0,0,0.2)">${score.toFixed(2)}</div>
                         <div class="small opacity-75 text-uppercase fw-bold letter-spacing-1">Current Final Score</div>
                    </div>
                </div>
                <!-- Background Pattern -->
                <div style="position:absolute;top:0;right:0;bottom:0;left:0;opacity:0.05;background-image: radial-gradient(white 1px, transparent 1px); background-size: 20px 20px; z-index:1; pointer-events:none"></div>
            </div>

            <div class="card-body p-4 bg-light">
                <!-- TOP ROW: TREND & QUALITATIVE -->
                <div class="row g-4 mb-4">
                    <div class="col-lg-8">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-body p-4">
                                <h5 class="fw-bold text-primary-custom mb-3">Overall Performance Trend</h5>
                                <div id="stTrendChart_${s.meta.code}" style="height:350px"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card h-100 border-0 shadow-sm">
                            <div class="card-header bg-white border-0 pt-4 px-4 pb-0">
                                <h5 class="fw-bold text-primary-custom mb-0">Qualitative Feedback</h5>
                                <small class="text-muted">Wave 2 2025 Analysis</small>
                            </div>
                            <div class="card-body p-4">
                                <div class="p-3 bg-light rounded-3 border h-100 overflow-auto" style="max-height: 250px;">
                                    <div class="text-dark" style="font-size:0.9rem;line-height:1.6">
                                        ${qualitativeText}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CRITICAL SECTION -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-danger text-white py-3 px-4 d-flex justify-content-between align-items-center">
                         <h5 class="mb-0 fw-bold">Critical Issues (< 84)</h5>
                         <span class="badge bg-white text-danger">${curData ? Object.values(curData.sections).filter(v => v < 84).length : 0} Issues Found</span>
                    </div>
                    <div class="card-body p-4">
                         <div class="row g-3" id="stIssuesList_${s.meta.code}"></div>
                    </div>
                </div>

                <!-- DETAILED BREAKDOWN WITH MINI CHARTS -->
                <div class="card border-0 shadow-sm">
                     <div class="card-header bg-white py-3 px-4">
                        <h5 class="fw-bold text-primary-custom mb-0">Detailed Section Analysis</h5>
                     </div>
                     <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="stSectionTable_${s.meta.code}">
                            <thead class="bg-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-4">Section Name</th>
                                    <th class="text-center">Trend (5 Waves)</th>
                                    <th class="text-end pe-4">Current Score</th>
                                    <th class="text-center" style="width:50px">Status</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                     </div>
                </div>
            </div>
            
            ${!isFullscreen ? `<div class="card-footer bg-white p-3 text-end"><button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('storeDetailPanel').style.display='none'">Close Detail Panel</button></div>` : ''}
        </div>
    `;

    // 1. Render Trend Chart
    var yDiv = sortedWaves.map(w => s.results[w] ? s.results[w].totalScore : null);
    var xDiv = sortedWaves;

    Plotly.newPlot(`stTrendChart_${s.meta.code}`, [{
        x: xDiv, y: yDiv, type: 'scatter', mode: 'lines+markers+text',
        text: yDiv.map(v => v ? v.toFixed(1) : ""), textposition: "top center",
        line: { color: '#002060', width: 4, shape: 'spline' },
        marker: { color: '#002060', size: 10, line: { color: 'white', width: 3 } },
        fill: 'tozeroy', fillcolor: 'rgba(0, 32, 96, 0.05)'
    }], {
        margin: { t: 30, l: 40, r: 20, b: 30 },
        yaxis: { range: [50, 105], gridcolor: "#f3f4f6" },
        xaxis: { showgrid: false },
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"
    }, { responsive: true, displayModeBar: false });

    // 2. Render Critical Issues & Breakdown Table
    var tableBody = document.querySelector(`#stSectionTable_${s.meta.code} tbody`);
    var issuesDiv = document.getElementById(`stIssuesList_${s.meta.code}`);

    issuesDiv.innerHTML = ""; // Clear

    if (curData && curData.sections) {
        Object.entries(curData.sections).forEach(([k, v]) => {
            var isCritical = v < 84;

            // Build Mini Trend Data for this section
            var sectionTrend = sortedWaves.map(w => (s.results[w] && s.results[w].sections && s.results[w].sections[k]) ? s.results[w].sections[k] : 0);
            var trendId = `spark_${s.meta.code}_${k.substring(0, 5).replace(/\W/g, '')}_${Math.random().toString(36).substr(2, 5)}`;

            // Table Row
            var tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="ps-4 fw-bold text-dark">${k}</td>
                <td class="text-center py-2"><div id="${trendId}" style="width:120px;height:40px;margin:0 auto"></div></td>
                <td class="text-end pe-4 fw-bold ${isCritical ? 'text-danger' : 'text-success'} fs-5">${v.toFixed(2)}</td>
                <td class="text-center">${isCritical ? '⚠️' : '✅'}</td>
            `;
            tableBody.appendChild(tr);

            // Render Sparkline immediate
            Plotly.newPlot(trendId, [{
                x: [1, 2, 3, 4, 5], y: sectionTrend, type: 'scatter', mode: 'lines',
                line: { color: isCritical ? '#EF4444' : '#10B981', width: 2 },
                fill: 'tozeroy', fillcolor: isCritical ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
            }], {
                margin: { t: 0, l: 0, r: 0, b: 0 },
                xaxis: { showgrid: false, zeroline: false, showticklabels: false },
                yaxis: { showgrid: false, zeroline: false, showticklabels: false, range: [0, 110] },
                paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
                height: 40, width: 120
            }, { responsive: false, displayModeBar: false, staticPlot: true });

            // Critical Issue Card
            if (isCritical) {
                var action = reportData.actionPlanConfig[k] || "Review operational standards immediately. Scores below 84 require documented action plan.";
                issuesDiv.innerHTML += `
                    <div class="col-md-6">
                        <div class="p-3 bg-white border border-danger rounded-3 h-100 shadow-sm" style="border-left-width: 5px !important;">
                            <div class="d-flex justify-content-between mb-2">
                                <strong class="text-danger">${k}</strong>
                                <span class="badge bg-danger rounded-pill">${v.toFixed(1)}</span>
                            </div>
                            <div class="text-muted small fst-italic">"${action}"</div>
                        </div>
                    </div>
                `;
            }
        });
    }

    if (issuesDiv.innerHTML === "") {
        issuesDiv.innerHTML = `<div class="col-12"><div class="alert alert-success border-0 shadow-sm d-flex align-items-center"><span class="fs-2 me-3">🎉</span><div><h6 class="alert-heading fw-bold mb-0">Excellent Performance!</h6><p class="mb-0 small">No critical issues found in this wave.</p></div></div></div>`;
    }
}
