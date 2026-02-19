
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let updatedCount = 0;

function getKeywords(text) {
    return text.toLowerCase();
}

function refinements(text) {
    const t = getKeywords(text);

    // 1. STORAGE & AREA MERGING
    if (t.includes('gudang') || t.includes('penyimpanan') || t.includes('galon') || t.includes('alat kebersihan')) {
        return "Space Optimization: Customer areas (toilets/fitting rooms) must be kept separate from back-of-house storage.";
    }

    // 2. STOCK & AVAILABILITY
    if (t.includes('stok') || t.includes('tersedia') || t.includes('kosong') || t.includes('size')) {
        return "Inventory Management: Ensure high-demand items are replenished and stock visibility is accurate.";
    }

    // 3. PROMOTIONS & DISCOUNTS
    if (t.includes('diskon') || t.includes('potongan') || t.includes('promo') || t.includes('voucher') || t.includes('25.000') || t.includes('250.000')) {
        return "Active Selling: Make sure every customer is aware of applicable promos to increase basket size.";
    }

    // 4. POSITIVE CLOSING / GESTURES
    if (t.includes('senyum') || t.includes('tangan') || t.includes('jari') || t.includes('dada')) {
        return "Signature Service: The 'Smile & Hand on Chest' gesture is a key brand differentiator. Keep it up.";
    }

    // 5. CUSTOMER INITIATIVE (Passive Staff) - Re-affirmation
    if (t.includes('langsung') && (t.includes('mengutarakan') || t.includes('minta'))) {
        return "Proactive Service: Do not rely on customer initiative. Anticipate needs before they ask.";
    }

    return null;
}

Object.keys(cache).forEach(key => {
    const item = cache[key];
    if (item.aiInsight === 'Maintain high service standards.') {
        const newInsight = refinements(key);
        if (newInsight) {
            item.aiInsight = newInsight;
            updatedCount++;
        }
    }
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Round 4 Audit Complete. Refined ${updatedCount} additional items.`);
