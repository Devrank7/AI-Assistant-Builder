/**
 * Export knowledge chunks and AI settings from the API to seed files.
 *
 * Usage:
 *   node scripts/export-knowledge-seeds.js [base_url] [token]
 *
 * Defaults:
 *   base_url = http://localhost:3000
 *   token = from .env.local ADMIN_SECRET_TOKEN
 *
 * Example (export from production):
 *   node scripts/export-knowledge-seeds.js https://winbix-ai.pp.ua md_winbix_prod
 */

const fs = require('fs');
const path = require('path');

const SEEDS_DIR = path.resolve(__dirname, '..', 'knowledge-seeds');

async function main() {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    let token = process.argv[3];

    if (!token) {
        try {
            const envFile = fs.readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf-8');
            const match = envFile.match(/ADMIN_SECRET_TOKEN=(.+)/);
            if (match) token = match[1].trim();
        } catch (e) {}
    }

    if (!token) {
        console.error('No token provided. Usage: node export-knowledge-seeds.js [base_url] [token]');
        process.exit(1);
    }

    // Get client list
    const clientsRes = await fetch(`${baseUrl}/api/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const clientsData = await clientsRes.json();
    const clients = clientsData.clients || [];

    if (clients.length === 0) {
        console.log('No clients found.');
        return;
    }

    fs.mkdirSync(SEEDS_DIR, { recursive: true });

    let exported = 0;
    let skipped = 0;

    for (const client of clients) {
        const clientId = client.clientId;
        try {
            // Fetch knowledge chunks
            const knowledgeRes = await fetch(`${baseUrl}/api/knowledge?clientId=${clientId}&includeEmbeddings=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const knowledgeData = await knowledgeRes.json();
            const chunks = knowledgeData.chunks || [];

            // Fetch AI settings
            const settingsRes = await fetch(`${baseUrl}/api/ai-settings/${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const settingsData = await settingsRes.json();
            const settings = settingsData.settings || null;

            if (chunks.length === 0 && !settings) {
                console.log(`  ⏭️  ${clientId}: no knowledge or settings, skipping`);
                skipped++;
                continue;
            }

            // Save seed file
            const seed = {
                clientId,
                exportedAt: new Date().toISOString(),
                chunks: chunks.map(c => ({
                    text: c.text,
                    embedding: c.embedding,
                    source: c.source || 'website',
                })),
                aiSettings: settings ? {
                    systemPrompt: settings.systemPrompt,
                    greeting: settings.greeting,
                    temperature: settings.temperature,
                    maxTokens: settings.maxTokens,
                    topK: settings.topK,
                    aiModel: settings.aiModel,
                    handoffEnabled: settings.handoffEnabled,
                } : null,
            };

            const seedPath = path.join(SEEDS_DIR, `${clientId}.json`);
            fs.writeFileSync(seedPath, JSON.stringify(seed));
            exported++;
            console.log(`  ✅ ${clientId}: ${chunks.length} chunks, prompt ${settings?.systemPrompt?.length || 0} chars`);
        } catch (err) {
            console.error(`  ❌ ${clientId}: ${err.message}`);
        }
    }

    console.log(`\nDone! Exported: ${exported} | Skipped: ${skipped}`);
    console.log(`Seeds saved to: ${SEEDS_DIR}/`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
