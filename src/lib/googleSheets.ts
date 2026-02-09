/**
 * Google Sheets Integration
 *
 * Export chat logs and data to Google Sheets.
 *
 * Setup:
 * 1. Create Google Cloud project
 * 2. Enable Google Sheets API
 * 3. Create Service Account
 * 4. Download JSON key as service_account.json to project root
 * 5. Set GOOGLE_SERVICE_ACCOUNT_PATH in .env (optional, defaults to ./service_account.json)
 * 6. Share your spreadsheet with the service account email (found in JSON)
 */

import * as fs from 'fs';
import * as path from 'path';

interface SheetRow {
  [key: string]: string | number | boolean | Date;
}

interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
}

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

// Cache for loaded credentials
let cachedConfig: GoogleSheetsConfig | null = null;

/**
 * Get Google Sheets configuration from service_account.json or environment
 */
function getConfig(): GoogleSheetsConfig | null {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Option 1: Load from service_account.json file
  const serviceAccountPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'service_account.json');

  try {
    if (fs.existsSync(serviceAccountPath)) {
      const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
      const credentials: ServiceAccountCredentials = JSON.parse(fileContent);

      if (credentials.client_email && credentials.private_key) {
        cachedConfig = {
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
        };
        console.log(`Google Sheets: Loaded credentials for ${credentials.client_email}`);
        return cachedConfig;
      }
    }
  } catch (error) {
    console.error('Error loading service_account.json:', error);
  }

  // Option 2: Fallback to environment variables
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    cachedConfig = {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
    return cachedConfig;
  }

  return null;
}

/**
 * Get service account email (for sharing spreadsheets)
 */
export function getServiceAccountEmail(): string | null {
  const config = getConfig();
  return config?.clientEmail || null;
}

/**
 * Get access token using service account
 * @param config - Google Sheets configuration
 * @param extraScopes - Additional OAuth scopes to request
 */
async function getAccessToken(config: GoogleSheetsConfig, extraScopes?: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  if (extraScopes) {
    scopes.push(...extraScopes);
  }

  const payload = {
    iss: config.clientEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  };

  // Create JWT
  const crypto = await import('crypto');

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${base64Header}.${base64Payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(config.privateKey, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to get Google access token: ${data.error || response.statusText}`);
  }
  return data.access_token;
}

/**
 * Append rows to a Google Sheet
 */
export async function appendToSheet(
  spreadsheetId: string,
  sheetName: string,
  rows: SheetRow[]
): Promise<{ success: boolean; rowsAdded: number; error?: string }> {
  const config = getConfig();

  if (!config) {
    return {
      success: false,
      rowsAdded: 0,
      error: 'Google Sheets not configured. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY.',
    };
  }

  try {
    const accessToken = await getAccessToken(config);

    // Convert rows to values array
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const values = rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val?.toString() || '';
      })
    );

    // Add headers if first export
    const allValues = [headers, ...values];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: allValues }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return {
      success: true,
      rowsAdded: rows.length,
    };
  } catch (error) {
    return {
      success: false,
      rowsAdded: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test connection to Google Sheets
 */
export async function testConnection(spreadsheetId: string): Promise<boolean> {
  const config = getConfig();

  if (!config) {
    return false;
  }

  try {
    const accessToken = await getAccessToken(config);

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if Google Sheets is configured
 */
export function isConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Read values from a Google Sheet
 */
export async function readSheetValues(
  spreadsheetId: string,
  range: string = 'A:Z'
): Promise<{ success: boolean; values: string[][]; error?: string }> {
  const config = getConfig();

  if (!config) {
    return { success: false, values: [], error: 'Google Sheets not configured.' };
  }

  try {
    const accessToken = await getAccessToken(config);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    return { success: true, values: data.values || [] };
  } catch (error) {
    return {
      success: false,
      values: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update values in a Google Sheet
 */
export async function updateSheetValues(
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<{ success: boolean; updatedCells: number; error?: string }> {
  const config = getConfig();

  if (!config) {
    return { success: false, updatedCells: 0, error: 'Google Sheets not configured.' };
  }

  try {
    const accessToken = await getAccessToken(config);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    return { success: true, updatedCells: data.updatedCells || 0 };
  } catch (error) {
    return {
      success: false,
      updatedCells: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for spreadsheets by name using Google Drive API
 */
export async function searchSpreadsheets(
  query: string
): Promise<{ success: boolean; files: Array<{ id: string; name: string }>; error?: string }> {
  const config = getConfig();

  if (!config) {
    return { success: false, files: [], error: 'Google Sheets not configured.' };
  }

  try {
    const accessToken = await getAccessToken(config, ['https://www.googleapis.com/auth/drive.readonly']);

    const driveQuery = `name contains '${query.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet'`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQuery)}&fields=files(id,name)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const data = await response.json();
    return { success: true, files: data.files || [] };
  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
