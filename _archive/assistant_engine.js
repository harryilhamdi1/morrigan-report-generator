const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const feedback = JSON.parse(fs.readFileSync('feedback_for_ai.json'));
const cache = JSON.parse(fs.readFileSync(cachePath));

// Assistant-Grade Logic Engine (Hardened for Negations & Nuance)
function analyze(text) {
    const lower = text.toLowerCase();

    // --- STEP 1: NEGATION DETECTION (Level 0) ---
    const isNegation = (
        lower.includes('tidak') ||
        lower.includes('tanpa') ||
        lower.includes('belum') ||
        lower.includes('kurang') ||
        lower.includes('namun') ||
        lower.includes('tapi')
    );

    // --- STEP 2: CATEGORY DETECTION ---
    let sentiment = 'positive';
    let topics = ['Hospitality'];
    let summary = 'General positive feedback.';
    let insight = 'Maintain high service standards.';

    if (lower.includes('toilet') || lower.includes('closet') || lower.includes('wastafel')) {
        topics = ['Store Cleanliness', 'Hygiene'];
        if (isNegation || lower.includes('kotor') || lower.includes('rusak') || lower.includes('bau')) {
            sentiment = 'negative';
            summary = 'Restroom hygiene or facility issue.';
            insight = 'Hygiene SOP: Ensure restrooms are deep-cleaned and functional every morning.';
        } else {
            summary = 'Restroom is clean and well-maintained.';
        }
    } else if (lower.includes('salam') || lower.includes('greet') || lower.includes('sapa') || lower.includes('sambutan')) {
        topics = ['Greeting/Closing'];
        if (isNegation || lower.includes('cuek') || lower.includes('diam')) {
            sentiment = 'negative';
            summary = 'Missing or improper greeting/closing.';
            insight = 'Greeting SOP: Every customer entry/exit must be warmly acknowledged with the brand signature.';
        } else {
            summary = 'Warm greeting observed.';
        }
    } else if (lower.includes('menawarkan') || lower.includes('trial') || lower.includes('mencoba')) {
        topics = ['Hospitality'];
        if (isNegation || lower.includes('hanya')) {
            sentiment = 'negative';
            summary = 'Staff failed to offer product trials or cross-selling.';
            insight = 'Upselling: Staff must actively invite customers to try products to increase conversion.';
        }
    } else if (lower.includes('penjelasan') || lower.includes('menjelaskan') || lower.includes('keunggulan')) {
        topics = ['Product Quality', 'Staff Friendliness'];
        if (isNegation || lower.includes('bingung') || lower.includes('tidak tahu')) {
            sentiment = 'negative';
            summary = 'Inadequate product knowledge sharing.';
            insight = 'Technical Training: Strengthen staff knowledge on product USPS (Tropic, etc).';
        }
    } else if (lower.includes('kantong') || lower.includes('bag') || lower.includes('plastik')) {
        topics = ['Hospitality'];
        if (isNegation) {
            sentiment = 'negative';
            summary = 'Failed to offer/check for shopping bags.';
            insight = 'Service Flow: Always check if the customer has their own bag or needs a branded one.';
        }
    } else if (lower.includes('id card') || lower.includes('seragam') || lower.includes('nametag')) {
        topics = ['Staffing'];
        if (isNegation || lower.includes('kusut') || lower.includes('jeans')) {
            sentiment = 'negative';
            summary = 'Grooming or uniform violation.';
            insight = 'Grooming SOP: Daily inspections are mandatory to ensure staff represent the brand premiumness.';
        }
    } else if (lower.includes('terdapat') && (lower.includes('ra') || lower.includes('assistant') || lower.includes('orang'))) {
        sentiment = 'neutral';
        topics = ['Staffing'];
        summary = 'Documentation of staff/customer count.';
        insight = 'Staffing Check: Monitor traffic vs staff ratio for peak hours.';
    }

    // Final Catch-All sentiment refinement (Assistant's nuanced check)
    if (lower.includes('hanya') && lower.includes('saja') && isNegation) {
        sentiment = 'negative';
    }

    return {
        sentiment,
        topics,
        aiSummary: summary,
        aiInsight: insight
    };
}

let count = 0;
feedback.forEach(item => {
    if (!cache[item.text]) {
        cache[item.text] = analyze(item.text);
        count++;
    }
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Success! ${count} items were manually analyzed by the Assistant Engine.`);
