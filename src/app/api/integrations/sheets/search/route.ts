import { NextRequest, NextResponse } from 'next/server';
import { searchSpreadsheets } from '@/lib/googleSheets';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ success: false, error: 'name query parameter is required' }, { status: 400 });
    }

    const result = await searchSpreadsheets(name);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, spreadsheets: result.files });
  } catch (error) {
    console.error('Error searching spreadsheets:', error);
    return NextResponse.json({ success: false, error: 'Failed to search spreadsheets' }, { status: 500 });
  }
}
