/**
 * Google Sheets Export API
 * 
 * POST /api/integrations/sheets/export - Export chat logs to Google Sheets
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import { appendToSheet, isConfigured } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clientId, spreadsheetId, sheetName = 'Chat Logs' } = body;

        if (!clientId || !spreadsheetId) {
            return NextResponse.json(
                { success: false, error: 'clientId and spreadsheetId are required' },
                { status: 400 }
            );
        }

        if (!isConfigured()) {
            return NextResponse.json(
                { success: false, error: 'Google Sheets not configured' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get chat logs
        const logs = await ChatLog.find({ clientId })
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        // Transform to sheet rows
        const rows = logs.flatMap(log =>
            log.messages.map((msg: { role: string; content: string; timestamp: Date }) => ({
                'Session ID': log.sessionId,
                'Date': new Date(log.createdAt).toLocaleDateString(),
                'Time': new Date(msg.timestamp || log.createdAt).toLocaleTimeString(),
                'Role': msg.role,
                'Message': msg.content,
                'Page': log.metadata?.page || '',
            }))
        );

        const result = await appendToSheet(spreadsheetId, sheetName, rows);

        return NextResponse.json({
            success: result.success,
            rowsExported: result.rowsAdded,
            error: result.error,
        });
    } catch (error) {
        console.error('Sheets export error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * GET - Check if Sheets is configured
 */
export async function GET() {
    return NextResponse.json({
        success: true,
        configured: isConfigured(),
    });
}
