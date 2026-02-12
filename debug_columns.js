const fs = require('fs');
const { parse } = require('csv-parse/sync');

const file = 'CSV/Wave 2 2025.csv';
const content = fs.readFileSync(file, 'utf8');

const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    delimiter: ';'
});

if (records.length > 0) {
    console.log("Found columns:");
    Object.keys(records[0]).forEach((k, idx) => console.log(`${idx}: ${k}`));
}
