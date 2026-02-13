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
            box-shadow: 0 .125rem .25rem rgba(0,0,0,.075) !important;
        }
        @media print {
            body * { visibility: hidden; }
            #storeDetailPanel, #storeDetailPanel * { visibility: visible; }
            #storeDetailPanel { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; display: block !important; }
            .sidebar, .navbar, .btn, .battle-dropdown-container, .no-print { display: none !important; }
            .card { border: none !important; box-shadow: none !important; break-inside: avoid; }
            .card-header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            /* Ensure charts are visible - heavy charts might need resize logic but this is a start */
            .js-plotly-plot { width: 100% !important; }
            .print-only { display: flex !important; margin-top: 50px; page-break-inside: avoid; }
        }
        @media screen {
            .print-only { display: none !important; }
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

    var printBtn = `<button class="btn btn-sm btn-outline-light rounded-pill px-3 ms-2 no-print" onclick="window.print()">🖨️ Print Report</button>`;

    var openWindowBtn = !isFullscreen
        ? `<button class="btn btn-sm btn-outline-light rounded-pill px-3 no-print" onclick="window.open('?store=${s.meta.code}', '_blank')">🔗 Open Independent Window</button>`
        : "";

    // Qualitative Feedback
    var qualitativeText = "No specific qualitative feedback recorded for this wave.";
    if (curData && curData.qualitative && curData.qualitative.length > 0) {
        qualitativeText = curData.qualitative.map(t => `<p class="mb-2">“${t}”</p>`).join("");
    } else {
        qualitativeText = `<p class="text-muted fst-italic">${qualitativeText}</p>`;
    }

    container.innerHTML = `
        <div class="card border-0 shadow-lg overflow-hidden ${isFullscreen ? 'rounded-0 min-vh-100' : ''}">
            <!-- PREMIUM HEADER -->
            <div class="card-header bg-primary-custom text-white p-4 position-relative" style="background: linear-gradient(135deg, #002060 0%, #1e3a8a 100%);">
                <div class="d-flex justify-content-between align-items-center mb-3 position-relative" style="z-index:100">
                    <div class="d-flex align-items-center">
                        ${backBtn}
                        <!-- MODERN BATTLE DROPDOWN -->
                        <div class="position-relative ms-3 battle-dropdown-container" style="z-index: 1060">
                            <button class="btn btn-light btn-sm rounded-pill shadow-sm fw-bold text-primary px-3 d-flex align-items-center gap-2 border-0" 
                                    style="height: 38px;"
                                    onclick="toggleBattleDropdown('${s.meta.code}')">
                                <span class="badge bg-primary rounded-pill me-1">VS</span>
                                <span id="battleOpponentName_${s.meta.code}" class="text-truncate" style="max-width:150px">Select Opponent...</span>
                                <span class="small opacity-50">▼</span>
                            </button>
                            
                            <!-- DROPDOWN PANEL -->
                            <div id="battleDropdown_${s.meta.code}" class="position-absolute bg-white shadow-lg rounded-3 mt-2 p-2 overflow-hidden animate__animated animate__fadeIn" 
                                 style="display:none; width:320px; left:0; z-index:1070; max-height:450px; border:1px solid rgba(0,0,0,0.1)">
                                 
                                 <div class="input-group input-group-sm mb-2 border rounded-2 bg-light">
                                    <span class="input-group-text border-0 bg-transparent">🔍</span>
                                    <input type="text" class="form-control border-0 bg-transparent shadow-none" placeholder="Search store name..." 
                                           onkeyup="filterBattleList('${s.meta.code}', this.value)" onclick="event.stopPropagation()">
                                 </div>
                                 
                                 <div id="battleList_${s.meta.code}" class="overflow-auto custom-scrollbar" style="max-height:300px">
                                    <div class="p-4 text-center text-muted small"><span class="spinner-border spinner-border-sm"></span> Loading...</div>
                                 </div>
                            </div>
                        </div>
                    </div>
                    <div>${openWindowBtn}${printBtn}</div>
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
                <div style="position:absolute;top:0;right:0;bottom:0;left:0;opacity:0.05;background-image: radial-gradient(white 1px, transparent 1px); background-size: 20px 20px; z-index:1; pointer-events:none"></div>
            </div>

            <div class="card-body p-4 bg-light">
                <!-- BATTLE FIELD CONTAINER -->
                <div id="battleField_${s.meta.code}" class="mb-5 animate__animated animate__fadeIn" style="display:none;"></div>

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

                <!-- SIGNATURE BLOCK (PRINT ONLY) -->
                <div class="row mt-5 print-only">
                    <div class="col-6">
                        <div class="border-top border-dark pt-2 w-75">
                            <p class="mb-0 fw-bold">Store Manager</p>
                            <p class="small text-muted">Sign & Date</p>
                        </div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="border-top border-dark pt-2 w-75 ms-auto text-start">
                            <p class="mb-0 fw-bold">Area Manager / Supervisor</p>
                            <p class="small text-muted">Sign & Date</p>
                        </div>
                    </div>
                </div>
            </div>
            
            ${!isFullscreen ? `<div class="card-footer bg-white p-3 text-end"><button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('storeDetailPanel').style.display='none'">Close Detail Panel</button></div>` : ''}
        </div>
    `;

    // 1. Render Trend Chart
    var yDiv = sortedWaves.map(w => (s.results[w] ? s.results[w].totalScore : null));
    var xDiv = sortedWaves;

    Plotly.newPlot("stTrendChart_" + s.meta.code, [{
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
    var tableBody = document.querySelector("#stSectionTable_" + s.meta.code + " tbody");
    var issuesDiv = document.getElementById("stIssuesList_" + s.meta.code);

    issuesDiv.innerHTML = "";

    if (curData && curData.sections) {
        Object.entries(curData.sections).forEach(([k, v]) => {
            var isCritical = v < 84;
            var sectionTrend = sortedWaves.map(w => (s.results[w] && s.results[w].sections && s.results[w].sections[k]) ? s.results[w].sections[k] : 0);
            var trendId = "spark_" + s.meta.code + "_" + k.substring(0, 5).replace(/\W/g, '') + "_" + Math.random().toString(36).substr(2, 5);

            var tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="ps-4 fw-bold text-dark">${k}</td>
                <td class="text-center py-2"><div id="${trendId}" style="width:120px;height:40px;margin:0 auto"></div></td>
                <td class="text-end pe-4 fw-bold ${isCritical ? 'text-danger' : 'text-success'} fs-5">${v.toFixed(2)}</td>
                <td class="text-center">${isCritical ? '⚠️' : '✅'}</td>
            `;
            tableBody.appendChild(tr);

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

            if (isCritical) {
                var action = reportData.actionPlanConfig[k] || "Review operational standards immediately.";
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

// --- HELPER FUNCTIONS FOR MODERN BATTLE DROPDOWN ---

function toggleBattleDropdown(code) {
    const dd = document.getElementById('battleDropdown_' + code);
    const list = document.getElementById('battleList_' + code);

    if (dd.style.display === 'none') {
        dd.style.display = 'block';
        if (list.innerHTML.includes('Loading')) {
            populateBattleList(code, '');
        }
    } else {
        dd.style.display = 'none';
    }
}

function populateBattleList(code, filter) {
    const s = reportData.stores[code];
    const curWave = sortedWaves[sortedWaves.length - 1];
    const list = document.getElementById('battleList_' + code);
    const stores = Object.values(reportData.stores);

    filter = filter.toLowerCase();

    const matches = stores.filter(x =>
        x.meta.code !== code &&
        (x.meta.name.toLowerCase().includes(filter) || x.meta.code.toLowerCase().includes(filter))
    ).sort((a, b) => {
        const scA = (a.results[curWave] && a.results[curWave].totalScore) ? a.results[curWave].totalScore : 0;
        const scB = (b.results[curWave] && b.results[curWave].totalScore) ? b.results[curWave].totalScore : 0;
        return scB - scA;
    });

    if (matches.length === 0) {
        list.innerHTML = '<div class="p-3 text-center text-muted small">No matches found</div>';
        return;
    }

    list.innerHTML = matches.map(x => {
        const sc = (x.results[curWave] && x.results[curWave].totalScore) ? x.results[curWave].totalScore : 0;
        const colorClass = sc >= 90 ? 'text-primary' : (sc < 84 ? 'text-danger' : 'text-warning');
        return `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom hover-bg-light cursor-pointer" 
                 onclick="selectBattleOpponent('${code}', '${x.meta.code}', '${x.meta.name}')" 
                 style="transition:background-color 0.2s">
                 <div>
                    <div class="fw-bold small text-dark">${x.meta.name}</div>
                    <div class="text-muted" style="font-size:0.75rem">${x.meta.region}</div>
                 </div>
                 <div class="fw-bold ${colorClass}">${sc.toFixed(1)}</div>
            </div>
        `;
    }).join("");
}

function filterBattleList(code, val) {
    populateBattleList(code, val);
}

function selectBattleOpponent(codeA, codeB, nameB) {
    document.getElementById('battleOpponentName_' + codeA).textContent = nameB;
    document.getElementById('battleDropdown_' + codeA).style.display = 'none';
    renderComparison(codeA, codeB);
}

// Global click listener to close dropdowns (injected once)
if (!window.battleDropdownListenerAdded) {
    window.addEventListener('click', function (e) {
        if (!e.target.closest('.battle-dropdown-container')) {
            document.querySelectorAll('[id^=battleDropdown_]').forEach(el => el.style.display = 'none');
        }
    });
    window.battleDropdownListenerAdded = true;
}


// --- BATTLE MODE LOGIC ---
function renderComparison(codeA, codeB) {
    const container = document.getElementById('battleField_' + codeA);
    if (!codeB) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const sA = reportData.stores[codeA];
    const sB = reportData.stores[codeB];
    const curWave = sortedWaves[sortedWaves.length - 1];

    if (!sA || !sB) return;

    container.style.display = 'block';

    // Data Prep
    const sections = Object.keys(reportData.summary[curWave].sections).sort();
    const scoresA = sections.map(sec => (sA.results[curWave] && sA.results[curWave].sections[sec] ? sA.results[curWave].sections[sec] : 0));
    const scoresB = sections.map(sec => (sB.results[curWave] && sB.results[curWave].sections[sec] ? sB.results[curWave].sections[sec] : 0));
    const totalA = (sA.results[curWave] && sA.results[curWave].totalScore) ? sA.results[curWave].totalScore : 0;
    const totalB = (sB.results[curWave] && sB.results[curWave].totalScore) ? sB.results[curWave].totalScore : 0;
    const diffTotal = totalA - totalB;

    // Generate HTML Structure
    container.innerHTML = `
        <div class="card border-0 shadow-lg gradient-battle text-white overflow-hidden">
            <div class="card-header bg-transparent border-0 pt-4 pb-2 text-center">
                 <h2 class="fw-bold text-uppercase mb-0" style="letter-spacing:2px">⚔️ Battle Mode Analysis</h2>
                 <p class="opacity-75">Head-to-Head Comparison</p>
            </div>
            <div class="card-body p-4">
                 <div class="row align-items-center g-5">
                      <!-- VS HEADER -->
                      <div class="col-12 text-center mb-2">
                           <div class="d-flex justify-content-center align-items-center gap-5">
                                <div class="text-end">
                                     <h3 class="fw-bold mb-0">${sA.meta.name}</h3>
                                     <div class="display-4 fw-bold text-warning">${totalA.toFixed(2)}</div>
                                </div>
                                <div class="display-6 fw-bold opacity-50">VS</div>
                                <div class="text-start">
                                     <h3 class="fw-bold mb-0">${sB.meta.name}</h3>
                                     <div class="display-4 fw-bold text-white">${totalB.toFixed(2)}</div>
                                </div>
                           </div>
                           <div class="mt-2 badge ${diffTotal >= 0 ? 'bg-success' : 'bg-danger'} fs-6 px-3 py-2">
                                Gap: ${diffTotal > 0 ? '+' : ''}${diffTotal.toFixed(2)}
                           </div>
                      </div>

                      <!-- RADAR CHART -->
                      <div class="col-lg-5">
                           <div class="bg-white rounded-3 p-2 shadow-sm" style="height:400px">
                                <div id="battleRadar_${codeA}" style="width:100%;height:100%"></div>
                           </div>
                      </div>

                      <!-- GAP TABLE -->
                      <div class="col-lg-7">
                           <div class="bg-white rounded-3 shadow-sm overflow-hidden text-dark h-100">
                                <div class="table-responsive h-100">
                                    <table class="table table-hover mb-0 align-middle">
                                        <thead class="bg-light small text-uppercase text-muted">
                                            <tr>
                                                <th class="ps-4">Section</th>
                                                <th class="text-center">${sA.meta.code}</th>
                                                <th class="text-center">${sB.meta.code}</th>
                                                <th class="text-center">Gap</th>
                                                <th class="text-center pe-3">Winner</th>
                                            </tr>
                                        </thead>
                                        <tbody id="battleTableBody_${codeA}"></tbody>
                                    </table>
                                </div>
                           </div>
                      </div>
                 </div>
            </div>
            <style>
                .gradient-battle { background: linear-gradient(135deg, #1e3a8a 0%, #4338ca 50%, #7e22ce 100%); }
                .hover-bg-light:hover { background-color: #f8f9fa !important; }
            </style>
        </div>
    `;

    // Render Table Rows
    const tbody = document.getElementById('battleTableBody_' + codeA);
    sections.forEach((sec, idx) => {
        const valA = scoresA[idx];
        const valB = scoresB[idx];
        const diff = valA - valB;
        const isWin = diff > 0;
        const isTie = Math.abs(diff) < 0.01;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="ps-4 fw-bold text-muted small text-uppercase">${sec}</td>
            <td class="text-center fw-bold ${valA > valB ? 'text-primary' : ''}">${valA.toFixed(1)}</td>
            <td class="text-center fw-bold ${valB > valA ? 'text-primary' : ''}">${valB.toFixed(1)}</td>
            <td class="text-center fw-bold ${diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-muted')}">
                ${diff > 0 ? '+' : ''}${diff.toFixed(1)}
            </td>
            <td class="text-center pe-3">
                ${isTie ? '<span class="badge bg-secondary">DRAW</span>' : (isWin ? '<span class="badge bg-warning text-dark">🏆 WIN</span>' : '')}
            </td>
        `;
        tbody.appendChild(row);
    });

    // Render Radar Chart
    Plotly.newPlot('battleRadar_' + codeA, [
        {
            type: 'scatterpolar', r: scoresA, theta: sections, fill: 'toself', name: sA.meta.name,
            line: { color: '#F59E0B' }, marker: { color: '#F59E0B' }
        },
        {
            type: 'scatterpolar', r: scoresB, theta: sections, fill: 'toself', name: sB.meta.name,
            line: { color: '#4338ca' }, marker: { color: '#4338ca' }
        }
    ], {
        polar: {
            radialaxis: { visible: true, range: [0, 100] }
        },
        margin: { t: 30, b: 30, l: 40, r: 40 },
        showlegend: true,
        legend: { orientation: 'h', y: -0.1 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    }, { responsive: true, displayModeBar: false });
}
