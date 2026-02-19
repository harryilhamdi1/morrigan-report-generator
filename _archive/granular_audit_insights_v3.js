
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let updatedCount = 0;

function getKeywords(text) {
    return text.toLowerCase();
}

function refinements(text) {
    const t = getKeywords(text);

    // 1. PRODUCT KNOWLEDGE & EXPLANATION
    if (t.includes('keunggulan') || t.includes('fitur') || t.includes('fungsi') || t.includes('teknologi') || t.includes('spesifikasi')) {
        return "Knowledge Training: Staff must be able to explain USPs (Tropic/Fabrics) confidently.";
    }
    if (t.includes('garansi') || t.includes('warranty')) {
        return "Holistic Service: Selling isn't just about warranty; focus on benefits and usage first.";
    }
    if (t.includes('menjawab') || t.includes('pertanyaan') || t.includes('bingung') || t.includes('tidak tahu')) {
        return "Competence: Staff must be ready to answer technical queries without hesitation.";
    }

    // 2. RECOMMENDATIONS & UPSELLING
    if (t.includes('rekomendasi') || t.includes('alternatif') || t.includes('saran') || t.includes('pilihan')) {
        return "Sales Strategy: Always offer alternatives if the specific request is unavailable.";
    }
    if (t.includes('mencari') || t.includes('cek stok') || t.includes('stock') || t.includes('tablet')) {
        return "Stock Accuracy: Use the tablet/system immediately to locate missing sizes/items.";
    }

    // 3. AMBIANCE (Music/Scent/Vibe)
    if (t.includes('musik') || t.includes('lagu') || t.includes('volume') || t.includes('suara')) {
        return "Sensory Experience: Music volume must be ambient (conversation-friendly), not overpowering.";
    }

    // 4. GROOMING (Specifics)
    if (t.includes('jambang') || t.includes('kumis') || t.includes('janggut') || t.includes('cukur')) {
        return "Grooming SOP: Facial hair must be neatly trimmed or clean-shaven per company standards.";
    }
    if (t.includes('rambut') || t.includes('gondrong') || t.includes('warna')) {
        return "Grooming SOP: Hair must be tidy, natural color, and styled professionally.";
    }

    // 5. SERVICE FLOW & PROCESS
    if (t.includes('fitting room') && (t.includes('menunggu') || t.includes('luar'))) {
        return "Fitting Room Service: Staff must wait nearby to assist with size changes or styling advice.";
    }
    if (t.includes('kasir') || t.includes('transaksi')) {
        if (t.includes('langsung') || t.includes('buru-buru') || t.includes('cepat')) {
            return "Transaction Pace: Don't rush. Confirm potential add-ons (socks/care products) before closing.";
        }
    }

    // 6. FINAL CATCH-ALL FOR REMAINING NEGATIVES
    if (t.includes('tidak') || t.includes('kurang') || t.includes('hanya') || t.includes('belum')) {
        return "Service Standard Gap: Verify SOP compliance for this specific interaction step.";
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
console.log(`Round 3 Audit Complete. Refined ${updatedCount} additional items.`);
