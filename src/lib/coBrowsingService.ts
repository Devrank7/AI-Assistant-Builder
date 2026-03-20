import { randomUUID } from 'crypto';
import connectDB from './mongodb';
import CoBrowsingSession from '@/models/CoBrowsingSession';

export async function createSession(clientId: string, visitorId: string, agentUserId: string) {
  await connectDB();
  const session = await CoBrowsingSession.create({
    sessionId: randomUUID(),
    clientId,
    visitorId,
    agentUserId,
    status: 'active',
    startedAt: new Date(),
  });
  return session;
}

export async function addHighlight(sessionId: string, selector: string, label: string, color: string) {
  await connectDB();
  const highlight = { selector, label, color, timestamp: new Date() };
  const session = await CoBrowsingSession.findOneAndUpdate(
    { sessionId, status: { $ne: 'ended' } },
    { $push: { highlights: highlight } },
    { new: true }
  );
  return session ? highlight : null;
}

export async function updateScroll(sessionId: string, x: number, y: number) {
  await connectDB();
  await CoBrowsingSession.findOneAndUpdate(
    { sessionId, status: { $ne: 'ended' } },
    { $set: { scrollPosition: { x, y } } }
  );
}

export async function endSession(sessionId: string) {
  await connectDB();
  return CoBrowsingSession.findOneAndUpdate(
    { sessionId },
    { $set: { status: 'ended', endedAt: new Date() } },
    { new: true }
  );
}

export async function getActiveSession(clientId: string, visitorId: string) {
  await connectDB();
  return CoBrowsingSession.findOne({ clientId, visitorId, status: { $in: ['waiting', 'active'] } });
}

export async function getActiveSessions(agentUserId: string) {
  await connectDB();
  return CoBrowsingSession.find({ agentUserId, status: { $in: ['waiting', 'active'] } }).sort({ startedAt: -1 });
}

export async function getSessionById(sessionId: string) {
  await connectDB();
  return CoBrowsingSession.findOne({ sessionId });
}
