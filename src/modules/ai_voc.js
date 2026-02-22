const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '../cache/voc_ai_cache.json');

/**
 * Loads cache from disk.
 */
function loadCache() {
    try {
        if (fs.existsSync(CACHE_PATH)) {
            return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
        }
    } catch (e) {
        console.warn("⚠️ Could not load AI cache:", e.message);
    }
    return {};
}

/**
 * Normalizes text for cache lookup (case-insensitive, remove punctuation/extra spaces)
 */
function normalizeKey(text) {
    if (!text) return "";
    return text.toString()
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Standardize spaces
        .trim();
}

/**
 * Enriches feedback items using the local "Golden Cache".
 * This version is 100% offline and does NOT use the Gemini API.
 */
async function processAllFeedbackWithAI(allFeedback) {
    const cache = loadCache();
    const results = [];

    // Create a normalized lookup map for robustness
    const normalizedCache = {};
    Object.keys(cache).forEach(key => {
        normalizedCache[normalizeKey(key)] = cache[key];
    });

    console.log(`📦 Local Cache Enrichment: Loading ${Object.keys(cache).length} pre-analyzed insights...`);

    allFeedback.forEach(item => {
        const text = item.text || "";
        const normKey = normalizeKey(text);

        if (normalizedCache[normKey]) {
            const cacheItem = normalizedCache[normKey];
            const merged = {
                ...item,
                ...cacheItem,
                aiEnhanced: true
            };

            results.push(merged);
        } else {
            // No cache? Fallback to neutral or rule-based placeholders
            results.push({
                ...item,
                aiEnhanced: false
            });
        }
    });

    const enhancedCount = results.filter(r => r.aiEnhanced).length;
    console.log(`✅ Enrichment Complete: ${enhancedCount}/${results.length} items enhanced with Cache Insights.`);

    return results;
}

module.exports = { processAllFeedbackWithAI };
