const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'generate_report_v4.js');
const newCodeFile = path.join(__dirname, 'new_init_branches_matrix.js');

let reportLines = fs.readFileSync(reportFile, 'utf8').split(/\r?\n/);
let newCode = fs.readFileSync(newCodeFile, 'utf8');

// Format new code for the array
let newCodeFormatted = newCode.split(/\r?\n/).map(line => {
    let cleanLine = line.replace('\r', '');
    let escaped = cleanLine.replace(/'/g, "\\'");
    return `        '${escaped}',`;
});

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < reportLines.length; i++) {
    let trimmed = reportLines[i].trim();
    if (trimmed.startsWith("'function initBranches(){") || trimmed.startsWith("'function initBranches() {")) {
        startIndex = i;
    }
    if (trimmed.startsWith("'function renderStoreList(){")) {
        endIndex = i - 1;
        break;
    }
}

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    console.log(`Replacing lines ${startIndex + 1} to ${endIndex + 1}`);
    reportLines.splice(startIndex, endIndex - startIndex, ...newCodeFormatted);
    fs.writeFileSync(reportFile, reportLines.join('\n'));
    console.log("Patched generate_report_v4.js with Strategic Matrix!");
} else {
    console.error("Could not find function boundaries again.");
    console.log("Start:", startIndex);
    console.log("End:", endIndex);
}
