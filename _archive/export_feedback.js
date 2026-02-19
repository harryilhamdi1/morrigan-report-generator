const fs = require('fs');
const path = require('path');
const WAVES = require('./src/config/waves');
const masterMapPath = path.join(__dirname, 'CSV', 'Master Site Morrigan.csv');
const { loadMasterData, loadSectionWeights } = require('./src/modules/data_loader');
const { processWave } = require('./src/modules/scorer');

async function exportFeedback() {
    console.log("Gathering all qualitative feedback (including dialogue and failures)...");
    const masterMap = await loadMasterData(masterMapPath);
    const sectionWeights = await loadSectionWeights(__dirname);

    let allReviews = new Set();

    for (const wave of WAVES) {
        const filePath = path.join(__dirname, 'CSV', wave.file);
        try {
            const waveData = await processWave(filePath, wave.name, wave.year, masterMap, sectionWeights);
            waveData.forEach(d => {
                // 1. Standard Qualitative
                if (d.qualitative) {
                    d.qualitative.forEach(q => {
                        if (q.text && q.text.trim().length > 3) allReviews.add(q.text.trim());
                    });
                }
                // 2. Dialogue
                if (d.dialogue) {
                    if (d.dialogue.customerQuestion && d.dialogue.customerQuestion.length > 3) allReviews.add(d.dialogue.customerQuestion.trim());
                    if (d.dialogue.raAnswer && d.dialogue.raAnswer.length > 3) allReviews.add(d.dialogue.raAnswer.trim());
                    if (d.dialogue.memberBenefits && d.dialogue.memberBenefits.length > 3) allReviews.add(d.dialogue.memberBenefits.trim());
                }
                // 3. Failed Items Reasons
                if (d.failedItems) {
                    d.failedItems.forEach(f => {
                        if (f.reason && f.reason.length > 3) allReviews.add(f.reason.trim());
                    });
                }
            });
        } catch (e) {
            console.error(`Error processing ${wave.file}:`, e.message);
        }
    }

    const output = Array.from(allReviews).map((text, i) => ({ id: i, text }));
    fs.writeFileSync('feedback_for_ai.json', JSON.stringify(output, null, 2));
    console.log(`Saved ${output.length} unique qualitative reviews to feedback_for_ai.json`);
}

exportFeedback();
