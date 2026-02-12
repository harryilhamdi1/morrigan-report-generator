const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'generate_report_v4.js');
const newCodeFile = path.join(__dirname, 'new_init_regions.js');

let reportContent = fs.readFileSync(reportFile, 'utf8');
let newCode = fs.readFileSync(newCodeFile, 'utf8');

// 1. Update output filename
reportContent = reportContent.replace("report_v3.html", "report_v4.html");
reportContent = reportContent.replace("report_v3.html", "report_v4.html");

// 2. Replace initRegions
// Lines 485 to 624 (1-based)
let lines = reportContent.split('\n');

// start index=484, end index=623
// length = 623 - 484 + 1 = 140
// Verify we are targeting the right lines by checking content slightly
if (lines[484].trim().startsWith("function initRegions") && lines[623].trim() === "}") {
    console.log("Found function at expected lines. Replacing...");
    lines.splice(484, 140, newCode);
    fs.writeFileSync(reportFile, lines.join('\n'));
    console.log("Patched generate_report_v4.js successfully.");
} else {
    console.error("Could not verify function location. Aborting patch.");
    console.log("Line 485:", lines[484]);
    console.log("Line 624:", lines[623]);
}
