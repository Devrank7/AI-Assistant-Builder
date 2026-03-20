import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import AgentPersona from '@/models/AgentPersona';
import Client from '@/models/Client';

/**
 * GET /api/agent-personas/[id] — Get a single persona
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { id } = await params;

  const persona = await AgentPersona.findById(id).lean();
  if (!persona) return Errors.notFound('Persona not found');

  // Verify user owns the client
  const client = await Client.findOne({ clientId: persona.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Persona not found');

  return successResponse(persona);
}

/**
 * PATCH /api/agent-personas/[id] — Update a persona
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { id } = await params;
  const body = await request.json();

  const persona = await AgentPersona.findById(id);
  if (!persona) return Errors.notFound('Persona not found');

  // Verify user owns the client
  const client = await Client.findOne({ clientId: persona.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Persona not found');

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await AgentPersona.updateMany({ clientId: persona.clientId, _id: { $ne: id } }, { isDefault: false });
  }

  const allowedFields = [
    'name',
    'avatar',
    'role',
    'tone',
    'language',
    'systemPromptOverlay',
    'triggerKeywords',
    'triggerIntents',
    'isDefault',
    'isActive',
    'nicheTemplate',
    'modelPreference',
    'memoryEnabled',
    'maxMemoryFacts',
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (persona as Record<string, unknown>)[field] = body[field];
    }
  }

  await persona.save();

  return successResponse(persona, 'Persona updated');
}

/**
 * DELETE /api/agent-personas/[id] — Delete a persona
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { id } = await params;

  const persona = await AgentPersona.findById(id);
  if (!persona) return Errors.notFound('Persona not found');

  // Verify user owns the client
  const client = await Client.findOne({ clientId: persona.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Persona not found');

  await AgentPersona.findByIdAndDelete(id);

  return successResponse(null, 'Persona deleted');
}
