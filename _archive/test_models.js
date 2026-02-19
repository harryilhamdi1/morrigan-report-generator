require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
    try {
        console.log("Fetching available models...");
        // Not all SDK versions support listModels directly on genAI, but it's worth a try.
        // Alternatively, we can just try a simple generateContent on robust models.

        // Let's try to infer from a simple test
        const modelsToTest = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        for (const m of modelsToTest) {
            try {
                process.stdout.write(`Testing ${m}... `);
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log("✅ OK");
            } catch (e) {
                console.log("❌ FAILED: " + e.message);
                if (e.response) console.log(JSON.stringify(e.response, null, 2));
            }
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
