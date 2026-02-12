const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'generate_report_v4.js');
const newCodeFile = path.join(__dirname, 'new_init_regions.js');

let reportLines = fs.readFileSync(reportFile, 'utf8').split(/\r?\n/); // Handle CRLF in source
let newCode = fs.readFileSync(newCodeFile, 'utf8');

// 1. Update output filename (Node.js part)
for (let i = 0; i < 200; i++) {
    if (reportLines[i].includes("report_v3.html")) {
        reportLines[i] = reportLines[i].replace("report_v3.html", "report_v4.html");
    }
}

// 2. Format new code
let newCodeFormatted = newCode.split(/\r?\n/).map(line => {
    // Remove \r just in case
    let cleanLine = line.replace('\r', '');
    // Escape single quotes
    let escaped = cleanLine.replace(/'/g, "\\'");
    // Add indentation and quotes
    return `        '${escaped}',`;
});

// Since the file is already partially botched by previous run (maybe?), let's be careful.
// Wait, previous run replaced lines 485-625 with bad content.
// Now lines 485+ are bad.
// Finding "function initRegions" might fail if it's garbled.
// But the start line should be recognizable if only the end of line is bad.
// Actually, the previous patch inserted lines that look like:
// 'code\r',
// So they start correctly.

let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < reportLines.length; i++) {
    let trimmed = reportLines[i].trim();
    // Start detection: simpler check
    if (trimmed.startsWith("'function initRegions(){") || trimmed.startsWith("'function initRegions() {")) {
        startIndex = i;
    }
    // End detection: initBranches is next
    if (trimmed.startsWith("'function initBranches(){")) {
        endIndex = i - 1;
        break;
    }
}

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    console.log(`Replacing lines ${startIndex + 1} to ${endIndex + 1}`);
    reportLines.splice(startIndex, endIndex - startIndex, ...newCodeFormatted);
    fs.writeFileSync(reportFile, reportLines.join('\n')); // Use \n only for output consistency
    console.log("Patched generate_report_v4.js successfully!");
} else {
    console.error("Could not find function boundaries.");
    console.log("Start:", startIndex);
    console.log("End:", endIndex);
    // Fallback: if we can't find boundaries because file is messed up, 
    // we might need to restore from v3 and start over?
    // But let's hope it finds strictly matching lines.
}
