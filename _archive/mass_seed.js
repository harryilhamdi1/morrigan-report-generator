const fs = require('fs');
const path = require('path');

const feedbackPath = path.join(__dirname, 'feedback_for_ai.json');
const cachePath = path.join(__dirname, 'src', 'cache', 'voc_ai_cache.json');

/**
 * THE MASTER INTELLIGENCE DICTIONARY
 * Structured by Priority (LEVEL 0 = Override, LEVEL 1 = Target, LEVEL 2 = Catch-All)
 */
const patterns = [
    // --- LEVEL 0: CRITICAL NEGATIVE OVERRIDES (High Priority) ---
    {
        regex: /tidak meminta.*mengecek|tidak cek.*barang|tanpa.*mengecek/i,
        sentiment: 'negative',
        topics: ['Speed of Service', 'Product Quality'],
        summary: 'Failed to perform quality/match verification.',
        insight: 'Precision SOP: Staff must always invite customers to double-check the item condition before finalizing the sale.'
    },
    {
        regex: /tanpa.*menjelaskan|tanpa.*informasi|tidak ada.*penjelasan|hanya.*saja/i,
        sentiment: 'negative',
        topics: ['Product Quality', 'Staff Friendliness'],
        summary: 'Transactional service without expert guidance.',
        insight: 'Expert Service: The RA must proactively provide care instructions and USPs beyond just taking payment.'
    },
    {
        regex: /tanpa.*menyapa|tanpa.*salam|belum.*menyambut|tidak ada.*sapaan/i,
        sentiment: 'negative',
        topics: ['Greeting/Closing'],
        summary: 'Standard welcoming greeting missed.',
        insight: 'Hospitality: The "Welcome Greeting" is the first touchpoint; ensure it is consistently delivered.'
    },
    {
        regex: /tidak menghampiri|pelanggan yang menghampiri/i,
        sentiment: 'negative',
        topics: ['Hospitality', 'Staff Friendliness'],
        summary: 'Reactive/Passive staff behavior.',
        insight: 'Proactive Approach: Staff must initiate engagement; do not wait for the customer to approach you.'
    },
    {
        regex: /tidak rapi|berantakan|kurang rapi|sampah|berdebu/i,
        sentiment: 'negative',
        topics: ['Store Cleanliness', 'Ambiance'],
        summary: 'Housekeeping/Cleanliness issue noticed.',
        insight: 'Visual Standards: A clean store reflects professional management; execute pre-opening cleaning checklists rigorously.'
    },
    {
        regex: /sinis|tidak ramah|jutek|kurang senyum|tidak gercep/i,
        sentiment: 'negative',
        topics: ['Staff Friendliness'],
        summary: 'Staff attitude or speed concerns.',
        insight: 'Service Mindset: Staff must remain warm and attentive even during high-traffic periods.'
    },
    {
        regex: /main HP|bermain handphone|sibuk sendiri/i,
        sentiment: 'negative',
        topics: ['Staffing'],
        summary: 'Staff distracted by personal devices.',
        insight: 'Professionalism: Strictly no phones on floor; provide lockers for personal devices.'
    },

    // --- LEVEL 1: POSITIVE AFFIRMATIONS ---
    {
        regex: /menghampiri Pelanggan|sapa Pelanggan|menyambut|salam/i,
        sentiment: 'positive',
        topics: ['Hospitality', 'Staff Friendliness'],
        summary: 'Proactive and welcoming staff.',
        insight: 'First Impression: Keep up the proactive greetings; they set a positive tone for the shopping journey.'
    },
    {
        regex: /menjelaskan.*perawatan|menjelaskan.*fitur|edukasi/i,
        sentiment: 'positive',
        topics: ['Product Quality'],
        summary: 'Advanced product knowledge sharing.',
        insight: 'Expert Service: Product care education builds post-purchase value; maintain this standard.'
    },
    {
        regex: /rapi|bersih|wangi|nyaman/i,
        sentiment: 'positive',
        topics: ['Store Cleanliness', 'Ambiance'],
        summary: 'Excellent store hygiene and organization.',
        insight: 'Premium Standard: A clean environment is a key driver of customer dwell time and brand trust.'
    },
    {
        regex: /ramah|sopan|baik|puas/i,
        sentiment: 'positive',
        topics: ['Staff Friendliness'],
        summary: 'Great customer hospitality and friendliness.',
        insight: 'Loyalty: High level of hospitality increases repeat visit probability.'
    },

    // --- LEVEL 2: CATCH-ALL LOGIC (Matches anything Else) ---
    {
        regex: /.*/, // The final catch-all
        sentiment: (text) => {
            const low = text.toLowerCase();
            if (low.includes('tidak') || low.includes('kurang') || low.includes('belum') || low.includes('tanpa')) return 'negative';
            if (low.includes('baik') || low.includes('ramah') || low.includes('bagus') || low.includes('puas')) return 'positive';
            return 'neutral';
        },
        topics: ['Hospitality'],
        summary: 'General service transaction observation.',
        insight: 'Maintenance: Continue monitoring service quality to ensure consistency across all waves.'
    }
];

function massSeed() {
    if (!fs.existsSync(feedbackPath)) {
        console.error("Missing feedback_for_ai.json");
        return;
    }

    const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    let cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

    let addedCount = 0;

    feedback.forEach(item => {
        const text = item.text || "";
        // Overwrite simple catch-alls if we have better patterns now, but keep manual seeds
        if (cache[text] && !cache[text].isAutoSeeded) return;

        for (const p of patterns) {
            const match = text.match(p.regex);
            if (match) {
                const sentiment = typeof p.sentiment === 'function' ? p.sentiment(text) : p.sentiment;
                cache[text] = {
                    sentiment: sentiment,
                    topics: p.topics,
                    aiSummary: typeof p.summary === 'function' ? p.summary(match) : p.summary,
                    aiInsight: typeof p.insight === 'function' ? p.insight(match) : p.insight,
                    isAutoSeeded: true // Flag to allow refinement overwrites
                };
                addedCount++;
                break;
            }
        }
    });

    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4), 'utf8');
    console.log(`🚀 Mass Seeding Complete!`);
    console.log(`✅ Processed ${addedCount} items into Golden Cache.`);
    console.log(`📦 Total Cache Items: ${Object.keys(cache).length}`);
}

massSeed();
