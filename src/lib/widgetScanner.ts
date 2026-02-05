import fs from 'fs';
import path from 'path';
import { ClientInfo, WidgetFolder } from './types';

const WIDGETS_DIR = path.join(process.cwd(), 'widgets');

export function getWidgetsDirectory(): string {
  return WIDGETS_DIR;
}

export function ensureWidgetsDirectory(): void {
  if (!fs.existsSync(WIDGETS_DIR)) {
    fs.mkdirSync(WIDGETS_DIR, { recursive: true });
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
