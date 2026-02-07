require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Using API Key:', process.env.GEMINI_API_KEY ? '***' : 'MISSING');

    try {
        const modelParams = { model: 'gemini-1.5-flash' }; // Dummy model to get client
        // Direct access to model list is not straightforward in SDK, but let's try a direct fetch if SDK fails
        // actually SDK has specific method usually but let's try direct fetch for clarity

        // SDK doesn't expose listModels directly on the main instance easily in all versions.
        // Let's use fetch to the API endpoint directly.

        const apiKey = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            console.error('Failed to list models:', await response.text());
            return;
        }

        const data = await response.json();
        console.log('Available Models:');
        data.models.forEach(m => {
            if (m.name.includes('embed')) {
                console.log(`- ${m.name} (${m.description})`);
            }
        });
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
