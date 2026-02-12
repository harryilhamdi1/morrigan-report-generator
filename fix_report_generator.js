const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'generate_report_v4.js');
const newCodeFile = path.join(__dirname, 'new_init_branches_matrix.js');

const reportContent = fs.readFileSync(reportFile, 'utf8');
const newBranchCode = fs.readFileSync(newCodeFile, 'utf8');

// Function to find function body in the string array format
function getFunctionBounds(content, funcName) {
    const lines = content.split('\n');
    let start = -1;
    let end = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`'function ${funcName}()`) || lines[i].includes(`'function ${funcName} (`)) {
            start = i;
        }
        if (start !== -1 && lines[i].includes("',") && i > start) {
            // Find the end of the current function by looking for the start of the next one
            // or the end of the parts array.
            // But we know the next function is renderStoreList
        }
    }
    return { start, end };
}

// Actually, let's just do a clean replacement of the whole generateHTML function
// to ensure no corruption.
// I will build the report generator content manually here.

// But wait, the generate_report_v4.js has a lot of complex logic above.
// I'll just use a more careful regex replacement.

let formattedNewCode = newBranchCode.split(/\r?\n/).map(line => {
    let escaped = line.replace(/'/g, "\\'").replace(/\r/g, "");
    return `                '${escaped}',`;
}).join('\n');

// Find the function block precisely
const pattern = /'function initBranches\(\) \{'[\s\S]*?'function renderStoreList\(\)\{'/;
const replacement = `'function initBranches() {',\n${formattedNewCode}\n                'function renderStoreList(){'`;

const updatedContent = reportContent.replace(pattern, replacement);

if (updatedContent === reportContent) {
    console.error("Failed to match pattern!");
} else {
    fs.writeFileSync(reportFile, updatedContent);
    console.log("Successfully fixed generate_report_v4.js");
}
