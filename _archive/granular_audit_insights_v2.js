
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let updatedCount = 0;

function getKeywords(text) {
    return text.toLowerCase();
}

function refinements(text) {
    const t = getKeywords(text);

    // 1. STAFFING & TRAFFIC COUNTS (Neutral Observations)
    if (t.includes('jumlah') || t.includes('terdapat') || t.includes('ada')) {
        if (t.includes('retail assistant') || t.includes('staf') || t.includes('staff')) {
            return "Staffing Level: Ensure ratio is sufficient for the observed traffic volume.";
        }
        if (t.includes('pelanggan') || t.includes('customer') || t.includes('pengunjung')) {
            return "Traffic Analysis: High traffic requires active floor management and zoning.";
        }
    }

    // 2. HYGIENE & CLEANLINESS (Refined with variants)
    if (t.includes('tisu') || t.includes('tissue') || t.includes('tisue') || t.includes('kertas')) return "Hygiene Standard: Restock consumables (tissues/soap) immediately.";
    if (t.includes('kotor') || t.includes('noda') || t.includes('kerak') || t.includes('debu') || t.includes('bercak')) return "Hygiene Standard: Immediate deep cleaning required. Enforce hourly checks.";
    if (t.includes('sampah') || t.includes('bekas')) return "Waste Management: Bins must be emptied regularly. Zero tolerance for litter.";
    if (t.includes('bau') || t.includes('arom')) return "Odor Control: Immediate investigation required. Scent marketing should be pleasant.";

    // 3. VISUAL MERCHANDISING
    if (t.includes('poster') || t.includes('banner') || t.includes('fasad') || t.includes('display') || t.includes('manekin')) {
        return "Visual Merchandising: Ensure all VM elements are aligned with current campaign guidelines.";
    }

    // 4. FACILITIES (Additional variants)
    if (t.includes('ac') || t.includes('panas') || t.includes('gerah')) return "HVAC Maintenance: Maintain comfortable store temperature (23-24°C).";
    if (t.includes('lampu') || t.includes('gelap') || t.includes('redup')) return "Lighting Maintenance: Replace dead bulbs immediately.";

    // 5. STAFF BEHAVIOR (Additional)
    if (t.includes('topi') || t.includes('aksesoris')) return "Grooming SOP: No unauthorized accessories (hats/sunglasses) allowed on sales floor.";
    if (t.includes('main hp') || t.includes('gadget')) return "Service Focus: Zero tolerance for personal device use.";

    return null;
}

Object.keys(cache).forEach(key => {
    const item = cache[key];
    // Re-check generic insights OR specifically target the ones we might have missed
    if (item.aiInsight === 'Maintain high service standards.') {
        const newInsight = refinements(key);
        if (newInsight) {
            item.aiInsight = newInsight;
            updatedCount++;
        }
    }
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Round 2 Audit Complete. Refined ${updatedCount} additional items.`);
