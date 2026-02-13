// Post-processor: Replace initBranches in the already-generated report_v4.html
// This avoids the escaping issues of the patch_report_v4.js approach
const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'ESS Retail In Depth Analysis.html');
const newCodeFile = path.join(__dirname, 'new_init_branches_matrix.js');

let html = fs.readFileSync(htmlFile, 'utf8');
let newCode = fs.readFileSync(newCodeFile, 'utf8');

// Find the old initBranches function in the HTML
const startMarker = 'function initBranches(){';
const endMarker = 'function renderStoreList(){';

const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find function boundaries in report_v4.html");
    console.log("Start found:", startIdx !== -1);
    console.log("End found:", endIdx !== -1);
    process.exit(1);
}

// Replace: from start of initBranches to start of renderStoreList
const before = html.substring(0, startIdx);
const after = html.substring(endIdx);

const result = before + newCode + '\n\n' + after;

fs.writeFileSync(htmlFile, result);
console.log("Successfully injected new initBranches into report_v4.html!");
console.log("Old function was at char position", startIdx, "to", endIdx);
