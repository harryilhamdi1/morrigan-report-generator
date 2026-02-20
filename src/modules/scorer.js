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

async function processWave(filePath, waveName, year, masterMap, sectionWeights, ligaMap) {
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
            liga: ligaMap?.[siteCode] || { tier_2024: 'UNKNOWN', tier_2025: 'UNKNOWN', tier_2026: 'UNKNOWN' },
            sections: {},
            qualitative: [],
            failedItems: []
        };

        if (storeData.region === 'CLOSED' || storeData.branch === 'CLOSED') return;

        // Identify Qualitative Text Columns by VALUE pattern (not header name)
        // Skip metadata columns and detect real free-text observations
        const headers = Object.keys(record);
        const metaColPrefixes = ['Review number', 'Site Code', 'Site Name', 'Branch', 'Regional', 'Final Score'];
        const scorePatterns = [
            /^(Yes|No)\s*\(/i,            // "Yes (100.00)" or "No (0.00)"
            /^\d+[\.,]\d+\s*\(/i,          // "100.00 (1/1)"
            /^\(\d+\/\d+\)/i,             // "(1/1)"
            /^\d+[\.,]\d+$/,              // Pure numbers like "100.00" or "62.50"
            /^N\/A$/i,                     // N/A
        ];
        const isSectionCol = (h) => h.startsWith('(Section)');
        const isMetaCol = (h) => metaColPrefixes.some(m => h.includes(m));

        // Columns to exclude from qualitative (staff name, cashier name, dialogue - handled separately)
        const dialogueColIds = ['759203', '759205', '759565'];
        const staffNameColIds = ['759173', '759246']; // RA name, Cashier name

        // NEW: Junk Data Columns to explicitly ignore
        const junkColIds = [
            '759151', // Lokasi Store (Address)
            '759245', // Metode Pembayaran (Payment)
            '760132', // Periode Visit
            '760133', // Jadwal Visit
            '759264'  // Waktu Transaksi (3 menit)
        ];

        const isExcludedCol = (h) => {
            return dialogueColIds.some(id => h.includes(id)) ||
                staffNameColIds.some(id => h.includes(id)) ||
                junkColIds.some(id => h.includes(id));
        };

        // Garbage text filters (not real qualitative feedback)
        const isGarbageText = (val) => {
            const lower = val.toLowerCase();
            // 1. Filter out staff photo references, timestamps
            if (lower.includes('foto terlampir')) return true;

            // 2. Filter out Payment Methods & Store Metadata
            if (/^(?:kartu kredit|debit|tunai|cash|qris|e-?\s*wallet)/i.test(lower)) return true;
            if (lower.includes(' / ') && (lower.includes('debit') || lower.includes('kredit'))) return true; // "Kartu Kredit / Debit"
            if (lower.includes('st eg ol')) return true; // Store Codes

            // 3. Filter out Addresses
            if (/(?:jl\.|jalan)\s+/i.test(lower) && /\d+/.test(lower)) return true; // "Jl. Kemanggisan... No. 1B"
            if (/rt\s*\d|rw\s*\d/i.test(lower)) return true; // "Rt 4-5"
            if (/kec\.|kel\.|kab\.|kota /i.test(lower)) return true;

            // 4. Filter out technical metadata
            if (/^\d+\s*(menit|detik|jam)\.?$/i.test(val)) return true;  // "3 menit."
            if (/^\d+\s*(retail|pelanggan|orang)/i.test(val)) return true;  // "4 Pelanggan"
            if (/^(weekday|weekend)\s*\(/i.test(val)) return true;  // "Weekend (Sabtu & Minggu)"

            // 5. Filter out selection-based answers that are just category picks with scores
            if (/\(\d+[\.,]\d+\)$/.test(val.trim())) return true; // e.g. "Menawarkan produk lain... (100.00)"

            return false;
        };

        // --- Dialogue Extraction (Customer-RA Interaction) ---
        const questionCol = headers.find(h => h.includes('759203') && h.includes('Cantumkan hal'));
        const answerCol = headers.find(h => h.includes('759205') && h.includes('Cantumkan Jawaban'));
        const memberCol = headers.find(h => h.includes('759565') && h.includes('manfaat member'));

        // Capture Staff Name (Column 759173)
        const staffNameCol = headers.find(h => h.includes('759173') || h.toLowerCase().includes('nama & foto retail assistant'));
        let staffName = (staffNameCol && record[staffNameCol]) ? record[staffNameCol].trim() : null;
        if (staffName) {
            staffName = staffName.replace(/\.$/, '');
            const lower = staffName.toLowerCase();
            if (lower.includes('terlampir') || lower.includes('foto') || lower.length < 3 || lower === 'retail assistant' || lower.includes('unknown') || lower.includes('n/a') || lower.includes('nama & foto')) {
                staffName = null;
            }
        }

        storeData.dialogue = {
            customerQuestion: (questionCol && record[questionCol] && record[questionCol].trim().length > 3) ? record[questionCol].trim() : null,
            raAnswer: (answerCol && record[answerCol] && record[answerCol].trim().length > 3) ? record[answerCol].trim() : null,
            memberBenefits: (memberCol && record[memberCol] && record[memberCol].trim().length > 3) ? record[memberCol].trim() : null
        };

        const uniqueFeedback = new Set();
        headers.forEach(key => {
            // Skip non-content columns
            if (isMetaCol(key) || isSectionCol(key) || isExcludedCol(key)) return;

            let val = (record[key] || '').trim();
            if (!val || val.length < 10) return;  // Must be at least 10 chars for meaningful text

            // Skip if value matches a score pattern
            if (scorePatterns.some(p => p.test(val))) return;

            // Skip garbage text
            if (isGarbageText(val)) return;

            // At this point, val is likely a qualitative observation
            if (!uniqueFeedback.has(val)) {
                const classified = classifySingle(val);

                // Determine the context/section from the column header
                let sourceContext = 'General';
                const headerMatch = key.match(/\)\s*(.+?)(?:\s*-\s*Text|\s*\(|$)/);
                if (headerMatch) sourceContext = headerMatch[1].substring(0, 60).trim();

                storeData.qualitative.push({
                    text: val,
                    sentiment: classified.sentiment,
                    category: classified.themes.length > 0 ? classified.themes[0] : sourceContext,
                    themes: classified.themes,
                    staffName: staffName, // Attach identified staff name to this feedback
                    sourceColumn: key.substring(0, 80) // For debugging
                });
                uniqueFeedback.add(val);
            }
        });

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
