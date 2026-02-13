const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILDER_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(BUILDER_ROOT, '../..');
const CLIENTS_DIR = path.join(BUILDER_ROOT, 'clients');
const WIDGETS_DIR = path.join(PROJECT_ROOT, 'widgets');
const DIST_DIR = path.join(BUILDER_ROOT, 'dist');

// Read mass config
const configs = JSON.parse(fs.readFileSync(path.join(BUILDER_ROOT, 'mass-build-configs.json'), 'utf-8'));

// Optional: skip list (clients that already have widgets on their sites)
const skipFile = path.join(BUILDER_ROOT, 'skip-list.json');
const skipList = fs.existsSync(skipFile) ? JSON.parse(fs.readFileSync(skipFile, 'utf-8')) : [];

const allClients = [...configs.dental, ...configs.tuning];
const toBuild = allClients.filter(c => !skipList.includes(c.clientId));

console.log(`\n🚀 Mass Build: ${toBuild.length} widgets to build (${skipList.length} skipped)\n`);

let built = 0;
let failed = 0;

for (const client of toBuild) {
    const clientDir = path.join(CLIENTS_DIR, client.clientId);
    const widgetOutDir = path.join(WIDGETS_DIR, client.clientId);

    // 1. Create client directory
    fs.mkdirSync(clientDir, { recursive: true });

    // 2. Determine niche based on parent array
    const isDental = configs.dental.some(d => d.clientId === client.clientId);

    // 3. Write widget.config.json
    const widgetConfig = {
        clientId: client.clientId,
        bot: {
            name: client.name,
            greeting: client.greeting,
            tone: "professional_friendly"
        },
        design: {
            style: isDental ? "dark_green" : "dark_blue",
            position: "bottom-right"
        },
        features: {
            streaming: true,
            imageUpload: isDental,
            quickReplies: {
                enabled: true,
                starters: client.starters
            },
            feedback: true,
            sound: true,
            leads: true,
            integrations: {}
        }
    };

    fs.writeFileSync(
        path.join(clientDir, 'widget.config.json'),
        JSON.stringify(widgetConfig, null, 2)
    );

    // 4. Build widget
    console.log(`[${built + failed + 1}/${toBuild.length}] Building: ${client.clientId} (${client.name})...`);
    try {
        execSync(`node scripts/build.js ${client.clientId}`, {
            cwd: BUILDER_ROOT,
            stdio: 'pipe',
            timeout: 60000
        });

        // 5. Copy to widgets directory
        fs.mkdirSync(widgetOutDir, { recursive: true });
        fs.copyFileSync(
            path.join(DIST_DIR, 'script.js'),
            path.join(widgetOutDir, 'script.js')
        );

        built++;
        console.log(`  ✅ ${client.clientId} → widgets/${client.clientId}/script.js`);
    } catch (err) {
        failed++;
        console.error(`  ❌ ${client.clientId} FAILED: ${err.message}`);
    }
}

console.log(`\n🎉 Done! Built: ${built} | Failed: ${failed} | Skipped: ${skipList.length}`);
console.log(`📁 Widgets deployed to: ${WIDGETS_DIR}/\n`);
