import { NextRequest, NextResponse } from 'next/server';
import { updateSheetValues } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { spreadsheetId, range, values } = body;

    if (!spreadsheetId || !range || !values) {
      return NextResponse.json(
        { success: false, error: 'spreadsheetId, range, and values are required' },
        { status: 400 }
      );
    }

    const result = await updateSheetValues(spreadsheetId, range, values);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedCells: result.updatedCells });
  } catch (error) {
    console.error('Error updating sheet:', error);
    return NextResponse.json({ success: false, error: 'Failed to update sheet' }, { status: 500 });
  }
}
