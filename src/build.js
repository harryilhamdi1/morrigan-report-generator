const fs = require('fs').promises;
const path = require('path');
const WAVES = require('./config/waves');
const ACTION_PLANS_MAP = require('./config/action_plans');
const { THRESHOLD_SCORE } = require('./config/scoring');
const { loadMasterData, loadSectionWeights } = require('./modules/data_loader');
const { processWave } = require('./modules/scorer');
const { buildHierarchy } = require('./modules/aggregator');

// Paths
const BASE_DIR = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const OUTPUT_FILE = path.join(__dirname, '../ESS Retail Analysis.html');

async function loadTemplate(filename) {
    return await fs.readFile(path.join(TEMPLATE_DIR, filename), 'utf8');
}

async function main() {
    console.log("🚀 Starting Build Process...");

    // 1. Load Configurations & Master Data
    console.log("   Loading Master Data & Weights...");
    const masterMap = await loadMasterData(path.join(BASE_DIR, 'CSV', 'Master Site Morrigan.csv'));
    const sectionWeights = await loadSectionWeights(BASE_DIR); // Pass base dir to find CSV folder

    // 2. Process All Waves
    let allStoreData = [];
    console.log("   Processing Waves...");

    for (const wave of WAVES) {
        const filePath = path.join(BASE_DIR, 'CSV', wave.file);
        try {
            console.log(`    - Processing ${wave.name} (${wave.year})...`);
            const waveData = await processWave(filePath, wave.name, wave.year, masterMap, sectionWeights);
            console.log(`      > Found ${waveData.length} records.`);
            allStoreData = allStoreData.concat(waveData);
        } catch (err) {
            console.error(`    ❌ Error processing ${wave.file}:`, err.message);
        }
    }

    // 3. Transformation & Aggregation
    console.log("   Building Hierarchy & Stats...");
    console.log(`    > Total records: ${allStoreData.length}`);
    const { hierarchy, allQualitative, allFailureReasons } = buildHierarchy(allStoreData, WAVES);
    console.log(`    > Hierarchy built. Stores: ${Object.keys(hierarchy.stores).length}, Regions: ${Object.keys(hierarchy.regions).length}`);

    // 4. Construct Final JSON Payload
    const reportData = {
        meta: { generatedAt: new Date().toISOString() },
        summary: hierarchy.all,
        regions: hierarchy.regions,
        branches: hierarchy.branches,
        stores: hierarchy.stores,
        threshold: THRESHOLD_SCORE,
        actionPlanConfig: ACTION_PLANS_MAP,
        // Calculate VoC Stats for the JSON payload to be used by initVoC if needed, 
        // OR we can just pass raw feedbacks if we want client-side processing. 
        // For now, let's pass a simplified VoC summary if the client script needs it, 
        // but looking at scripts.js it seems to handle qualitative inside store details.
        // We might want to pass global VoC stats here if the dashboard needs it.
        // Let's stick to what the original script did or what our new templates expect.
        voc: allQualitative,
        failureReasons: allFailureReasons
    };

    const jsonStr = JSON.stringify(reportData);
    console.log(`    > JSON payload size: ${jsonStr.length} characters`);

    // 5. Load & Assemble Templates
    console.log("   Assembling HTML...");
    const tplBase = await loadTemplate('base.html');
    const tplDash = await loadTemplate('dashboard.html');
    const tplReg = await loadTemplate('regional.html');
    const tplBranch = await loadTemplate('branch.html');
    const tplStore = await loadTemplate('store.html');
    const tplVoC = await loadTemplate('voc.html');
    const tplScripts = await loadTemplate('scripts.js');

    // Combine Tabs
    const combinedContent = tplDash + '\n' + tplReg + '\n' + tplBranch + '\n' + tplStore + '\n' + tplVoC;

    let finalHTML = tplBase;
    console.log(`    > Placeholder index: ${finalHTML.indexOf('{{REPORT_DATA_JSON}}')}`);

    // 6. Injection
    finalHTML = finalHTML
        .replace(/\{\s*\{\s*CONTENT\s*\}\s*\}/, () => combinedContent)
        .replace(/\{\s*\{\s*REPORT_DATA_JSON\s*\}\s*\}/, () => jsonStr)
        .replace(/\{\s*\{\s*SCRIPTS\s*\}\s*\}/, () => tplScripts)
        .replace(/\{\s*\{\s*GENERATED_DATE\s*\}\s*\}/, () => new Date().toLocaleDateString('en-GB'))
        .replace(/\{\s*\{\s*THRESHOLD\s*\}\s*\}/, () => THRESHOLD_SCORE);

    console.log(`    > Final HTML size: ${finalHTML.length} characters`);

    // 7. Write Output
    await fs.writeFile(OUTPUT_FILE, finalHTML);
    console.log(`✅ Build Complete! Output: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error("❌ Build Failed:", err);
    process.exit(1);
});
