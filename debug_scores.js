const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Mock data loading simulation
const loadData = () => {
    // We can't easily reproduce the whole parsing logic without copying it.
    // Instead, let's just use the EXISTING generate_report_v2.js but modify it to print debug info and EXIT.
    // Actually, I can just use run_command("node ...") and grep the output if I add logging.
    // But I can't modify the file just for logging and revert.

    // Better: Read the 'report_v2.html' file? No, it has data embedded!
    // I can parse the HTML to find 'const reportData = ...'

    const html = fs.readFileSync('report_v2.html', 'utf8');
    const match = html.match(/const reportData = (\{.*?\});/s);
    if (match) {
        const data = JSON.parse(match[1]);
        const branches = data.branches;
        const currentWave = Object.keys(data.summary).sort().pop();

        console.log("Current Wave:", currentWave);
        console.log("Branches:");

        Object.keys(branches).forEach(br => {
            const d = branches[br][currentWave];
            if (d) {
                const score = d.sum / d.count;
                console.log(`${br}: ${score.toFixed(2)} (Sum: ${d.sum}, Count: ${d.count})`);
            } else {
                console.log(`${br}: No Data`);
            }
        });
    } else {
        console.log("Could not find reportData in HTML");
    }
};

loadData();
