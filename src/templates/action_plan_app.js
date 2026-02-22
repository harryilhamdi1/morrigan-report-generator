/**
 * action_plan_app.js
 * Logic for the standalone Action Plan Implementation & Monitoring Dashboard.
 */

// Global State
let apData = null; // Will point to window._REPORT_DATA
let globalStorePlansCache = {};
let globalStats = {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0
};

// Pagination State
let currentPage = 1;
const itemsPerPage = 10;
let currentSearchQuery = '';

function initActionPlanDashboard() {
    console.log("Initializing Action Plan Monitoring Dashboard...");

    // Attempt to decompress data early if the base wrapper hasn't done it
    if (typeof reportData !== 'undefined') {
        apData = reportData;
        console.log("Found existing report data initialized by base html.");
    } else if (window._REPORT_DATA) {
        apData = window._REPORT_DATA;
    } else {
        console.error("No report data found. Please run the build script.");
        return;
    }

    // Build the global cache of actual action plans
    buildGlobalPlanCache();

    // Init aggregations
    renderNationalTab();
    renderRegionalTab();
    renderBranchTab();

    // Default to National Dashboard
    showDashboard();

    // Start Phase 3: Analytics & Timers
    initDisguisedTimer();
    renderNationalCharts();
}

function buildGlobalPlanCache() {
    const allStores = Object.values(apData.stores);
    allStores.forEach(st => {
        const tasks = buildRealActionPlanWithTracking(st);
        globalStorePlansCache[st.meta.name] = tasks;

        tasks.forEach(t => {
            globalStats.total++;
            if (t.status === 'approved') globalStats.completed++;
            else if (t.status === 'in_progress' || t.status === 'head_approved') globalStats.inProgress++;
            else globalStats.pending++;
        });
    });
}

// --- Aggregation Functions (Real Data) ---
function renderNationalTab() {
    document.getElementById('natTotalPlans').innerText = globalStats.total.toLocaleString();
    document.getElementById('natCompleted').innerText = globalStats.completed.toLocaleString();
    document.getElementById('natInProgress').innerText = globalStats.inProgress.toLocaleString();
    document.getElementById('natPending').innerText = globalStats.pending.toLocaleString();

    const now = new Date();
    document.getElementById('nationalLastUpdated').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderRegionalTab() {
    const tbody = document.getElementById('apRegionalBody');
    const inboxBody = document.getElementById('apRegionInboxBody');
    if (!tbody || !inboxBody || !apData) return;

    tbody.innerHTML = '';
    inboxBody.innerHTML = '';

    const regions = Object.keys(apData.regions || {}).sort();
    let totalRegionPendingCount = 0;
    let inboxHtml = [];

    regions.forEach(regId => {
        let storeCount = 0;
        let totalRegionPlans = 0;
        let completedRegionPlans = 0;

        const regionStores = Object.values(apData.stores).filter(st => st.meta.region === regId);

        regionStores.forEach(st => {
            storeCount++;
            const plans = globalStorePlansCache[st.meta.name] || [];
            totalRegionPlans += plans.length;
            completedRegionPlans += plans.filter(p => p.status === 'approved').length;

            // Build Inbox Items (max 50 to avoid DOM overload)
            plans.forEach(p => {
                if (p.status !== 'approved') {
                    totalRegionPendingCount++;
                    if (inboxHtml.length < 50) {
                        let statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Pending</span>';
                        if (p.status === 'in_progress') statusBadge = '<span class="badge bg-info text-dark"><i class="bi bi-arrow-repeat me-1"></i>In Progress</span>';
                        if (p.status === 'head_approved') statusBadge = '<span class="badge bg-primary"><i class="bi bi-check-circle me-1"></i>HoB Approved</span>';

                        inboxHtml.push(`
                            <tr class="align-middle border-bottom premium-row">
                                <td>
                                    <div class="fw-bold text-dark">${st.meta.name}</div>
                                    <div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${st.meta.branch}</div>
                                </td>
                                <td><span class="badge bg-${p.typeClass} bg-opacity-10 text-${p.typeClass} border border-${p.typeClass} border-opacity-25 px-2 py-1"><i class="bi bi-tag-fill me-1"></i>${p.type.split(' (')[0]}</span></td>
                                <td>
                                    <div class="small fw-bold text-dark mb-1 text-truncate" style="max-width: 250px;" title="${p.source}">"${p.source}"</div>
                                    <div class="small text-muted">${p.action}</div>
                                </td>
                                <td class="text-center">${statusBadge}</td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-dark rounded-pill shadow-sm px-3 fw-bold btn-hover-lift" onclick="openStoreActionPlan('${st.meta.name}')">Review <i class="bi bi-arrow-right ms-1"></i></button>
                                </td>
                            </tr>
                        `);
                    }
                }
            });
        });

        const plansGenerated = totalRegionPlans;
        const implRate = totalRegionPlans > 0 ? Math.round((completedRegionPlans / totalRegionPlans) * 100) : 0;
        let color = implRate > 70 ? 'success' : (implRate > 50 ? 'warning' : 'danger');

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-${color} bg-opacity-10 p-2 rounded-3">
                            <i class="bi bi-map-fill text-${color}"></i>
                        </div>
                        <span class="fw-bold text-dark fs-6 w-100 text-center">${regId}</span>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-shop me-1"></i>${storeCount}</span>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-card-checklist text-primary me-1"></i>${plansGenerated.toLocaleString()} Plans</span>
                </td>
                <td class="pe-4">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100">
                        <div class="d-flex justify-content-between w-50 mb-1 mx-auto">
                            <span class="xsmall fw-bold text-muted">Completion</span>
                            <span class="xsmall fw-bold text-${color}">${implRate}%</span>
                        </div>
                        <div class="progress w-50 mx-auto" style="height: 6px; border-radius:3px; background:#e2e8f0;">
                            <div class="progress-bar bg-${color}" role="progressbar" style="width: ${implRate}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    inboxBody.innerHTML = inboxHtml.join('');
    if (inboxHtml.length === 50 && totalRegionPendingCount > 50) {
        inboxBody.innerHTML += `<tr><td colspan="5" class="text-center text-muted small py-3"><i class="bi bi-three-dots"></i> Showing 50 of ${totalRegionPendingCount} pending tasks.</td></tr>`;
    }
    document.getElementById('apRegionPendingCount').innerText = `${totalRegionPendingCount.toLocaleString()} Pending Tasks`;
}

function renderBranchTab() {
    const tbody = document.getElementById('apBranchBody');
    const inboxBody = document.getElementById('apBranchInboxBody');
    if (!tbody || !inboxBody || !apData) return;

    tbody.innerHTML = '';
    inboxBody.innerHTML = '';

    const branchMap = {};
    let totalBranchPendingCount = 0;
    let inboxHtml = [];

    // Group all stores by Branch
    Object.values(apData.stores).forEach(st => {
        const bName = st.meta.branch;
        if (!branchMap[bName]) {
            branchMap[bName] = {
                region: st.meta.region,
                branch: bName,
                storeCount: 0,
                totalBranchPlans: 0,
                completedBranchPlans: 0
            };
        }

        branchMap[bName].storeCount++;
        const plans = globalStorePlansCache[st.meta.name] || [];
        branchMap[bName].totalBranchPlans += plans.length;
        branchMap[bName].completedBranchPlans += plans.filter(p => p.status === 'approved').length;

        // Build Inbox Items
        plans.forEach(p => {
            if (p.status !== 'approved') {
                totalBranchPendingCount++;
                if (inboxHtml.length < 50) {
                    let statusBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-hourglass-split me-1"></i>Pending</span>';
                    if (p.status === 'in_progress') statusBadge = '<span class="badge bg-info text-dark"><i class="bi bi-arrow-repeat me-1"></i>In Progress</span>';
                    if (p.status === 'head_approved') statusBadge = '<span class="badge bg-primary"><i class="bi bi-check-circle me-1"></i>HoB Approved</span>';

                    inboxHtml.push(`
                        <tr class="align-middle border-bottom premium-row">
                            <td>
                                <div class="fw-bold text-dark">${st.meta.name}</div>
                                <div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${st.meta.branch}</div>
                            </td>
                            <td><span class="badge bg-${p.typeClass} bg-opacity-10 text-${p.typeClass} border border-${p.typeClass} border-opacity-25 px-2 py-1"><i class="bi bi-tag-fill me-1"></i>${p.type.split(' (')[0]}</span></td>
                            <td>
                                <div class="small fw-bold text-dark mb-1 text-truncate" style="max-width: 250px;" title="${p.source}">"${p.source}"</div>
                                <div class="small text-muted">${p.action}</div>
                            </td>
                            <td class="text-center">${statusBadge}</td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-dark rounded-pill shadow-sm px-3 fw-bold btn-hover-lift" onclick="openStoreActionPlan('${st.meta.name}')">Review <i class="bi bi-arrow-right ms-1"></i></button>
                            </td>
                        </tr>
                    `);
                }
            }
        });
    });

    const branchesList = Object.values(branchMap).sort((a, b) => a.branch.localeCompare(b.branch));

    branchesList.forEach(br => {
        const implRate = br.totalBranchPlans > 0 ? Math.round((br.completedBranchPlans / br.totalBranchPlans) * 100) : 0;
        let color = implRate > 70 ? 'success' : (implRate > 50 ? 'warning' : 'danger');

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-${color} bg-opacity-10 p-2 rounded-3">
                            <i class="bi bi-diagram-3-fill text-${color}"></i>
                        </div>
                        <div class="w-100 text-center">
                            <div class="fw-bold text-dark fs-6">${br.branch}</div>
                            <div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${br.region}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill"><i class="bi bi-shop me-1"></i>${br.storeCount} stores</span>
                </td>
                <td class="pe-4">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100">
                        <div class="d-flex justify-content-between w-50 mb-1 mx-auto">
                            <span class="xsmall fw-bold text-muted">Completion</span>
                            <span class="xsmall fw-bold text-${color}">${implRate}%</span>
                        </div>
                        <div class="progress w-50 mx-auto" style="height: 6px; border-radius:3px; background:#e2e8f0;">
                            <div class="progress-bar bg-${color}" role="progressbar" style="width: ${implRate}%"></div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    inboxBody.innerHTML = inboxHtml.join('');
    if (inboxHtml.length === 50 && totalBranchPendingCount > 50) {
        inboxBody.innerHTML += `<tr><td colspan="5" class="text-center text-muted small py-3"><i class="bi bi-three-dots"></i> Showing 50 of ${totalBranchPendingCount} pending tasks.</td></tr>`;
    }
    document.getElementById('apBranchPendingCount').innerText = `${totalBranchPendingCount.toLocaleString()} Pending Tasks`;
}

// --- Navigation Functions ---
function hideAllTabs() {
    document.getElementById('tab-dashboard').style.display = 'none';
    document.getElementById('tab-regional').style.display = 'none';
    document.getElementById('tab-branch').style.display = 'none';
    document.getElementById('tab-stores').style.display = 'none';

    document.getElementById('nav-dashboard').classList.remove('active');
    document.getElementById('nav-regional').classList.remove('active');
    document.getElementById('nav-branch').classList.remove('active');
    document.getElementById('nav-store').classList.remove('active');
}

function showDashboard() {
    hideAllTabs();
    document.getElementById('tab-dashboard').style.display = 'block';
    document.getElementById('nav-dashboard').classList.add('active');
}

function showRegional() {
    hideAllTabs();
    document.getElementById('tab-regional').style.display = 'block';
    document.getElementById('nav-regional').classList.add('active');
}

function showBranch() {
    hideAllTabs();
    document.getElementById('tab-branch').style.display = 'block';
    document.getElementById('nav-branch').classList.add('active');
}

function showStoreList() {
    hideAllTabs();
    document.getElementById('tab-stores').style.display = 'block';
    document.getElementById('nav-store').classList.add('active');

    document.getElementById('storeContent').style.display = 'none';
    document.getElementById('storeListContainer').style.display = 'block';

    // Render the table
    renderActionPlanStoreTable();
}

// --- Store Table Rendering ---
function renderActionPlanStoreTable(searchQuery = '', page = 1) {
    const tbody = document.getElementById('apStoreMasterBody');
    if (!tbody || !apData) return;

    tbody.innerHTML = '';
    currentSearchQuery = searchQuery;
    currentPage = page;

    // Grab all stores from hierarchy
    const allStores = Object.values(apData.stores);
    const query = searchQuery.toLowerCase().trim();

    // Filter based on search query
    const filteredStores = query === '' ? allStores : allStores.filter(st => {
        return st.meta.name.toLowerCase().includes(query) ||
            st.meta.region.toLowerCase().includes(query) ||
            st.meta.branch.toLowerCase().includes(query) ||
            st.meta.brand.toLowerCase().includes(query);
    });

    if (filteredStores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">No stores matching your search.</td></tr>';
        return;
    }

    // Pagination Math
    const totalItems = filteredStores.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStores = filteredStores.slice(startIndex, startIndex + itemsPerPage);

    // Render Paginated Stores
    paginatedStores.forEach(st => {
        const plans = globalStorePlansCache[st.meta.name] || [];
        const total = plans.length;
        const completed = plans.filter(p => p.status === 'approved').length;

        const randProgress = total > 0 ? Math.round((completed / total) * 100) : 0;
        let progressColor = 'danger';
        if (randProgress > 40) progressColor = 'warning';
        if (randProgress > 75) progressColor = 'success';

        const html = `
            <tr class="premium-row border-0 text-center">
                <td class="ps-4 py-3 text-start">
                    <div class="d-flex align-items-center gap-3">
                        <div class="user-avatar shadow-sm bg-gradient" style="background: linear-gradient(135deg, var(--bs-${progressColor}) 0%, #1e293b 100%); flex-shrink:0;">
                            <i class="bi bi-shop"></i>
                        </div>
                        <div class="w-100 text-center">
                            <h6 class="mb-0 fw-bold text-dark text-start" style="font-family: 'Outfit', sans-serif;">${st.meta.name}</h6>
                            <div class="d-flex text-muted small mt-1 justify-content-start gap-3">
                                <span><i class="bi bi-geo-alt-fill text-primary"></i> ${st.meta.region}</span>
                                <span><i class="bi bi-box-fill text-secondary"></i> ${st.meta.branch}</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td class="text-center"><span class="badge bg-light text-dark border fw-bold fs-6 shadow-sm"><i class="bi bi-list-task me-1"></i>${total}</span></td>
                <td class="text-center align-middle">
                    <div class="d-flex flex-column justify-content-center align-items-center">
                        <div class="progress w-100 bg-light mb-1 border shadow-sm" style="height: 10px; border-radius: 10px; max-width: 150px;">
                            <div class="progress-bar bg-${progressColor} progress-bar-striped ${randProgress > 0 && randProgress < 100 ? 'progress-bar-animated' : ''}" role="progressbar" style="width: ${randProgress}%;"></div>
                        </div>
                        <span class="text-${progressColor} small fw-bolder">${randProgress}%</span>
                    </div>
                </td>
                <td class="text-center pe-4">
                    <button class="btn btn-sm btn-dark rounded-pill shadow-sm fw-bold px-4" onclick="openStoreActionPlan('${st.meta.name}')">
                        Execute <i class="bi bi-arrow-right ms-1"></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    renderStorePagination(totalPages, currentPage);
}

function renderStorePagination(totalPages, current) {
    let paginationContainer = document.getElementById('apStorePagination');
    if (!paginationContainer) {
        // Create container if it doesn't exist yet
        const tableContainer = document.getElementById('apStoreMasterTable').closest('.table-responsive');
        tableContainer.insertAdjacentHTML('afterend', `
            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top px-3">
                <div class="small text-muted fw-bold" id="apStorePaginationInfo"></div>
                <ul class="pagination pagination-sm mb-0 shadow-sm" id="apStorePagination"></ul>
            </div>
        `);
        paginationContainer = document.getElementById('apStorePagination');
    }

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        document.getElementById('apStorePaginationInfo').innerText = '';
        return;
    }

    // Update Info Text
    document.getElementById('apStorePaginationInfo').innerText = `Page ${current} of ${totalPages}`;

    let html = '';

    // Prev Button
    html += `
        <li class="page-item ${current === 1 ? 'disabled' : ''}">
            <a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${current - 1}); return false;" aria-label="Previous">
                <span aria-hidden="true"><i class="bi bi-chevron-left"></i></span>
            </a>
        </li>
    `;

    // Setup window (e.g., current +/- 2 pages)
    let startPage = Math.max(1, current - 2);
    let endPage = Math.min(totalPages, current + 2);

    if (startPage > 1) {
        html += `<li class="page-item"><a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, 1); return false;">1</a></li>`;
        if (startPage > 2) {
            html += `<li class="page-item disabled"><a class="page-link text-dark" href="#">...</a></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === current) {
            html += `<li class="page-item active" aria-current="page"><span class="page-link bg-dark border-dark">${i}</span></li>`;
        } else {
            html += `<li class="page-item"><a class="page-link text-dark fw-bold" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${i}); return false;">${i}</a></li>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<li class="page-item disabled"><a class="page-link text-dark" href="#">...</a></li>`;
        }
        html += `<li class="page-item"><a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Next Button
    html += `
        <li class="page-item ${current === totalPages ? 'disabled' : ''}">
            <a class="page-link text-dark" href="#" onclick="renderActionPlanStoreTable(currentSearchQuery, ${current + 1}); return false;" aria-label="Next">
                <span aria-hidden="true"><i class="bi bi-chevron-right"></i></span>
            </a>
        </li>
    `;

    paginationContainer.innerHTML = html;
}

function openStoreActionPlan(storeName) {
    document.getElementById('storeListContainer').style.display = 'none';
    document.getElementById('storeContent').style.display = 'block';

    // Find store metadata
    const allStores = Object.values(apData.stores);
    const st = allStores.find(s => s.meta.name === storeName);
    if (st) {
        document.getElementById('apStoreName').innerText = st.meta.name;
        document.getElementById('apStoreMeta').innerText = `${st.meta.region} • ${st.meta.branch}`;
    }

    // Generate real action plan data using the Deep Dive engine
    const tasks = buildRealActionPlanWithTracking(st);

    // Calculate global implementation rate (only fully approved counts towards 100%)
    const compRate = Math.round((tasks.filter(t => t.status === 'approved').length / tasks.length) * 100);
    document.getElementById('apStoreCompletion').innerText = `${compRate}%`;

    renderTaskChecklists(tasks);
    renderWeeklyTimeline(tasks);
}

function buildRealActionPlanWithTracking(storeObj) {
    if (!storeObj || !storeObj.results) return [];

    // Pick the most recent wave available for this store
    const waves = Object.keys(storeObj.results).sort().reverse();
    if (waves.length === 0) return [];
    const currentWave = waves[0];

    // Generate the raw action plan from the common algorithm
    const rawActions = generateStoreActionPlan(storeObj, currentWave, storeObj.feedback);
    if (!rawActions || rawActions.length === 0) return [];

    // Map the raw engine output to execution tracking states.
    // RESET: Start everything as Pending (0 progress) for real-world simulation
    return rawActions.map((raw, index) => {
        let status = 'pending';
        let typeClass = 'secondary';

        // Match UI coloring to types
        if (raw.type.includes('Kuantitatif')) typeClass = 'danger';
        else if (raw.type.includes('Suara Pelanggan')) typeClass = 'dark';
        else if (raw.type.includes('Optimalisasi')) typeClass = 'primary';
        else typeClass = 'secondary';

        return {
            id: `AP-REAL-${index + 1}`,
            type: raw.type,
            source: raw.source,
            action: raw.action,
            status: status,
            week: index + 1,
            proofText: '',
            remarksHead: '',
            remarksHCBP: '',
            typeClass: typeClass
        };
    });
}

function renderTaskChecklists(tasks) {
    const container = document.getElementById('apTaskListContainer');
    container.innerHTML = '';

    tasks.forEach(task => {
        let statusBadge = '';
        if (task.status === 'approved') statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1"><i class="bi bi-check-all me-1"></i>Verified by HCBP</span>';
        else if (task.status === 'head_approved') statusBadge = '<span class="badge bg-info bg-opacity-10 text-info border border-info px-2 py-1"><i class="bi bi-person-check-fill me-1"></i>Approved by HOB</span>';
        else if (task.status === 'in_progress') statusBadge = '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning px-2 py-1"><i class="bi bi-arrow-repeat me-1"></i>In Review (HOB)</span>';
        else statusBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary px-2 py-1"><i class="bi bi-hourglass me-1"></i>Pending Execution</span>';

        // Serial Logic
        const isHeadApproved = task.status === 'head_approved' || task.status === 'approved';
        const isHcbpApproved = task.status === 'approved';

        const btnStateHead = isHeadApproved ? 'disabled' : '';
        const btnStateHcbp = isHcbpApproved ? 'disabled' : '';

        // Generate serial HCBP UI
        let hcbpUI = '';
        if (!isHeadApproved) {
            hcbpUI = `
                <div class="col-md-6">
                    <div class="h-100 p-4 rounded-4 border border-light shadow-sm d-flex flex-column justify-content-center align-items-center text-center" style="background: rgba(248, 250, 252, 0.6); backdrop-filter: blur(5px);">
                        <div class="bg-white p-3 rounded-circle shadow-sm mb-3">
                            <i class="bi bi-lock-fill text-muted fs-4 opacity-50"></i>
                        </div>
                        <div class="fw-bold text-dark opacity-75 mb-1" style="font-family: 'Outfit', sans-serif;">Awaiting Branch Approval</div>
                        <div class="xsmall text-muted text-uppercase fw-bold" style="letter-spacing: 1px;">Serial Validation Required</div>
                    </div>
                </div>
            `;
        } else {
            hcbpUI = `
                <div class="col-md-6">
                    <div class="h-100 p-3 rounded-4 border shadow-sm" style="background: #F8FAFC; border-color: rgba(30, 41, 59, 0.1) !important;">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-dark bg-opacity-10 p-2 rounded-3 me-2">
                                <i class="bi bi-briefcase-fill text-dark fs-5"></i>
                            </div>
                            <h6 class="fw-bold text-dark mb-0 small text-uppercase flex-grow-1" style="letter-spacing: 0.5px;">HCBP Assessment</h6>
                            ${isHcbpApproved ? '<span class="badge bg-success rounded-pill shadow-sm"><i class="bi bi-check-lg"></i> Verified</span>' : ''}
                        </div>
                        <div class="btn-group w-100 shadow-sm mb-3" role="group">
                            <button type="button" class="btn btn-sm ${isHcbpApproved ? 'btn-dark' : 'btn-outline-dark'} fw-bold ${btnStateHcbp}"><i class="bi bi-check2-all me-1"></i>Verify & Close</button>
                            <button type="button" class="btn btn-sm btn-outline-danger fw-bold ${btnStateHcbp}"><i class="bi bi-x-lg me-1"></i>Reject</button>
                        </div>
                        <textarea class="form-control form-control-sm border-0 shadow-sm rounded-3" rows="2" placeholder="Leave official remarks... (mandatory on reject)" ${btnStateHcbp} style="resize: none;">${task.remarksHCBP}</textarea>
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="card border-0 shadow-sm bg-white hover-lift" style="border-radius: 16px; left: 0; transition: transform 0.2s, box-shadow 0.2s; border: 1px solid rgba(0,0,0,0.05) !important;">
                <div class="card-header bg-light bg-gradient border-bottom py-3 d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-${task.typeClass} shadow-sm px-2 py-1"><i class="bi bi-tag-fill me-1 opacity-75"></i>${task.type}</span>
                        <span class="small text-muted ms-2 fw-bold d-none d-md-inline text-uppercase" style="letter-spacing:0.5px; font-size:0.75rem;"><i class="bi bi-bullseye me-1 text-${task.typeClass}"></i>${task.source}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="card-body p-4">
                    <div class="d-flex gap-3 mb-4">
                        <div class="mt-1">
                            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center shadow-sm" style="width: 32px; height:32px;">
                                <i class="bi bi-lightning-charge-fill"></i>
                            </div>
                        </div>
                        <p class="fw-bold text-dark mb-0" style="font-size: 1.1rem; line-height: 1.6; font-family:'Outfit', sans-serif;">"${task.action}"</p>
                    </div>
                    
                    <!-- Execution Proof Form (Store Head) -->
                    <div class="px-4 py-3 mb-4 rounded-4 shadow-sm border" style="background: linear-gradient(to right, #ffffff, #f8f9fa); border-left: 4px solid var(--bs-primary) !important;">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-primary mb-0 small text-uppercase" style="letter-spacing: 1px;"><i class="bi bi-building-check me-2 fs-5 align-middle"></i>Execution Proof (Store Head)</h6>
                            <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill"><i class="bi bi-file-earmark-text me-1"></i>Draft</span>
                        </div>
                        <textarea class="form-control form-control-sm bg-white mb-3 shadow-sm border border-light rounded-3 p-3 text-dark" rows="3" placeholder="Describe actions taken, resources used, and completion date...">${task.proofText}</textarea>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-primary shadow-sm fw-bold px-3 btn-hover-lift"><i class="bi bi-send-fill me-2"></i>Submit for Review</button>
                            <button class="btn btn-sm btn-outline-secondary shadow-sm fw-bold px-3 bg-white btn-hover-lift"><i class="bi bi-cloud-upload me-2"></i>Attach Image</button>
                        </div>
                    </div>

                    <!-- Dual Approval Section -->
                    <div class="row g-3">
                        <!-- Head of Branch -->
                        <div class="col-md-6">
                            <div class="h-100 p-3 rounded-4 border shadow-sm" style="background: #FFFAF0; border-color: rgba(245, 158, 11, 0.2) !important;">
                                <div class="d-flex align-items-center mb-3">
                                    <div class="bg-warning bg-opacity-25 p-2 rounded-3 me-2">
                                        <i class="bi bi-person-badge text-warning fs-5"></i>
                                    </div>
                                    <h6 class="fw-bold text-dark mb-0 small text-uppercase flex-grow-1" style="letter-spacing: 0.5px;">Head of Branch Review</h6>
                                    ${isHeadApproved ? '<span class="badge bg-success rounded-pill shadow-sm"><i class="bi bi-check-lg"></i> Approved</span>' : ''}
                                </div>
                                <div class="btn-group w-100 shadow-sm mb-3" role="group">
                                    <button type="button" class="btn btn-sm ${isHeadApproved ? 'btn-success' : 'btn-outline-success'} fw-bold ${btnStateHead}"><i class="bi bi-hand-thumbs-up-fill me-1"></i>Approve</button>
                                    <button type="button" class="btn btn-sm btn-outline-danger fw-bold ${btnStateHead}"><i class="bi bi-arrow-return-left me-1"></i>Revise</button>
                                </div>
                                <textarea class="form-control form-control-sm border-0 shadow-sm rounded-3" rows="2" placeholder="Leave remarks for store..." ${btnStateHead} style="resize: none;">${task.remarksHead}</textarea>
                            </div>
                        </div>
                        
                        <!-- HCBP (Serial Lock) -->
                        ${hcbpUI}
                    </div>
                    
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function renderWeeklyTimeline(tasks) {
    const list = document.getElementById('apWeeklySprintTracker');
    if (!list) return;
    list.innerHTML = '';

    // Create a horizontal flex container
    const container = document.createElement('div');
    container.className = 'd-flex justify-content-between position-relative w-100';

    // Background connecting line
    const bgLine = document.createElement('div');
    bgLine.style.cssText = 'position: absolute; top: 40px; left: 5%; right: 5%; height: 4px; background: #e2e8f0; z-index: 1; border-radius: 4px;';
    container.appendChild(bgLine);

    tasks.forEach(task => {
        let statusColor = 'secondary';
        let statusIcon = 'bi-circle';
        let statusText = 'Pending execution';
        let isActive = false;

        if (task.status === 'approved') {
            statusColor = 'success';
            statusIcon = 'bi-check-lg';
            statusText = 'Verified & Closed';
            isActive = true;
        } else if (task.status === 'head_approved') {
            statusColor = 'info';
            statusIcon = 'bi-person-check-fill';
            statusText = 'Approved by HoB';
            isActive = true;
        } else if (task.status === 'in_progress') {
            statusColor = 'warning';
            statusIcon = 'bi-arrow-repeat';
            statusText = 'In Review';
            isActive = true;
        }

        const step = document.createElement('div');
        step.className = 'd-flex flex-column align-items-center position-relative';
        step.style.cssText = 'z-index: 2; width: 140px;';

        step.innerHTML = `
            <div class="mb-2 text-muted fw-bold small text-uppercase" style="letter-spacing: 1.5px; font-size: 0.65rem;">Week ${task.week}</div>
            <div class="bg-white border text-${statusColor} border-${statusColor} ${isActive ? `bg-${statusColor} text-white` : ''} rounded-circle d-flex align-items-center justify-content-center shadow mb-3 hover-lift" style="width: 54px; height: 54px; border-width: 3px !important; transition: transform 0.2s;" title="${task.action.replace(/"/g, '&quot;')}">
                <i class="bi ${statusIcon} fs-5"></i>
            </div>
            <div class="text-center px-2">
                <div class="fw-bold text-dark text-truncate w-100 mb-1" style="font-size: 0.85rem;" title="${task.type}">${task.type.split(' (')[0]}</div>
                <div class="text-${statusColor} fw-bold" style="font-size: 0.7rem; background: var(--bs-${statusColor}-bg-subtle, rgba(0,0,0,0.05)); padding: 2px 8px; border-radius: 12px; display: inline-block;">${statusText}</div>
            </div>
        `;
        container.appendChild(step);
    });

    list.appendChild(container);
}

// Run init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure base.html decompression is finished
    setTimeout(initActionPlanDashboard, 500);
});

// Phase 3: Disguised Countdown Timer Logic
function initDisguisedTimer() {
    const targetDate = new Date('2026-07-01T00:00:00'); // Confidential Deadline for Operational Audit (July 2026)

    function updateTimer() {
        const now = new Date();
        const diff = targetDate - now;

        if (diff <= 0) return;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);

        const elDays = document.getElementById('cdDays');
        const elHours = document.getElementById('cdHours');
        const elMins = document.getElementById('cdMins');

        if (elDays) elDays.innerText = String(days).padStart(2, '0');
        if (elHours) elHours.innerText = String(hours).padStart(2, '0');
        if (elMins) elMins.innerText = String(mins).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 60000); // Update every minute
}

// Phase 3: National Analytics Dashboard
function renderNationalCharts() {
    // 1. Compliance Doughnut Chart
    const ctx = document.getElementById('natComplianceChart');
    if (ctx && window.Chart) {
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Pending'],
                datasets: [{
                    data: [globalStats.completed, globalStats.inProgress, globalStats.pending],
                    backgroundColor: ['#059669', '#F59E0B', '#E11D48'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true, boxWidth: 8, font: { family: 'Inter', size: 11 } }
                    }
                }
            }
        });
    }

    // 2. Top Execution Leaderboard
    const tbody = document.getElementById('natLeaderboardTableBody');
    if (!tbody || !apData) return;

    // Calculate performance per region
    const regionStats = {};
    const regions = Object.keys(apData.regions || {});

    regions.forEach(reg => {
        const storesInReg = Object.values(apData.stores).filter(s => s.meta.region === reg);
        let totalPlans = 0;
        let completedPlans = 0;

        storesInReg.forEach(st => {
            const plans = globalStorePlansCache[st.meta.name] || [];
            totalPlans += plans.length;
            completedPlans += plans.filter(p => p.status === 'approved').length;
        });

        const rate = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;
        regionStats[reg] = { rate: Math.round(rate), total: totalPlans };
    });

    // Sort and render top regions
    const sortedRegions = Object.entries(regionStats)
        .filter(([_, stats]) => stats.total > 0)
        .sort((a, b) => b[1].rate - a[1].rate);

    tbody.innerHTML = '';
    sortedRegions.forEach(([reg, stats], index) => {
        let medal = `<span class="fw-bold text-muted">${index + 1}</span>`;
        if (index === 0) medal = `<i class="bi bi-trophy-fill text-warning fs-5"></i>`;
        else if (index === 1) medal = `<i class="bi bi-award-fill text-secondary fs-5" style="color: #94a3b8 !important;"></i>`;
        else if (index === 2) medal = `<i class="bi bi-award-fill fs-5" style="color: #b45309 !important;"></i>`;

        let trend = `<i class="bi bi-dash text-muted"></i>`;
        if (stats.rate > 50) trend = `<i class="bi bi-arrow-up text-success fw-bold"></i>`;
        else if (stats.rate < 30) trend = `<i class="bi bi-arrow-down text-danger fw-bold"></i>`;

        const html = `
            <tr class="premium-row">
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <div class="text-center" style="width: 30px;">${medal}</div>
                        <span class="fw-bold text-dark">${reg}</span>
                    </div>
                </td>
                <td class="text-end fw-bold text-${stats.rate > 70 ? 'success' : (stats.rate > 40 ? 'warning' : 'danger')}">${stats.rate}%</td>
                <td class="text-center pe-4">${trend}</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });
}
