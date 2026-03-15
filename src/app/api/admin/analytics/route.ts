import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAdmin } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import ChatLog from '@/models/ChatLog';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();

  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30');
  const since = new Date();
  since.setDate(since.getDate() - days);

  const messagesPerDay = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $unwind: '$messages' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const messagesByChannel = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $ifNull: ['$metadata.channel', 'website'] },
        count: { $sum: { $size: '$messages' } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const topClients = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$clientId', messageCount: { $sum: { $size: '$messages' } } } },
    { $sort: { messageCount: -1 } },
    { $limit: 10 },
  ]);

  const userGrowth = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const chatQuality = await ChatLog.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        avgMessages: { $avg: { $size: '$messages' } },
        totalSessions: { $sum: 1 },
      },
    },
  ]);

  return successResponse({
    messagesPerDay: messagesPerDay.map((d) => ({ date: d._id, count: d.count })),
    messagesByChannel: messagesByChannel.map((d) => ({ channel: d._id, count: d.count })),
    topClients: topClients.map((d) => ({ clientId: d._id, messageCount: d.messageCount })),
    userGrowth: userGrowth.map((d) => ({ date: d._id, count: d.count })),
    chatQuality: {
      avgConversationLength: Math.round(chatQuality[0]?.avgMessages ?? 0),
      totalSessions: chatQuality[0]?.totalSessions ?? 0,
    },
  });
}
