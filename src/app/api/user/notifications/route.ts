// src/app/api/user/notifications/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();

    const notifications = await Notification.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(50);

    return successResponse(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return Errors.internal('Failed to fetch notifications');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { action, notificationId } = await request.json();

    await connectDB();

    if (action === 'mark_all_read') {
      await Notification.updateMany({ userId: auth.userId, isRead: false }, { isRead: true });
    } else if (action === 'mark_read' && notificationId) {
      await Notification.updateOne({ _id: notificationId, userId: auth.userId }, { isRead: true });
    }

    return successResponse(undefined, 'Notifications updated');
  } catch (error) {
    console.error('Update notifications error:', error);
    return Errors.internal('Failed to update notifications');
  }
}
