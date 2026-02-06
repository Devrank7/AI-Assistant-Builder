import { NextResponse } from 'next/server';
import { GEMINI_MODELS } from '@/lib/models';

export async function GET() {
  return NextResponse.json({
    success: true,
    models: GEMINI_MODELS.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      tier: m.tier,
      pricing: m.pricing,
      maxOutputTokens: m.maxOutputTokens,
      description: m.description,
      isDefault: m.isDefault,
    })),
  });
}
