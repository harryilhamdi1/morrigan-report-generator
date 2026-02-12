const fs = require('fs');
//const jsdom = require("jsdom"); // Not using jsdom, relying on regex parsing


async function validate() {
    try {
        const html = fs.readFileSync('report_v2.html', 'utf8');

        // Extract the JSON data object
        const jsonMatch = html.match(/const reportData = (\{.*?\});/s);
        if (!jsonMatch) {
            console.error("❌ Could not find reportData JSON in HTML");
            return;
        }

        const data = JSON.parse(jsonMatch[1]);

        console.log("--- Validation Report ---");
        console.log(`Generated At: ${data.meta.generatedAt}`);
        const totalRegions = Object.keys(data.regions).sort();
        const totalBranches = Object.keys(data.branches).sort();

        console.log(`Total Regions: ${totalRegions.length}`);
        console.log("Regions List:", totalRegions.join(", "));

        console.log(`Total Branches: ${totalBranches.length}`);
        console.log("Branches List:", totalBranches.join(", "));

        // Check Action Plans
        let actionPlanCount = 0;
        let totalSectionsChecked = 0;

        const threshold = data.threshold;
        console.log(`Threshold for Action Plan: ${threshold}`);

        Object.values(data.stores).forEach(store => {
            Object.values(store.results).forEach(waveRes => {
                Object.entries(waveRes.sections).forEach(([sec, score]) => {
                    totalSectionsChecked++;
                    if (score < threshold) {
                        actionPlanCount++;
                    }
                });
            });
        });

        console.log(`Total Sections Checked: ${totalSectionsChecked}`);
        console.log(`Implied Action Plans (Score < ${threshold}): ${actionPlanCount}`);

        // Check Qualitative Feedback Parsing
        let feedbackCount = 0;
        Object.values(data.stores).forEach(store => {
            Object.values(store.results).forEach(waveRes => {
                if (waveRes.qualitative && waveRes.qualitative.length > 0) {
                    feedbackCount += waveRes.qualitative.length;
                }
            });
        });
        console.log(`Total Qualitative Feedback Entries Found: ${feedbackCount}`);

        if (feedbackCount === 0) {
            console.warn("⚠️ WARNING: No qualitative feedback found. Check column extraction logic.");
        } else {
            console.log("✅ Qualitative feedback extracted successfully.");
        }

    } catch (err) {
        console.error("❌ Validation Failed:", err.message);
    }
}

validate();
