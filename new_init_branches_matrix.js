function initBranches() {
    try {
        var waves = sortedWaves;
        var curWave = waves[waves.length - 1];
        var prevWave = waves.length > 1 ? waves[waves.length - 2] : null;

        // ══════════════════════════════════════════════════════
        // DATA PREPARATION
        // ══════════════════════════════════════════════════════
        var branchData = Object.keys(reportData.branches).map(function (b) {
            var dCur = reportData.branches[b][curWave];
            var dPrev = prevWave ? reportData.branches[b][prevWave] : null;

            var score = dCur ? dCur.sum / dCur.count : 0;
            var prevScore = dPrev ? dPrev.sum / dPrev.count : 0;
            var growth = prevWave ? (score - prevScore) : 0;

            // Trend across ALL waves
            var trendPoints = waves.map(function (w) {
                var d = reportData.branches[b][w];
                return d ? d.sum / d.count : null;
            });

            // Worst 3 stores (The Drag)
            var stores = Object.values(reportData.stores).filter(function (s) {
                return s.meta.branch === b && s.results[curWave];
            });
            var worstStores = stores.slice().sort(function (x, y) {
                return x.results[curWave].totalScore - y.results[curWave].totalScore;
            }).slice(0, 3).map(function (s) {
                return { name: s.meta.name, score: s.results[curWave].totalScore, code: s.meta.code };
            });

            // Worst 3 sections
            var worstSections = [];
            if (dCur && dCur.sections) {
                worstSections = Object.entries(dCur.sections).map(function (e) {
                    return { k: e[0], v: e[1].sum / e[1].count };
                }).sort(function (a, b) { return a.v - b.v; }).slice(0, 3);
            }

            return {
                name: b, score: score, growth: growth, count: dCur ? dCur.count : 0,
                trend: trendPoints, worstStores: worstStores, worstSections: worstSections
            };
        });

        // ══════════════════════════════════════════════════════
        // ANALYTICS ENGINE
        // ══════════════════════════════════════════════════════
        var avgScore = branchData.reduce(function (s, d) { return s + d.score; }, 0) / branchData.length;
        var sortedByScore = branchData.slice().sort(function (a, b) { return b.score - a.score; });
        var sortedByGrowth = branchData.slice().sort(function (a, b) { return b.growth - a.growth; });
        var bestBranch = sortedByScore[0];
        var worstBranch = sortedByScore[sortedByScore.length - 1];
        var bestGrower = sortedByGrowth[0];
        var worstGrower = sortedByGrowth[sortedByGrowth.length - 1];
        var criticalCount = branchData.filter(function (d) { return d.score < 84; }).length;
        var warningCount = branchData.filter(function (d) { return d.score >= 84 && d.score < 90; }).length;
        var excellentCount = branchData.filter(function (d) { return d.score >= 90; }).length;
        var growingCount = branchData.filter(function (d) { return d.growth > 0; }).length;
        var decliningCount = branchData.filter(function (d) { return d.growth < 0; }).length;
        var gapTopBottom = bestBranch.score - worstBranch.score;

        // Stars / Rising / Watch / Critical quadrant counts
        var stars = branchData.filter(function (d) { return d.score >= 84 && d.growth >= 0; });
        var rising = branchData.filter(function (d) { return d.score < 84 && d.growth >= 0; });
        var watchList = branchData.filter(function (d) { return d.score >= 84 && d.growth < 0; });
        var critical = branchData.filter(function (d) { return d.score < 84 && d.growth < 0; });

        // Tornado sort (by growth ascending, Plotly renders bottom-to-top)
        var tornadoData = branchData.slice().sort(function (a, b) { return a.growth - b.growth; });

        // ══════════════════════════════════════════════════════
        // BUILD THE DASHBOARD HTML
        // ══════════════════════════════════════════════════════
        var container = document.getElementById("tab-branches");
        if (!container) return;

        container.innerHTML = "";

        // --- PAGE HEADER ---
        var headerDiv = document.createElement("div");
        headerDiv.className = "d-flex justify-content-between align-items-center mb-4";
        headerDiv.innerHTML = "<div><h2 class=\"text-primary-custom mb-1\" style=\"font-weight:800\">Branch Strategic Analysis</h2><p class=\"text-muted m-0\">Performance assessment, momentum tracking & strategic diagnostics — <strong>" + curWave + "</strong></p></div><div class=\"text-end\"><div class=\"badge bg-light text-dark border px-3 py-2 shadow-sm\" style=\"font-size:0.85rem\">" + branchData.length + " Branch Units &middot; " + branchData.reduce(function (s, d) { return s + d.count }, 0) + " Outlets</div></div>";
        container.appendChild(headerDiv);

        // ══════════════════════════════════════════════════════
        // 1. EXECUTIVE INSIGHT CALLOUTS
        // ══════════════════════════════════════════════════════
        var insightRow = document.createElement("div");
        insightRow.className = "row g-3 mb-4";

        var insights = [
            {
                icon: "🏆", color: "#002060", bg: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
                title: "Top Performer",
                value: bestBranch.name,
                detail: bestBranch.score.toFixed(1) + " pts &middot; " + (bestBranch.growth >= 0 ? "+" : "") + bestBranch.growth.toFixed(2) + " momentum",
                border: "#002060"
            },
            {
                icon: "🚀", color: "#059669", bg: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)",
                title: "Fastest Improver",
                value: bestGrower.name,
                detail: "+" + bestGrower.growth.toFixed(2) + " growth &middot; Score: " + bestGrower.score.toFixed(1),
                border: "#10B981"
            },
            {
                icon: "⚠️", color: "#D97706", bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
                title: "Performance Gap",
                value: gapTopBottom.toFixed(1) + " pts",
                detail: "Between " + bestBranch.name + " and " + worstBranch.name,
                border: "#F59E0B"
            },
            {
                icon: "📊", color: "#7C3AED", bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
                title: "Branch Health Index",
                value: excellentCount + " / " + warningCount + " / " + criticalCount,
                detail: "Excellent / Warning / Critical",
                border: "#7C3AED"
            }
        ];

        insights.forEach(function (ins) {
            var col = document.createElement("div");
            col.className = "col-lg-3 col-md-6";
            col.innerHTML = "<div class=\"card h-100 border-0 shadow-sm\" style=\"border-left: 4px solid " + ins.border + " !important; background: " + ins.bg + ";\"><div class=\"card-body p-3\"><div class=\"d-flex align-items-center mb-2\"><span style=\"font-size:1.3rem\" class=\"me-2\">" + ins.icon + "</span><span class=\"text-uppercase fw-bold small\" style=\"color:" + ins.color + ";letter-spacing:1px;font-size:0.65rem\">" + ins.title + "</span></div><div class=\"fw-bold\" style=\"font-size:1.1rem;color:" + ins.color + "\">" + ins.value + "</div><div class=\"text-muted\" style=\"font-size:0.75rem;margin-top:4px\">" + ins.detail + "</div></div></div>";
            insightRow.appendChild(col);
        });
        container.appendChild(insightRow);

        // ══════════════════════════════════════════════════════
        // 2. TORNADO CHART (Split View: Growth | Score)
        // ══════════════════════════════════════════════════════
        var tornadoCard = document.createElement("div");
        tornadoCard.className = "card border-0 shadow-sm mb-4";
        tornadoCard.innerHTML = "<div class=\"card-body p-4\"><div class=\"d-flex justify-content-between align-items-center mb-0\"><div><h5 class=\"fw-bold text-primary-custom mb-1\">Branch Momentum vs Performance</h5><div class=\"text-muted small\">Left: Growth trend (vs previous wave) &middot; Right: Current score assessment</div></div><div class=\"d-flex gap-3 small align-items-center bg-light px-3 py-2 rounded-pill\"><div class=\"fw-bold text-muted me-1\" style=\"font-size:0.65rem;letter-spacing:1px\">SCORE:</div><div class=\"d-flex align-items-center\"><span style=\"width:10px;height:10px;background:#1E3A8A;border-radius:50%;margin-right:5px\"></span><span style=\"font-size:0.75rem\">Excellent (≥90)</span></div><div class=\"d-flex align-items-center\"><span style=\"width:10px;height:10px;background:#F59E0B;border-radius:50%;margin-right:5px\"></span><span style=\"font-size:0.75rem\">Warning (84-90)</span></div><div class=\"d-flex align-items-center\"><span style=\"width:10px;height:10px;background:#EF4444;border-radius:50%;margin-right:5px\"></span><span style=\"font-size:0.75rem\">Critical (<84)</span></div></div></div><div class=\"row g-0 align-items-stretch mt-3\"><div class=\"col-md-6 border-end pb-2 border-bottom\"><div class=\"d-flex justify-content-between px-4 small fw-bold text-muted text-uppercase\" style=\"font-size:0.65rem;letter-spacing:1px\"><span>Branch</span><span>Growth Trend</span></div></div><div class=\"col-md-6 pb-2 border-bottom\"><div class=\"px-4 small fw-bold text-muted text-uppercase text-center\" style=\"font-size:0.65rem;letter-spacing:1px\">Current Score</div></div><div class=\"col-md-6 border-end position-relative\"><div id=\"chartGrowth\" style=\"width:100%\"></div></div><div class=\"col-md-6 position-relative\"><div id=\"chartScore\" style=\"width:100%\"></div></div></div></div>";
        container.appendChild(tornadoCard);

        // Render Plotly Tornado Charts
        var yLabels = tornadoData.map(function (d) { return d.name; });
        var xGrowth = tornadoData.map(function (d) { return d.growth; });
        var xScore = tornadoData.map(function (d) { return d.score; });

        var growthColors = xGrowth.map(function (g) { return g >= 0 ? "#10B981" : "#F43F5E"; });
        var scoreColors = xScore.map(function (s) { if (s >= 90) return "#1E3A8A"; if (s >= 84) return "#F59E0B"; return "#EF4444"; });

        var traceGrowth = {
            x: xGrowth, y: yLabels, type: "bar", orientation: "h",
            marker: { color: growthColors, opacity: 0.9, line: { width: 0 } },
            text: xGrowth.map(function (g) { return (g > 0 ? "+" : "") + g.toFixed(2); }),
            textposition: "outside", textfont: { color: "#6B7280", size: 10, family: "Inter" },
            hoverinfo: "y+x", cliponaxis: false
        };

        var traceScore = {
            x: xScore, y: yLabels, mode: "markers+text",
            marker: { color: scoreColors, size: 14, line: { color: "white", width: 2.5 }, symbol: "circle" },
            text: xScore.map(function (s) { return s.toFixed(1); }),
            textposition: "middle right", textfont: { size: 11, family: "Inter", color: "#374151" },
            type: "scatter", hoverinfo: "x+y"
        };

        var chartHeight = Math.max(450, branchData.length * 32);

        Plotly.newPlot("chartGrowth", [traceGrowth], {
            margin: { t: 20, l: 140, r: 50, b: 30 },
            xaxis: { zeroline: true, zerolinecolor: "#E5E7EB", zerolinewidth: 2, showgrid: true, gridcolor: "#F9FAFB", tickfont: { size: 10, color: "#9CA3AF" } },
            yaxis: { automargin: true, tickfont: { size: 11, family: "Inter", color: "#111827" }, gridcolor: "#F3F4F6", showgrid: true },
            height: chartHeight, barmode: "relative", paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"
        }, config);

        Plotly.newPlot("chartScore", [traceScore], {
            margin: { t: 20, l: 0, r: 60, b: 30 },
            xaxis: { range: [55, 108], showgrid: true, gridcolor: "#F3F4F6", zeroline: false, tickfont: { size: 10, color: "#9CA3AF" } },
            yaxis: { showticklabels: false, showgrid: true, gridcolor: "#F3F4F6" },
            height: chartHeight,
            shapes: [
                { type: "line", x0: 84, x1: 84, y0: -0.5, y1: branchData.length - 0.5, line: { color: "#EF4444", width: 1, dash: "dot" }, layer: "below" },
                { type: "rect", x0: 90, x1: 108, y0: -0.5, y1: branchData.length - 0.5, fillcolor: "rgba(30, 58, 138, 0.04)", line: { width: 0 }, layer: "below" }
            ],
            paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"
        }, config);

        // ══════════════════════════════════════════════════════
        // 3. STRATEGIC QUADRANT MATRIX
        // ══════════════════════════════════════════════════════
        var matrixCard = document.createElement("div");
        matrixCard.className = "card border-0 shadow-sm mb-4";
        matrixCard.innerHTML = "<div class=\"card-body p-4\"><div class=\"d-flex justify-content-between align-items-center mb-3\"><div><h5 class=\"fw-bold text-primary-custom mb-1\">Strategic Growth Matrix</h5><div class=\"text-muted small\">Performance (X) vs Momentum (Y) — Bubble size = Outlet count</div></div><div class=\"d-flex gap-3 small\"><div class=\"d-flex align-items-center\"><span style=\"width:12px;height:12px;background:#1E3A8A;border-radius:3px;margin-right:5px\"></span><span style=\"font-size:0.75rem\">⭐ Stars</span></div><div class=\"d-flex align-items-center\"><span style=\"width:12px;height:12px;background:#10B981;border-radius:3px;margin-right:5px\"></span><span style=\"font-size:0.75rem\">🚀 Rising</span></div><div class=\"d-flex align-items-center\"><span style=\"width:12px;height:12px;background:#F59E0B;border-radius:3px;margin-right:5px\"></span><span style=\"font-size:0.75rem\">👀 Watch</span></div><div class=\"d-flex align-items-center\"><span style=\"width:12px;height:12px;background:#EF4444;border-radius:3px;margin-right:5px\"></span><span style=\"font-size:0.75rem\">🔴 Critical</span></div></div></div><div id=\"quadrantMatrix\" style=\"height:500px\"></div></div>";
        container.appendChild(matrixCard);

        // Assign quadrant colors
        var bubbleColors = branchData.map(function (d) {
            if (d.score >= 84 && d.growth >= 0) return "#1E3A8A";
            if (d.score < 84 && d.growth >= 0) return "#10B981";
            if (d.score >= 84 && d.growth < 0) return "#F59E0B";
            return "#EF4444";
        });

        var maxCount = Math.max.apply(null, branchData.map(function (d) { return d.count; }));
        var bubbleSizes = branchData.map(function (d) { return 12 + (d.count / maxCount) * 30; });

        var traceMatrix = {
            x: branchData.map(function (d) { return d.score; }),
            y: branchData.map(function (d) { return d.growth; }),
            text: branchData.map(function (d) { return d.name + "<br>Score: " + d.score.toFixed(1) + "<br>Growth: " + (d.growth > 0 ? "+" : "") + d.growth.toFixed(2) + "<br>Outlets: " + d.count; }),
            mode: "markers+text",
            textposition: "top center",
            textfont: { size: 9, family: "Inter", color: "#374151" },
            marker: { color: bubbleColors, size: bubbleSizes, line: { color: "white", width: 2 }, opacity: 0.85 },
            hoverinfo: "text",
            type: "scatter"
        };

        // Use branch initials for labels to avoid clutter
        var matrixLabels = branchData.map(function (d) {
            var parts = d.name.split(" ");
            if (parts.length >= 2) return parts[0].substring(0, 1) + "." + parts.slice(1).join(" ");
            return d.name;
        });
        traceMatrix.text = matrixLabels;

        var minScore = Math.min.apply(null, branchData.map(function (d) { return d.score; }));
        var maxScore = Math.max.apply(null, branchData.map(function (d) { return d.score; }));
        var minGrowth = Math.min.apply(null, branchData.map(function (d) { return d.growth; }));
        var maxGrowth = Math.max.apply(null, branchData.map(function (d) { return d.growth; }));

        Plotly.newPlot("quadrantMatrix", [traceMatrix], {
            margin: { t: 30, l: 60, r: 30, b: 50 },
            xaxis: {
                title: { text: "Current Score →", font: { size: 12, color: "#6B7280" } },
                range: [minScore - 3, maxScore + 3], showgrid: true, gridcolor: "#F3F4F6",
                tickfont: { size: 10 }, zeroline: false
            },
            yaxis: {
                title: { text: "Growth Momentum →", font: { size: 12, color: "#6B7280" } },
                range: [minGrowth - 1.5, maxGrowth + 1.5], showgrid: true, gridcolor: "#F3F4F6",
                tickfont: { size: 10 }, zeroline: false
            },
            shapes: [
                { type: "line", x0: 84, x1: 84, y0: minGrowth - 2, y1: maxGrowth + 2, line: { color: "#EF4444", width: 1.5, dash: "dash" } },
                { type: "line", x0: minScore - 5, x1: maxScore + 5, y0: 0, y1: 0, line: { color: "#6B7280", width: 1.5, dash: "dash" } }
            ],
            annotations: [
                { x: maxScore + 1, y: maxGrowth + 0.8, text: "⭐ STARS", showarrow: false, font: { size: 11, color: "#1E3A8A", family: "Inter" } },
                { x: minScore - 1, y: maxGrowth + 0.8, text: "🚀 RISING", showarrow: false, font: { size: 11, color: "#10B981", family: "Inter" } },
                { x: maxScore + 1, y: minGrowth - 0.8, text: "👀 WATCH", showarrow: false, font: { size: 11, color: "#F59E0B", family: "Inter" } },
                { x: minScore - 1, y: minGrowth - 0.8, text: "🔴 CRITICAL", showarrow: false, font: { size: 11, color: "#EF4444", family: "Inter" } }
            ],
            paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
            showlegend: false, height: 500
        }, config);

        // ══════════════════════════════════════════════════════
        // 4. AUTO-GENERATED CONSULTANT NARRATIVE
        // ══════════════════════════════════════════════════════
        var narrativeCard = document.createElement("div");
        narrativeCard.className = "card border-0 shadow-sm mb-4";

        var narrativePoints = [];
        narrativePoints.push("<strong>" + bestBranch.name + "</strong> leads the network with a score of <strong>" + bestBranch.score.toFixed(1) + "</strong>" + (bestBranch.growth >= 0 ? ", and continues to show positive momentum (+" + bestBranch.growth.toFixed(2) + ")." : ", however it shows a slight momentum decline (" + bestBranch.growth.toFixed(2) + "), warranting attention."));

        if (criticalCount > 0) {
            var critNames = branchData.filter(function (d) { return d.score < 84; }).map(function (d) { return d.name; });
            narrativePoints.push("<strong>" + criticalCount + " branch" + (criticalCount > 1 ? "es" : "") + "</strong> fall below the critical threshold of 84: <strong>" + critNames.join(", ") + "</strong>. Immediate intervention is recommended.");
        }

        if (bestGrower.growth > 0) {
            narrativePoints.push("<strong>" + bestGrower.name + "</strong> shows the strongest improvement momentum at <strong>+" + bestGrower.growth.toFixed(2) + "</strong> points, signaling effective operational changes.");
        }

        if (worstGrower.growth < 0) {
            narrativePoints.push("<strong>" + worstGrower.name + "</strong> experienced the steepest decline at <strong>" + worstGrower.growth.toFixed(2) + "</strong> points. Root cause analysis should be prioritized.");
        }

        narrativePoints.push("The performance gap between the best and worst branch is <strong>" + gapTopBottom.toFixed(1) + " points</strong>, indicating " + (gapTopBottom > 15 ? "significant disparity requiring standardization efforts." : "moderate variance across the network."));

        narrativePoints.push("Branch distribution: <strong>" + stars.length + "</strong> Stars, <strong>" + rising.length + "</strong> Rising, <strong>" + watchList.length + "</strong> on Watch List, <strong>" + critical.length + "</strong> Critical.");

        var bulletHTML = narrativePoints.map(function (p, i) {
            var icons = ["📌", "🔴", "📈", "📉", "📊", "🗂️"];
            return "<div class=\"d-flex align-items-start mb-3\"><span class=\"me-3\" style=\"font-size:1.1rem;min-width:24px\">" + (icons[i] || "•") + "</span><div class=\"text-dark\" style=\"font-size:0.9rem;line-height:1.6\">" + p + "</div></div>";
        }).join("");

        narrativeCard.innerHTML = "<div class=\"card-body p-4\"><div class=\"d-flex align-items-center mb-3\"><h5 class=\"fw-bold text-primary-custom mb-0 me-3\">Key Strategic Findings</h5><span class=\"badge bg-primary-custom text-white px-3 py-1\" style=\"background:#002060;font-size:0.7rem;letter-spacing:1px\">AUTO-GENERATED</span></div><div class=\"bg-light rounded-3 p-4\" style=\"border-left:4px solid #002060\">" + bulletHTML + "</div></div>";
        container.appendChild(narrativeCard);

        // ══════════════════════════════════════════════════════
        // 5. BRANCH HEALTH MONITOR (Card Grid)
        // ══════════════════════════════════════════════════════
        var monitorHeader = document.createElement("div");
        monitorHeader.className = "d-flex justify-content-between align-items-center mb-3";
        monitorHeader.innerHTML = "<div><h5 class=\"fw-bold text-primary-custom mb-0\">Branch Health Monitor</h5><div class=\"text-muted small\">Detailed diagnostic cards with trend, drag stores & priority sections</div></div><div class=\"input-group\" style=\"width:300px\"><span class=\"input-group-text bg-white border-end-0\"><span class=\"text-muted\">🔍</span></span><input type=\"text\" id=\"branchHealthSearch\" class=\"form-control border-start-0 ps-0\" placeholder=\"Filter branch...\" onkeyup=\"window.filterBranchCards()\"></div>";
        container.appendChild(monitorHeader);

        var healthGrid = document.createElement("div");
        healthGrid.id = "branchHealthList";
        healthGrid.className = "row g-3";
        container.appendChild(healthGrid);

        // Sort cards by score (leaderboard order)
        var cardData = branchData.slice().sort(function (a, b) { return b.score - a.score; });

        cardData.forEach(function (d, idx) {
            // Sparkline SVG
            var trendVals = d.trend.filter(function (v) { return v !== null; });
            var sparkline = "";
            if (trendVals.length > 0) {
                var tMin = Math.min.apply(null, trendVals) - 2;
                var tMax = Math.max.apply(null, trendVals) + 2;
                if (tMax <= tMin) tMax = tMin + 1;
                var h = 35, w = 120;
                var step = trendVals.length > 1 ? w / (trendVals.length - 1) : 0;

                var pts = trendVals.length > 1 ? trendVals.map(function (v, i) {
                    var y = h - ((v - tMin) / (tMax - tMin) * h);
                    return (i * step).toFixed(1) + "," + y.toFixed(1);
                }).join(" ") : "0," + (h / 2) + " " + w + "," + (h / 2);

                var trendColor = d.growth >= 0 ? "#10B981" : "#EF4444";
                var lastX = trendVals.length > 1 ? ((trendVals.length - 1) * step).toFixed(1) : w;
                var lastY = (h - ((trendVals[trendVals.length - 1] - tMin) / (tMax - tMin) * h)).toFixed(1);

                // Add area fill under the line
                var areapts = pts + " " + lastX + "," + h + " 0," + h;

                sparkline = "<svg width=\"" + w + "\" height=\"" + (h + 2) + "\" style=\"vertical-align:middle\"><defs><linearGradient id=\"grad" + idx + "\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"" + trendColor + "\" stop-opacity=\"0.15\"/><stop offset=\"100%\" stop-color=\"" + trendColor + "\" stop-opacity=\"0\"/></linearGradient></defs><polygon points=\"" + areapts + "\" fill=\"url(#grad" + idx + ")\"/><polyline points=\"" + pts + "\" fill=\"none\" stroke=\"" + trendColor + "\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"" + lastX + "\" cy=\"" + lastY + "\" r=\"3.5\" fill=\"" + trendColor + "\" stroke=\"white\" stroke-width=\"1.5\"/></svg>";
            }

            // Drag stores HTML
            var dragHTML = d.worstStores.map(function (s) {
                return "<div class=\"d-flex justify-content-between align-items-start mb-1 pb-1\" style=\"border-bottom:1px solid #f3f4f6;cursor:pointer\" onclick=\"showTab('stores'); var inp=document.getElementById('filterSearch'); if(inp){inp.value='" + s.code + "'; updateStoreState('search', '" + s.code + "');}\"><span class=\"text-dark\" style=\"font-size:0.78rem;line-height:1.3;word-break:break-word\">" + s.name + "</span><span class=\"badge ms-2 flex-shrink-0 " + (s.score < 84 ? "bg-danger" : "bg-warning text-dark") + "\" style=\"font-size:0.7rem\">" + s.score.toFixed(1) + "</span></div>";
            }).join("");

            // Weak sections HTML
            var weakHTML = d.worstSections.map(function (s) {
                var shortName = s.k.length > 35 ? s.k.substring(0, 35) + "..." : s.k;
                return "<div class=\"d-flex justify-content-between align-items-start mb-1 pb-1\" style=\"border-bottom:1px solid #f3f4f6\"><span class=\"text-dark\" title=\"" + s.k + "\" style=\"font-size:0.78rem;line-height:1.3;word-break:break-word\">" + shortName + "</span><span class=\"fw-bold text-danger ms-2 flex-shrink-0\" style=\"font-size:0.78rem\">" + s.v.toFixed(1) + "</span></div>";
            }).join("");

            // Score color
            var scoreCls = d.score >= 90 ? "text-primary-custom" : (d.score < 84 ? "text-danger" : "text-warning");
            var statusBadge = d.score >= 90 ? "<span class=\"badge bg-primary-custom text-white\" style=\"background:#002060;font-size:0.6rem\">EXCELLENT</span>" : (d.score < 84 ? "<span class=\"badge bg-danger\" style=\"font-size:0.6rem\">CRITICAL</span>" : "<span class=\"badge bg-warning text-dark\" style=\"font-size:0.6rem\">WARNING</span>");

            // Rank badge
            var rankHTML = "";
            if (idx === 0) rankHTML = "<span class=\"rank-badge rank-top-1 shadow-sm\" style=\"width:24px;height:24px;font-size:0.7rem\">1</span>";
            else if (idx === 1) rankHTML = "<span class=\"rank-badge rank-top-2 shadow-sm\" style=\"width:24px;height:24px;font-size:0.7rem\">2</span>";
            else if (idx === 2) rankHTML = "<span class=\"rank-badge rank-top-3 shadow-sm\" style=\"width:24px;height:24px;font-size:0.7rem\">3</span>";
            else rankHTML = "<span class=\"badge bg-light text-muted border\" style=\"font-size:0.65rem\">#" + (idx + 1) + "</span>";

            var wrapper = document.createElement("div");
            wrapper.className = "col-lg-6 col-md-12 branch-health-card-wrapper";
            wrapper.setAttribute("data-name", d.name);
            wrapper.innerHTML = "<div class=\"card h-100 border-0 shadow-sm\" style=\"transition:all 0.2s;border-radius:14px\"><div class=\"card-body p-3\"><div class=\"d-flex justify-content-between align-items-start mb-2 pb-2\" style=\"border-bottom:2px solid #f0f0f0\"><div class=\"d-flex align-items-center\"><div class=\"me-2\">" + rankHTML + "</div><div><div class=\"fw-bold text-dark\" style=\"font-size:1rem\">" + d.name + "</div><div class=\"text-muted\" style=\"font-size:0.7rem\">" + d.count + " Outlets &middot; " + statusBadge + "</div></div></div><div class=\"text-end\"><div class=\"fw-bold " + scoreCls + "\" style=\"font-size:1.8rem;line-height:1\">" + d.score.toFixed(1) + "</div><div class=\"" + (d.growth >= 0 ? "text-success" : "text-danger") + " fw-bold\" style=\"font-size:0.7rem\">" + (d.growth > 0 ? "▲ +" : "▼ ") + d.growth.toFixed(2) + " vs prev</div></div></div><div class=\"d-flex justify-content-between align-items-center mb-3 px-1\"><div style=\"font-size:0.65rem\" class=\"text-muted text-uppercase fw-bold\">Trend (" + waves.length + " Waves)</div><div>" + sparkline + "</div></div><div class=\"row g-2\"><div class=\"col-6\" style=\"border-right:1px solid #f0f0f0\"><div class=\"text-uppercase fw-bold text-muted mb-2\" style=\"font-size:0.6rem;letter-spacing:1px\">📉 Top \"Drag\" Stores</div>" + (dragHTML || "<div class=\"text-muted small\">No data</div>") + "</div><div class=\"col-6\"><div class=\"text-uppercase fw-bold text-muted mb-2\" style=\"font-size:0.6rem;letter-spacing:1px\">⚠️ Priority Sections</div>" + (weakHTML || "<div class=\"text-muted small\">No data</div>") + "</div></div></div></div>";
            healthGrid.appendChild(wrapper);
        });

        // Global filter function
        window.filterBranchCards = function () {
            var val = document.getElementById("branchHealthSearch").value.toLowerCase();
            var nodes = document.querySelectorAll(".branch-health-card-wrapper");
            nodes.forEach(function (node) {
                var name = node.getAttribute("data-name").toLowerCase();
                node.style.display = name.indexOf(val) !== -1 ? "" : "none";
            });
        };

    } catch (e) {
        console.error("initBranches Error:", e);
        var errDiv = document.getElementById("tab-branches");
        if (errDiv) errDiv.innerHTML = "<div class=\"alert alert-danger m-4\"><strong>Dashboard Error:</strong> " + e.message + "</div>";
    }
}
