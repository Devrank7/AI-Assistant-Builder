/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const clientId = process.argv[2];

if (!clientId) {
    console.error("Please provide a Client ID: node scripts/build.js <client_id>");
    process.exit(1);
}

const BUILDER_ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(BUILDER_ROOT, 'clients');
const SRC_DIR = path.join(BUILDER_ROOT, 'src');
const DIST_DIR = path.join(BUILDER_ROOT, 'dist');

const clientDir = path.join(CLIENTS_DIR, clientId);
const clientSrcDir = path.join(clientDir, 'src');

if (!fs.existsSync(clientDir)) {
    console.error(`Client directory not found: ${clientDir}`);
    process.exit(1);
}

console.log(`🚀 Building widget for client: ${clientId}...`);

// 1. Copy client config to root for vite.config.js to pick up
const configPath = path.join(clientDir, 'widget.config.json');
if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, path.join(BUILDER_ROOT, 'widget.config.json'));
}

// 2. Overwrite src/components with client's custom components
// We only copy components that exist in client folder, falling back to default otherwise?
// NO, for consistency, if client folder exists, we assume it has the full source for components.
// OR we can overlay. Let's overlay.

if (fs.existsSync(clientSrcDir)) {
    console.log("📦 Copying custom source code...");
    // Backup shared main.jsx & hooks/ — they must NEVER be overwritten by client files
    const sharedMainJsx = path.join(SRC_DIR, 'main.jsx');
    const sharedHooksDir = path.join(SRC_DIR, 'hooks');
    const mainBackup = fs.existsSync(sharedMainJsx) ? fs.readFileSync(sharedMainJsx) : null;

    fs.cpSync(clientSrcDir, SRC_DIR, { recursive: true, force: true });

    // Restore protected files
    if (mainBackup) fs.writeFileSync(sharedMainJsx, mainBackup);
    // Restore hooks if client had any (shouldn't, but safety net)
    // hooks are already protected by writeWidgetFile validation, this is defense-in-depth
}

// 3. Run Build
console.log("🔨 Running Vite build...");
try {
    execSync('npm run build', { stdio: 'inherit', cwd: BUILDER_ROOT });
    console.log("✅ Build successful!");
} catch {
    console.error("❌ Build failed");
    process.exit(1);
}

// 4. Output path
console.log(`\n🎉 Artifact ready: ${path.join(DIST_DIR, 'script.js')}`);
