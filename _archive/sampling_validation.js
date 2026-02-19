/**
 * SAMPLING VALIDATION SCRIPT
 * Purpose: Validate scoring logic against actual CSV data BEFORE applying changes.
 * This script reads a few records, calculates scores using the new logic,
 * and compares them to the CSV's own Section Scores and Final Score.
 */

const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const path = require('path');

// === FROM scoring_logic_vFinal.js ===

const SECTION_ITEMS = {
    'A': { codes: [759166, 759167, 759168, 759169, 759170, 759171], exclude: [] },
    'B': { codes: [759174, 759175, 759176, 759177, 759178, 759179], exclude: [] },
    'C': { codes: [759181, 759182, 759183, 759184, 759185, 759186, 759187, 759188, 759189, 759190, 759191, 759192], exclude: [] },
    'D': { codes: [759194, 759195, 759196, 759197, 759198, 759199, 759200, 759201], exclude: [] },
    'E': { codes: [759204, 759206, 759207, 759208, 759209, 759210, 759212, 759213, 759214, 759215], exclude: [] },
    'F': { codes: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], exclude: [759221] },
    'G': { codes: [759231, 759233, 759211, 759569, 759235, 759236, 759237, 759243, 759239], exclude: [759211] },
    'H': { codes: [759247, 759248, 759249, 759250, 759251, 759252, 759253, 759254, 759255, 759256, 759257, 759258, 759259, 759260, 759261, 759267, 759262, 759263, 759265, 759266], exclude: [] },
    'I': { codes: [759270, 759271, 759272, 759273, 759274, 759275, 759276, 759277], exclude: [] },
    'J': { codes: [759280, 759281, 759282, 759283, 759284], exclude: [759282, 759283] },
    'K': { codes: [759287, 759288, 759289], exclude: [] }
};

const SECTION_FULL_NAMES = {
    'A': 'A. Tampilan Tampak Depan Outlet',
    'B': 'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
    'C': 'C. Suasana & Kenyamanan Outlet',
    'D': 'D. Penampilan Retail Assistant',
    'E': 'E. Pelayanan Penjualan & Pengetahuan Produk',
    'F': 'F. Pengalaman Mencoba Produk',
    'G': 'G. Rekomendasi untuk Membeli Produk',
    'H': 'H. Pembelian Produk & Pembayaran di Kasir',
    'I': 'I. Penampilan Kasir',
    'J': 'J. Toilet (Khusus Store yang memiliki toilet )',
    'K': 'K. Salam Perpisahan oleh Retail Asisstant'
};

let SECTION_WEIGHTS = {};

async function loadSectionWeights() {
    const weightPath = path.join(__dirname, 'CSV', 'Section Weight.csv');
    const content = await fs.readFile(weightPath, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, trim: true, bom: true });
    records.forEach(r => {
        const vals = Object.values(r);
        const name = (vals[0] || '').trim();
        const weight = parseInt(vals[1]);
        if (name && weight) {
            const letterMatch = name.match(/([A-K])\./);
            if (letterMatch) SECTION_WEIGHTS[letterMatch[1]] = weight;
        }
    });
}

function parseItemScore(val) {
    if (!val) return null;
    const s = String(val);
    if (s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null;
}

function calculateWeightedScore(sectionsMap) {
    let earnedPoints = 0;
    let maxPointsPossible = 0;

    Object.entries(sectionsMap).forEach(([secName, grade]) => {
        if (grade === null || grade === undefined || isNaN(grade)) return;
        const letterMatch = secName.match(/^([A-K])\./);
        if (!letterMatch) return;
        const weight = SECTION_WEIGHTS[letterMatch[1]];
        if (!weight) return;
        earnedPoints += (grade / 100) * weight;
        maxPointsPossible += weight;
    });

    if (maxPointsPossible === 0) return 0;
    return (earnedPoints / maxPointsPossible) * 100;
}

// === MAIN SAMPLING ===

async function runSampling() {
    await loadSectionWeights();
    console.log('=== SECTION WEIGHTS ===');
    console.log(SECTION_WEIGHTS);
    console.log('Total weight:', Object.values(SECTION_WEIGHTS).reduce((a, b) => a + b, 0));
    console.log('');

    const csvFile = path.join(__dirname, 'CSV', 'Wave 2 2025.csv');
    const content = await fs.readFile(csvFile, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, relax_column_count: true, trim: true, bom: true });

    const headers = Object.keys(records[0]);
    const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

    // Sample first 5 records
    const sampleSize = 5;
    console.log(`=== SAMPLING ${sampleSize} RECORDS FROM Wave 2 2025.csv ===\n`);

    for (let idx = 0; idx < Math.min(sampleSize, records.length); idx++) {
        const record = records[idx];
        const siteCode = record['Site Code'] || 'N/A';
        const storeName = record['Site Name'] || 'N/A';

        console.log(`\n${'='.repeat(70)}`);
        console.log(`STORE #${idx + 1}: ${storeName} (${siteCode})`);
        console.log(`${'='.repeat(70)}`);

        // 1. Get CSV Section Scores (what the CSV says)
        const csvSections = {};
        const calcSections = {};

        Object.entries(SECTION_FULL_NAMES).forEach(([letter, fullName]) => {
            // Find section column in CSV
            const secCol = headers.find(h => h.includes(fullName) && !h.endsWith('- Text'));
            let csvScore = null;
            if (secCol && record[secCol]) {
                let raw = record[secCol];
                if (typeof raw === 'string') {
                    if (raw.includes('(')) {
                        const match = raw.match(/\((\d+(\.\d+)?)\)/);
                        csvScore = match ? parseFloat(match[1]) : null;
                    } else {
                        csvScore = parseFloat(raw.replace(',', '.'));
                    }
                }
            }
            csvSections[letter] = csvScore;

            // 2. Calculate from item-level data (our new logic)
            const config = SECTION_ITEMS[letter];
            let passed = 0, total = 0, failedItems = [];
            config.codes.forEach(code => {
                if (config.exclude.includes(code)) return;
                const col = getCol(code);
                if (!col) return;
                const val = record[col];
                const score = parseItemScore(val);
                if (score !== null) {
                    total++;
                    if (score === 1) passed++;
                    else failedItems.push(code);
                }
            });

            const calcScore = total > 0 ? (passed / total) * 100 : null;
            calcSections[letter] = { calc: calcScore, passed, total, failed: failedItems };
        });

        // 3. Compare Section-by-Section
        console.log('\n  Section | CSV Score | Calc Score | Items (Pass/Total) | Match?');
        console.log('  ' + '-'.repeat(66));

        let allMatch = true;
        Object.entries(SECTION_FULL_NAMES).forEach(([letter, fullName]) => {
            const csv = csvSections[letter];
            const calc = calcSections[letter];
            const csvStr = csv !== null && !isNaN(csv) ? csv.toFixed(2) : 'N/A';
            const calcStr = calc.calc !== null ? calc.calc.toFixed(2) : 'N/A';
            const match = csv !== null && calc.calc !== null ? Math.abs(csv - calc.calc) < 0.5 : '???';
            const matchIcon = match === true ? '✅' : (match === false ? '❌' : '⚠️');
            if (match === false) allMatch = false;

            console.log(`  ${letter}.     | ${csvStr.padStart(9)} | ${calcStr.padStart(10)} | ${calc.passed}/${calc.total}`.padEnd(60) + ` | ${matchIcon}`);
            if (calc.failed.length > 0) {
                console.log(`           Failed items: ${calc.failed.join(', ')}`);
            }
        });

        // 4. Final Score Comparison
        const finalScoreKey = headers.find(k => k === 'Final Score' || k.trim() === 'Final Score');
        let csvFinal = null;
        if (finalScoreKey && record[finalScoreKey]) {
            csvFinal = parseFloat(String(record[finalScoreKey]).replace(',', '.'));
        }

        // Build section map for weighted calculation
        const sectionMapForCalc = {};
        Object.entries(SECTION_FULL_NAMES).forEach(([letter, fullName]) => {
            if (calcSections[letter].calc !== null) {
                sectionMapForCalc[fullName] = calcSections[letter].calc;
            }
        });
        const calcFinal = calculateWeightedScore(sectionMapForCalc);

        const finalMatch = csvFinal !== null ? Math.abs(csvFinal - calcFinal) < 1.0 : '???';
        const finalIcon = finalMatch === true ? '✅' : (finalMatch === false ? '❌' : '⚠️');

        console.log('\n  --- FINAL SCORE ---');
        console.log(`  CSV Final Score:        ${csvFinal !== null ? csvFinal.toFixed(2) : 'N/A'}`);
        console.log(`  Calculated (Weighted):  ${calcFinal.toFixed(2)}`);
        console.log(`  Difference:             ${csvFinal !== null ? (csvFinal - calcFinal).toFixed(2) : 'N/A'}`);
        console.log(`  Match: ${finalIcon}`);
    }

    console.log('\n\n=== SAMPLING COMPLETE ===');
}

runSampling().catch(e => console.error(e));
