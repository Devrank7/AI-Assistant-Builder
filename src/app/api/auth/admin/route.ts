import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        const adminToken = process.env.ADMIN_SECRET_TOKEN;

        if (!adminToken) {
            return NextResponse.json(
                { success: false, error: 'Admin token not configured' },
                { status: 500 }
            );
        }

        if (token === adminToken) {
            return NextResponse.json({
                success: true,
                message: 'Admin authenticated successfully'
            });
        } else {
            return NextResponse.json(
                { success: false, error: 'Invalid admin token' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Admin auth error:', error);
        return NextResponse.json(
            { success: false, error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
