const fs = require('fs');
const path = require('path');

const reportFile = path.join(__dirname, 'ESS Retail In Depth Analysis.html');
const newStoreListCodeFile = path.join(__dirname, 'new_store_list.js');
const newStoreListCode = fs.readFileSync(newStoreListCodeFile, 'utf8');

let html = fs.readFileSync(reportFile, 'utf8');

const startMarker = 'function renderStoreList(){';
const endMarker = '</script>';

const idxStart = html.indexOf(startMarker);
const idxEnd = html.lastIndexOf(endMarker);

if (idxStart === -1 || idxEnd === -1) {
    console.error("Could not find boundaries for store list injection.");
    process.exit(1);
}

// Construct new main script block
const newInitCall = `
window.onload = function() { initSummary(); initRegions(); initBranches(); initStoreTable(); };
`;

// Replace from renderStoreList start to just before </script>
const before = html.substring(0, idxStart);
const after = html.substring(idxEnd); // Contains </script>...

const finalHtml = before + newStoreListCode + '\n' + newInitCall + after;

fs.writeFileSync(reportFile, finalHtml);
console.log("Successfully injected Enhanced Store Deep Dive (Pagination, Filters, Sort) into report_v4.html!");
