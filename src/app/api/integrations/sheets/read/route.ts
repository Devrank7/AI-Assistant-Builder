import { NextRequest, NextResponse } from 'next/server';
import { readSheetValues } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    const range = searchParams.get('range') || 'A:Z';

    if (!spreadsheetId) {
      return NextResponse.json({ success: false, error: 'spreadsheetId is required' }, { status: 400 });
    }

    const result = await readSheetValues(spreadsheetId, range);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    const values = result.values;
    if (values.length === 0) {
      return NextResponse.json({ success: true, headers: [], rows: [] });
    }

    const headers = values[0];
    const rows = values.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    return NextResponse.json({ success: true, headers, rows });
  } catch (error) {
    console.error('Error reading sheet:', error);
    return NextResponse.json({ success: false, error: 'Failed to read sheet' }, { status: 500 });
  }
}
