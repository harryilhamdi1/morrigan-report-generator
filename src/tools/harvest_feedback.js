const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Load existing training data to avoid duplicates
const trainingData = require('../config/sentiment_training.js');
const existingTexts = new Set(trainingData.map(t => t.text));

const waves = require('../config/waves.js');
const captured = new Set();
const limit = 60; // Get a bit more to filter

console.log("--- HARVESTING FEEDBACK ---");

for (const wave of waves) {
    if (captured.size >= limit) break;

    const csvPath = path.join(__dirname, '../../CSV', wave.file);
    if (!fs.existsSync(csvPath)) {
        console.log(`Skipping missing file: ${csvPath}`);
        continue;
    }

    console.log(`Reading ${wave.file}...`);
    const content = fs.readFileSync(csvPath, 'utf8');

    try {
        const records = parse(content, {
            delimiter: ';',
            relax_column_count: true,
            skip_empty_lines: true,
            from_line: 2 // Skip header
        });

        for (const row of records) {
            if (row.length < 5) continue;

            // Get last column (Qualitative Feedback)
            let feedback = row[row.length - 1].trim();

            // validation
            if (feedback.length < 25) continue; // Too short
            if (feedback.includes('100.00') || feedback.includes('0.00')) continue; // Score
            if (feedback.includes('Yes (') || feedback.includes('No (')) continue; // Score
            if (feedback.match(/^\d+$/)) continue; // ID

            // Check meaningfulness
            if (!existingTexts.has(feedback) && !captured.has(feedback)) {
                captured.add(feedback);
            }
            if (captured.size >= limit) break;
        }
    } catch (err) {
        console.error(`Error parsing ${wave.file}: ${err.message}`);
    }
}

console.log("\n--- HARVESTED ITEMS ---");
console.log(JSON.stringify([...captured], null, 2));
