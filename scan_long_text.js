// ... (imports)
const fs = require('fs');
const { parse } = require('csv-parse/sync');

// ... (logic sama)
const csvFile = 'CSV/Wave 2 2025.csv';
const content = fs.readFileSync(csvFile, 'utf8');
const records = parse(content, { columns: true, delimiter: ';', relax_quotes: true, skip_empty_lines: true });

let longTextPresence = {}; // key: column name, value: count of rows with len > 30

records.forEach(r => {
    Object.entries(r).forEach(([k, v]) => {
        if (v && v.length > 30) {
            if (!longTextPresence[k]) longTextPresence[k] = 0;
            longTextPresence[k]++;
        }
    });
});

console.log("=== TOP 10 LONG TEXT COLUMNS ===");
Object.entries(longTextPresence)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([k, v]) => {
        // Find ID like (123456)
        let match = k.match(/\(\d+\)/);
        let idPart = match ? match[0] : "";
        let shortName = k.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, "");
        console.log(`[${v}] ${idPart} ${shortName}...`);
    });
