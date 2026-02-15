
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
            onclick="openSectionDetail('${k}')">
                ${isTopLow ? '<div class="position-absolute top-0 end-0 m-3"><span class="badge bg-danger">PRIORITY IMPROVEMENT</span></div>' : ''}
                <div class="section-icon-wrapper"><div style="width:24px; height:24px;">${icon}</div></div>
                <div class="${isTopLow ? 'display-5' : 'section-score'} fw-bold ${isC ? 'text-danger' : 'text-primary-custom'}">${sc.toFixed(1)}</div>
                <div class="${isTopLow ? 'h5 fw-bold' : 'section-label'} mb-3" title="${k}">${k}</div>
                <div class="d-flex align-items-center justify-content-between mt-auto">
                    <span class="badge rounded-pill ${cr > 0 ? 'bg-danger' : 'bg-success'}">${cr > 0 ? cr + " Critical" : "All Clean"}</span>
                    <svg style="width:16px; height:16px; opacity:0.3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
                </div></div> `;
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
            h += `<tr ><td style="padding-left:20px"><span class="rank-badge ${cls}">${r}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr> `;
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
            h += `<tr ><td style="padding-left:20px"><span class="rank-badge ${cls}">${i + 1}</span></td><td>${x.n}</td><td class="text-end fw-bold" style="padding-right:20px">${x.s.toFixed(2)}</td></tr> `;
        });
        document.getElementById(id).innerHTML = h;
    };
    renderH(regList, "regionRankList");
    renderH(brList, "branchRankList");

    // 7. National Top Priorities (Lowest Scoring Items)
    const natContainer = document.getElementById("natPrioritiesList");
    if (natContainer && dat.details) {
        let allNatItems = [];
        Object.entries(dat.details).forEach(([sec, items]) => {
            Object.values(items).forEach(item => {
                if (item.count > 0) {
                    allNatItems.push({ t: item.t, score: (item.sum / item.count) });
                }
            });
        });

        // Sort Ascending (Lowest First) -> Take 5
        const topPriorities = allNatItems.sort((a, b) => a.score - b.score).slice(0, 5);

        natContainer.innerHTML = topPriorities.map((item, idx) => `
                <div class="col-md-6 col-lg-4" >
                    <div class="h-100 p-3 bg-white rounded shadow-sm border-start border-4 border-danger d-flex align-items-center">
                        <div class="me-3 fw-bold text-danger fs-4">#${idx + 1}</div>
                        <div class="flex-grow-1">
                            <div class="small fw-bold text-dark" style="line-height:1.2;">${item.t}</div>
                        </div>
                        <div class="ms-2 text-end">
                            <span class="badge bg-danger rounded-pill">${(item.score * 100).toFixed(0)}%</span>
                        </div>
                    </div>
            </div>
                `).join('');
    }
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
                <div class="d-flex justify-content-center gap-4 small text-muted text-uppercase fw-bold" style="letter-spacing:1px; margin: 15px 0;" >
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FECACA;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Critical (<84)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#FDE68A;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Warning (84-90)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#BFDBFE;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Good (90-95)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#A5B4FC;border:1px solid rgba(0,0,0,0.1);border-radius:4px;margin-right:8px;"></span>Excellent (>95)</div>
           </div> `;

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
                <div class="modal fade" id="heatmapModal" tabindex="-1" > <div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content border-0 shadow-lg" style="border-radius:12px;overflow:hidden;">
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
                </div></div></div> `;
            document.body.insertAdjacentHTML('beforeend', m.innerHTML);
        }

        document.getElementById("hmModalTitle").textContent = r;
        document.getElementById("hmModalSubtitle").textContent = fullSec;
        var scEl = document.getElementById("hmScore"); scEl.textContent = score.toFixed(2);
        scEl.className = "display-3 fw-bold mb-2 " + (score < 84 ? "text-danger" : "text-primary-custom");
        document.getElementById("hmBadge").innerHTML = score < 84 ? `<span class="badge bg-danger px-3 py-2 rounded-pill" > CRITICAL</span> ` : (score < 90 ? ` <span class="badge bg-warning text-dark px-3 py-2 rounded-pill" > WARNING</span> ` : ` <span class="badge bg-success px-3 py-2 rounded-pill" > GOOD</span> `);
        document.getElementById("hmVsNat").innerHTML = (diff >= 0 ? `<span class="text-success" >▲ +` : ` <span class="text-danger" >▼ `) + diff.toFixed(2) + "</span>";
        document.getElementById("hmAction").textContent = reportData.actionPlanConfig[fullSec] || "Review operational standards and compliance.";

        var culprits = Object.values(reportData.stores).filter(s => s.meta.region === r && s.results[curWave]).map(s => ({ n: s.meta.name, s: s.results[curWave].sections[fullSec] || 0 })).sort((a, b) => a.s - b.s).slice(0, 5);
        document.getElementById("hmCulprits").innerHTML = culprits.map(c => `<tr ><td>${c.n}</td><td class="text-end fw-bold ${c.s < 84 ? "text-danger" : ""}" > ${c.s.toFixed(2)}</td></tr> `).join("");

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
        var weakHTML = secs.map(x => `<div class="d-flex justify-content-between align-items-center mb-1 text-danger small" ><span class="text-truncate" style="max-width:180px">${x.k}</span><strong>${x.v.toFixed(1)}</strong></div> `).join("");
        var rankBadge = idx < 3 ? `<span class="rank-badge rank-top-${idx + 1} shadow-sm" style="width:32px;height:32px;font-size:1rem;" > ${idx + 1}</span> ` : ` <span class="badge bg-light text-dark border" > #${idx + 1}</span> `;

        var col = document.createElement("div");
        col.className = "col-lg-4 col-md-6";
        col.innerHTML = `
                <div class="card h-100 shadow-hover border-0" style="transition: transform 0.2s;" >
                    <div class="card-body p-4 position-relative">
                        <div class="position-absolute top-0 end-0 m-3">${rankBadge}</div>
                        <h5 class="fw-bold text-primary-custom mb-1">${item.n}</h5>
                        <div class="text-muted small mb-3">${d.count} Outlet Aktif</div>
                        <div class="d-flex align-items-center mb-4">
                            <h2 class="display-5 fw-bold mb-0 me-3 ${score < 84 ? " text-danger" : "text-primary-custom"}">${score.toFixed(2)}</h2>
                        <div class="${diff >= 0 ? " text-success" : "text-danger"} fw-bold small">
                        ${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(2)}
                    </div>
                   </div>
                   <div class="p-3 bg-light rounded-3 mb-3 border-start border-3 border-danger">
                       <div class="text-uppercase fw-bold text-muted small mb-2" style="font-size:0.7rem; letter-spacing:1px;">Focus Areas (Lowest 3)</div>
                       ${weakHTML}
                   </div>
                   <button class="btn btn-outline-primary w-100 btn-sm" onclick="showTab('stores'); document.getElementById('storeSearch').value='${item.n}'; renderStoreList();">Deep Dive</button>
               </div>
           </div> `;
        cont.appendChild(col);
    });

    // 4. Regional Priorities (Focus on Lowest Ranked Region)
    const lowestRegion = sortedRegs[sortedRegs.length - 1]; // sortedRegs is desc
    const regPriContainer = document.getElementById("regPrioritiesList");

    if (regPriContainer && lowestRegion && lowestRegion.d && lowestRegion.d.details) {
        // Update Title to include Region Name
        const header = regPriContainer.closest('.card').querySelector('.card-header-clean');
        if (header) header.textContent = `⚠️ Priority Focus for ${lowestRegion.n}(Lowest Performing Region)`;

        let allRegItems = [];
        Object.entries(lowestRegion.d.details).forEach(([sec, items]) => {
            Object.values(items).forEach(item => {
                if (item.count > 0) {
                    allRegItems.push({ t: item.t, score: (item.sum / item.count) });
                }
            });
        });

        const topRegPriorities = allRegItems.sort((a, b) => a.score - b.score).slice(0, 5);

        regPriContainer.innerHTML = topRegPriorities.map((item, idx) => `
                <div class= "col-md-6 col-lg-4" >
                <div class="h-100 p-3 bg-white rounded shadow-sm border-start border-4 border-danger d-flex align-items-center">
                    <div class="me-3 fw-bold text-danger fs-4 text-nowrap">#${idx + 1}</div>
                    <div class="flex-grow-1">
                        <div class="small fw-bold text-dark" style="line-height:1.2;">${item.t}</div>
                    </div>
                    <div class="ms-2 text-end">
                        <span class="badge bg-danger rounded-pill">${(item.score * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
                `).join('');
    }
}

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

    // 4. Branch Priorities (Focus on Lowest Ranked Branch)
    const lowestBranch = [...brData].sort((a, b) => a.s - b.s)[0];
    const brPriContainer = document.getElementById("branchPrioritiesList");

    if (brPriContainer && lowestBranch && lowestBranch.d && lowestBranch.d.details) {
        // Update Title
        const header = brPriContainer.closest('.card').querySelector('.card-header-clean');
        if (header) header.textContent = `⚠️ Priority Focus for ${lowestBranch.n}(Lowest Performing Branch)`;

        let allBrItems = [];
        Object.entries(lowestBranch.d.details).forEach(([sec, items]) => {
            Object.values(items).forEach(item => {
                if (item.count > 0) {
                    allBrItems.push({ t: item.t, score: (item.sum / item.count) });
                }
            });
        });

        const topBrPriorities = allBrItems.sort((a, b) => a.score - b.score).slice(0, 5);

        brPriContainer.innerHTML = topBrPriorities.map((item, idx) => `
                <div class= "col-md-6 col-lg-4" >
                <div class="h-100 p-3 bg-white rounded shadow-sm border-start border-4 border-danger d-flex align-items-center">
                    <div class="me-3 fw-bold text-danger fs-4 text-nowrap">#${idx + 1}</div>
                    <div class="flex-grow-1">
                        <div class="small fw-bold text-dark" style="line-height:1.2;">${item.t}</div>
                    </div>
                    <div class="ms-2 text-end">
                        <span class="badge bg-danger rounded-pill">${(item.score * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
                `).join('');
    }
}

function renderBranchKPIs(top, fast, gap, hExc, hWarn, hCrit) {
    var html = `
                <div class="col-xl-3 col-md-6" >
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
    // Consultant-grade Lollipop Chart: Final Polish with Outlet Count
    var sorted = [...brData].sort((a, b) => a.s - b.s);
    var yNames = sorted.map(d => d.n);
    var xScores = sorted.map(d => d.s);

    // Color logic: Green (>=95), Amber (>=84), Red (<84)
    var dotColors = xScores.map(s => s >= 95 ? '#059669' : (s >= 84 ? '#D97706' : '#DC2626'));

    // Dynamic Height
    var dynamicHeight = Math.max(550, yNames.length * 50);

    // Calculate Average
    var avgScore = xScores.length > 0 ? xScores.reduce((a, b) => a + b, 0) / xScores.length : 0;

    // --- Trace 1: Lollipop Stems ---
    var baselineScore = 70;
    var stemTrace = {
        y: yNames,
        x: xScores.map(s => s - baselineScore),
        base: Array(yNames.length).fill(baselineScore),
        type: 'bar',
        orientation: 'h',
        marker: { color: dotColors.map(c => c + '25'), line: { width: 0 } },
        width: 0.15,
        hoverinfo: 'skip',
        showlegend: false
    };

    // --- Trace 2: Lollipop Heads (Dots) ---
    var dotTrace = {
        y: yNames,
        x: xScores,
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: dotColors,
            size: 16,
            line: { color: 'white', width: 2 },
            symbol: 'circle'
        },
        hovertemplate: '<b>%{y}</b><br>Score: %{x:.2f}<extra></extra>',
        showlegend: false
    };

    // --- Annotations ---
    var annotations = [];

    // 1. Data Labels (Scores, Momentum, Outlet Count)
    sorted.forEach((d, i) => {
        // Score Label
        annotations.push({
            x: d.s + 1.2,
            y: d.n,
            text: '<b>' + d.s.toFixed(1) + '</b>',
            showarrow: false,
            font: { size: 12, family: 'Inter', color: '#111827', weight: '700' },
            xanchor: 'left',
            bgcolor: 'white',
            borderpad: 2
        });

        // Momentum Badge
        var momColor = d.mom >= 0 ? '#059669' : '#DC2626';
        var momIcon = d.mom >= 0 ? '▲' : '▼';
        annotations.push({
            x: d.s + 6.0,
            y: d.n,
            text: momIcon + ' ' + Math.abs(d.mom).toFixed(1),
            showarrow: false,
            font: { size: 10, family: 'Inter', color: momColor, weight: '600' },
            xanchor: 'left'
        });

        // Outlet Count (Context Column on Right)
        annotations.push({
            x: 108, // Fixed far right position
            y: d.n,
            text: d.count + ' Stores',
            showarrow: false,
            font: { size: 11, family: 'Inter', color: '#6B7280', weight: '500' },
            xanchor: 'right'
        });
    });

    // 2. Reference Lines
    var shapes = [
        {
            type: 'line',
            x0: 84, x1: 84,
            y0: -0.5, y1: yNames.length - 0.5,
            line: { color: '#EF4444', width: 1.5, dash: 'dash' },
            layer: 'below'
        },
        {
            type: 'line',
            x0: avgScore, x1: avgScore,
            y0: -0.5, y1: yNames.length - 0.5,
            line: { color: '#4472C4', width: 1.5, dash: 'dot' },
            layer: 'below'
        }
    ];

    // 3. Reference Labels

    // Average Label (Top)
    annotations.push({
        x: avgScore,
        y: yNames.length - 0.5,
        text: '<b>AVG:' + avgScore.toFixed(1) + '</b>',
        showarrow: false,
        font: { size: 10, color: '#4472C4', family: 'Inter', weight: 'bold' },
        yanchor: 'bottom',
        xanchor: 'center',
        bgcolor: '#FFFFFF',
        yshift: 5
    });

    // Threshold Label (Bottom)
    annotations.push({
        x: 84,
        y: -0.5, // Bottom
        text: '<b>TARGET: 84</b>',
        showarrow: false,
        font: { size: 10, color: '#EF4444', family: 'Inter', weight: 'bold' },
        yanchor: 'top',
        xanchor: 'center',
        bgcolor: '#FFFFFF',
        yshift: -5
    });

    // Outlet Count Header (Top Right)
    annotations.push({
        x: 108,
        y: yNames.length - 0.5,
        text: 'SIZE',
        showarrow: false,
        font: { size: 9, color: '#9CA3AF', family: 'Inter', weight: '700' },
        yanchor: 'bottom',
        xanchor: 'right',
        yshift: 5
    });

    Plotly.newPlot("branchMomentumChart", [stemTrace, dotTrace], {
        xaxis: {
            title: { text: '', font: { size: 11 } },
            range: [baselineScore, 110], // Increased range to fit Outlet Count
            showgrid: true,
            gridcolor: '#F3F4F6',
            zeroline: false,
            tickfont: { size: 11, color: '#9CA3AF', family: 'Inter' },
            dtick: 5,
            side: 'top'
        },
        yaxis: {
            automargin: true,
            tickfont: { size: 12, family: 'Inter', weight: '600', color: '#1F2937' },
            showgrid: false
        },
        shapes: shapes,
        annotations: annotations,
        margin: { l: 180, r: 60, t: 60, b: 40 },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        height: dynamicHeight,
        font: { family: 'Inter' },
        hovermode: 'closest',
        bargap: 0.5
    }, config);
}
function renderBranchMatrixChart(brData) {
    var x = brData.map(d => d.s);
    var y = brData.map(d => d.mom);
    // Smart Labels: Only show extreme outliers to avoid label pile-ups
    var sortedByScore = [...brData].sort((a, b) => b.s - a.s);
    var outliers = new Set([
        ...sortedByScore.slice(0, 2).map(d => d.n),  // Top 2 by score
        ...sortedByScore.slice(-2).map(d => d.n)      // Bottom 2 by score
    ]);

    var text = brData.map(d => outliers.has(d.n) ? d.n : "");
    var hoverText = brData.map(d => d.n);

    // Visuals: White background for text labels to improve readability over gridlines
    var size = brData.map(d => Math.max(12, Math.min(35, Math.sqrt(d.count) * 7))); // Slightly larger bubbles
    var colors = x.map(s => s >= 84 ? '#002060' : '#DC2626');

    // Shapes: Q1 (Stars), Q2 (Rising), Q3 (Watch), Q4 (Critical)
    var shapes = [
        { type: 'rect', x0: 84, y0: 0, x1: 105, y1: 20, fillcolor: '#ECFDF5', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Stars
        { type: 'rect', x0: 50, y0: 0, x1: 84, y1: 20, fillcolor: '#EFF6FF', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Rising
        { type: 'rect', x0: 84, y0: -20, x1: 105, y1: 0, fillcolor: '#FFFBEB', opacity: 0.4, line: { width: 0 }, layer: 'below' }, // Watch
        { type: 'rect', x0: 50, y0: -20, x1: 84, y1: 0, fillcolor: '#FEF2F2', opacity: 0.4, line: { width: 0 }, layer: 'below' }  // Critical
    ];

    var divId = "branchMatrixChart";
    var chart = document.getElementById(divId);

    Plotly.newPlot(divId, [{
        x: x, y: y, text: text, hovertext: hoverText, mode: 'markers+text',
        marker: { size: size, color: colors, opacity: 0.85, line: { color: 'white', width: 2 }, sizemode: 'diameter' },
        textposition: 'top center',
        textfont: { size: 10, family: 'Inter', weight: 'bold', color: '#1F2937', bgcolor: 'rgba(255,255,255,0.8)' }, // Masking
        hovertemplate: '<b>%{hovertext}</b><br>Score: %{x:.2f}<br>Momentum: %{y:.2f}<br>Outlets: %{marker.size}<extra></extra>'
    }], {
        xaxis: { title: 'Current Score →', range: [75, 100], showgrid: true, gridcolor: 'white', zeroline: false }, // Zoomed in range?
        yaxis: { title: 'Momentum ↑', range: [-20, 22], showgrid: true, gridcolor: 'white', zeroline: true, zerolinecolor: '#9CA3AF' },
        shapes: [
            ...shapes,
            { type: 'line', x0: 84, x1: 84, y0: -20, y1: 20, line: { color: '#EF4444', width: 2, dash: 'dash' } },
            { type: 'line', x0: 50, x1: 105, y0: 0, y1: 0, line: { color: '#9CA3AF', width: 1 } }
        ],
        annotations: [
            { x: 99, y: 18, text: '⭐ STARS', showarrow: false, font: { color: '#059669', size: 14, weight: '900' }, bgcolor: 'white', opacity: 0.8 },
            { x: 76, y: 18, text: '⚡ RISING', showarrow: false, font: { color: '#2563EB', size: 14, weight: '900' }, bgcolor: 'white', opacity: 0.8 },
            { x: 99, y: -18, text: '👀 WATCH', showarrow: false, font: { color: '#D97706', size: 14, weight: '900' }, bgcolor: 'white', opacity: 0.8 },
            { x: 76, y: -18, text: '🛑 CRITICAL', showarrow: false, font: { color: '#DC2626', size: 14, weight: '900' }, bgcolor: 'white', opacity: 0.8 }
        ],
        margin: { t: 80, b: 40, l: 50, r: 20 },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter' }, hovermode: 'closest',
        height: 400
    }, config);

    // Interaction
    chart.on('plotly_click', function (data) {
        var name = data.points[0].hovertext || data.points[0].text;
        if (name) {
            var inp = document.getElementById("branchSearch");
            inp.value = name;
            filterBranchCards();
            document.getElementById("branchContainer").scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Render Scale Efficiency Chart
    renderBranchScaleChart(brData);
}

function renderBranchScaleChart(brData) {
    // Advanced Scale Analysis V4: Granular breakdown (5 Categories)
    var groups = {
        '1-5': { min: 1, max: 5, count: 0, scoreSum: 0, momSum: 0, networks: 0, critical: 0, scores: [], names: [] },
        '6-10': { min: 6, max: 10, count: 0, scoreSum: 0, momSum: 0, networks: 0, critical: 0, scores: [], names: [] },
        '11-15': { min: 11, max: 15, count: 0, scoreSum: 0, momSum: 0, networks: 0, critical: 0, scores: [], names: [] },
        '16-20': { min: 16, max: 20, count: 0, scoreSum: 0, momSum: 0, networks: 0, critical: 0, scores: [], names: [] },
        '21+': { min: 21, max: 999, count: 0, scoreSum: 0, momSum: 0, networks: 0, critical: 0, scores: [], names: [] }
    };

    brData.forEach(d => {
        var k = '21+';
        if (d.count <= 5) k = '1-5';
        else if (d.count <= 10) k = '6-10';
        else if (d.count <= 15) k = '11-15';
        else if (d.count <= 20) k = '16-20';

        groups[k].networks++;
        groups[k].scoreSum += d.s;
        groups[k].momSum += d.mom;
        groups[k].count += d.count;
        if (d.s < 84) groups[k].critical++;
        groups[k].scores.push(d.s);
        groups[k].names.push({ n: d.n, s: d.s });
    });

    var labels = Object.keys(groups);
    // Calculations
    var avgScores = labels.map(k => groups[k].networks > 0 ? groups[k].scoreSum / groups[k].networks : 0);
    var avgMoms = labels.map(k => groups[k].networks > 0 ? groups[k].momSum / groups[k].networks : 0);

    // Stats
    var minScores = labels.map(k => groups[k].scores.length > 0 ? Math.min(...groups[k].scores) : 0);
    var maxScores = labels.map(k => groups[k].scores.length > 0 ? Math.max(...groups[k].scores) : 0);
    var bestPerformers = labels.map(k => {
        if (groups[k].names.length === 0) return "N/A";
        var best = groups[k].names.reduce((prev, curr) => (prev.s > curr.s) ? prev : curr);
        return `${best.n} (${best.s.toFixed(1)})`;
    });
    var worstPerformers = labels.map(k => {
        if (groups[k].names.length === 0) return "N/A";
        var worst = groups[k].names.reduce((prev, curr) => (prev.s < curr.s) ? prev : curr);
        return `${worst.n} (${worst.s.toFixed(1)})`;
    });

    // Error Bars (Range) - Thinner and Lighter for Readability
    var errorY = {
        type: 'data',
        symmetric: false,
        array: maxScores.map((max, i) => max - avgScores[i]),
        arrayminus: avgScores.map((avg, i) => avg - minScores[i]),
        color: '#9CA3AF', thickness: 1, width: 2, visible: true // Gray, thin
    };

    // Colors: 5-Step Blue Gradient
    var barColors = ['#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#1E40AF'];

    // Contrast Text Colors for Bars
    var textColors = ['#1F2937', '#1F2937', '#1F2937', '#FFFFFF', '#FFFFFF']; // Dark for light bars

    // Trace 1: Bar Chart — NO text labels to avoid overlap with line
    var trace1 = {
        x: labels, y: avgScores, type: 'bar', name: 'Avg Score',
        marker: { color: barColors, line: { width: 0 }, opacity: 0.9 },
        error_y: errorY,
        text: avgScores.map(v => v > 0 ? v.toFixed(1) : ""),
        textposition: 'none', // Hide bar text — values shown via annotations below
        hovertemplate:
            '<b>%{x} Outlets</b><br>' +
            'Avg Score: %{y:.2f}<br>' +
            'Range: %{customdata[2]:.1f} - %{customdata[3]:.1f}<br>' +
            '🏆 Best: %{customdata[4]}<br>' +
            '⚠️ Lowest: %{customdata[5]}<br>' +
            'Networks: %{customdata[0]}<br>' +
            'Critical: %{customdata[1]}<extra></extra>',
        customdata: labels.map((l, i) => [
            groups[l].networks,
            groups[l].critical,
            minScores[i],
            maxScores[i],
            bestPerformers[i],
            worstPerformers[i]
        ])
    };

    // Trace 2: Line Chart (Momentum)
    var trace2 = {
        x: labels, y: avgMoms, type: 'scatter', mode: 'lines+markers+text', name: 'Momentum',
        yaxis: 'y2',
        line: { color: '#F97316', width: 3, shape: 'spline' },
        marker: { size: 9, color: 'white', line: { color: '#F97316', width: 2 } },
        text: avgMoms.map(v => (v > 0 ? "+" : "") + v.toFixed(1) + "<br>"), textposition: 'top center',
        textfont: { color: '#C2410C', weight: 'bold', size: 12 }, // Darker orange, larger text
        hovertemplate: 'Avg Momentum: %{y:.2f}<extra></extra>'
    };

    // Score annotations placed below the x-axis for each bar
    var scoreAnnotations = labels.map((l, i) => ({
        x: l, y: avgScores[i], xref: 'x', yref: 'y',
        text: '<b>' + avgScores[i].toFixed(1) + '</b>',
        showarrow: false,
        font: { color: textColors[i], size: 13, family: 'Inter' },
        yshift: -15 // Push inside the bar, below the top edge
    }));

    Plotly.newPlot('branchScaleChart', [trace1, trace2], {
        margin: { t: 30, b: 30, l: 40, r: 40 },
        yaxis: { range: [65, 100], title: { text: 'Avg Score', font: { size: 10, color: '#6B7280' } } },
        yaxis2: {
            title: { text: 'Avg Momentum', font: { size: 10, color: '#EA580C' } },
            overlaying: 'y', side: 'right', showgrid: false, zeroline: false,
            range: [-10, 20]
        },
        xaxis: { title: 'Number of Outlets', titlefont: { size: 10, color: '#9CA3AF' }, tickfont: { size: 11, weight: 'bold' } },
        showlegend: false,
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        height: 350, font: { family: 'Inter' },
        annotations: scoreAnnotations
    }, config);
}
function renderBranchInsights(top, fast, hCrit, brData) {
    var insights = [];
    insights.push(`<div >📌 <strong>${top.n}</strong> leads with <strong>${top.s.toFixed(2)}</strong>.`);
    if (hCrit > 0) {
        var names = brData.filter(b => b.s < 84).map(b => b.n).join(", ");
        insights.push(`<div >🚨 <strong>${hCrit} Critical Branches</strong> (< 84): <span class="text-danger">${names}</span>.</div> `);
    }
    insights.push(`<div >📈 <strong>${fast.n}</strong> has the strongest momentum(<span class="text-success">+${fast.mom.toFixed(2)}</span>).</div> `);

    var stars = brData.filter(b => b.s >= 84 && b.mom > 0).length;
    var rising = brData.filter(b => b.s < 84 && b.mom > 0).length;
    insights.push(`<div >💡 <strong>Strategic Mix</strong>: ${stars} Stars(High / Growing), ${rising} Rising(Low / Growing).</div> `);

    document.getElementById("branchInsights").innerHTML = insights.join("");
}

// Variables for Culprit Pagination
// (Declarations moved below to avoid duplicates)

// Expose functions globally
window.changeCulpritPage = function (delta) {
    currentCulpritPage += delta;
    renderCulpritList();
};

// Global variables to store current modal context
var currentCulpritData = [];
var currentCulpritPage = 1;
const CULPRIT_PAGE_SIZE = 5;
var currentCulpritSection = null; // Track if we are viewing a specific section

function showCulpritModal(branchName, sectionName = null) {
    // Use global sortedWaves to get the latest wave
    var targetWave = (typeof sortedWaves !== 'undefined') ? sortedWaves[sortedWaves.length - 1] : "Wave 1";
    currentCulpritSection = sectionName ? sectionName.trim() : null;

    document.getElementById("culpritBranchName").innerText = branchName + (currentCulpritSection ? ` - ${currentCulpritSection} ` : "");

    // Helper: get section score from store-level data
    // Store sections are flat numbers { sectionName: score }
    // Branch/Region sections are { sectionName: { sum, count } }
    function getStoreSecScore(sections, secName) {
        // Try exact match first
        if (sections[secName] !== undefined) {
            var v = sections[secName];
            return (typeof v === 'object' && v.sum !== undefined) ? (v.sum / v.count) : v;
        }
        // Try trimmed match
        var key = Object.keys(sections).find(k => k.trim() === secName.trim());
        if (key !== undefined) {
            var v = sections[key];
            return (typeof v === 'object' && v.sum !== undefined) ? (v.sum / v.count) : v;
        }
        return null;
    }

    // Get Stores < 84
    currentCulpritData = Object.values(reportData.stores)
        .filter(s => {
            if (s.meta.branch !== branchName || !s.results[targetWave]) return false;

            if (currentCulpritSection) {
                var score = getStoreSecScore(s.results[targetWave].sections, currentCulpritSection);
                return score !== null && score < 84;
            } else {
                return s.results[targetWave].totalScore < 84;
            }
        })
        .map(s => {
            var d = s.results[targetWave];
            return {
                n: s.meta.name,
                c: s.meta.code,
                s: d.totalScore,
                secScore: currentCulpritSection ? getStoreSecScore(d.sections, currentCulpritSection) : null,
                sect: d.sections
            };
        })
        .sort((a, b) => {
            if (currentCulpritSection) return a.secScore - b.secScore;
            return a.s - b.s;
        });

    currentCulpritPage = 1;
    renderCulpritList();

    var myModal = new bootstrap.Modal(document.getElementById('culpritModal'));
    myModal.show();
}

function renderCulpritList() {
    var container = document.getElementById("culpritList");
    container.innerHTML = "";

    var start = (currentCulpritPage - 1) * CULPRIT_PAGE_SIZE;
    var end = start + CULPRIT_PAGE_SIZE;
    var pageData = currentCulpritData.slice(start, end);

    if (pageData.length === 0) {
        container.innerHTML = '<div class="text-center p-4 text-muted">No stores found below threshold.</div>';
        return;
    }

    pageData.forEach(s => {
        // Find worst 3 sections for context
        // Store sections can be flat numbers OR {sum, count} objects
        var worstSecs = Object.entries(s.sect)
            .map(([k, v]) => ({ k: k, s: (typeof v === 'object' && v.sum !== undefined) ? (v.sum / v.count) : v }))
            .filter(ws => !isNaN(ws.s))
            .sort((a, b) => a.s - b.s) // Lowest first
            .slice(0, 3); // Top 3

        var worstHTML = worstSecs.map(ws =>
            `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-1 px-1 me-1 mb-1" style="font-size: 0.75rem;" >
        ${ws.k}: ${ws.s.toFixed(1)}
             </span> `
        ).join("");

        // Determine what score to show prominently
        var displayScore = currentCulpritSection ? s.secScore : s.s;

        // Make clickable link
        var item = document.createElement("a");
        item.href = "?store=" + s.c;
        item.target = "_blank";
        item.className = "list-group-item list-group-item-action p-3 border-light hover-bg-light text-decoration-none";

        var badgeColor = displayScore < 70 ? 'bg-danger' : (displayScore < 84 ? 'bg-warning text-dark' : 'bg-success');

        item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1" >
                <span class="fw-bold text-dark">${s.n}</span>
                <span class="badge ${badgeColor} rounded-pill fs-6">${displayScore.toFixed(1)}</span>
            </div>
            
            <div class="mt-2 mb-2">
                <div class="text-muted small fw-medium mb-1">Lowest Performing Areas:</div>
                <div class="d-flex flex-wrap">
                    ${worstHTML}
                </div>
            </div>

            <div class="small text-muted d-flex align-items-center justify-content-between mt-2 pt-2 border-top border-light-subtle">
                ${currentCulpritSection
                ? `<span>Total Store Score: <strong>${s.s.toFixed(1)}</strong></span>`
                : `<span class="text-danger fw-medium"><i class="bi bi-exclamation-circle me-1"></i> Requires Attention</span>`
            }
                <span class="text-primary fw-medium" style="font-size: 0.85rem;">View Full Analysis <i class="bi bi-arrow-right ms-1"></i></span>
            </div>
    `;
        container.appendChild(item);
    });

    // Pagination Controls
    var totalPages = Math.ceil(currentCulpritData.length / CULPRIT_PAGE_SIZE);
    document.getElementById("culpritPageIndicator").innerText = `Page ${currentCulpritPage} of ${totalPages || 1} `;
    document.getElementById("btnCulpritPrev").disabled = currentCulpritPage === 1;
    document.getElementById("btnCulpritNext").disabled = (end >= currentCulpritData.length) || (totalPages <= 1);
}

function renderBranchCards(data, waves) {
    var cont = document.getElementById("branchContainer");
    cont.innerHTML = "";

    // Sort by Score Descending
    var viewData = [...data].sort((a, b) => b.s - a.s);

    viewData.forEach((d, i) => {
        var rank = i + 1;
        var badge = d.s >= 95 ? '<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 rounded-pill fw-bold">EXCELLENT</span>' :
            (d.s >= 84 ? '<span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 px-3 py-2 rounded-pill fw-bold">WARNING</span>' :
                '<span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 px-3 py-2 rounded-pill fw-bold">CRITICAL</span>');

        var yTrend = waves.map(w => { var bd = reportData.branches[d.n][w]; return bd ? bd.sum / bd.count : null; });
        var sparkHTML = generateSparkline(yTrend, waves);

        // Data for Lists
        var branchStores = Object.values(reportData.stores).filter(s => s.meta.branch === d.n && s.results[waves[waves.length - 1]]);
        var criticalCount = branchStores.filter(s => s.results[waves[waves.length - 1]].totalScore < 84).length;

        var lowestStores = [...branchStores]
            .map(s => ({ n: s.meta.name, s: s.results[waves[waves.length - 1]].totalScore }))
            .sort((a, b) => a.s - b.s) // Lowest first
            .slice(0, 3);

        var lowestHTML = lowestStores.map(s => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light-subtle" >
                <span class="fw-medium text-dark small text-wrap lh-sm" style="max-width: 70%;">${s.n}</span>
                <span class="fw-bold ${s.s < 84 ? 'text-danger' : 'text-dark'} small bg-light-subtle px-2 py-1 rounded">${s.s.toFixed(1)}</span>
            </div> `).join("");

        // Critical Stores Button (Moved to Middle Column)
        var criticalBtnHTML = "";
        if (criticalCount > 0) {
            criticalBtnHTML = `
        <div class="mt-3 text-center" >
            <button onclick="showCulpritModal('${d.n}')" class="btn btn-sm btn-danger shadow-sm w-100 py-2 fw-medium" style="border-radius: 8px;">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> View ${criticalCount} Critical Stores
            </button>
            </div> `;
        }

        var prioritySecs = Object.entries(d.d.sections)
            .map(([k, v]) => ({ k: k, s: v.sum / v.count }))
            .sort((a, b) => a.s - b.s)
            .slice(0, 3);

        var priorityHTML = prioritySecs.map(s => {
            // Count problematic stores for this section
            var probCount = branchStores.filter(store => {
                var res = store.results[waves[waves.length - 1]];
                if (!res || res.sections[s.k] === undefined) return false;
                var sv = res.sections[s.k];
                var score = (typeof sv === 'object' && sv.sum !== undefined) ? (sv.sum / sv.count) : sv;
                return !isNaN(score) && score < 84;
            }).length;

            return `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-light-subtle hover-bg-light"
    style="cursor: pointer; transition: background 0.2s;"
    onclick="showCulpritModal('${d.n}', '${s.k}')"
    title="Click to view problematic stores in ${s.k}" >
                
                <div class="d-flex align-items-center gap-2" style="max-width: 75%;">
                    <!-- Visual Indicator: Small icon -->
                    <i class="bi bi-box-arrow-in-up-right text-muted" style="font-size: 0.75rem;"></i>
                    
                    <div class="text-wrap lh-sm">
                        <div class="fw-medium text-dark small text-decoration-underline-hover">${s.k}</div>
                        ${probCount > 0 ? `<div class="mt-1"><span class="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25" style="font-size: 0.6rem; padding: 2px 6px;">${probCount} STORES BELOW 84</span></div>` : ''}
                    </div>
                </div>
                <span class="fw-bold ${s.s < 84 ? 'text-danger' : 'text-dark'} small bg-light-subtle px-2 py-1 rounded">${s.s.toFixed(1)}</span>
            </div> `;
        }).join("");

        var col = document.createElement("div");
        col.className = "col-12 branch-card-item";
        col.dataset.name = d.n.toLowerCase();

        col.innerHTML = `
        <div class="card border-0 shadow hover-shadow-lg mb-4 overflow-hidden" style="border-radius: 16px; transition: all 0.3s ease;" >
            < !--Header -->
            <div class="card-header border-0 bg-gradient-to-r from-light to-white p-4" style="background: linear-gradient(90deg, #F9FAFB 0%, #FFFFFF 100%);">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style="width:40px;height:40px;font-size:1.1rem;">${rank}</div>
                        <div>
                            <h4 class="fw-bold text-dark mb-0" style="font-family: 'Outfit', sans-serif;">${d.n}</h4>
                            <div class="text-muted small mt-1 fw-medium">${d.count} Outlets · Average Score</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <h2 class="display-5 fw-bold mb-0 ${d.s < 84 ? 'text-danger' : 'text-success'}">${d.s.toFixed(2)}</h2>
                        ${badge}
                    </div>
                </div>
            </div>
            
            <div class="card-body p-0">
                <div class="row g-0">
                    <!-- Col 1: Trend -->
                    <div class="col-lg-3 border-end border-light-subtle p-4">
                        <div class="d-flex align-items-center justify-content-between mb-3">
                            <h6 class="text-uppercase fw-bold text-muted small mb-0">Momentum</h6>
                            <span class="badge ${d.mom >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} rounded-pill">
                                ${d.mom >= 0 ? '▲ +' : '▼ '}${d.mom.toFixed(2)}
                            </span>
                        </div>
                        <div style="height: 60px; opacity: 0.7;">${sparkHTML}</div>
                        <p class="small text-muted mt-3 mb-0 lh-sm">Wave-over-wave trend.</p>
                    </div>

                    <!-- Col 2: Lowest Performing Stores (Middle) -->
                    <div class="col-lg-5 border-end border-light-subtle p-4 bg-light bg-opacity-10">
                        <h6 class="text-uppercase fw-bold text-muted small mb-3">
                            <i class="bi bi-graph-down-arrow me-1"></i> Lowest Performing Stores
                        </h6>
                        <div class="d-flex flex-column gap-1">
                            ${lowestHTML}
                        </div>
                        ${criticalBtnHTML}
                    </div>

                    <!-- Col 3: Priority Focus Areas -->
                    <div class="col-lg-4 p-4">
                        <h6 class="text-uppercase fw-bold text-warning small mb-3">
                            <i class="bi bi-exclamation-triangle me-1"></i> Priority Focus Areas
                        </h6>
                        <div class="d-flex flex-column gap-1">
                            ${priorityHTML}
                        </div>
                    </div>
                </div>
            </div>
        </div> `;
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
        if (score < 84) scoreBadge = `<span class="badge bg-danger rounded-pill px-3" > ${score.toFixed(2)}</span> `;
        else if (score >= 95) scoreBadge = `<span class="badge bg-success rounded-pill px-3" > ${score.toFixed(2)}</span> `;
        else scoreBadge = `<span class="fw-bold text-dark" > ${score.toFixed(2)}</span> `;

        var row = `<tr >
            <td class="ps-4 fw-bold text-secondary">#${rank}</td>
            <td><span class="badge bg-light text-dark border">${s.meta.code}</span></td>
            <td><div class="fw-bold text-dark">${s.meta.name}</div></td>
            <td><span class="badge bg-soft-primary text-primary-custom border-0">${s.meta.branch}</span></td>
            <td><span class="small text-secondary fw-bold text-uppercase">${s.meta.region}</span></td>
            <td class="text-end text-dark">${scoreBadge}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="viewStore('${s.meta.code}')">See Details</button>
            </td>
        </tr> `;
        tbody.innerHTML += row;
    });

    document.getElementById("storeListCount").textContent = `Showing ${start + 1} -${Math.min(end, list.length)} of ${list.length} stores`;
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
    // Ensure tab is active (critical for deep links)
    if (typeof showTab === 'function') showTab('stores');

    // Switch Views
    document.getElementById("storeListContainer").style.display = "none";
    document.getElementById("storeContent").style.display = "block";

    // Set Global State
    window.currentStoreId = id;

    // Populate dropdown for compatibility (hidden but functional) - OPTIONAL
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

function generateSparkline(data, waves) {
    if (!data || data.length < 2) return "";
    var w = 120, h = 40;

    // Dynamic Scale
    var valid = data.filter(d => d !== null);
    if (valid.length === 0) return "";
    var dMin = Math.min(...valid), dMax = Math.max(...valid);
    var range = dMax - dMin;
    var min = Math.max(0, dMin - (range * 0.2 || 5));
    var max = Math.min(100, dMax + (range * 0.2 || 5));
    if (min === max) { min -= 5; max += 5; }

    var step = w / (data.length - 1);
    var points = [];

    data.forEach((val, i) => {
        if (val === null) return;
        var x = i * step;
        var y = h - ((val - min) / (max - min) * h);
        points.push({ x: x, y: y, val: val, wave: waves ? waves[i] : (i + 1) });
    });

    if (points.length < 2) return "";

    var linePath = points.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");

    // Closed path for fill area
    var fillPath = linePath + ` L ${points[points.length - 1].x.toFixed(1)} ${h} L ${points[0].x.toFixed(1)} ${h} Z`;

    var last = points[points.length - 1], first = points[0];
    var isUp = last.val >= first.val;
    var color = isUp ? "#10B981" : "#EF4444";
    var fillColor = isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";

    var markers = points.map(p =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#fff" stroke="${color}" stroke - width="1.5" class="spark-dot" >
        <title>${p.wave}: ${p.val.toFixed(2)}</title>
        </circle> `
    ).join("");

    return `<svg width="${w}" height="${h}" viewBox="-20 -10 ${w + 40} ${h + 20}" fill="none" style="overflow:visible; vertical-align:middle;" >
        <path d="${fillPath}" fill="${fillColor}" stroke="none"/>
        <path d="${linePath}" stroke="${color}" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
        ${markers}
        <text x="-5" y="${first.y}" fill="#6B7280" text-anchor="end" font-family="Inter, sans-serif" font-size="10" font-weight="600" dy="3">${first.val.toFixed(0)}</text>
        <text x="${w + 5}" y="${last.y}" fill="${color}" text-anchor="start" font-family="Inter, sans-serif" font-size="11" font-weight="700" dy="3">${last.val.toFixed(0)}</text>
    </svg> `;
}

function loadStoreDetail(idOverride) {
    var c = idOverride || document.getElementById("storeSelect").value;
    // Fallback if accessed via dropdown (rare now)
    if (!c) c = document.getElementById("storeSelect").value;

    if (!c) return;

    var s = reportData.stores[c], cur = s.results[sortedWaves[sortedWaves.length - 1]];
    var currentWaveKey = sortedWaves[sortedWaves.length - 1];

    // 1. Basic Info & Rank Calculation
    document.getElementById("stName").textContent = s.meta.name;
    document.getElementById("stMeta").textContent = s.meta.region + " | " + s.meta.branch;

    var stScore = cur.totalScore;
    document.getElementById("stScore").textContent = stScore.toFixed(2);
    document.getElementById("stScore").className = "display-3 fw-bold " + (stScore < 84 ? "text-danger" : "text-white");

    // Calculate Rank
    var allStores = Object.values(reportData.stores);
    allStores.sort((a, b) => {
        var sa = a.results[currentWaveKey] ? a.results[currentWaveKey].totalScore : 0;
        var sb = b.results[currentWaveKey] ? b.results[currentWaveKey].totalScore : 0;
        return sb - sa;
    });
    var rank = allStores.findIndex(x => x.meta.code === c) + 1;
    document.getElementById("stRankBadge").textContent = "Rank #" + rank;

    // Calculate Momentum (YoY / Wave-over-Wave)
    var prevWaveKey = sortedWaves[sortedWaves.length - 2];
    var momHTML = "";
    if (prevWaveKey && s.results[prevWaveKey]) {
        var prevScore = s.results[prevWaveKey].totalScore;
        var diff = stScore - prevScore;
        var icon = diff >= 0 ? "▲" : "▼";
        var colorClass = diff >= 0 ? "text-success" : "text-danger"; // Note: text-success on dark bg might need adjustment, but using inline style for safety
        var colorStyle = diff >= 0 ? "#4ADE80" : "#F87171"; // Light Green / Light Red for visibility on Dark Blue
        momHTML = `<span style="color:${colorStyle}" > ${icon} ${Math.abs(diff).toFixed(2)}</span> <span class="opacity-75 small fw-normal text-white">vs last wave</span>`;
    } else {
        momHTML = `<span class="opacity-50 small" > No previous data</span> `;
    }
    document.getElementById("stMomentum").innerHTML = momHTML;

    // 2. Trend Line (Main Chart) - Luxury Style
    // 2. Trend Line (Main Chart) - Luxury Style
    var y = sortedWaves.map(w => s.results[w] ? s.results[w].totalScore : null);

    // Calculate Averages
    var yNat = sortedWaves.map(w => {
        var d = reportData.summary[w];
        return d ? d.sum / d.count : null;
    });

    var yReg = sortedWaves.map(w => {
        var d = reportData.regions[s.meta.region][w];
        return d ? d.sum / d.count : null;
    });

    // Target Line (Constant 84)
    var yTarget = sortedWaves.map(() => 84);

    Plotly.newPlot("stTrendChart", [
        // 1. Main Store Trace (Area)
        {
            x: sortedWaves, y: y, name: s.meta.name, type: "scatter", mode: "lines+markers",
            line: { color: "#1E3A8A", width: 4, shape: 'spline', smoothing: 1.3 },
            marker: { size: 10, color: "#1E3A8A", line: { color: "white", width: 2 } },
            fill: 'tozeroy', fillcolor: 'rgba(59, 130, 246, 0.1)'
        },
        // 2. National Avg (Dotted)
        {
            x: sortedWaves, y: yNat, name: "National Avg", type: "scatter", mode: "lines",
            line: { color: "#9CA3AF", width: 2, dash: 'dot', shape: 'spline' },
            marker: { size: 0 }, hovertemplate: 'Nat Avg: %{y:.2f}<extra></extra>'
        },
        // 3. Regional Avg (Dashed)
        {
            x: sortedWaves, y: yReg, name: "Region Avg", type: "scatter", mode: "lines",
            line: { color: "#8B5CF6", width: 2, dash: 'dash', shape: 'spline' },
            marker: { size: 0 }, hovertemplate: 'Reg Avg: %{y:.2f}<extra></extra>'
        },
        // 4. Target (Red Dash)
        {
            x: sortedWaves, y: yTarget, name: "Target (84)", type: "scatter", mode: "lines",
            line: { color: "#EF4444", width: 1.5, dash: 'longdashdot' },
            marker: { size: 0 }, hovertemplate: 'Target: 84<extra></extra>'
        }
    ], {
        margin: { t: 20, l: 30, r: 20, b: 0 }, // Increased bottom for legend
        yaxis: { gridcolor: "#F3F4F6", range: [60, 105], zeroline: false },
        xaxis: { showgrid: false, zeroline: false },
        paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
        hoverlabel: { bgcolor: "#1E3A8A", font: { color: "white", family: "Inter" } },
        showlegend: true,
        legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: 'center', bgcolor: 'rgba(0,0,0,0)' }
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

    // Data for Insights
    const insightData = [];

    Object.entries(cur.sections).forEach(([k, v]) => {
        var isBad = v < 84;

        // Calculate Gap
        var avg = radarMode === 'region' ?
            (regData && regData.sections[k] ? regData.sections[k].sum / regData.sections[k].count : 0) :
            (brData && brData.sections[k] ? brData.sections[k].sum / brData.sections[k].count : 0);
        var gap = v - avg;
        var gapHTML = `<span class="small fw-bold ${gap >= 0 ? 'text-success' : 'text-danger'}" > ${gap >= 0 ? '+' : ''}${gap.toFixed(1)}</span> `;

        // Store for Insights
        // Store for Insights
        const failedItems = [];
        const fixedItems = [];

        // Extract section code (e.g., "A" from "A. Tampilan...")
        const sectionCode = k.split('.')[0].trim();

        // 5-Wave History Logic
        // Get last 5 waves (including current)
        const relevantWaves = sortedWaves.slice(-5);

        // Get Previous Wave Data for comparison (for Fixed Items logic)
        const prevWaveDetails = (prevWaveKey && s.results[prevWaveKey] && s.results[prevWaveKey].details)
            ? s.results[prevWaveKey].details[sectionCode] : null;

        if (cur.details && cur.details[sectionCode]) {
            Object.entries(cur.details[sectionCode]).forEach(([code, item]) => {

                // Helper to get history for this item code across last 5 waves
                const getHistory = () => {
                    return relevantWaves.map(w => {
                        if (!s.results[w] || !s.results[w].details || !s.results[w].details[sectionCode] || !s.results[w].details[sectionCode][code]) return null;
                        const hItem = s.results[w].details[sectionCode][code];
                        // Return 1 (Pass), 0 (Fail), or null (N/A)
                        if (hItem.r === 1 || hItem.r === "1" || hItem.r === true) return 1;
                        if (hItem.r === 0 || hItem.r === "0" || hItem.r === false) return 0;
                        return null;
                    });
                };

                const history = getHistory();

                // Get Regional Benchmark
                let regAvg = null;
                // regData is defined in outer scope of loadStoreDetail
                if (regData && regData.details && regData.details[sectionCode] && regData.details[sectionCode][code]) {
                    const rItem = regData.details[sectionCode][code];
                    if (rItem.count > 0) regAvg = rItem.sum / rItem.count;
                }

                // Check if Failed
                if (item.r === 0 || item.r === "0" || item.r === false) {
                    failedItems.push({ text: item.t, history: history, regAvg: regAvg });
                }
                // Check if Fixed (Passed now, Failed before)
                else if (prevWaveDetails && prevWaveDetails[code]) {
                    const prevItem = prevWaveDetails[code];
                    if (prevItem.r === 0 || prevItem.r === "0" || prevItem.r === false) {
                        fixedItems.push({ text: item.t, history: history });
                    }
                }
            });
        }
        insightData.push({ sec: k, score: v, gap: gap, avg: avg, failed: failedItems, fixed: fixedItems });


        // Generate Sparkline Data
        var sparkData = sortedWaves.map(w => s.results[w] && s.results[w].sections[k] !== undefined ? s.results[w].sections[k] : null);
        var sparkHTML = generateSparkline(sparkData, sortedWaves);

        tb.innerHTML += `<tr >
            <td class="fw-bold text-dark" style="font-size:0.9rem;">${k}</td>
            <td>${sparkHTML}</td>
            <td class="text-end fw-bold ${isBad ? "text-danger" : "text - dark"}" > ${v.toFixed(2)}</td>
            <td class="text-center">${gapHTML}</td>
            <td class="text-center">${isBad ? "<span class='badge bg-soft-danger text-danger'>⚠️ CRITICAL</span>" : "<span class='badge bg-soft-success text-success'>OK</span>"}</td>
        </tr> `;
    });

    // 5. Render Performance Insights (New)
    renderPerformanceInsights(insightData);

    // 6. Qualitative Feedback
    var fbList = document.getElementById("stFeedback"); fbList.innerHTML = "";
    if (cur.qualitative && cur.qualitative.length > 0) {
        cur.qualitative.forEach(q => {
            var badge = q.sentiment === 'positive' ? '<span class="badge bg-success">POS</span>' : (q.sentiment === 'negative' ? '<span class="badge bg-danger">NEG</span>' : '<span class="badge bg-secondary">NEU</span>');
            fbList.innerHTML += `<div class="p-3 bg-white rounded shadow-sm border-start border-4 ${q.sentiment === 'negative' ? 'border-danger' : 'border-success'}" >
                <div class="d-flex justify-content-between mb-1"><span class="fw-bold small text-uppercase text-muted">${q.category}</span>${badge}</div>
                <p class="mb-0 small text-dark">"${q.text}"</p>
            </div> `;
        });
    } else {
        fbList.innerHTML = "<div class='text-center text-muted py-4 small'>No feedback recorded</div>";
    }
}

// --- BATTLE MODE LOGIC ---

function toggleBattleMode(isActive) {
    const stdMode = document.getElementById("stStandardMode");
    const battleMode = document.getElementById("stBattleMode");

    if (isActive) {
        if (!window.currentStoreId) {
            alert("No store selected!");
            return;
        }

        stdMode.style.display = "none";
        battleMode.style.display = "block";

        // Initialize Opponent Selector if empty
        const oppSelect = document.getElementById("battleOpponentSelect");
        if (oppSelect.options.length <= 1) {
            initOpponentSelector();
        }

        // Set Player 1 Info
        const s = reportData.stores[window.currentStoreId];
        const curWave = sortedWaves[sortedWaves.length - 1];
        const res = s.results[curWave];

        document.getElementById("battleP1Name").textContent = s.meta.name;
        document.getElementById("battleP1Score").textContent = "Score: " + (res ? res.totalScore.toFixed(2) : "N/A");

    } else {
        stdMode.style.display = "flex"; // Restore flex layout
        battleMode.style.display = "none";
    }
}

function initOpponentSelector() {
    const oppSelect = document.getElementById("battleOpponentSelect");
    const currentId = window.currentStoreId;
    const curWave = sortedWaves[sortedWaves.length - 1];

    // Group by Region
    const regions = {};
    Object.values(reportData.stores).forEach(s => {
        if (s.meta.code === currentId) return; // Exclude self
        if (!regions[s.meta.region]) regions[s.meta.region] = [];
        regions[s.meta.region].push(s);
    });

    // Populate Dropdown
    Object.keys(regions).sort().forEach(r => {
        const group = document.createElement("optgroup");
        group.label = r;
        regions[r].sort((a, b) => a.meta.name.localeCompare(b.meta.name));

        regions[r].forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.meta.code;
            opt.textContent = s.meta.name;
            group.appendChild(opt);
        });
        oppSelect.appendChild(group);
    });
}

function renderBattleAnalysis() {
    const p1Id = window.currentStoreId;
    const p2Id = document.getElementById("battleOpponentSelect").value;

    if (!p2Id) return;

    const curWave = sortedWaves[sortedWaves.length - 1];
    const s1 = reportData.stores[p1Id];
    const s2 = reportData.stores[p2Id];

    const res1 = s1.results[curWave];
    const res2 = s2.results[curWave];

    if (!res1 || !res2) return;

    // 1. Radar Comparison
    const secKeys = Object.keys(res1.sections).sort();
    const v1 = secKeys.map(k => res1.sections[k]);
    const v2 = secKeys.map(k => res2.sections[k] || 0); // Handle missing sections safely

    const radarKeys = [...secKeys, secKeys[0]].map(k => k.split(' ')[0]); // Shortened labels
    const r1 = [...v1, v1[0]];
    const r2 = [...v2, v2[0]];

    Plotly.newPlot("battleRadarChart", [
        {
            type: 'scatterpolar', r: r1, theta: radarKeys,
            fill: 'toself', name: s1.meta.name,
            line: { color: '#2563EB' }, marker: { size: 4 }
        },
        {
            type: 'scatterpolar', r: r2, theta: radarKeys,
            fill: 'toself', name: s2.meta.name,
            line: { color: '#DC2626' }, marker: { size: 4 }, opacity: 0.7
        }
    ], {
        polar: {
            radialaxis: { visible: true, range: [0, 100] },
        },
        showlegend: true, legend: { orientation: "h", y: -0.2 },
        margin: { t: 30, l: 40, r: 40, b: 20 },
        height: 350
    }, config);

    // 2. Gap Analysis (Tale of the Tape)
    const wins = [];
    const losses = [];

    // Iterate all sections and items using details object
    if (res1.details && res2.details) {
        Object.keys(res1.details).forEach(sec => {
            const secItems1 = res1.details[sec];
            const secItems2 = res2.details[sec] || {};

            Object.keys(secItems1).forEach(code => {
                const item1 = secItems1[code];
                const item2 = secItems2[code];

                if (!item2) return;

                // Win: We Passed (1), They Failed (0)
                if (item1.r === 1 && item2.r === 0) {
                    wins.push({ sec: sec, text: item1.t });
                }
                // Loss: We Failed (0), They Passed (1)
                else if (item1.r === 0 && item2.r === 1) {
                    losses.push({ sec: sec, text: item1.t });
                }
            });
        });
    }

    // Render Functions (Grouped by Section)
    const renderList = (list, containerId, emptyMsg) => {
        const cont = document.getElementById(containerId);
        if (list.length === 0) {
            cont.innerHTML = `<div class="text-center text-muted mt-5" > ${emptyMsg}</div> `;
            return;
        }

        // Group items by Section
        const grouped = {};
        list.forEach(item => {
            if (!grouped[item.sec]) grouped[item.sec] = [];
            grouped[item.sec].push(item.text);
        });

        let html = '<div class="px-2">';
        Object.keys(grouped).sort().forEach(sec => {
            html += `<div class="mb-3" >
                <div class="d-flex align-items-center mb-2">
                    <span class="badge bg-dark rounded-pill me-2">${sec}</span>
                    <h6 class="mb-0 fw-bold border-bottom flex-grow-1 pb-1 text-secondary" style="font-size:0.85rem">Section ${sec}</h6>
                </div>
                <ul class="list-unstyled mb-0 ps-2">`;

            grouped[sec].forEach(text => {
                html += `<li class="mb-2 d-flex align-items-start text-dark small" style="line-height:1.4;">
                    <i class="bi bi-caret-right-fill me-2 opacity-50 mt-1" style="font-size:0.7rem;"></i>
                    <span>${text}</span>
                </li>`;
            });
            html += `</ul></div> `;
        });
        html += '</div>';
        cont.innerHTML = html;
    };

    renderList(wins, "tabWins", "No distinct wins found. You matched or trailed everywhere.");
    renderList(losses, "tabLosses", "No losses found! You matched or beat them everywhere.");
}

function renderPerformanceInsights(data) {
    if (!data || data.length === 0) return;

    // 1. Deviation Chart (Horizontal Bar)
    // Sort by Section Name for consistent order (reversed for TOP-down view in horz bar)
    const sortedData = [...data].sort((a, b) => b.sec.localeCompare(a.sec));

    // Shorten Labels (First 3 words)
    const labels = sortedData.map(d => {
        const parts = d.sec.split(' ');
        return parts.length > 3 ? parts.slice(0, 3).join(' ') + '...' : d.sec;
    });

    const values = sortedData.map(d => d.gap);
    const colors = values.map(v => v >= 0 ? '#10B981' : '#EF4444'); // Green / Red

    Plotly.newPlot("stDeviationChart", [{
        type: 'bar',
        x: values,
        y: labels,
        orientation: 'h',
        marker: { color: colors, opacity: 0.8 },
        text: values.map(v => (v > 0 ? '+' : '') + v.toFixed(1)),
        textposition: 'auto',
        hoverinfo: 'x+y'
    }], {
        margin: { t: 20, l: 150, r: 20, b: 30 },
        xaxis: { title: "Diff vs Regional Avg", zeroline: true, zerolinecolor: '#374151' },
        yaxis: { automargin: true },
        height: 300,
        font: { family: "Inter, sans-serif", size: 11 }
    }, config);

    // 2. Top Priorities (Lowest Scoring Sections) - TILES UI
    // Sort by Score Ascending (Worst first)
    const worstSections = [...data].sort((a, b) => a.score - b.score);
    const impList = document.getElementById("stImprovementList");
    impList.innerHTML = "";

    worstSections.forEach((item, index) => {
        const isTop3 = index < 3;
        // Top 3 get full width, others get half width
        const colClass = isTop3 ? "col-12" : "col-6";
        // Top 3 get Danger Border, others get clean look
        const cardStyle = isTop3 ? "border-start border-4 border-danger" : "border-0";
        const bgClass = isTop3 ? "bg-white" : "bg-light";

        // Data for Modal
        const failedJson = JSON.stringify(item.failed || []).replace(/"/g, '&quot;');
        const fixedJson = JSON.stringify(item.fixed || []).replace(/"/g, '&quot;');

        impList.innerHTML += `
        <div class="${colClass}" >
            <div class="card h-100 shadow-sm ${bgClass} ${cardStyle}"
                style="cursor: pointer; transition: all 0.2s ease-in-out;"
                onmouseover="this.style.transform='translateY(-2px)'"
                onmouseout="this.style.transform='translateY(0)'"
                onclick='showFailureDetails("${item.sec}", ${failedJson}, ${fixedJson})'>
                <div class="card-body p-3 d-flex justify-content-between align-items-center">
                    <div style="max-width: 75%;">
                        <h6 class="fw-bold text-dark mb-1 ${!isTop3 ? 'small' : ''}" style="line-height:1.2;">${item.sec}</h6>
                        <div class="small text-muted" style="font-size: 0.75rem;">vs Reg: <span class="${item.gap >= 0 ? 'text-success' : 'text-danger'} fw-bold">${item.gap > 0 ? '+' : ''}${item.gap.toFixed(1)}</span></div>
                    </div>
                    <div class="text-end">
                        <span class="badge ${item.score < 84 ? 'bg-danger' : 'bg-success'} rounded-pill" style="font-size: ${isTop3 ? '0.9rem' : '0.75rem'}">${item.score.toFixed(1)}</span>
                    </div>
                </div>
            </div>
        </div> `;
    });
}

function showFailureDetails(section, failedItems, fixedItems) {
    document.getElementById("failureModalTitle").textContent = section;
    const body = document.getElementById("failureModalBody");
    body.innerHTML = "";

    // Helper to render history dots
    const renderHistoryDots = (history) => {
        if (!history || history.length === 0) return '';
        let dotsHtml = '<div class="d-flex align-items-center mt-2">';
        dotsHtml += '<span class="text-muted small me-2" style="font-size: 0.7rem;">History (Old &rarr; New):</span>';

        history.forEach(status => {
            let colorClass = 'bg-secondary';
            let iconClass = 'bi-dash';

            if (status === 1) { colorClass = 'bg-success'; iconClass = 'bi-check-lg'; }
            if (status === 0) { colorClass = 'bg-danger'; iconClass = 'bi-x-lg'; }

            dotsHtml += `<div class="rounded-circle ${colorClass} text-white d-flex justify-content-center align-items-center me-1"
    style="width: 20px; height: 20px; font-size: 10px;" title="${status === 1 ? 'Passed' : (status === 0 ? 'Failed' : 'N/A')}" >
        <i class="bi ${iconClass}"></i>
                         </div> `;
        });
        dotsHtml += '</div>';
        return dotsHtml;
    };

    // 1. Failed Items
    if (!failedItems || failedItems.length === 0) {
        if (!fixedItems || fixedItems.length === 0) {
            body.innerHTML = '<div class="p-4 text-center text-muted">No specific failed items found.<br><small>Score deduction might be due to partial points or N/A answers.</small></div>';
        }
    } else {
        body.innerHTML += `<div class="px-2 text-danger fw-bold border-bottom pb-2 mb-2" > <i class="bi bi-exclamation-octagon-fill me-2"></i>Improvement Needed</div> `;

        failedItems.forEach(item => {
            const history = item.history || [];
            // Check if recurring (last 2 failures) for simple badge
            const isRecurring = history.length >= 2 && history[history.length - 1] === 0 && history[history.length - 2] === 0;
            const text = item.text || item;

            // Benchmark UI
            let benchmarkHtml = '';
            // Only show benchmark if regAvg is a valid number
            if (item.regAvg !== null && item.regAvg !== undefined && !isNaN(item.regAvg)) {
                const rPct = (item.regAvg * 100).toFixed(0);
                const isCommon = item.regAvg < 0.6; // If region avg < 60%, it's common.
                const badge = isCommon
                    ? `<span class="badge bg-light text-dark border" > <i class="bi bi-info-circle me-1"></i>Common Issue(Reg: ${rPct} %)</span> `
                    : `<span class="badge bg-light text-danger border border-danger" > <i class="bi bi-exclamation-circle me-1"></i>Specific Deficit(Reg: ${rPct} %)</span> `;

                // Progress Bar: Region Average Marker
                // Since store failed (0%), we show Region Avg as a bar comparison
                // Visual: [ Region Avg bar ]

                benchmarkHtml = `
        <div class="mt-2 pt-2 border-top border-light" >
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted fw-bold" style="font-size:0.7rem; letter-spacing:0.5px;">VS REGIONAL AVG</small>
                        ${badge}
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-secondary" role="progressbar" style="width: ${rPct}%" aria-valuenow="${rPct}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <div class="d-flex justify-content-end mt-1">
                         <small class="text-muted" style="font-size: 0.7rem;">Region Avg: <strong>${rPct}%</strong></small>
                    </div>
                 </div> `;
            }

            body.innerHTML += `<div class="list-group-item list-group-item-action py-3 border-start border-3 border-danger mb-2 shadow-sm rounded-end" >
        <div class="d-flex w-100 justify-content-between align-items-start">
            <div style="width: 100%;">
                <div class="d-flex justify-content-between">
                    <h6 class="mb-1 text-danger fw-bold">Issue Detected</h6>
                    ${isRecurring ? '<span class="badge bg-warning text-dark"><i class="bi bi-arrow-repeat me-1"></i>Recurring</span>' : '<span class="badge bg-danger">Failed</span>'}
                </div>
                <p class="mb-2 text-dark fw-medium" style="font-size: 0.95rem;">"${text}"</p>
                ${renderHistoryDots(history)}
                ${benchmarkHtml}
            </div>
        </div>
            </div> `;
        });
    }

    // 2. Fixed Items (Improvements)
    if (fixedItems && fixedItems.length > 0) {
        body.innerHTML += `<div class="mt-4 mb-2 px-2 text-success fw-bold border-bottom pb-2" > <i class="bi bi-trophy-fill me-2"></i>Improvements(Fixed since last wave)</div> `;
        fixedItems.forEach(item => {
            const history = item.history || [];
            const text = item.text || item;

            body.innerHTML += `<div class="list-group-item list-group-item-action py-3 border-start border-3 border-success bg-light mb-2 shadow-sm rounded-end" >
        <div class="d-flex w-100 justify-content-between align-items-start">
            <div style="width: 100%;">
                <div class="d-flex justify-content-between">
                    <h6 class="mb-1 text-success fw-bold">Fixed / Improved</h6>
                    <span class="badge bg-success"><i class="bi bi-check2-circle me-1"></i>Resolved</span>
                </div>
                <p class="mb-2 text-dark fw-medium" style="font-size: 0.95rem;">"${text}"</p>
                ${renderHistoryDots(history)}
            </div>
        </div>
            </div> `;
        });
    }

    var myModal = new bootstrap.Modal(document.getElementById('failureModal'));
    myModal.show();
}


window.onload = function () {
    initSummary();
    initRegions();
    initBranches();
    initStoreTable();

    // Deep Link Logic
    var urlParams = new URLSearchParams(window.location.search);
    var storeId = urlParams.get('store');
    if (storeId) {
        setTimeout(function () { viewStore(storeId); }, 100);
    }
};

// Fullscreen Chart Logic
function openChartModal(sourceId, title) {
    var sourceDiv = document.getElementById(sourceId);
    if (!sourceDiv) return;

    var modalTitle = document.getElementById("chartModalTitle");
    modalTitle.textContent = title || "Chart Analysis";

    // Get source data and layout
    var data = sourceDiv.data;
    var layout = sourceDiv.layout;

    if (!data || !layout) {
        console.error("No Plotly data found in " + sourceId);
        return;
    }

    // Clone and adjust layout for fullscreen
    var newLayout = JSON.parse(JSON.stringify(layout));
    newLayout.width = null;
    newLayout.height = null;
    newLayout.autosize = true;
    newLayout.margin = { t: 50, l: 50, r: 50, b: 50 }; // More padding

    // Show Modal
    var myModal = new bootstrap.Modal(document.getElementById('chartModal'));
    myModal.show();

    // Render after modal is shown to ensure correct sizing
    document.getElementById('chartModal').addEventListener('shown.bs.modal', function () {
        Plotly.newPlot('chartModalContainer', data, newLayout, {
            responsive: true,
            displayModeBar: true, // Enable tools for deep dive
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        });
    }, { once: true });
}

// --- Section Detail Modal Logic ---
function openSectionDetail(sectionName) {
    console.log("Opening section detail for:", sectionName);
    try {
        // 1. Get Trend Data (National)
        const trendLabels = [];
        const trendData = [];

        sortedWaves.forEach(wave => {
            const d = reportData.summary[wave];
            if (d && d.sections[sectionName]) {
                trendLabels.push(wave);
                trendData.push(d.sections[sectionName]);
            }
        });

        // 2. Get Regional Leaderboard (Current Wave)
        const cur = sortedWaves[sortedWaves.length - 1];
        const regionScores = [];
        Object.keys(reportData.regions).forEach(reg => {
            const rData = reportData.regions[reg][cur];
            if (rData && rData.sections[sectionName]) {
                regionScores.push({ name: reg, score: rData.sections[sectionName] });
            }
        });
        // Top 5 Regions
        const topRegions = regionScores.sort((a, b) => b.score - a.score).slice(0, 5);

        // 3. Render Modal Content
        // Ensure modal structure exists
        let modalEl = document.getElementById('sectionDetailModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'sectionDetailModal';
            modalEl.className = 'modal fade';
            modalEl.setAttribute('tabindex', '-1');
            modalEl.innerHTML = `
        <div class="modal-dialog modal-xl modal-dialog-centered" >
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title" id="sectionDetailTitle">Section Analysis</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body bg-light" id="sectionDetailBody"></div>
            </div>
            </div> `;
            document.body.appendChild(modalEl);
        }

        document.getElementById('sectionDetailTitle').textContent = `Analysis: ${sectionName} `;
        const body = document.getElementById('sectionDetailBody');
        body.innerHTML = `
        <div class="row g-4" >
            <!--Trend Chart-->
            <div class="col-lg-8">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 fw-bold">
                        <i class="bi bi-graph-up me-2 text-primary"></i>National Trend (5 Waves)
                    </div>
                    <div class="card-body">
                        <canvas id="sectionTrendChart" style="height: 300px; width: 100%;"></canvas>
                    </div>
                </div>
            </div>
            
            <!--Regional Leaderboard-->
        <div class="col-lg-4">
            <div class="card h-100 border-0 shadow-sm">
                <div class="card-header bg-white border-0 fw-bold">
                    <i class="bi bi-geo-alt-fill me-2 text-success"></i>Top Performing Regions
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light small text-muted">
                                <tr>
                                    <th class="ps-3">#</th>
                                    <th>Region</th>
                                    <th class="text-end pe-3">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topRegions.map((r, i) => `
                                        <tr>
                                            <td class="ps-3"><span class="badge bg-light text-dark border">${i + 1}</span></td>
                                            <td class="small fw-bold">${r.name}</td>
                                            <td class="text-end pe-3 fw-bold ${r.score >= 84 ? 'text-success' : 'text-danger'}">${(typeof r.score === 'number' && !isNaN(r.score)) ? r.score.toFixed(1) : '0.0'}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        </div>
        `;

        // 4. Show Modal
        const myModal = new bootstrap.Modal(modalEl);
        myModal.show();

        // 5. Draw Chart (Wait for modal transition)
        modalEl.addEventListener('shown.bs.modal', function () {
            const ctx = document.getElementById('sectionTrendChart');
            if (ctx) {
                // Destroy old chart if exists (not strictly needed since we rebuild DOM, but good practice if I cached it)
                // simplified: DOM is fresh.
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: trendLabels,
                        datasets: [{
                            label: 'National Score',
                            data: trendData,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#0d6efd',
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: false,
                                min: 50,
                                max: 100,
                                grid: { borderDash: [5, 5] }
                            },
                            x: { grid: { display: false } }
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                padding: 10,
                                cornerRadius: 4
                            }
                        }
                    }
                });
            }
        }, { once: true });
    } catch (err) {
        console.error("Critical error in openSectionDetail:", err);
        alert("Error opening detail: " + err.message);
    }
}
