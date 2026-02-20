const { THRESHOLD_SCORE } = require('../config/scoring');

function buildHierarchy(allStoreData, waves) {
    const hierarchy = { all: {}, regions: {}, branches: {}, stores: {} };

    // VoC Filter Config
    const latestWaveConfig = waves[waves.length - 1];
    const latestWaveKeyForCheck = `${latestWaveConfig.year} ${latestWaveConfig.name}`;
    const allQualitative = [];
    const allFailureReasons = [];

    allStoreData.forEach(entry => {
        const waveKey = `${entry.year} ${entry.wave}`;

        // Collect VOC Data (ALL Waves for Trend Analysis)
        if (entry.qualitative && entry.qualitative.length > 0) {
            // Enrich qualitative data with site metadata for citation & regional analysis
            const enrichedQualitative = entry.qualitative.map(q => ({
                ...q,
                siteName: entry.siteName,
                siteCode: entry.siteCode,
                region: entry.region,
                branch: entry.branch, // ADDED: Branch for drill-down
                wave: entry.wave,
                year: entry.year
            }));
            allQualitative.push(...enrichedQualitative);
        }

        // Collect Failure Reasons for Latest Wave (for theme aggregation)
        if (waveKey === latestWaveKeyForCheck && entry.failedItems && entry.failedItems.length > 0) {
            entry.failedItems.forEach(fi => {
                if (fi.reason) {
                    allFailureReasons.push({
                        reason: fi.reason,
                        section: fi.section,
                        item: fi.item,
                        store: entry.siteName,
                        siteCode: entry.siteCode,
                        region: entry.region,
                        branch: entry.branch
                    });
                }
            });
        }

        // Initialize Store Node
        if (!hierarchy.stores[entry.siteCode]) {
            hierarchy.stores[entry.siteCode] = {
                meta: { name: entry.siteName, region: entry.region, branch: entry.branch, code: entry.siteCode, liga: entry.liga },
                results: {}
            };
        }

        // Add Result to Store
        hierarchy.stores[entry.siteCode].results[waveKey] = {
            sections: entry.sections,
            qualitative: entry.qualitative,
            dialogue: entry.dialogue || null,
            totalScore: entry.totalScore,
            failedItems: entry.failedItems || [],
            details: entry.details || {}
        };

        // Aggregation Helper
        const addToHierarchy = (levelObj, record) => {
            if (!levelObj[waveKey]) levelObj[waveKey] = { sum: 0, count: 0, sections: {}, details: {} };
            levelObj[waveKey].sum += record.totalScore;
            levelObj[waveKey].count++;

            // Sections Aggregation
            Object.entries(record.sections).forEach(([secName, val]) => {
                if (!levelObj[waveKey].sections[secName]) levelObj[waveKey].sections[secName] = { sum: 0, count: 0, critical: 0 };
                levelObj[waveKey].sections[secName].sum += val;
                levelObj[waveKey].sections[secName].count++;
                if (val < THRESHOLD_SCORE) levelObj[waveKey].sections[secName].critical++;
            });

            // Item-Level Aggregation (for Benchmarks)
            if (record.details) {
                Object.entries(record.details).forEach(([secKey, items]) => {
                    if (!levelObj[waveKey].details[secKey]) levelObj[waveKey].details[secKey] = {};

                    Object.entries(items).forEach(([itemCode, itemVal]) => {
                        if (!levelObj[waveKey].details[secKey][itemCode]) {
                            levelObj[waveKey].details[secKey][itemCode] = { sum: 0, count: 0, t: itemVal.t };
                        }

                        // Only count valid numeric scores for benchmark
                        // itemVal.r might be 1, 0, or null. STRICT CHECK needed.
                        // Based on scorer.js: 1, 0, or null
                        if (typeof itemVal.r === 'number') {
                            levelObj[waveKey].details[secKey][itemCode].sum += itemVal.r;
                            levelObj[waveKey].details[secKey][itemCode].count++;
                        }
                    });
                });
            }
        };

        addToHierarchy(hierarchy.all, entry);
        if (!hierarchy.regions[entry.region]) hierarchy.regions[entry.region] = {};
        addToHierarchy(hierarchy.regions[entry.region], entry);
        if (!hierarchy.branches[entry.branch]) hierarchy.branches[entry.branch] = {};
        addToHierarchy(hierarchy.branches[entry.branch], entry);
    });

    // Sort Qualitative Data (Newest First) for UX
    allQualitative.sort((a, b) => {
        // Compare Year Descending
        if (b.year != a.year) return b.year - a.year;
        // Compare Wave Descending (Numeric awareness for "Wave 10" vs "Wave 2")
        return b.wave.localeCompare(a.wave, undefined, { numeric: true, sensitivity: 'base' });
    });

    return { hierarchy, allQualitative, allFailureReasons };
}

module.exports = { buildHierarchy };
