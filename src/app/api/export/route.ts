import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { getAnalytics } from '@/lib/analytics';

type ExportType = 'chats' | 'knowledge' | 'analytics';
type ExportFormat = 'csv' | 'json';

/**
 * GET /api/export?clientId=xxx&type=chats|knowledge|analytics&format=csv|json
 * Export data in CSV or JSON format
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const type = searchParams.get('type') as ExportType;
    const format = (searchParams.get('format') || 'csv') as ExportFormat;
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!clientId || !type) {
      return NextResponse.json({ success: false, error: 'clientId and type are required' }, { status: 400 });
    }

    if (!['chats', 'knowledge', 'analytics'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be: chats, knowledge, or analytics' },
        { status: 400 }
      );
    }

    let data: unknown;
    let filename: string;

    switch (type) {
      case 'chats': {
        const logs = await ChatLog.find({ clientId }).sort({ createdAt: -1 }).limit(1000).lean();

        if (format === 'csv') {
          const rows = [['Session ID', 'Date', 'Role', 'Message'].join(',')];
          for (const log of logs) {
            for (const msg of log.messages || []) {
              rows.push(
                [
                  log.sessionId,
                  new Date(msg.timestamp || log.createdAt).toISOString(),
                  msg.role,
                  `"${String(msg.content).replace(/"/g, '""')}"`,
                ].join(',')
              );
            }
          }
          data = rows.join('\n');
        } else {
          data = logs;
        }
        filename = `chats-${clientId}-${new Date().toISOString().split('T')[0]}`;
        break;
      }

      case 'knowledge': {
        const chunks = await KnowledgeChunk.find({ clientId })
          .select('text source createdAt')
          .sort({ createdAt: -1 })
          .lean();

        if (format === 'csv') {
          const rows = [['Source', 'Date', 'Text'].join(',')];
          for (const chunk of chunks) {
            rows.push(
              [
                chunk.source || 'manual',
                new Date(chunk.createdAt).toISOString(),
                `"${chunk.text.replace(/"/g, '""')}"`,
              ].join(',')
            );
          }
          data = rows.join('\n');
        } else {
          data = chunks;
        }
        filename = `knowledge-${clientId}-${new Date().toISOString().split('T')[0]}`;
        break;
      }

      case 'analytics': {
        const analytics = await getAnalytics(clientId, days);

        if (format === 'csv') {
          const rows = [['Date', 'Chats', 'Messages', 'Avg Messages/Chat'].join(',')];
          for (const day of analytics.dailyStats) {
            rows.push([day.date, day.totalChats, day.totalMessages, day.avgMessagesPerChat.toFixed(1)].join(','));
          }
          data = rows.join('\n');
        } else {
          data = analytics;
        }
        filename = `analytics-${clientId}-${days}d-${new Date().toISOString().split('T')[0]}`;
        break;
      }
    }

    if (format === 'csv') {
      return new NextResponse(data as string, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      type,
      exportedAt: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ success: false, error: 'Failed to export data' }, { status: 500 });
  }
}
