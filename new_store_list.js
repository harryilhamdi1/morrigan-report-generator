// Enhanced Store Deep Dive Logic

// State Management
var storeListState = {
    page: 1,
    perPage: 15,
    search: "",
    region: "",
    branch: "",
    sort: "score_desc"
};

// Main Initialization
function initStoreTable() {
    // URL Check for Independent Window Mode
    var urlParams = new URLSearchParams(window.location.search);
    var targetStore = urlParams.get('store');

    if (targetStore) {
        // FULLSCREEN MODE
        activateStoreWindowMode(targetStore);
        return;
    }

    // NORMAL DASHBOARD MODE
    var container = document.getElementById("tab-stores");
    if (!container) return;

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2 class="text-primary-custom mb-1" style="font-weight:800">Store Deep Dive</h2>
                <p class="text-muted m-0">Detailed performance metrics per store with trend analysis & issue tracking.</p>
            </div>
        </div>

        <!-- Filter Toolbar -->
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

        <!-- Detail Panel (Hidden by default) -->
        <div id="storeDetailPanel" style="display:none;" class="mb-4 intro-animation">
             <!-- Injected via loadStoreDetail -->
        </div>

        <!-- Store Table -->
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
                            <th class="text-end pe-4" style="width:140px">Action</th>
                        </tr>
                    </thead>
                    <tbody id="storeTableBody">
                        <!-- Rows injected here -->
                    </tbody>
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

    populateStoreDropdowns();
    renderStoreTable();
}

function activateStoreWindowMode(siteCode) {
    // Hide standard layout elements
    document.querySelector('.sidebar').style.display = 'none';
    document.querySelector('.main-content').style.marginLeft = '0';
    document.querySelector('.main-content').style.padding = '0'; // Remove padding

    // Hide all tabs
    var tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(t => t.classList.remove('active'));

    // Create a dedicated full-screen container
    var fsContainer = document.createElement('div');
    fsContainer.id = 'storeFullscreenContainer';
    fsContainer.className = 'container-fluid p-4 bg-light';
    fsContainer.style.minHeight = '100vh';
    document.body.appendChild(fsContainer);

    // Hide original main content to be safe
    document.querySelector('.main-content').style.display = 'none';

    // Render logic
    var s = reportData.stores[siteCode];
    if (!s) {
        fsContainer.innerHTML = `<div class="alert alert-danger m-5">Store ${siteCode} not found in dataset.</div>`;
        return;
    }

    renderModernStoreDetail(s, fsContainer, true);
}

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
                <button class="btn btn-sm btn-outline-secondary me-2" onclick="event.stopPropagation(); loadModernStoreDetail('${s.meta.code}')" title="View details here">Details</button>
                <button class="btn btn-sm btn-light border" onclick="event.stopPropagation(); window.open('?store=${s.meta.code}', '_blank')" title="Open in new window">🔗</button>
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

// Unified Detail Renderer
function renderModernStoreDetail(s, container, isFullscreen) {
    var curWave = sortedWaves[sortedWaves.length - 1];
    var curData = s.results[curWave];
    var score = curData ? curData.totalScore : 0;

    var backBtn = isFullscreen
        ? `<button class="btn btn-sm btn-light text-danger fw-bold px-3 py-1 rounded-pill shadow-sm" onclick="window.close()">✕ Close Window</button>`
        : `<button class="btn btn-sm btn-light text-primary-custom fw-bold px-3 py-1 rounded-pill shadow-sm" onclick="document.getElementById('storeDetailPanel').style.display='none'; window.scrollTo({top: 0, behavior: 'smooth'});">← Back to Store List</button>`;

    container.innerHTML = `
        <div class="card border-0 shadow-lg overflow-hidden ${isFullscreen ? 'h-100' : ''}">
            <div class="card-header bg-primary-custom text-white p-4" style="background: linear-gradient(135deg, #002060 0%, #1e3a8a 100%)">
                <div class="mb-3 d-flex justify-content-between">
                    <div>${backBtn}</div>
                    ${!isFullscreen ? `<button class="btn btn-sm btn-outline-light rounded-pill" onclick="window.open('?store=${s.meta.code}', '_blank')">🔗 Open in New Window</button>` : `<div class="opacity-50 small">Independent Window Mode</div>`}
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h3 class="fw-bold mb-1 text-white">${s.meta.name}</h3>
                        <div class="opacity-75">${s.meta.region} &middot; ${s.meta.branch} &middot; ${s.meta.code}</div>
                    </div>
                    <div class="text-end">
                        <div class="display-4 fw-bold">${score.toFixed(2)}</div>
                        <div class="small opacity-75">Current Final Score</div>
                    </div>
                </div>
            </div>
            <div class="card-body p-4">
                <div class="row g-4">
                    <div class="col-lg-8">
                        <h5 class="fw-bold text-primary-custom mb-3">Performance Trend</h5>
                        <div id="stTrendChartModern_${s.meta.code}" style="height:350px"></div>
                    </div>
                     <div class="col-lg-4">
                        <h5 class="fw-bold text-primary-custom mb-3">Critical Issues (< 84)</h5>
                        <div id="stIssuesList_${s.meta.code}" class="vstack gap-3" style="max-height:350px;overflow-y:auto"></div>
                    </div>
                </div>
                
                <h5 class="fw-bold text-primary-custom mt-4 mb-3">Detailed Section Breakdown</h5>
                <div class="table-responsive">
                    <table class="table table-sm table-hover" id="stSectionTableModern_${s.meta.code}">
                        <thead class="bg-light"><tr><th>Section</th><th class="text-end">Score</th><th class="text-center">Status</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
            ${!isFullscreen ? `<div class="card-footer bg-light p-3 text-end"><button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('storeDetailPanel').style.display='none'">Close Detail</button></div>` : ''}
        </div>
    `;

    // Render Trend Chart (Unique ID)
    var yDiv = sortedWaves.map(w => s.results[w] ? s.results[w].totalScore : null);
    Plotly.newPlot(`stTrendChartModern_${s.meta.code}`, [{
        x: sortedWaves, y: yDiv, type: 'scatter', mode: 'lines+markers+text',
        text: yDiv.map(v => v ? v.toFixed(1) : ""), textposition: "top center",
        line: { color: '#002060', width: 3 }, marker: { color: '#002060', size: 8, line: { color: 'white', width: 2 } }
    }], {
        margin: { t: 20, l: 40, r: 20, b: 30 },
        yaxis: { range: [50, 105], gridcolor: "#f3f4f6" },
        xaxis: { showgrid: false }
    }, { responsive: true, displayModeBar: false });

    // Render Issues & Table
    var tableBody = document.querySelector(`#stSectionTableModern_${s.meta.code} tbody`);
    var issuesDiv = document.getElementById(`stIssuesList_${s.meta.code}`);

    if (curData && curData.sections) {
        Object.entries(curData.sections).forEach(([k, v]) => {
            var isCritical = v < 84;
            var tr = document.createElement("tr");
            tr.innerHTML = `<td>${k}</td><td class="text-end fw-bold ${isCritical ? 'text-danger' : ''}">${v.toFixed(2)}</td><td class="text-center">${isCritical ? '⚠️' : '✅'}</td>`;
            tableBody.appendChild(tr);

            if (isCritical) {
                var action = reportData.actionPlanConfig[k] || "Review operational standards immediately.";
                issuesDiv.innerHTML += `
                    <div class="p-3 bg-light border-start border-4 border-danger rounded-end">
                        <div class="d-flex justify-content-between mb-1">
                            <strong class="text-danger" style="font-size:0.85rem">${k}</strong>
                            <span class="badge bg-danger">${v.toFixed(1)}</span>
                        </div>
                        <div class="text-muted small fst-italic">"${action}"</div>
                    </div>
                `;
            }
        });
    }

    if (issuesDiv.innerHTML === "") {
        issuesDiv.innerHTML = `<div class="alert alert-success border-0 shadow-sm"><h6 class="alert-heading fw-bold mb-1">🎉 Excellent Work!</h6><p class="mb-0 small">No critical issues found in this wave.</p></div>`;
    }
}
