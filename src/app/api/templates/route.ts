import { NextRequest, NextResponse } from 'next/server';
import { promptTemplates, getTemplateById } from '@/lib/promptTemplates';

// GET - List all templates
export async function GET() {
    return NextResponse.json({
        success: true,
        templates: promptTemplates.map(t => ({
            id: t.id,
            name: t.name,
            icon: t.icon,
            description: t.description,
            suggestedTemperature: t.suggestedTemperature,
        })),
    });
}

// POST - Get full template by ID
export async function POST(request: NextRequest) {
    try {
        const { templateId } = await request.json();

        if (!templateId) {
            return NextResponse.json(
                { success: false, error: 'templateId is required' },
                { status: 400 }
            );
        }

        const template = getTemplateById(templateId);

        if (!template) {
            return NextResponse.json(
                { success: false, error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            template,
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch template' },
            { status: 500 }
        );
    }
}
