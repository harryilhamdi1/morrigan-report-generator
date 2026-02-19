const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const path = require('path');

// ==========================================
// 1. CONFIGURATION (REPLACE EXISTING CONSTANTS)
// ==========================================

// Validated Section Item Codes
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

let SECTION_WEIGHTS = {};

// ==========================================
// 2. HELPER FUNCTIONS (ADD THESE)
// ==========================================

async function loadSectionWeights() {
    try {
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
        console.log(`Loaded Weights:`, SECTION_WEIGHTS);
    } catch (err) {
        console.error("Error loading Section Weights:", err.message);
    }
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

function parseItemScore(val) {
    if (!val) return null;
    const s = String(val);
    if (s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null;
}

// ==========================================
// 3. LOGIC TO INSERT INTO processWave() FUNCTION
// ==========================================
/*
   In your processWave function, inside the 'records.forEach(record => {' loop,
   REPLACE the scoring logic with this block:
*/

// --- ITEM-LEVEL DRILL-DOWN (Identify Failed Items) ---
// Helper: find column by item code
const headers = Object.keys(records[0]);
const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));

// Initialize failedItems in your storeData object first:
// storeData.failedItems = [];

Object.entries(SECTION_ITEMS).forEach(([letter, config]) => {
    config.codes.forEach(code => {
        if (config.exclude.includes(code)) return;
        const col = getCol(code);
        if (!col) return;
        const val = record[col];
        const score = parseItemScore(val);
        if (score === 0) {
            const itemName = col.replace(/^\(\d+\)\s*/, '').substring(0, 80);
            storeData.failedItems.push({ section: letter, code: code, item: itemName });
        }
    });
});

// --- TOTAL SCORE CALCULATION ---
// We prefer the 'Final Score' from CSV if present, otherwise we calculate it.
const finalScoreKey = Object.keys(record).find(k => k === 'Final Score' || k.trim() === 'Final Score');
let csvFinalScore = null;
if (finalScoreKey && record[finalScoreKey]) {
    let val = parseFloat(String(record[finalScoreKey]).replace(',', '.'));
    if (!isNaN(val) && val > 0) csvFinalScore = val;
}

const calcScore = calculateWeightedScore(storeData.sections);
storeData.totalScore = csvFinalScore !== null ? csvFinalScore : calcScore;
