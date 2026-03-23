import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import Conversation from '@/models/Conversation';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings from '@/models/AISettings';
import { generateEmbedding, findSimilarChunks } from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate an AI suggested reply for a conversation.
 * Uses RAG (same knowledge base as the bot) + last 10 messages.
 */
export async function generateInboxSuggestedReply(conversationId: string): Promise<string | null> {
  await connectDB();

  const conversation = await Conversation.findOne({ conversationId });
  if (!conversation) return null;

  // 1. Fetch last 10 messages from chatlog
  const chatlog = await ChatLog.findOne({
    clientId: conversation.clientId,
    sessionId: conversation.sessionId,
  });
  if (!chatlog || !chatlog.messages || chatlog.messages.length === 0) return null;

  const lastMessages = chatlog.messages.slice(-10);
  const conversationText = lastMessages
    .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
    .join('\n');

  // 2. Fetch relevant knowledge chunks (RAG)
  const lastUserMessage = [...lastMessages].reverse().find((m: { role: string }) => m.role === 'user');
  let ragContext = '';

  if (lastUserMessage) {
    const chunks = await KnowledgeChunk.find({ clientId: conversation.clientId });
    if (chunks.length > 0) {
      const queryEmbedding = await generateEmbedding(lastUserMessage.content);
      const relevant = await findSimilarChunks(queryEmbedding, chunks, 5, 0.3);
      ragContext = relevant.map((c: { text: string; similarity: number }) => c.text).join('\n\n');
    }
  }

  // 3. Get AI settings for system prompt context
  const aiSettings = await AISettings.findOne({ clientId: conversation.clientId });
  const businessContext = aiSettings?.systemPrompt?.substring(0, 500) || '';

  // 4. Generate suggestion via Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an operator assistant helping a human customer support agent. Based on the conversation history, knowledge base, and business context below, suggest a helpful reply.

Requirements:
- Write as a human operator, not as a bot
- Be concise (1-3 sentences)
- Be warm and professional
- Use relevant knowledge base information if applicable
- If the customer asked a specific question, answer it directly

Business context: ${businessContext}

Knowledge base:
${ragContext || '(no relevant knowledge found)'}

Conversation:
${conversationText}

Suggested operator reply:`;

  try {
    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    // Store in conversation
    await Conversation.findOneAndUpdate({ conversationId }, { $set: { aiSuggestedReply: suggestion } });

    return suggestion;
  } catch (err) {
    console.error('Failed to generate suggested reply:', err);
    return null;
  }
}
