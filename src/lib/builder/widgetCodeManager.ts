// src/lib/builder/widgetCodeManager.ts
import fs from 'fs';
import path from 'path';

const BUILDER_ROOT = path.resolve(process.cwd(), '.claude/widget-builder');
const CLIENTS_DIR = path.join(BUILDER_ROOT, 'clients');
const SHARED_SRC = path.join(BUILDER_ROOT, 'src');

// Files that can be read
const READABLE_FILES = [
  'components/Widget.jsx',
  'components/ChatMessage.jsx',
  'components/QuickReplies.jsx',
  'components/MessageFeedback.jsx',
  'components/RichBlocks.jsx',
  'index.css',
  'main.jsx',
];

// Files that can be written (hooks/ is NEVER writable — see CLAUDE.md Gotcha #8)
const WRITABLE_PATHS = ['components/', 'index.css', 'main.jsx'];

export interface WidgetCodeBundle {
  [filename: string]: string;
}

export function readWidgetCode(clientId: string, files?: string[]): WidgetCodeBundle {
  const clientSrc = path.join(CLIENTS_DIR, clientId, 'src');
  const clientDir = path.join(CLIENTS_DIR, clientId);
  const filesToRead = files || READABLE_FILES;
  const bundle: WidgetCodeBundle = {};

  for (const file of filesToRead) {
    // Client-specific file takes priority over shared template
    const clientPath = path.join(clientSrc, file);
    const sharedPath = path.join(SHARED_SRC, file);

    if (fs.existsSync(clientPath)) {
      bundle[file] = fs.readFileSync(clientPath, 'utf-8');
    } else if (fs.existsSync(sharedPath)) {
      bundle[file] = fs.readFileSync(sharedPath, 'utf-8');
    }
  }

  // Always include theme.json and widget.config.json
  const themePath = path.join(clientDir, 'theme.json');
  const configPath = path.join(clientDir, 'widget.config.json');
  if (fs.existsSync(themePath)) {
    bundle['theme.json'] = fs.readFileSync(themePath, 'utf-8');
  }
  if (fs.existsSync(configPath)) {
    bundle['widget.config.json'] = fs.readFileSync(configPath, 'utf-8');
  }

  return bundle;
}

export function validateFilePath(file: string): { valid: boolean; error?: string } {
  // Block writes to hooks/
  if (file.startsWith('hooks/') || file.includes('/hooks/')) {
    return {
      valid: false,
      error: 'Cannot modify shared hooks. Hooks are shared across all widgets and must not be changed per-client.',
    };
  }

  // Must match a writable path prefix
  const isWritable = WRITABLE_PATHS.some((prefix) => file === prefix || file.startsWith(prefix));
  if (!isWritable) {
    return {
      valid: false,
      error: `File "${file}" is not in the writable paths: ${WRITABLE_PATHS.join(', ')}`,
    };
  }

  return { valid: true };
}

export function writeWidgetFile(clientId: string, file: string, content: string): void {
  const clientSrc = path.join(CLIENTS_DIR, clientId, 'src');
  const filePath = path.join(clientSrc, file);
  const dir = path.dirname(filePath);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

export interface VersionEntry {
  v: number;
  date: string;
  description: string;
  tool: string;
}

export interface VersionManifest {
  current: number;
  versions: VersionEntry[];
}

function getVersionsDir(clientId: string): string {
  // Check both quickwidgets/ and widgets/
  const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
  const fullDir = path.join(process.cwd(), 'widgets', clientId);
  if (fs.existsSync(quickDir)) return path.join(quickDir, 'versions');
  if (fs.existsSync(fullDir)) return path.join(fullDir, 'versions');
  return path.join(quickDir, 'versions'); // default to quickwidgets
}

function getWidgetDir(clientId: string): string {
  const quickDir = path.join(process.cwd(), 'quickwidgets', clientId);
  const fullDir = path.join(process.cwd(), 'widgets', clientId);
  if (fs.existsSync(fullDir)) return fullDir;
  return quickDir;
}

export function readManifest(clientId: string): VersionManifest {
  const manifestPath = path.join(getVersionsDir(clientId), 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }
  return { current: 0, versions: [] };
}

export function saveVersion(clientId: string, description: string, tool: string): number {
  const versionsDir = getVersionsDir(clientId);
  const widgetDir = getWidgetDir(clientId);
  const scriptPath = path.join(widgetDir, 'script.js');

  if (!fs.existsSync(scriptPath)) return 0;

  fs.mkdirSync(versionsDir, { recursive: true });

  const manifest = readManifest(clientId);
  const nextVersion = manifest.current + 1;

  // Copy current script.js to versions/vN.js
  fs.copyFileSync(scriptPath, path.join(versionsDir, `v${nextVersion}.js`));

  // Update manifest
  manifest.current = nextVersion;
  manifest.versions.push({
    v: nextVersion,
    date: new Date().toISOString(),
    description,
    tool,
  });

  fs.writeFileSync(path.join(versionsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  return nextVersion;
}

export function rollbackToVersion(
  clientId: string,
  version: number | 'previous'
): { success: boolean; error?: string; version?: number } {
  const manifest = readManifest(clientId);

  // Resolve version number
  let targetVersion: number;
  if (version === 'previous') {
    targetVersion = manifest.current - 1;
  } else {
    targetVersion = version;
  }

  // Validate
  const exists = manifest.versions.find((v) => v.v === targetVersion);
  if (!exists) {
    const available = manifest.versions.map((v) => v.v).join(', ');
    return {
      success: false,
      error: `Version ${targetVersion} does not exist. Available versions: ${available || 'none'}`,
    };
  }

  const versionsDir = getVersionsDir(clientId);
  const widgetDir = getWidgetDir(clientId);
  const versionFile = path.join(versionsDir, `v${targetVersion}.js`);
  const scriptPath = path.join(widgetDir, 'script.js');

  if (!fs.existsSync(versionFile)) {
    return { success: false, error: `Version file v${targetVersion}.js not found on disk.` };
  }

  fs.copyFileSync(versionFile, scriptPath);
  manifest.current = targetVersion;
  fs.writeFileSync(path.join(versionsDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  return { success: true, version: targetVersion };
}
