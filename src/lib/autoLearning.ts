/**
 * Auto-Learning from Failures
 *
 * Detects bad AI responses from negative feedback, then:
 * 1. Flags the response for review
 * 2. Auto-generates a corrected answer
 * 3. Creates a Correction that gets injected into future prompts
 *
 * This creates a self-improving loop where the AI gets better over time.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import ChatLog from '@/models/ChatLog';
import Correction from '@/models/Correction';
import KnowledgeChunk from '@/models/KnowledgeChunk';

interface FailedInteraction {
  sessionId: string;
  userQuestion: string;
  badAnswer: string;
  feedbackComment?: string;
}

/**
 * Process negative feedback and auto-generate corrections.
 */
export async function processNegativeFeedback(
  clientId: string,
  sessionId: string,
  messageIndex: number,
  comment?: string
): Promise<{ correctionCreated: boolean; correction?: string }> {
  await connectDB();

  // Get the chat log to find the specific messages
  const chatLog = await ChatLog.findOne({ clientId, sessionId });
  if (!chatLog || !chatLog.messages || chatLog.messages.length < messageIndex + 1) {
    return { correctionCreated: false };
  }

  // Find the user question and bad AI answer
  const badAnswer = chatLog.messages[messageIndex];
  if (!badAnswer || badAnswer.role !== 'assistant') {
    return { correctionCreated: false };
  }

  // Find the preceding user message
  const userMsg = messageIndex > 0 ? chatLog.messages[messageIndex - 1] : null;
  if (!userMsg || userMsg.role !== 'user') {
    return { correctionCreated: false };
  }

  // Check if a correction already exists for this question
  const existing = await Correction.findOne({
    clientId,
    userQuestion: userMsg.content,
    status: { $in: ['pending', 'applied'] },
  });
  if (existing) return { correctionCreated: false };

  // Get relevant knowledge to generate a better answer
  const knowledgeChunks = await KnowledgeChunk.find({ clientId }).select('text').limit(20).lean();
  const knowledgeContext = knowledgeChunks.map((c) => c.text).join('\n\n');

  // Generate a corrected answer
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const prompt = `A customer asked a question and the AI gave a bad answer that received negative feedback.

Customer question: "${userMsg.content}"
Bad AI answer: "${badAnswer.content}"
${comment ? `Feedback from reviewer: "${comment}"` : ''}

Available knowledge base:
${knowledgeContext.substring(0, 3000)}

Generate a BETTER answer that:
1. Directly addresses the customer's question
2. Uses information from the knowledge base when relevant
3. Is concise and helpful
4. Avoids the issues with the original answer

Write ONLY the corrected answer (no explanation, no prefix):`;

    const result = await model.generateContent(prompt);
    const correctedAnswer = result.response.text().trim();

    // Create correction record
    await Correction.create({
      clientId,
      sessionId,
      messageIndex,
      userQuestion: userMsg.content,
      originalAnswer: badAnswer.content,
      correctedAnswer,
      status: 'pending',
      source: 'auto_learning',
      metadata: {
        feedbackComment: comment,
      },
    });

    return { correctionCreated: true, correction: correctedAnswer };
  } catch (err) {
    console.error('[AutoLearning] Correction generation error:', err);
    return { correctionCreated: false };
  }
}

/**
 * Get learning stats for a client.
 */
export async function getLearningStats(clientId: string): Promise<{
  totalNegativeFeedback: number;
  correctionsGenerated: number;
  correctionsApplied: number;
  improvementRate: number;
}> {
  await connectDB();

  const [negativeFeedback, corrections, applied] = await Promise.all([
    Feedback.countDocuments({ clientId, rating: 'down' }),
    Correction.countDocuments({ clientId, source: 'auto_learning' }),
    Correction.countDocuments({ clientId, source: 'auto_learning', status: 'applied' }),
  ]);

  return {
    totalNegativeFeedback: negativeFeedback,
    correctionsGenerated: corrections,
    correctionsApplied: applied,
    improvementRate: negativeFeedback > 0 ? (applied / negativeFeedback) * 100 : 0,
  };
}

/**
 * Auto-apply pending corrections that have high confidence.
 * Called periodically or after batch review.
 */
export async function autoApplyCorrections(clientId: string): Promise<number> {
  await connectDB();

  // Find pending auto-learning corrections
  const pending = await Correction.find({
    clientId,
    status: 'pending',
    source: 'auto_learning',
  });

  let applied = 0;

  for (const correction of pending) {
    // Auto-apply if correction looks reasonable (has content, not too long)
    if (
      correction.correctedAnswer &&
      correction.correctedAnswer.length > 10 &&
      correction.correctedAnswer.length < 2000
    ) {
      correction.status = 'applied';
      await correction.save();
      applied++;
    }
  }

  return applied;
}
