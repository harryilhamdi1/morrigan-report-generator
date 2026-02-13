
const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'ESS Retail In Depth Analysis.html');
let html = fs.readFileSync(reportFile, 'utf8');

// 1. Inject Sidebar Link
const sidebarTarget = '<span>Store Deep Dive</span></a>';
const vocLink = `
        <a href="#" onclick="showTab('voc')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            <span>Voice of Customer</span>
        </a>`;

if (!html.includes('showTab(\'voc\')')) {
    html = html.replace(sidebarTarget, sidebarTarget + vocLink);
}

// 2. Inject Tab Content
const tabContent = `
    <div id="tab-voc" style="display:none;">
        <h2 class="text-primary-custom mb-4">Voice of Customer</h2>
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card h-100 bg-primary text-white">
                    <div class="card-body text-center d-flex flex-column justify-content-center">
                        <div class="display-4 fw-bold" id="vocTotal">0</div>
                        <div class="small opacity-75">Total Feedback</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <div class="display-4 fw-bold text-success" id="vocPositive">0</div>
                        <div class="small text-muted">Positive Sentiments</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <div class="display-4 fw-bold text-danger" id="vocNegative">0</div>
                        <div class="small text-muted">Negative Sentiments</div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card h-100">
                    <div class="card-body text-center">
                        <div class="display-4 fw-bold text-secondary" id="vocNeutral">0</div>
                        <div class="small text-muted">Neutral/Mixed</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-8">
                <div class="card h-100">
                    <div class="card-header-clean">Frequently Mentioned Topics</div>
                    <div class="card-body">
                        <div id="vocWordCloud" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center; min-height: 300px;"></div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100">
                    <div class="card-header-clean">Theme Sentiment Breakdown</div>
                    <div class="card-body p-0">
                        <table class="table table-custom m-0">
                            <thead><tr><th>Theme</th><th class="text-end">Mentions</th><th class="text-end">Sentiment</th></tr></thead>
                            <tbody id="vocThemes"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

// Insert before the closing of main-content (which is before <script>)
const scriptTagIndex = html.indexOf('<script>');
if (scriptTagIndex !== -1 && !html.includes('id="tab-voc"')) {
    // Find the last </div> before <script>
    const contentEnd = html.lastIndexOf('</div>', scriptTagIndex);
    html = html.substring(0, contentEnd) + tabContent + html.substring(contentEnd);
}

// 3. Inject JS Logic
const jsLogic = `
function initVoc() {
    if (!reportData.voc) return;
    
    // Stats
    document.getElementById('vocTotal').textContent = reportData.voc.sentiment.total;
    document.getElementById('vocPositive').textContent = reportData.voc.sentiment.positive;
    document.getElementById('vocNegative').textContent = reportData.voc.sentiment.negative;
    document.getElementById('vocNeutral').textContent = reportData.voc.sentiment.neutral;

    // Themes
    const themeTable = document.getElementById('vocThemes');
    themeTable.innerHTML = '';
    reportData.voc.themes.forEach(t => {
        const sentimentColor = t.sentiment > 0 ? 'text-success' : (t.sentiment < 0 ? 'text-danger' : 'text-muted');
        const sign = t.sentiment > 0 ? '+' : '';
        themeTable.innerHTML += \`<tr>
            <td>\${t.name}</td>
            <td class="text-end fw-bold">\${t.count}</td>
            <td class="text-end fw-bold \${sentimentColor}">\${sign}\${t.sentiment}</td>
        </tr>\`;
    });

    // Word Cloud (Simple HTML Pill implementation)
    const cloudContainer = document.getElementById('vocWordCloud');
    cloudContainer.innerHTML = '';
    const maxCount = reportData.voc.wordCloud[0]?.size || 1;
    
    reportData.voc.wordCloud.forEach(w => {
        const sizePercent = 0.8 + (w.size / maxCount) * 1.5; // Scale between 0.8em and 2.3em
        const opacity = 0.5 + (w.size / maxCount) * 0.5;
        const color = '#002060';
        
        const span = document.createElement('span');
        span.textContent = w.text;
        span.style.fontSize = \`\${sizePercent}em\`;
        span.style.opacity = opacity;
        span.style.color = color;
        span.style.fontWeight = w.size > maxCount * 0.5 ? 'bold' : 'normal';
        span.style.padding = '5px 10px';
        span.style.cursor = 'default';
        span.title = \`\${w.size} mentions\`;
        
        cloudContainer.appendChild(span);
    });
}
`;

// Inject JS before window.onload
const onloadMarker = 'window.onload = function() {';
if (!html.includes('function initVoc()') && html.includes(onloadMarker)) {
    html = html.replace(onloadMarker, jsLogic + '\n' + onloadMarker);

    // Update window.onload
    // It currently looks like: window.onload = function() { initSummary(); initRegions(); initBranches(); initStoreTable(); };
    // We want to add initVoc();
    html = html.replace('initStoreTable(); };', 'initStoreTable(); initVoc(); };');
}

fs.writeFileSync(reportFile, html);
console.log("Successfully injected Voice of Customer module!");
