const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let MONGODB_URI = 'mongodb://mongo:boot@localhost:7878/ai-widget-admin?authSource=admin'; // Default

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/MONGODB_URI=(.*)/);
    if (match && match[1]) {
        MONGODB_URI = match[1].trim();
    }
}

async function fixModelName() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Also update client 002 if needed, but primarily aguy_client
        const specificUpdate = await mongoose.connection.db.collection('aisettings').updateOne(
            { clientId: 'aguy_client' },
            { $set: { aiModel: 'gemini-3-flash-preview' } },
            { upsert: true }
        );
        console.log('Ensured aguy_client uses gemini-3-flash-preview');
        console.log(specificUpdate);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

fixModelName();
