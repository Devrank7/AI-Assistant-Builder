/**
 * Agent Personas API
 *
 * GET /api/personas?clientId=xxx - List personas
 * POST /api/personas - Create persona
 * PATCH /api/personas - Update persona
 * DELETE /api/personas?id=xxx - Delete persona
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import AgentPersona from '@/models/AgentPersona';
import { verifyAdminOrClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const clientId = new URL(request.url).searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const personas = await AgentPersona.find({ clientId }).sort({ isDefault: -1, createdAt: 1 }).lean();
    return NextResponse.json({ success: true, personas });
  } catch (error) {
    console.error('Personas GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { clientId, name, role, tone, language, systemPromptOverlay, triggerKeywords, triggerIntents, isDefault } =
      body;

    if (!clientId || !name) {
      return NextResponse.json({ success: false, error: 'clientId and name are required' }, { status: 400 });
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await AgentPersona.updateMany({ clientId }, { $set: { isDefault: false } });
    }

    const persona = await AgentPersona.create({
      clientId,
      name,
      role,
      tone,
      language,
      systemPromptOverlay,
      triggerKeywords,
      triggerIntents,
      isDefault,
    });

    return NextResponse.json({ success: true, persona });
  } catch (error) {
    console.error('Personas POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Persona id is required' }, { status: 400 });
    }

    if (updates.isDefault) {
      const existing = await AgentPersona.findById(id);
      if (existing) {
        await AgentPersona.updateMany({ clientId: existing.clientId }, { $set: { isDefault: false } });
      }
    }

    // Enforce ownership: non-admin clients may only update their own personas
    const ownershipFilter: Record<string, unknown> = { _id: id };
    if (auth.role === 'client') {
      ownershipFilter.clientId = auth.clientId;
    }

    const persona = await AgentPersona.findOneAndUpdate(ownershipFilter, { $set: updates }, { new: true }).lean();
    if (!persona) {
      return NextResponse.json({ success: false, error: 'Persona not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ success: true, persona });
  } catch (error) {
    console.error('Personas PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const id = new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Persona id is required' }, { status: 400 });
    }

    // Enforce ownership: non-admin clients may only delete their own personas
    const ownershipFilter: Record<string, unknown> = { _id: id };
    if (auth.role === 'client') {
      ownershipFilter.clientId = auth.clientId;
    }

    const deleted = await AgentPersona.findOneAndDelete(ownershipFilter);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Persona not found or access denied' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Personas DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
