import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';

// GET - Get AI settings for a client
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        await connectDB();
        const { clientId } = await params;

        let settings = await AISettings.findOne({ clientId });

        // Create default settings if none exist
        if (!settings) {
            settings = await AISettings.create({
                clientId,
                systemPrompt: defaultSystemPrompt,
                greeting: 'Привет! Чем могу помочь?',
                temperature: 0.7,
                maxTokens: 1024,
                topK: 3,
            });
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error fetching AI settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch AI settings' },
            { status: 500 }
        );
    }
}

// PUT - Update AI settings
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ clientId: string }> }
) {
    try {
        await connectDB();
        const { clientId } = await params;
        const body = await request.json();

        // Only allow specific fields to be updated
        const allowedFields = ['systemPrompt', 'greeting', 'temperature', 'maxTokens', 'topK'];
        const updateData: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const settings = await AISettings.findOneAndUpdate(
            { clientId },
            { $set: updateData },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating AI settings:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update AI settings' },
            { status: 500 }
        );
    }
}
