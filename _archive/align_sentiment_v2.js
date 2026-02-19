
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let counts = { positive: 0, negative: 0, neutral: 0 };
let updated = 0;

function determineSentiment(insight, text) {
    const i = insight.toLowerCase();
    const t = text.toLowerCase();

    // 1. NEUTRAL (Strict Observations)
    if (i.includes('traffic analysis') || i.includes('staff/customer count')) return 'neutral';
    if (i.includes('staffing level') && !t.includes('kosong') && !t.includes('tidak ada')) return 'neutral';
    if (t.includes('jumlah') && t.includes('pelanggan')) return 'neutral';
    if (t.includes('terdapat') && t.includes('retail assistant') && !t.includes('duduk') && !t.includes('main')) return 'neutral';

    // 2. POSITIVE (State of being / Reinforcement)
    if (
        i.includes('keep it up') ||
        i.includes('well-maintained') ||
        i.includes('warm greeting observed') ||
        i.includes('general positive') ||
        i.includes('good') ||
        i.includes('great') ||
        i.includes('excellent') ||
        i.includes('is clean') ||    // "Restroom is clean"
        i.includes('was clean') ||
        i.includes('observed')       // "Warm greeting observed"
    ) {
        return 'positive';
    }

    // 3. NEGATIVE (Directives / Imperatives / Gaps)
    // Expanded list based on audit
    if (
        i.includes('must') || i.includes('should') ||
        i.includes('required') || i.includes('immediate') || i.includes('urgent') ||
        i.includes('violation') || i.includes('zero tolerance') || i.includes('policy') ||
        i.includes('failure') || i.includes('missing') || i.includes('incomplete') ||
        i.includes('gap') || i.includes('broken') || i.includes('dirty') ||
        i.includes('dead') || // dead bulb
        i.includes('investigation') ||
        i.includes('check') || i.includes('ensure') || i.includes('verify') ||
        i.includes('schedule') || // schedule repaint
        i.includes('keep') || // keep hidden
        i.includes('clean') || // clean mirrors (imperative)
        i.includes('replace') || i.includes('refill') || i.includes('restock') ||
        i.includes('tighten') || i.includes('fix') || i.includes('repair') ||
        i.includes('don\'t') || i.includes('never') || i.includes('avoid') || i.includes('stop') ||
        i.includes('escort') || // escort policy
        i.includes('presentation') // presentation: receipts should...
    ) {
        return 'negative';
    }

    // Default Fallback
    if (t.includes('tidak') || t.includes('kotor') || t.includes('rusak') || t.includes('panas') || t.includes('lama') || t.includes('bau')) return 'negative';

    return 'neutral';
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
console.log(`Sentiment Alignment V2 Complete. Updated ${updated} items.`);
console.log(`Final Distribution: Positive: ${counts.positive}, Negative: ${counts.negative}, Neutral: ${counts.neutral}`);
