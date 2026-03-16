import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { successResponse, Errors } from '@/lib/apiResponse';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

/**
 * Parses knowledge chunks into FAQ items.
 * Looks for Q:/A: patterns, or treats first sentence as question.
 */
function parseChunksToFaq(chunks: { _id: string; text: string; source?: string }[]): FaqItem[] {
  return chunks
    .map((chunk) => {
      const text = chunk.text.trim();
      let question = '';
      let answer = '';

      // Try Q: / A: pattern
      const qaMatch = text.match(/^Q:\s*(.+?)\n+A:\s*([\s\S]+)/i);
      if (qaMatch) {
        question = qaMatch[1].trim();
        answer = qaMatch[2].trim();
      } else {
        // Use first sentence as question, rest as answer
        const firstPeriod = text.indexOf('.');
        if (firstPeriod > 0 && firstPeriod < 200) {
          question = text.slice(0, firstPeriod + 1);
          answer = text.slice(firstPeriod + 1).trim();
        } else {
          question = text.slice(0, 100) + (text.length > 100 ? '...' : '');
          answer = text;
        }
      }

      return {
        id: chunk._id.toString(),
        question,
        answer,
        category: chunk.source || 'General',
      };
    })
    .filter((item) => item.question && item.answer);
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get('clientId');
  if (!clientId) return Errors.badRequest('clientId is required');

  await connectDB();

  const chunks = await KnowledgeChunk.find({ clientId }).select('text source').sort({ createdAt: 1 }).limit(100);

  const faqItems = parseChunksToFaq(chunks);

  return successResponse(faqItems);
}
