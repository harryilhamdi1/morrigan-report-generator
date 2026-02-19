
const fs = require('fs');
const cachePath = 'src/cache/voc_ai_cache.json';
const cache = JSON.parse(fs.readFileSync(cachePath));

let updatedCount = 0;

// Helper to sanitize text for matching
function getKeywords(text) {
    return text.toLowerCase();
}

// Insight Generator
function refinements(text) {
    const t = getKeywords(text);

    // 1. HYGIENE & CLEANLINESS (Critical)
    if (t.includes('bau') || t.includes('arom')) return "Odor Control: Immediate investigation required. Scent marketing should be pleasant, not offensive.";
    if (t.includes('sampah') || t.includes('tisue') || t.includes('bekas')) return "Waste Management: Bins must be emptied regularly. Zero tolerance for litter in customer areas.";
    if (t.includes('kotor') || t.includes('noda') || t.includes('kerak') || t.includes('debu') || t.includes('bercak')) return "Hygiene Standard: Immediate deep cleaning required. Enforce hourly checks for high-traffic zones.";
    if (t.includes('banjir') || t.includes('air') || t.includes('becek') || t.includes('licin')) return "Safety Hazard: Wet floors are a liability. Dry immediately and place caution signs.";

    // 2. FACILITIES (Maintenance)
    if (t.includes('ac') || t.includes('panas') || t.includes('gerah') || t.includes('suhu') || t.includes('dingin')) return "HVAC Maintenance: Maintain comfortable store temperature (23-24°C) to prolong customer dwell time.";
    if (t.includes('lampu') || t.includes('gelap') || t.includes('redup') || t.includes('bohlam') || t.includes('pencahayaan')) return "Lighting Maintenance: Replace dead bulbs immediately. Proper lighting is essential for product presentation.";
    if (t.includes('pintu') || t.includes('kunci') || t.includes('gagang') || t.includes('rusak') || t.includes('macet')) return "Facility Repair: Broken fixtures compromise privacy and safety. Prioritize immediate repair.";
    if (t.includes('signage') || t.includes('huruf') || t.includes('logo') || t.includes('neon')) return "Brand Image: Exterior signage is the first impression. Defective lights must be fixed within 24h.";

    // 3. STAFF APPEARANCE (Grooming)
    if (t.includes('seragam') || t.includes('baju') || t.includes('celana') || t.includes('jilbab')) return "Grooming SOP: Staff must adhere strictly to uniform guidelines (clean, pressed, correct attributes).";
    if (t.includes('sepatu') || t.includes('sandal') || t.includes('alas kaki')) return "Grooming SOP: Only authorized black footwear is permitted. No sandals or non-compliance shoes.";
    if (t.includes('rambut') || t.includes('kuku') || t.includes('bau badan')) return "Personal Hygiene: Staff must maintain impeccable personal grooming standards.";

    // 4. SERVICE - PASSIVE / ATTITUDE
    if (t.includes('main hp') || t.includes('gadget') || t.includes('ponsel') || t.includes('ngobrol') || t.includes('bercanda')) return "Service Focus: Zero tolerance for personal device use or idle chatting on the sales floor.";
    if (t.includes('cuek') || t.includes('diam') || t.includes('acuh')) return "Proactive Engagement: Staff must acknowledge every customer immediately. Passive behavior is unacceptable.";
    if (t.includes('tidak ramah') || t.includes('judes') || t.includes('sinis') || t.includes('ketus')) return "Hospitality: A warm, friendly demeanor is the baseline requirement for all interaction.";
    if (t.includes('menghampiri') || t.includes('menunggu') || t.includes('nyamperin')) return "Proactive Service: Staff must approach customers within 5 seconds, not wait to be approached.";

    // 5. PROCESS & SOP
    if (t.includes('member') || t.includes('poin') || t.includes('eac')) return "Membership SOP: Mandatory to ask for Member ID / EAC registration for every transaction.";
    if (t.includes('cek') || t.includes('periksa') || t.includes('kondisi')) return "Quality Control: Always confirm product condition with the customer before finalizing the sale.";
    if (t.includes('kantong') || t.includes('paper bag') || t.includes('belanjaan')) return "Packaging SOP: Ensure appropriate packaging is offered and available.";
    if (t.includes('struk') || t.includes('nota') || t.includes('kembalian')) return "Transaction Integrity: Ensure receipts and change are handed over accurately and politely.";

    return null; // Keep existing if no specific keyword match
}

Object.keys(cache).forEach(key => {
    const item = cache[key];

    // Only target the generic ones OR the ones we specifically want to refine
    if (item.aiInsight === 'Maintain high service standards.') {
        const newInsight = refinements(key);
        if (newInsight) {
            item.aiInsight = newInsight;
            updatedCount++;
        }
    }
});

fs.writeFileSync(cachePath, JSON.stringify(cache, null, 4));
console.log(`Granular Audit Complete. Refined ${updatedCount} items with specific operational insights.`);
