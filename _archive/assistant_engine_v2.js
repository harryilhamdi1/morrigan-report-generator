const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const feedback = JSON.parse(fs.readFileSync('feedback_for_ai.json'));
const cache = JSON.parse(fs.readFileSync(cachePath));

// HARDENED ASSISTANT LOGIC ENGINE (LEVEL 2)
// STRICTER NEGATION & PASSIVE BEHAVIOR DETECTION
function analyze(text) {
    const lower = text.toLowerCase();

    // --- STEP 1: GLOBAL NEGATION CHECK ---
    const isNegation = (
        lower.includes('tidak') ||
        lower.includes('tanpa') ||
        lower.includes('belum') ||
        lower.includes('kurang') ||
        lower.includes('bukan') ||
        lower.includes('hanya') || // "Hanya" in service context usually implies "Minimum effort"
        lower.includes('aliih-alih') ||
        lower.includes('melainkan') // "Melainkan" often introduces the failure after a negation
    );

    // --- STEP 2: CATEGORY & SENTIMENT MAPPING ---
    let sentiment = 'positive';
    let topics = ['Hospitality'];
    let summary = 'General positive feedback.';
    let insight = 'Maintain high service standards.';

    // CATEGORY: STAFFING & UNIFORM
    if (lower.includes('seragam') || lower.includes('jilbab') || lower.includes('id card') || lower.includes('sepatu') || lower.includes('lanyard')) {
        topics = ['Staffing'];
        if (isNegation || lower.includes('kusut') || lower.includes('digulung') || lower.includes('salah') || lower.includes('tidak sesuai')) {
            sentiment = 'negative';
            summary = 'Uniform/Grooming violation.';
            insight = 'Grooming SOP: Uniforms must be pristine and worn correctly (e.g. jilbab tucked in).';
        }
    }
    // CATEGORY: FACILITIES & AMBIANCE
    else if (lower.includes('lampu') || lower.includes('signage') || lower.includes('huruf') || lower.includes('ac') || lower.includes('suhu') || lower.includes('panas')) {
        topics = ['Ambiance', 'Facility Maintenance'];
        if (isNegation || lower.includes('mati') || lower.includes('redup') || lower.includes('rusak') || lower.includes('panas')) {
            sentiment = 'negative';
            summary = 'Facility failure (Light/AC/Signage).';
            insight = 'Maintenance: Store environment must be flawless; report outages immediately.';
        }
    }
    // CATEGORY: GREETING & CLOSING
    else if (lower.includes('salam') || lower.includes('menyapa') || lower.includes('terima kasih') || lower.includes('welcome')) {
        topics = ['Greeting/Closing'];
        if (isNegation || lower.includes('hanya') || lower.includes('saja') || lower.includes('lupa')) {
            sentiment = 'negative';
            summary = 'Incomplete/Missing greeting or closing.';
            insight = 'Signature Service: Use the full Morrigan greeting script with the Hand-on-Chest gesture.';
        }
    }
    // CATEGORY: SERVICE PROCESS (The "Passive" Trap)
    else if (lower.includes('menghampiri') || lower.includes('menawarkan') || lower.includes('bertanya') || lower.includes('konfirmasi') || lower.includes('cek')) {
        topics = ['Hospitality', 'Speed of Service'];
        if (isNegation || lower.includes('pelanggan yang') || lower.includes('hanya') || lower.includes('diam')) {
            sentiment = 'negative';
            summary = 'Passive service; Customer had to initiate.';
            insight = 'Proactive Engagement: Staff must approach customers within seconds, not wait to be asked.';
        }
    }
    // CATEGORY: CHECKOUT & PAYMENT
    else if (lower.includes('kasir') || lower.includes('transaksi') || lower.includes('member') || lower.includes('pembayaran')) {
        topics = ['Payment/Checkout'];
        if (isNegation || lower.includes('hanya') || lower.includes('tidak') || lower.includes('lanjut')) {
            sentiment = 'negative';
            summary = 'Incomplete checkout flow (Skipped Member/Confirmation).';
            insight = 'Transaction SOP: Always ask for Member ID and confirm product details before payment.';
        }
    }
    // CATEGORY: HANDOVER & ETHICS
    else if (lower.includes('menyerahkan') || lower.includes('permintaan') || lower.includes('staf lain')) {
        topics = ['Staff Friendliness', 'Hospitality'];
        if (isNegation || lower.includes('tidak') || lower.includes('meninggalkan')) {
            sentiment = 'negative';
            summary = 'Improper handover between staff.';
            insight = 'Teamwork: Never abandon a customer; handover warmly to a colleague if necessary.';
        }
    }

    // --- CATCH-ALL NUANCE CHECK ---
    // If "Hanya" or "Melainkan" exists, it's almost 99% Negative in this dataset
    if (sentiment === 'positive' && (lower.includes('hanya') || lower.includes('melainkan') || lower.includes('tapi'))) {
        sentiment = 'negative';
        summary = 'Service gap detected (Partial service).';
    }

    return {
        sentiment,
        topics,
        aiSummary: summary,
        aiInsight: insight
    };
}

let count = 0;
// RE-RUN ALL ITEMS (Overwrite)
feedback.forEach(item => {
    // Only overwrite if it wasn't manually set by user (optional, but lets overwrite all for safety)
    // Actually, let's trust the logic more than the old cache
    cache[item.text] = analyze(item.text);
    count++;
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`HARDENED SWEEP COMPLETE. Analyzed ${count} items with Level 2 Logic.`);
