const fs = require('fs');
const path = require('path');

const feedbackPath = path.join(__dirname, 'feedback_for_ai.json');
const cachePath = path.join(__dirname, 'src', 'cache', 'voc_ai_cache.json');

function auditCoverage() {
    if (!fs.existsSync(feedbackPath)) {
        console.error("❌ feedback_for_ai.json not found. Run export_feedback.js first.");
        return;
    }

    const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
    const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

    // Normalization helper
    const norm = (t) => t.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    // Create a normalized lookup SET for fast checking
    const normalizedCacheKeys = new Set(Object.keys(cache).map(k => norm(k)));

    const totalUnique = feedback.length;
    let coveredCount = 0;

    feedback.forEach(item => {
        if (normalizedCacheKeys.has(norm(item.text || ""))) {
            coveredCount++;
        }
    });

    const percentage = ((coveredCount / totalUnique) * 100).toFixed(2);
    const target = 10000;
    const progressToTarget = ((coveredCount / target) * 100).toFixed(2);

    console.log("\n📊 --- VoC Coverage Audit ---");
    console.log(`✅ Total Unique Feedback: ${totalUnique.toLocaleString()}`);
    console.log(`📦 Items in Golden Cache: ${coveredCount.toLocaleString()}`);
    console.log(`📈 Current Coverage:     ${percentage}% of total dataset`);
    console.log(`🎯 Progress to 10,000:   ${progressToTarget}%`);
    console.log("-------------------------------\n");
}

auditCoverage();
