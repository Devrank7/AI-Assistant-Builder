/**
 * Google Sheets Integration
 * 
 * Export chat logs and data to Google Sheets.
 * 
 * Setup:
 * 1. Create Google Cloud project
 * 2. Enable Google Sheets API
 * 3. Create Service Account
 * 4. Download JSON key
 * 5. Set GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY in .env
 * 6. Share your spreadsheet with the service account email
 */

interface SheetRow {
    [key: string]: string | number | boolean | Date;
}

interface GoogleSheetsConfig {
    clientEmail: string;
    privateKey: string;
}

/**
 * Get Google Sheets configuration from environment
 */
function getConfig(): GoogleSheetsConfig | null {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        return null;
    }

    return {
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
    };
}

/**
 * Get access token using service account
 */
async function getAccessToken(config: GoogleSheetsConfig): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = {
        alg: 'RS256',
        typ: 'JWT',
    };

    const payload = {
        iss: config.clientEmail,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
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
        const values = rows.map(row => headers.map(h => {
            const val = row[h];
            if (val instanceof Date) {
                return val.toISOString();
            }
            return val?.toString() || '';
        }));

        // Add headers if first export
        const allValues = [headers, ...values];

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=USER_ENTERED`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
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

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            }
        );

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
