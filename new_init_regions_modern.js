function initRegions() {
    var regKeys = Object.keys(reportData.regions).sort();
    var waves = sortedWaves;
    var curWave = waves[waves.length - 1];

    // 1. Heatmap Data Preparation (Categorical for Clean Styles)
    var secKeys = Object.keys(reportData.summary[curWave].sections).sort();

    // Matrices for Plotly
    var z_cat = [], z_val = [], z_txt_col = [];

    regKeys.forEach(r => {
        var row_cat = [], row_val = [], row_col = [];
        secKeys.forEach(s => {
            var d = reportData.regions[r][curWave];
            if (!d || !d.sections[s]) {
                row_cat.push(null); row_val.push(""); row_col.push("black");
            } else {
                var sc = d.sections[s].sum / d.sections[s].count;
                row_val.push(sc.toFixed(1)); // Display Text

                // Bucket Logic
                if (sc < 84) {
                    row_cat.push(0); row_col.push("#FFFFFF"); // Critical -> White Text
                } else if (sc < 90) {
                    row_cat.push(1); row_col.push("#1F2937"); // Warning -> Dark Text
                } else if (sc < 95) {
                    row_cat.push(2); row_col.push("#FFFFFF"); // Good -> White Text
                } else {
                    row_cat.push(3); row_col.push("#FFFFFF"); // Excellent -> White Text
                }
            }
        });
        z_cat.push(row_cat);
        z_val.push(row_val);
        z_txt_col.push(row_col);
    });

    // Custom Legend HTML (Top Only)
    var legendHTML = `
           <div class="d-flex justify-content-center gap-4 small text-muted text-uppercase fw-bold" style="letter-spacing:1px; margin: 15px 0;">
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#EF4444;border-radius:4px;margin-right:8px;box-shadow:0 2px 4px rgba(239,68,68,0.3)"></span>Critical (<84)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#F59E0B;border-radius:4px;margin-right:8px;box-shadow:0 2px 4px rgba(245,158,11,0.3)"></span>Warning (84-90)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#60A5FA;border-radius:4px;margin-right:8px;box-shadow:0 2px 4px rgba(96,165,250,0.3)"></span>Good (90-95)</div>
               <div class="d-flex align-items-center"><span style="width:14px;height:14px;background:#1E3A8A;border-radius:4px;margin-right:8px;box-shadow:0 2px 4px rgba(30,58,138,0.3)"></span>Excellent (>95)</div>
           </div>`;

    var container = document.getElementById("regionSectionHeatmap").parentElement;

    // Clear old custom legends
    container.querySelectorAll(".hm-legend-custom").forEach(e => e.remove());

    // Inject Top Legend
    var topLeg = document.createElement("div");
    topLeg.className = "hm-legend-custom";
    topLeg.innerHTML = legendHTML;
    container.insertBefore(topLeg, document.getElementById("regionSectionHeatmap"));

    // Modern Flat Colors (0,1,2,3)
    var colors = [
        [0, "#EF4444"], [0.25, "#EF4444"], // Red
        [0.25, "#F59E0B"], [0.5, "#F59E0B"], // Amber
        [0.5, "#60A5FA"], [0.75, "#60A5FA"], // Blue
        [0.75, "#1E3A8A"], [1, "#1E3A8A"]    // Dark Blue
    ];

    var hmDiv = document.getElementById("regionSectionHeatmap");

    Plotly.newPlot(hmDiv, [{
        x: secKeys, // FULL NAMES NOW
        y: regKeys,
        z: z_cat,
        text: z_val,
        customdata: z_val,
        type: "heatmap",
        colorscale: colors,
        zmin: 0, zmax: 3,
        xgap: 5, ygap: 5,
        texttemplate: "<b>%{text}</b>",
        textfont: { color: z_txt_col, family: "Inter", size: 11 },
        hovertemplate: "<b>%{y}</b><br>%{x}<br>Score: <b>%{text}</b><extra></extra>",
        showscale: false
    }], {
        margin: { l: 120, b: 120, t: 10 }, // Increased bottom margin for rotated labels
        xaxis: {
            side: "bottom",
            tickfont: { size: 10, color: "#4B5563", family: "Inter", weight: "600" },
            tickangle: -25 // Slanted for readability
        },
        yaxis: { tickfont: { size: 11, color: "#6B7280", family: "Inter", weight: "bold" } },
        font: { family: "Inter, sans-serif" },
        height: 600, // Taller to accommodate labels
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)'
    }, config);

    // Interactivity: Click to Deep Dive
    hmDiv.on("plotly_click", function (data) {
        var pt = data.points[0];
        var r = pt.y, fullSec = pt.x; // Now pt.x IS the full section name

        var d = reportData.regions[r][curWave], secData = d.sections[fullSec];
        var score = secData.sum / secData.count;
        var natData = reportData.summary[curWave].sections[fullSec], natScore = natData.sum / natData.count, diff = score - natScore;

        // Inject Modal if missing
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

        // Populate Modal
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

    // 2. Performance Trends - UNCHANGED
    var traces = regKeys.map(r => {
        var y = waves.map(w => { var d = reportData.regions[r][w]; return d ? d.sum / d.count : null; });
        return { x: waves, y: y, mode: "lines+markers", name: r, line: { shape: "spline", width: 3 }, marker: { size: 8 }, visible: true };
    });
    Plotly.newPlot("regionTrendChart", traces, {
        margin: { t: 20, l: 40, r: 20, b: 40 },
        showlegend: true, legend: { orientation: "h", y: -0.15 },
        xaxis: { showgrid: false }, yaxis: { gridcolor: "#F3F4F6", showgrid: true }
    }, config);

    // 3. Leaderboard - UNCHANGED
    var cont = document.getElementById("regionDetailCards");
    cont.innerHTML = "";
    // Sort regions by score
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
