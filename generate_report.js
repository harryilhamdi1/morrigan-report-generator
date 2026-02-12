const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const path = require('path');

async function processWave(filePath, waveName, year) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, {
        columns: true,
        delimiter: ';',
        skip_empty_lines: true,
        relax_column_count: true
    });

    const scores = {
        wave: waveName,
        year: year,
        sections: {},
        regions: {}
    };

    records.forEach(record => {
        const region = record['Regional'] || 'Unknown';
        if (!scores.regions[region]) scores.regions[region] = { count: 0, sections: {} };
        scores.regions[region].count++;

        Object.keys(record).forEach(key => {
            if (key.startsWith('(Section)')) {
                const sectionName = key.replace('(Section) ', '').trim();
                const score = parseFloat(record[key]);
                
                if (!isNaN(score)) {
                    // Global section aggregation
                    if (!scores.sections[sectionName]) scores.sections[sectionName] = { sum: 0, count: 0 };
                    scores.sections[sectionName].sum += score;
                    scores.sections[sectionName].count++;

                    // Regional aggregation
                    if (!scores.regions[region].sections[sectionName]) scores.regions[region].sections[sectionName] = { sum: 0, count: 0 };
                    scores.regions[region].sections[sectionName].sum += score;
                    scores.regions[region].sections[sectionName].count++;
                }
            }
        });
    });

    // Calculate averages
    const sectionAverages = {};
    for (const [section, data] of Object.entries(scores.sections)) {
        sectionAverages[section] = data.sum / data.count;
    }
    scores.sectionAverages = sectionAverages;

    const regionAverages = {};
    for (const [region, data] of Object.entries(scores.regions)) {
        regionAverages[region] = {};
        for (const [section, secData] of Object.entries(data.sections)) {
            regionAverages[region][section] = secData.sum / secData.count;
        }
    }
    scores.regionAverages = regionAverages;

    return scores;
}

async function generateReport() {
    const csvDir = path.join(__dirname, 'CSV');
    const waves = [
        { file: 'Wave 1 2024.csv', name: 'Wave 1', year: 2024 },
        { file: 'Wave 2 2024.csv', name: 'Wave 2', year: 2024 },
        { file: 'Wave 3 2024.csv', name: 'Wave 3', year: 2024 },
        { file: 'Wave 1 2025.csv', name: 'Wave 1', year: 2025 },
        { file: 'Wave 2 2025.csv', name: 'Wave 2', year: 2025 }
    ];

    const results = [];
    for (const wave of waves) {
        try {
            const data = await processWave(path.join(csvDir, wave.file), wave.name, wave.year);
            results.push(data);
            console.log(`Processed ${wave.file}`);
        } catch (err) {
            console.error(`Error processing ${wave.file}:`, err.message);
        }
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Morrigan In Depth Report</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f9; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .chart-container { margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Morrigan In Depth Report</h1>
        <p>Analysis of store performance across Wave 1-3 (2024) and Wave 1-2 (2025).</p>

        <div id="trendChart" class="chart-container"></div>
        <div id="regionChart" class="chart-container"></div>

        <h2>Section Performance Summary</h2>
        <table id="summaryTable">
            <thead>
                <tr>
                    <th>Section</th>
                    <th>2024 W1</th>
                    <th>2024 W2</th>
                    <th>2024 W3</th>
                    <th>2025 W1</th>
                    <th>2025 W2</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    </div>

    <script>
        const data = ${JSON.stringify(results)};
        
        // Prepare data for Trend Chart
        const sections = Object.keys(data[0].sectionAverages);
        const waves = data.map(d => \`\${d.year} \${d.wave}\`);
        
        const trendTraces = sections.map(sec => {
            return {
                x: waves,
                y: data.map(d => d.sectionAverages[sec] || null),
                name: sec,
                mode: 'lines+markers'
            };
        });

        Plotly.newPlot('trendChart', trendTraces, {
            title: 'Section Performance Trends Across Waves',
            yaxis: { title: 'Score', range: [0, 105] }
        });

        // Prepare data for Region Chart (Latest Wave)
        const latestWave = data[data.length - 1];
        const regions = Object.keys(latestWave.regionAverages);
        
        // Calculate average score per region across all sections
        const regionScores = regions.map(reg => {
            const scores = Object.values(latestWave.regionAverages[reg]);
            return scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        const regionTrace = {
            x: regions,
            y: regionScores,
            type: 'bar',
            marker: { color: '#1f77b4' }
        };

        Plotly.newPlot('regionChart', [regionTrace], {
            title: 'Average Performance by Region (Latest Wave: 2025 W2)',
            yaxis: { title: 'Average Score', range: [0, 105] }
        });

        // Populate Table
        const tbody = document.querySelector('#summaryTable tbody');
        sections.forEach(sec => {
            const tr = document.createElement('tr');
            const tdName = document.createElement('td');
            tdName.textContent = sec;
            tr.appendChild(tdName);

            data.forEach(d => {
                const td = document.createElement('td');
                const val = d.sectionAverages[sec];
                td.textContent = val ? val.toFixed(2) : '-';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    </script>
</body>
</html>
    `;

    await fs.writeFile('report.html', htmlContent);
    console.log('Report generated: report.html');
}

generateReport();
