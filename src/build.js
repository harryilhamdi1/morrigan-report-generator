const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib'); // ADDED: Zlib for server-side compression
const WAVES = require('./config/waves');
const ACTION_PLANS_MAP = require('./config/action_plans');
const { THRESHOLD_SCORE } = require('./config/scoring');
const { loadMasterData, loadSectionWeights, loadLigaData } = require('./modules/data_loader');
const { processWave, processVoc } = require('./modules/scorer');
const { buildHierarchy } = require('./modules/aggregator');
const { generateInsights } = require('./modules/voc'); // Import Rule-Based Insight Generator
const { processAllFeedbackWithAI } = require('./modules/ai_voc'); // Import AI Insight Generator

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
    const ligaMap = await loadLigaData(path.join(BASE_DIR, 'CSV', 'CSE Analysis - Liga ESS.csv'));

    // 2. Process All Waves
    let allStoreData = [];
    console.log("   Processing Waves...");

    for (const wave of WAVES) {
        const filePath = path.join(BASE_DIR, 'CSV', wave.file);
        try {
            console.log(`    - Processing ${wave.name} (${wave.year})...`);
            const waveData = await processWave(filePath, wave.name, wave.year, masterMap, sectionWeights, ligaMap);
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

    // 3b. Local VoC Enrichment (Internal Cache-Only)
    console.log("   Enriching VoC with Local Cache...");
    let finalVocData = await processAllFeedbackWithAI(allQualitative);

    // Always use rule-based narrative for the header, 
    // but the individual feedback cards will have enriched data from cache.
    console.log("   Generating Smart Insights (Rule-Based Narrative)...");
    let vocInsights = generateInsights(finalVocData);

    // 4. Construct Final JSON Payload
    const reportData = {
        meta: { generatedAt: new Date().toISOString() },
        summary: hierarchy.all,
        regions: hierarchy.regions,
        branches: hierarchy.branches,
        stores: hierarchy.stores,
        threshold: THRESHOLD_SCORE,
        actionPlanConfig: ACTION_PLANS_MAP,
        actionPlanConfig: ACTION_PLANS_MAP,
        voc: finalVocData, // Use Enriched Data (AI or Raw)
        vocInsights: vocInsights, // Add Insights to Payload
        failureReasons: allFailureReasons
    };

    const jsonStr = JSON.stringify(reportData);
    console.log(`    > Raw JSON size: ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB`);

    // COMPRESSION STEP
    console.log("   Compressing Data...");
    const buffer = Buffer.from(jsonStr, 'utf-8');
    const compressed = zlib.deflateSync(buffer);
    const b64 = compressed.toString('base64');
    console.log(`    > Compressed size: ${(b64.length / 1024 / 1024).toFixed(2)} MB`);

    // 5. Load & Assemble Templates
    console.log("   Assembling HTML...");
    const tplBase = await loadTemplate('base.html');
    const tplDash = await loadTemplate('dashboard.html');
    const tplReg = await loadTemplate('regional.html');
    const tplBranch = await loadTemplate('branch.html');
    const tplStore = await loadTemplate('store.html');
    const tplVoC = await loadTemplate('voc.html');
    const tplScripts = await loadTemplate('scripts.js');

    // Load Fflate Library from node_modules (UMD build is browser compatible)
    const fflateLib = await fs.readFile(path.join(BASE_DIR, 'node_modules/fflate/umd/index.js'), 'utf8');

    // Combine Tabs
    const combinedContent = tplDash + '\n' + tplReg + '\n' + tplBranch + '\n' + tplStore + '\n' + tplVoC;

    let finalHTML = tplBase;
    console.log(`    > Placeholder index for Data: ${finalHTML.indexOf('{{REPORT_DATA_B64}}')}`);

    // 6. Injection
    finalHTML = finalHTML
        .replace(/\{\s*\{\s*CONTENT\s*\}\s*\}/, () => combinedContent)
        .replace(/\{\s*\{\s*REPORT_DATA_B64\s*\}\s*\}/, () => b64) // Inject Compressed Data
        .replace(/\{\s*\{\s*FFLATE_LIB\s*\}\s*\}/, () => fflateLib) // Inject Library
        .replace(/\{\s*\{\s*SCRIPTS\s*\}\s*\}/, () => tplScripts)
        .replace(/\{\s*\{\s*GENERATED_DATE\s*\}\s*\}/, () => new Date().toLocaleDateString('en-GB'))
        .replace(/\{\s*\{\s*THRESHOLD\s*\}\s*\}/, () => THRESHOLD_SCORE);

    console.log(`    > Final HTML size: ${(finalHTML.length / 1024 / 1024).toFixed(2)} MB`);

    // 7. Write Output
    await fs.writeFile(OUTPUT_FILE, finalHTML);
    console.log(`✅ Build Complete using Compression! Output: ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error("❌ Build Failed:", err);
    process.exit(1);
});
