const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const { SECTION_ITEMS, TARGET_SECTIONS } = require('../config/scoring');
const { normalizeString } = require('./data_loader');
const { analyzeFeedback, classifySingle } = require('./voc');

function parseItemScore(val) {
    if (!val) return null;
    const s = String(val);
    if (s.includes('(1/1)') || s.includes('100.00')) return 1;
    if (s.includes('(0/1)') || s.includes('0.00')) return 0;
    return null;
}

async function processWave(filePath, waveName, year, masterMap) {
    const content = await fs.readFile(filePath, 'utf8');
    const records = parse(content, { columns: true, delimiter: ';', skip_empty_lines: true, relax_column_count: true, trim: true, bom: true });

    console.log(`[DEBUG] Parsed ${records.length} records from ${filePath}`);

    const storeResults = [];
    records.forEach(record => {
        const siteCode = record['Site Code'];
        if (!siteCode) return;

        let masterInfo = masterMap[siteCode];
        if (!masterInfo) {
            masterInfo = {
                region: normalizeString(record['Regional']),
                branch: normalizeString(record['Branch']),
                siteName: record['Site Name'] || 'Unknown Store'
            };
        }

        const storeData = {
            siteCode: siteCode,
            siteName: masterInfo.siteName,
            region: masterInfo.region,
            branch: masterInfo.branch,
            wave: waveName,
            year: year,
            sections: {},
            qualitative: [],
            failedItems: []
        };

        if (storeData.region === 'CLOSED' || storeData.branch === 'CLOSED') return;

        // Feedback Collection
        const headers = Object.keys(record);
        const lastCol = headers[headers.length - 1];

        // Identify Potential Columns (Explicit IDs + Last Column as requested)
        const feedbackCandidates = headers.filter(k => k.includes('759291') || k.toLowerCase().includes('informasikan hal-hal'));

        // Ensure last column is included (User Request for Wave 3 2025)
        if (lastCol && !feedbackCandidates.includes(lastCol)) {
            feedbackCandidates.push(lastCol);
        }

        const uniqueFeedback = new Set();
        feedbackCandidates.forEach(key => {
            let val = record[key];
            if (val && typeof val === 'string' && val.length > 5) {
                val = val.trim();
                if (!uniqueFeedback.has(val)) {
                    const classified = classifySingle(val);
                    storeData.qualitative.push({
                        text: val,
                        sentiment: classified.sentiment,
                        category: classified.themes.length > 0 ? classified.themes[0] : 'General',
                        themes: classified.themes
                    });
                    uniqueFeedback.add(val);
                }
            }
        });

        // --- Dialogue Extraction (Customer-RA Interaction) ---
        const questionCol = headers.find(h => h.includes('759203') && h.includes('Cantumkan hal'));
        const answerCol = headers.find(h => h.includes('759205') && h.includes('Cantumkan Jawaban'));
        const memberCol = headers.find(h => h.includes('759565') && h.includes('manfaat member'));

        storeData.dialogue = {
            customerQuestion: (questionCol && record[questionCol] && record[questionCol].trim().length > 3) ? record[questionCol].trim() : null,
            raAnswer: (answerCol && record[answerCol] && record[answerCol].trim().length > 3) ? record[answerCol].trim() : null,
            memberBenefits: (memberCol && record[memberCol] && record[memberCol].trim().length > 3) ? record[memberCol].trim() : null
        };

        // Final Score (Source of Truth)
        const finalScoreKey = Object.keys(record).find(k => k === 'Final Score' || k.trim() === 'Final Score');
        let finalScore = null;
        if (finalScoreKey && record[finalScoreKey]) {
            let rawVal = record[finalScoreKey];
            let val = parseFloat(rawVal.replace(',', '.'));
            if (!isNaN(val) && val > 0) finalScore = val;
        }

        // Section Scores
        TARGET_SECTIONS.forEach(fullSecName => {
            const key = Object.keys(record).find(k => k.includes(fullSecName) && !k.endsWith('- Text'));
            if (key) {
                let rawVal = record[key];
                let score = 0;
                if (typeof rawVal === 'string') {
                    if (rawVal.includes('(')) {
                        const match = rawVal.match(/\((\d+(\.\d+)?)\)/);
                        score = match ? parseFloat(match[1]) : 0;
                    } else {
                        score = parseFloat(rawVal.replace(',', '.'));
                    }
                } else score = rawVal;

                // Fix for old 1-5 scale if encountered
                if (!isNaN(score) && score <= 5 && score > 0) score = score * 20;

                if (!isNaN(score)) storeData.sections[fullSecName] = score;
            }
        });

        storeData.details = {}; // Initialize Details Object

        // Item Drill-down (Failed Items & Granular Details)
        const getCol = (code) => headers.find(h => h.includes(`(${code})`) && !h.endsWith('- Text'));
        const getTextCol = (code) => headers.find(h => h.includes(`(${code})`) && h.endsWith('- Text'));

        Object.entries(SECTION_ITEMS).forEach(([letter, config]) => {
            storeData.details[letter] = {}; // Init section
            config.codes.forEach(code => {
                if (config.exclude.includes(code)) return;
                const col = getCol(code);
                if (!col) return;
                const val = record[col];
                const score = parseItemScore(val);

                // Capture Item Name (Cleaned) - Remove (Code) prefix and trim
                const itemName = col.replace(/^\(\d+\)\s*/, '').trim();

                // Store Granular Detail (r: result, t: text) - Optimized keys
                storeData.details[letter][code] = { r: score, t: itemName };

                // Capture failure reason from paired "- Text" column
                if (score === 0) {
                    const textCol = getTextCol(code);
                    const reason = (textCol && record[textCol] && record[textCol].trim().length > 3)
                        ? record[textCol].trim() : null;
                    if (reason) storeData.details[letter][code].reason = reason;
                    storeData.failedItems.push({ section: letter, code: code, item: itemName, reason: reason });
                }
            });
        });

        // Calculate Total Score if missing
        if (finalScore !== null) storeData.totalScore = finalScore;
        else {
            const vals = Object.values(storeData.sections);
            storeData.totalScore = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        }
        storeResults.push(storeData);
    });

    return storeResults;
}

module.exports = { processWave };
