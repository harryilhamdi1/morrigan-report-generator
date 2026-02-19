require('dotenv').config();
const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
        } else {
            console.log("❌ Error listing models:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("❌ Network Error:", e.message);
    }
}

listModels();
