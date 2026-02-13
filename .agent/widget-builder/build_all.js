#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BUILDER_ROOT = __dirname;
const CLIENTS_DIR = path.join(BUILDER_ROOT, 'clients');
const BUILD_SCRIPT = path.join(BUILDER_ROOT, 'scripts', 'build.js');
// Path to quickwidgets: from .agent/widget-builder go up to .agent then up to root then to quickwidgets
const QUICKWIDGETS_DIR = path.resolve(BUILDER_ROOT, '..', '..', 'quickwidgets');

const clients = fs.readdirSync(CLIENTS_DIR).filter(f => fs.statSync(path.join(CLIENTS_DIR, f)).isDirectory());

console.log(`Found ${clients.length} clients to build and deploy.\n`);

let success = 0;
let fail = 0;

for (const client of clients) {
    console.log(`👉 Processing ${client}...`);
    try {
        // Build
        execSync(`node "${BUILD_SCRIPT}" ${client}`, { stdio: 'pipe', cwd: BUILDER_ROOT });

        // Deploy
        const destDir = path.join(QUICKWIDGETS_DIR, client);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(path.join(BUILDER_ROOT, 'dist', 'script.js'), path.join(destDir, 'script.js'));

        console.log(`   ✅ Built and Deployed`);
        success++;
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
        fail++;
    }
}

console.log(`\n🎉 Batch complete. Success: ${success}, Failed: ${fail}`);
