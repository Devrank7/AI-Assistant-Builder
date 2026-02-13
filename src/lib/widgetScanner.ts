import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { ClientInfo, WidgetFolder } from './types';

const WIDGETS_DIR = path.join(process.cwd(), 'widgets');
const QUICK_WIDGETS_DIR = path.join(process.cwd(), 'quickwidgets');

export type DetectedChannel = 'instagram' | 'whatsapp' | 'telegram-bot';

const CHANNEL_DIRS: DetectedChannel[] = ['instagram', 'whatsapp', 'telegram-bot'];

export interface ChannelFolderInfo {
  channel: DetectedChannel;
  hasConfig: boolean;
  hasScript: boolean;
  config?: Record<string, unknown>;
  scriptMeta?: { version: string; description: string; provider?: string };
}

export function getWidgetsDirectory(): string {
  return WIDGETS_DIR;
}

export function ensureWidgetsDirectory(): void {
  try {
    if (!fs.existsSync(WIDGETS_DIR)) {
      fs.mkdirSync(WIDGETS_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create widgets directory:', error);
  }
}

export function scanWidgetFolders(): WidgetFolder[] {
  ensureWidgetsDirectory();

  const folders: WidgetFolder[] = [];

  try {
    const entries = fs.readdirSync(WIDGETS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(WIDGETS_DIR, entry.name);
        const scriptPath = path.join(folderPath, 'script.js');
        const infoPath = path.join(folderPath, 'info.json');

        // Формат папки: clientId_username
        const parts = entry.name.split('_');
        const clientId = parts[0];
        const username = parts.slice(1).join('_');

        folders.push({
          clientId: entry.name,
          username: username || clientId,
          folderPath: entry.name,
          hasScript: fs.existsSync(scriptPath),
          hasInfo: fs.existsSync(infoPath),
        });
      }
    }
  } catch (error) {
    console.error('Error scanning widgets directory:', error);
  }

  return folders;
}

export function readClientInfo(folderName: string): ClientInfo | null {
  const infoPath = path.join(WIDGETS_DIR, folderName, 'info.json');

  try {
    if (fs.existsSync(infoPath)) {
      const content = fs.readFileSync(infoPath, 'utf-8');
      return JSON.parse(content) as ClientInfo;
    }
  } catch (error) {
    console.error(`Error reading info.json for ${folderName}:`, error);
  }

  return null;
}

export function getWidgetScript(folderName: string, fileName: string = 'script.js'): string | null {
  const filePath = path.join(WIDGETS_DIR, folderName, fileName);

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.error(`Error reading script for ${folderName}:`, error);
  }

  return null;
}

export function getWidgetFile(folderName: string, relativePath: string): Buffer | null {
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(WIDGETS_DIR, folderName, safePath);

  // Проверяем, что путь не выходит за пределы папки виджета
  const resolvedPath = path.resolve(filePath);
  const widgetDir = path.resolve(path.join(WIDGETS_DIR, folderName));

  if (!resolvedPath.startsWith(widgetDir)) {
    console.error('Attempted path traversal attack');
    return null;
  }

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (error) {
    console.error(`Error reading file ${relativePath} for ${folderName}:`, error);
  }

  return null;
}

/**
 * Scan for channel subdirectories (instagram, whatsapp, telegram-bot)
 * inside a client's widget folder.
 */
export function scanChannelFolders(clientFolderName: string): ChannelFolderInfo[] {
  const clientDir = path.join(WIDGETS_DIR, clientFolderName);
  const results: ChannelFolderInfo[] = [];

  for (const channel of CHANNEL_DIRS) {
    const channelDir = path.join(clientDir, channel);
    if (!fs.existsSync(channelDir) || !fs.statSync(channelDir).isDirectory()) continue;

    const configPath = path.join(channelDir, 'channel.config.json');
    const scriptPath = path.join(channelDir, 'script.js');
    let hasConfig = false;
    let hasScript = false;
    let config: Record<string, unknown> | undefined;
    let scriptMeta: { version: string; description: string; provider?: string } | undefined;

    try {
      if (fs.existsSync(configPath)) {
        hasConfig = true;
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (err) {
      console.error(`Error reading channel config for ${clientFolderName}/${channel}:`, err);
    }

    // Check for executable script
    try {
      if (fs.existsSync(scriptPath)) {
        hasScript = true;
        // Extract meta using vm.runInNewContext to avoid webpack bundling issues
        try {
          const code = fs.readFileSync(scriptPath, 'utf-8');
          const moduleExports: Record<string, unknown> = {};
          const moduleObj = { exports: moduleExports };
          const sandbox = {
            module: moduleObj,
            exports: moduleExports,
            require: () => ({}),
            console,
            process: { env: {} },
            fetch: () => Promise.resolve(),
            setTimeout,
            clearTimeout,
            Buffer,
            URL,
            URLSearchParams,
            JSON,
            Date,
            Math,
            RegExp,
            Promise,
            Error,
          };
          vm.runInNewContext(code, sandbox, { filename: scriptPath, timeout: 3000 });
          const script = moduleObj.exports as Record<string, unknown>;
          const meta = script?.meta as Record<string, unknown> | undefined;
          if (meta) {
            scriptMeta = {
              version: (meta.version as string) || '1.0.0',
              description: (meta.description as string) || '',
              provider: meta.provider as string | undefined,
            };
          }
        } catch (err) {
          console.error(`Error loading script meta for ${clientFolderName}/${channel}:`, err);
        }
      }
    } catch (err) {
      console.error(`Error checking script at ${clientFolderName}/${channel}:`, err);
    }

    // Include channel if it has either a config or a script
    if (hasConfig || hasScript) {
      results.push({ channel, hasConfig, hasScript, config, scriptMeta });
    }
  }

  return results;
}

export function listWidgetFiles(folderName: string): string[] {
  const folderPath = path.join(WIDGETS_DIR, folderName);
  const files: string[] = [];

  function scanDir(dirPath: string, prefix: string = '') {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          scanDir(path.join(dirPath, entry.name), relativePath);
        } else {
          files.push(relativePath);
        }
      }
    } catch (error) {
      console.error(`Error listing files in ${dirPath}:`, error);
    }
  }

  scanDir(folderPath);
  return files;
}

// --- Quick Widgets ---

export function getQuickWidgetsDirectory(): string {
  return QUICK_WIDGETS_DIR;
}

export function ensureQuickWidgetsDirectory(): void {
  try {
    if (!fs.existsSync(QUICK_WIDGETS_DIR)) {
      fs.mkdirSync(QUICK_WIDGETS_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create quickwidgets directory:', error);
  }
}

export function scanQuickWidgetFolders(): WidgetFolder[] {
  ensureQuickWidgetsDirectory();

  const folders: WidgetFolder[] = [];

  try {
    const entries = fs.readdirSync(QUICK_WIDGETS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderPath = path.join(QUICK_WIDGETS_DIR, entry.name);
        const scriptPath = path.join(folderPath, 'script.js');
        const infoPath = path.join(folderPath, 'info.json');

        const parts = entry.name.split('_');
        const clientId = parts[0];
        const username = parts.slice(1).join('_');

        folders.push({
          clientId: entry.name,
          username: username || clientId,
          folderPath: entry.name,
          hasScript: fs.existsSync(scriptPath),
          hasInfo: fs.existsSync(infoPath),
        });
      }
    }
  } catch (error) {
    console.error('Error scanning quickwidgets directory:', error);
  }

  return folders;
}

export function readQuickWidgetInfo(folderName: string): ClientInfo | null {
  const infoPath = path.join(QUICK_WIDGETS_DIR, folderName, 'info.json');

  try {
    if (fs.existsSync(infoPath)) {
      const content = fs.readFileSync(infoPath, 'utf-8');
      return JSON.parse(content) as ClientInfo;
    }
  } catch (error) {
    console.error(`Error reading info.json for quick widget ${folderName}:`, error);
  }

  return null;
}

export function getQuickWidgetFile(folderName: string, relativePath: string): Buffer | null {
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(QUICK_WIDGETS_DIR, folderName, safePath);

  const resolvedPath = path.resolve(filePath);
  const widgetDir = path.resolve(path.join(QUICK_WIDGETS_DIR, folderName));

  if (!resolvedPath.startsWith(widgetDir)) {
    console.error('Attempted path traversal attack');
    return null;
  }

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (error) {
    console.error(`Error reading file ${relativePath} for quick widget ${folderName}:`, error);
  }

  return null;
}

export function deleteQuickWidgetFolder(folderName: string): boolean {
  const folderPath = path.join(QUICK_WIDGETS_DIR, folderName);
  const resolvedPath = path.resolve(folderPath);

  if (!resolvedPath.startsWith(path.resolve(QUICK_WIDGETS_DIR))) {
    console.error('Attempted path traversal attack on delete');
    return false;
  }

  try {
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
      return true;
    }
  } catch (error) {
    console.error(`Error deleting quick widget folder ${folderName}:`, error);
  }

  return false;
}
