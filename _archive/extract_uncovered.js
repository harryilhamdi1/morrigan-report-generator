const fs = require('fs');
const feedback = JSON.parse(fs.readFileSync('feedback_for_ai.json'));
const cache = JSON.parse(fs.readFileSync('src/cache/voc_ai_cache.json'));

const uncovered = feedback.filter(x => !cache[x.text]).map(x => x.text);
console.log(uncovered.slice(0, 100).join('\n---\n'));
