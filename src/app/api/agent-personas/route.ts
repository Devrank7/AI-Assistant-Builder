import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import AgentPersona from '@/models/AgentPersona';
import Client from '@/models/Client';

/**
 * GET /api/agent-personas — List personas by clientId
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) return Errors.badRequest('clientId is required');

  // Verify user owns this client
  const client = await Client.findOne({ clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  const personas = await AgentPersona.find({ clientId }).sort({ isDefault: -1, createdAt: -1 }).lean();

  return successResponse(personas);
}

/**
 * POST /api/agent-personas — Create a new persona
 */
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const body = await request.json();

  if (!body.clientId) return Errors.badRequest('clientId is required');
  if (!body.name) return Errors.badRequest('name is required');

  // Verify user owns this client
  const client = await Client.findOne({ clientId: body.clientId, userId: auth.userId }).select('_id');
  if (!client) return Errors.notFound('Client not found');

  // If setting as default, unset other defaults first
  if (body.isDefault) {
    await AgentPersona.updateMany({ clientId: body.clientId }, { isDefault: false });
  }

  const persona = await AgentPersona.create({
    clientId: body.clientId,
    name: body.name,
    avatar: body.avatar || undefined,
    role: body.role || 'general',
    tone: body.tone || 'friendly',
    language: body.language || undefined,
    systemPromptOverlay: body.systemPromptOverlay || '',
    triggerKeywords: body.triggerKeywords || [],
    triggerIntents: body.triggerIntents || [],
    isDefault: body.isDefault || false,
    isActive: body.isActive !== false,
    nicheTemplate: body.nicheTemplate || undefined,
    modelPreference: body.modelPreference || 'auto',
    memoryEnabled: body.memoryEnabled || false,
    maxMemoryFacts: body.maxMemoryFacts || 20,
  });

  return successResponse(persona, 'Persona created', 201);
}
