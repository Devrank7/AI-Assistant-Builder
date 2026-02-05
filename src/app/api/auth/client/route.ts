import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const client = await Client.findOne({ clientToken: token });

        if (client) {
            return NextResponse.json({
                success: true,
                clientId: client.clientId,
                message: 'Client authenticated successfully'
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid client token' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Client auth error:', error);
        return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
