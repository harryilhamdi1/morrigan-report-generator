
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let counts = { positive: 0, negative: 0, neutral: 0 };
let updated = 0;

function determineSentiment(insight, text) {
    const i = insight.toLowerCase();
    const t = text.toLowerCase();

    // 1. NEUTRAL (Observations / Staff Counts / Traffic)
    if (i.includes('staffing level') || i.includes('traffic analysis') || i.includes('staff/customer count')) return 'neutral';
    if (t.includes('jumlah') && t.includes('pelanggan')) return 'neutral'; // Explicit text check for count
    if (t.includes('terdapat') && t.includes('retail assistant')) return 'neutral';

    // 2. POSITIVE (Reinforcement / Satisfaction)
    if (
        i.includes('keep it up') ||
        i.includes('well-maintained') ||
        i.includes('warm greeting observed') ||
        i.includes('general positive') ||
        i.includes('good') ||
        i.includes('maintained') ||
        (!i.includes('must') && !i.includes('required') && !i.includes('violation') && t.includes('bersih')) // Clean restroom
    ) {
        return 'positive';
    }

    // 3. NEGATIVE (Directives / Gaps / Violations)
    // Most of the granular insights I generated are directives ("Must", "Immediate", "Required", "Zero Tolerance")
    if (
        i.includes('must') ||
        i.includes('required') ||
        i.includes('immediate') ||
        i.includes('urgent') ||
        i.includes('violation') ||
        i.includes('zero tolerance') ||
        i.includes('failure') ||
        i.includes('missing') ||
        i.includes('incomplete') ||
        i.includes('gap') ||
        i.includes('broken') ||
        i.includes('dirty') ||
        i.includes('investigation') ||
        i.includes('check') || // "Check locks", "Check bulbs"
        i.includes('ensure') // "Ensure X is done" usually implies it wasn't
    ) {
        return 'negative';
    }

    // Default Fallback based on text if Insight is ambiguous
    if (t.includes('tidak') || t.includes('kotor') || t.includes('rusak') || t.includes('panas') || t.includes('lama')) return 'negative';

    return 'neutral'; // Safest fallback
}

Object.keys(cache).forEach(key => {
    const item = cache[key];
    const newSentiment = determineSentiment(item.aiInsight, key);

    if (item.sentiment !== newSentiment) {
        item.sentiment = newSentiment;
        updated++;
    }
    counts[newSentiment]++;
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Sentiment Alignment Complete. Updated ${updated} items.`);
console.log(`Final Distribution: Positive: ${counts.positive}, Negative: ${counts.negative}, Neutral: ${counts.neutral}`);
