const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'report_v4.html');

try {
    const html = fs.readFileSync(reportFile, 'utf8');

    // Find reportData JSON
    const startMarker = 'var reportData = ';
    const idxStart = html.indexOf(startMarker);

    if (idxStart === -1) {
        console.error("Could not find reportData variable.");
        process.exit(1);
    }

    // Find end of JSON (assumes it ends with ; before newline or script end)
    // A heuristic: search for the next variable declaration or end of script
    // But since it's huge, let's find the closing brace before the next var
    // Actually, generating reportData usually ends with ';\n'

    // Let's grab a chunk and try to find the end more robustly if possible, 
    // or just rely on the structure.
    // However, parsing 50MB+ JSON might crash if not careful.

    // Alternative: Check the CSV directly for non-empty values in that column.

    console.log("Checking CSV directly for non-empty feedback...");
    const csvFile = path.join(__dirname, 'CSV', 'Wave 2 2025.csv');
    const { parse } = require('csv-parse/sync');
    const content = fs.readFileSync(csvFile, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', relax_quotes: true, skip_empty_lines: true });

    let countWithFeedback = 0;
    records.slice(0, 20).forEach(r => {
        const keys = Object.keys(r);
        const feedbackKey = keys.find(k => k.includes('(759291)'));
        if (feedbackKey) {
            console.log(`Store ${r['Site Code']}: Feedback length = ${r[feedbackKey] ? r[feedbackKey].length : 0}`);
            if (r[feedbackKey] && r[feedbackKey].trim().length > 0) countWithFeedback++;
        } else {
            console.log("Column (759291) NOT FOUND!");
        }
    });

    console.log(`\nFound ${countWithFeedback} non-empty feedback in first 20 records.`);

} catch (e) {
    console.error(e);
}
