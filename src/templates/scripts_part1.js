
function initSummary() {
    var w = sortedWaves, cur = w[w.length - 1], prev = w.length > 1 ? w[w.length - 2] : null;
    var dat = reportData.summary[cur];

    // 1. KPI Scores
    var s = dat.sum / dat.count;
    var pS = prev ? reportData.summary[prev].sum / reportData.summary[prev].count : 0;
    var diff = s - pS;
    document.getElementById("kpi-score").textContent = s.toFixed(2);
    document.getElementById("kpi-score-trend").innerHTML = (diff >= 0 ? "▲ +" : "▼ ") + Math.abs(diff).toFixed(2) + " vs last wave";
    document.getElementById("kpi-score-trend").className = "kpi-trend " + (diff >= 0 ? "text-success" : "text-danger");
    document.getElementById("kpi-stores").textContent = dat.count;

    // Best Region
    var bestR = "", bestS = -1;
    Object.keys(reportData.regions).forEach(r => {
        var d = reportData.regions[r][cur];
        if (d && d.sum / d.count > bestS) { bestS = d.sum / d.count; bestR = r; }
    });
    document.getElementById("kpi-best-region").textContent = bestR || "N/A";

    // 2. Critical Issues (Total Count)
    var totActions = 0;
    Object.values(reportData.stores).forEach(st => {
        if (st.results[cur]) {
            Object.values(st.results[cur].sections).forEach(v => {
                if (v < reportData.threshold) totActions++;
            });
        }
    });
    document.getElementById("kpi-actions").textContent = totActions;

    // 3. Chart with Deltas
    var scores = w.map(k => reportData.summary[k].sum / reportData.summary[k].count);
    var ann = [];
    for (var i = 1; i < w.length; i++) {
        var p = scores[i - 1], c = scores[i];
        if (!isNaN(p) && !isNaN(c)) {
            var d = c - p;
            var color = d >= 0 ? "#059669" : "#DC2626";
            ann.push({
                x: w[i], y: (p + c) / 2,
                text: "<b>" + (d >= 0 ? "+" : "") + d.toFixed(1) + "</b>",
                showarrow: false,
                font: { size: 10, color: color },
                bgcolor: d >= 0 ? "rgba(5,150,105,0.1)" : "rgba(220,38,38,0.1)",
                bordercolor: color, borderwidth: 1, borderpad: 2
            });
        }
    }
    ann.push({ xref: "paper", yref: "y", x: 1.02, y: reportData.threshold, text: "<b>" + reportData.threshold + "</b>", showarrow: false, font: { size: 9, color: "#EF4444" } });

    Plotly.newPlot("summaryChart", [
        {
            x: w, y: scores, type: "scatter", mode: "lines+markers+text",
            line: { color: "#002060", width: 3, shape: "spline", smoothing: 1.2 },
            marker: { size: 10, color: "#002060", line: { color: "#FFF", width: 2 } },
            text: scores.map(v => v.toFixed(2)), textposition: "top center"
        },
        {
            x: w, y: w.map(() => reportData.threshold), mode: "lines",
            line: { color: "#EF4444", width: 1, dash: "dot" }, hoverinfo: "none"
        }
    ], {
        margin: { t: 40, l: 40, r: 40, b: 40 },
        annotations: ann,
        xaxis: { fixedrange: true },
        yaxis: { fixedrange: true, gridcolor: "#F3F4F6" },
        showlegend: false,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)"
    }, config);

    // 4. Section Analysis (Clickable - Sexy Tiles)
    var grid = document.getElementById("sectionAnalysisGrid");
    grid.innerHTML = "";
    var iconMap = {
        "A.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        "B.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        "C.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
        "D.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        "E.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        "F.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
        "G.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
        "H.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
        "I.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
        "J.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        "K.": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
    };
    Object.entries(dat.sections)
        .sort((a, b) => (a[1].sum / a[1].count) - (b[1].sum / b[1].count))
        .forEach(([k, v], i) => {
            var sc = v.sum / v.count, cr = v.critical || 0, isC = sc < 84;
            var prefix = k.split(" ")[0]; var icon = iconMap[prefix] || iconMap["A."];
            var isTopLow = i < 3;
            var col = document.createElement("div");
            col.className = isTopLow ? "col-xl-4 col-md-6" : "col-xl-2 col-md-4 col-sm-6";
            col.innerHTML = `<div class="card h-100 p-4 shadow-sm section-tile ${isC ? 'bg-soft-danger' : 'bg-white'}" 
                     style="cursor:pointer; ${isTopLow ? 'border: 2px solid #EF4444;' : ''}" 
                     onclick="showTab('stores'); document.getElementById('storeSearch').value=''; renderStoreList();">
                ${isTopLow ? '<div class="position-absolute top-0 end-0 m-3"><span class="badge bg-danger">PRIORITY IMPROVEMENT</span></div>' : ''}
                <div class="section-icon-wrapper"><div style="width:24px; height:24px;">${icon}</div></div>
                <div class="${isTopLow ? 'display-5' : 'section-score'} fw-bold ${isC ? 'text-danger' : 'text-primary-custom'}">${sc.toFixed(1)}</div>
                <div class="${isTopLow ? 'h5 fw-bold' : 'section-label'} mb-3" title="${k}">${k}</div>
                <div class="d-flex align-items-center justify-content-between mt-auto">
                    <span class="badge rounded-pill ${cr > 0 ? 'bg-danger' : 'bg-success'}">${cr > 0 ? cr + " Critical" : "All Clean"}</span>
                    <svg style="width:16px; height:16px; opacity:0.3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                </div></div>`;
            grid.appendChild(col);
        });

    // 5. Store Rankings
    var sList = Object.values(reportData.stores)
        .filter(s => s.results[cur])
        .map(s => ({ n: s.meta.name, s: s.results[cur].totalScore }))
        .sort((a, b) => b.s - a.s);

    var renderT = (l, id, top) => {
        var h = "";
        l.forEach((x, i) => {
            var r = top ? i + 1 : sList.length - i;
            var cls = top ? (i < 3 ? "rank-top-" + (i + 1) : "") : "";
            h += `<tr><td style="padding-left:20px"><span class="rank-badge ${cls}">${r}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr>`;
        });
        document.getElementById(id).innerHTML = h;
    };
    renderT(sList.slice(0, 5), "topStoresList", true);
    renderT(sList.slice(-5).reverse(), "bottomStoresList", false);

    // 6. Hierarchy Rankings
    var regList = Object.keys(reportData.regions).map(r => {
        var d = reportData.regions[r][cur]; return { n: r, s: d ? d.sum / d.count : 0 };
    }).sort((a, b) => b.s - a.s);
    var brList = Object.keys(reportData.branches).map(b => {
        var d = reportData.branches[b][cur]; return { n: b, s: d ? d.sum / d.count : 0 };
    }).sort((a, b) => b.s - a.s);

    var renderH = (l, id) => {
        var h = "";
        l.slice(0, 5).forEach((x, i) => {
            var cls = i < 3 ? "rank-top-" + (i + 1) : "";
            h += `<tr><td style="padding-left:20px"><span class="rank-badge ${cls}">${i + 1}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr>`;
        });
        document.getElementById(id).innerHTML = h;
    };
    renderH(regList, "regionRankList");
    renderH(brList, "branchRankList");
}

function initRegions() {
    var regKeys = Object.keys(reportData.regions).sort();
    var waves = sortedWaves;
    var curWave = waves[waves.length - 1];

    // 1. Heatmap Data Preparation
    var secKeys = Object.keys(reportData.summary[curWave].sections).sort();
    var z_cat = [], z_val = [], z_txt_col = [];

    regKeys.forEach(r => {
        var row_cat = [], row_val = [], row_col = [];
        secKeys.forEach(s => {
            var d = reportData.regions[r][curWave];
            if (!d || !d.sections[s]) {
                row_cat.push(null); row_val.push(""); row_col.push("black");
            } else {
                var sc = d.sections[s].sum / d.sections[s].count;
                row_val.push(sc.toFixed(1));
                if (sc < 84) { row_cat.push(0); row_col.push("#991B1B"); }
                else if (sc < 90) { row_cat.push(1); row_col.push("#92400E"); }
                else if (sc < 95) { row_cat.push(2); row_col.push("#1e3a8a"); }
                else { row_cat.push(3); row_col.push("#312E81"); }
            }
        });
        z_cat.push(row_cat); z_val.push(row_val); z_txt_col.push(row_col);
    });

    var legendHTML = `
           <div class="d-flex justify-content-center gap-4 small text-muted text-uppercase fw-bold" style="letter-spacing:1px; margin: 15px 0;">
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FECACA;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Critical (<84)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FDE68A;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Warning (84-90)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#BFDBFE;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Good (90-95)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#A5B4FC;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Excellent (>95)</div>
           </div>`;

    var container = document.getElementById("regionSectionHeatmap").parentElement;
    container.querySelectorAll(".hm-legend-custom").forEach(e => e.remove());
    var topLeg = document.createElement("div");
    topLeg.className = "hm-legend-custom";
    topLeg.innerHTML = legendHTML;
    container.insertBefore(topLeg, document.getElementById("regionSectionHeatmap"));

    var colors = [[0, "#FECACA"], [0.25, "#FECACA"], [0.25, "#FDE68A"], [0.5, "#FDE68A"], [0.5, "#BFDBFE"], [0.75, "#BFDBFE"], [0.75, "#A5B4FC"], [1, "#A5B4FC"]];
    var hmDiv = document.getElementById("regionSectionHeatmap");

    Plotly.newPlot(hmDiv, [{
        x: secKeys, y: regKeys, z: z_cat, text: z_val, customdata: z_val,
        type: "heatmap", colorscale: colors, zmin: 0, zmax: 3, xgap: 5, ygap: 5,
        texttemplate: "<b>%{text}</b>", textfont: { color: z_txt_col, family: "Inter", size: 11 },
        hovertemplate: "<b>%{y}</b><br>%{x}<br>Score: <b>%{text}</b><extra></extra>", showscale: false
    }], {
        margin: { l: 120, b: 120, t: 10 },
        xaxis: { side: "bottom", tickfont: { size: 10, color: "#4B5563", family: "Inter", weight: "600" }, tickangle: -25 },
        yaxis: { tickfont: { size: 11, color: "#6B7280", family: "Inter", weight: "bold" } },
        font: { family: "Inter, sans-serif" }, height: 600, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)'
    }, config);

    hmDiv.on("plotly_click", function (data) {
        var pt = data.points[0];
        var r = pt.y, fullSec = pt.x;
        var d = reportData.regions[r][curWave], secData = d.sections[fullSec];
        var score = secData.sum / secData.count;
        var natData = reportData.summary[curWave].sections[fullSec], natScore = natData.sum / natData.count, diff = score - natScore;

        if (!document.getElementById("heatmapModal")) {
            var m = document.createElement("div");
            m.innerHTML = `
           <div class="modal fade" id="heatmapModal" tabindex="-1"><div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content border-0 shadow-lg" style="border-radius:12px;overflow:hidden;">
               <div class="modal-header border-0 bg-white pb-0">
                    <div><h5 class="modal-title fw-bold text-primary-custom" id="hmModalTitle">Analysis</h5><div class="text-muted small text-uppercase fw-bold" id="hmModalSubtitle" style="letter-spacing:1px;">Detail</div></div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
               </div>
               <div class="modal-body p-4 bg-white"><div class="row g-4">
                   <div class="col-md-5">
                       <div class="p-4 bg-light rounded-3 h-100 text-center d-flex flex-column justify-content-center">
                            <div class="text-uppercase text-muted small fw-bold mb-1">Score</div>
                            <div class="display-3 fw-bold mb-2" id="hmScore" style="letter-spacing:-2px;">--</div>
                            <div id="hmBadge"></div>
                            <div class="mt-4 pt-3 border-top"><div class="small text-muted mb-1">vs National</div><div class="h5 fw-bold" id="hmVsNat">--</div></div>
                       </div>
                   </div>
                   <div class="col-md-7">
                        <div class="h-100">
                            <div class="d-flex align-items-center mb-3"><span class="me-2">📉</span><span class="fw-bold text-danger">Bottom Performing Stores</span></div>
                            <div class="table-responsive"><table class="table table-sm table-borderless mb-0" style="font-size:0.9rem;"><thead class="text-muted small text-uppercase"><tr><th>Store</th><th class="text-end">Score</th></tr></thead><tbody id="hmCulprits"></tbody></table></div>
                        </div>
                   </div>
                   <div class="col-12"><div class="p-3 bg-light rounded-3 border-start border-4 border-primary"><div class="d-flex"><div class="me-3 fs-4">💡</div><div><h6 class="fw-bold mb-1">Recommended Action</h6><p class="mb-0 text-muted small" id="hmAction">--</p></div></div></div></div>
                   <div class="col-12"><div class="pt-3 border-top"><div class="small text-muted text-uppercase fw-bold mb-2">Historical Trend</div><div id="hmTrendChart" style="height:120px;"></div></div></div>
               </div></div>
           </div></div></div>`;
            document.body.insertAdjacentHTML('beforeend', m.innerHTML);
        }

        document.getElementById("hmModalTitle").textContent = r;
        document.getElementById("hmModalSubtitle").textContent = fullSec;
        var scEl = document.getElementById("hmScore"); scEl.textContent = score.toFixed(2);
        scEl.className = "display-3 fw-bold mb-2 " + (score < 84 ? "text-danger" : "text-primary-custom");
        document.getElementById("hmBadge").innerHTML = score < 84 ? `<span class="badge bg-danger px-3 py-2 rounded-pill">CRITICAL</span>` : (score < 90 ? `<span class="badge bg-warning text-dark px-3 py-2 rounded-pill">WARNING</span>` : `<span class="badge bg-success px-3 py-2 rounded-pill">GOOD</span>`);
        document.getElementById("hmVsNat").innerHTML = (diff >= 0 ? `<span class="text-success">▲ +` : `<span class="text-danger">▼ `) + diff.toFixed(2) + "</span>";
        document.getElementById("hmAction").textContent = reportData.actionPlanConfig[fullSec] || "Review operational standards and compliance.";

        var culprits = Object.values(reportData.stores).filter(s => s.meta.region === r && s.results[curWave]).map(s => ({ n: s.meta.name, s: s.results[curWave].sections[fullSec] || 0 })).sort((a, b) => a.s - b.s).slice(0, 5);
        document.getElementById("hmCulprits").innerHTML = culprits.map(c => `<tr><td>${c.n}</td><td class="text-end fw-bold ${c.s < 84 ? "text-danger" : ""}">${c.s.toFixed(2)}</td></tr>`).join("");

        var yTrend = waves.map(w => { var rd = reportData.regions[r][w]; return rd && rd.sections[fullSec] ? rd.sections[fullSec].sum / rd.sections[fullSec].count : null; });
        Plotly.newPlot("hmTrendChart", [{ x: waves, y: yTrend, type: "scatter", mode: "lines+markers", line: { color: "#002060", width: 2, shape: "spline" }, marker: { color: "#002060", size: 6 } }], { margin: { t: 10, l: 30, r: 10, b: 20 }, height: 120, xaxis: { showgrid: false, tickfont: { size: 10 } }, yaxis: { showgrid: true, gridcolor: "#eee", tickfont: { size: 10 } } }, config);

        var modalEl = document.getElementById("heatmapModal");
        var modal = bootstrap.Modal.getInstance(modalEl);
        if (!modal) modal = new bootstrap.Modal(modalEl);
        modal.show();
    });

    // 2. Performance Trends
    var traces = regKeys.map(r => {
        var y = waves.map(w => { var d = reportData.regions[r][w]; return d ? d.sum / d.count : null; });
        return { x: waves, y: y, mode: "lines+markers", name: r, line: { shape: "spline", width: 3 }, marker: { size: 8 }, visible: true };
    });
    Plotly.newPlot("regionTrendChart", traces, {
        margin: { t: 20, l: 40, r: 20, b: 40 },
        showlegend: true, legend: { orientation: "h", y: -0.15 },
        xaxis: { showgrid: false }, yaxis: { gridcolor: "#F3F4F6", showgrid: true }
    }, config);

    // 3. Leaderboard
    var cont = document.getElementById("regionDetailCards");
    cont.innerHTML = "";
    var sortedRegs = regKeys.map(r => {
        var d = reportData.regions[r][curWave]; return { n: r, s: d ? d.sum / d.count : 0, d: d };
    }).sort((a, b) => b.s - a.s);

    sortedRegs.forEach((item, idx) => {
        var d = item.d; if (!d) return;
        var score = item.s;
        var prevW = waves.length > 1 ? waves[waves.length - 2] : null;
        var prevD = prevW ? reportData.regions[item.n][prevW] : null;
        var prevS = prevD ? prevD.sum / prevD.count : 0;
        var diff = score - prevS;

        var secs = Object.entries(d.sections).map(([k, v]) => ({ k: k, v: v.sum / v.count })).sort((a, b) => a.v - b.v).slice(0, 3);
        var weakHTML = secs.map(x => `<div class="d-flex justify-content-between align-items-center mb-1 text-danger small"><span class="text-truncate" style="max-width:180px">${x.k}</span><strong>${x.v.toFixed(1)}</strong></div>`).join("");
        var rankBadge = idx < 3 ? `<span class="rank-badge rank-top-${idx + 1} shadow-sm" style="width:32px;height:32px;font-size:1rem;">${idx + 1}</span>` : `<span class="badge bg-light text-dark border">#${idx + 1}</span>`;

        var col = document.createElement("div");
        col.className = "col-lg-4 col-md-6";
        col.innerHTML = `
           <div class="card h-100 shadow-hover border-0" style="transition: transform 0.2s;">
               <div class="card-body p-4 position-relative">
                   <div class="position-absolute top-0 end-0 m-3">${rankBadge}</div>
                   <h5 class="fw-bold text-primary-custom mb-1">${item.n}</h5>
                   <div class="text-muted small mb-3">${d.count} Outlet Aktif</div>
                   <div class="d-flex align-items-center mb-4">
                        <h2 class="display-5 fw-bold mb-0 me-3 ${score < 84 ? "text-danger" : "text-primary-custom"}">${score.toFixed(2)}</h2>
                        <div class="${diff >= 0 ? "text-success" : "text-danger"} fw-bold small">
                            ${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)}
                        </div>
                   </div>
                   <div class="p-3 bg-light rounded-3 mb-3 border-start border-3 border-danger">
                       <div class="text-uppercase fw-bold text-muted small mb-2" style="font-size:0.7rem; letter-spacing:1px;">Focus Areas (Lowest 3)</div>
                       ${weakHTML}
                   </div>
                   <button class="btn btn-outline-primary w-100 btn-sm" onclick="showTab('stores'); document.getElementById('storeSearch').value='${item.n}'; renderStoreList();">Deep Dive</button>
               </div>
           </div>`;
        cont.appendChild(col);
    });
}

