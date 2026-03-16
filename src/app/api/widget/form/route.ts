import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, data } = body;

    if (!clientId) return Errors.badRequest('clientId is required');
    if (!data || typeof data !== 'object') return Errors.badRequest('form data is required');

    await connectDB();

    // Verify client exists
    const client = await Client.findOne({ clientId }).select('clientId username organizationId');
    if (!client) return Errors.notFound('Widget not found');

    // Store form submission
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    if (!db) return Errors.internal('Database connection error');

    await db.collection('formsubmissions').insertOne({
      clientId,
      organizationId: client.organizationId || null,
      data,
      submittedAt: new Date(),
      source: 'widget',
    });

    return successResponse({ received: true }, 'Form submitted successfully');
  } catch (error) {
    console.error('Form submission error:', error);
    return Errors.internal('Failed to submit form');
  }
}
