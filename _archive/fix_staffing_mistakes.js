
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

// INLINE KEY ASSISTANT LOGIC (Subset for Fallback)
function getFallbackInsight(text) {
    const lower = text.toLowerCase();

    // IF NEGATION -> NEGATIVE
    if (lower.includes('tidak') || lower.includes('belum') || lower.includes('kurang') || lower.includes('tanpa') || lower.includes('hanya')) {
        return "Service Standard Gap: Verify SOP compliance.";
    }

    // IF QUESTION/INTERACTION -> POSITIVE
    if (lower.includes('menanyakan') || lower.includes('bertanya') || lower.includes('meminta')) {
        return "Proactive Engagement: Staff successfully engaged with customer needs.";
    }

    // DEFAULT POSITIVE
    return "General positive feedback.";
}

let fixedCount = 0;

Object.keys(cache).forEach(key => {
    const item = cache[key];
    const t = key.toLowerCase();

    // TARGET: The flawed "Staffing Level" insights
    if (item.aiInsight && item.aiInsight.includes('Staffing Level')) {
        // STRICT COUNT CHECK
        // Must have "jumlah" OR "terdapat" OR a digit
        const isRealCount = (t.includes('jumlah') || t.includes('terdapat') || /\d/.test(t) || t.includes(' satu ') || t.includes(' dua ') || t.includes(' tiga '));

        if (!isRealCount) {
            // It was a false positive triggers by 'ada' in 'kepada', etc.
            // Revert to Assistant Logic
            const newInsight = getFallbackInsight(key);
            item.aiInsight = newInsight;

            // Auto-align sentiment based on new insight
            if (newInsight.includes('Gap') || newInsight.includes('compliance')) {
                item.sentiment = 'negative';
            } else {
                item.sentiment = 'positive';
            }
            fixedCount++;
        }
    }
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Staffing Logic Fix Complete. Corrected ${fixedCount} false 'Staffing Level' items.`);
