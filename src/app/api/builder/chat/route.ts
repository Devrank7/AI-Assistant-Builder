import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import BuilderSession from '@/models/BuilderSession';
import { getDefaultModel } from '@/lib/models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const BUILDER_SYSTEM_PROMPT = `You are an AI Widget Builder assistant for WinBix AI. Your job is to help users create a custom chat widget for their website through conversation.

## Your workflow:
1. Ask the user about their business: type (dental, restaurant, SaaS, etc.), business name, and website URL.
2. Ask about their preferred style: colors, dark or light theme, font preferences, overall feel (modern, classic, playful, corporate).
3. When you have enough information, generate a complete theme.json configuration.

## When generating theme.json:
- Output it inside a \`\`\`json code block
- Include ALL required fields (see below)
- Choose colors that match the user's brand
- Set a descriptive "label" field like "BusinessName - Theme Description"
- Set "domain" to the user's website domain

## Required theme.json fields:
domain, font, isDark, widgetW, widgetH, widgetMaxW, widgetMaxH, toggleSize, toggleRadius,
headerPad, nameSize, avatarHeaderRound, chatAvatarRound,
headerFrom, headerVia, headerTo, toggleFrom, toggleVia, toggleTo, toggleShadow, toggleHoverRgb,
sendFrom, sendHoverFrom, onlineDotBg, onlineDotBorder, typingDot,
userMsgFrom, userMsgTo, userMsgShadow, avatarFrom, avatarTo, avatarBorder, avatarIcon,
linkColor, linkHover, copyHover, copyActive,
chipBorder, chipFrom, chipTo, chipText, chipHoverFrom, chipHoverTo, chipHoverBorder,
focusBorder, focusRing, imgActiveBorder, imgActiveBg, imgActiveText,
imgHoverText, imgHoverBorder, imgHoverBg, cssPrimary, cssAccent, focusRgb,
feedbackActive, feedbackHover

If isDark is true, also include: surfaceBg, surfaceCard, surfaceBorder, surfaceInput, surfaceInputFocus, textPrimary, textSecondary, textMuted

## Additional fields to include:
- "label": descriptive label
- "fontUrl": Google Fonts URL for the chosen font
- "hasShine": boolean for header shine effect
- "headerAccent": optional accent text
- "sendTo": gradient end for send button
- "sendHoverTo": gradient end for send button hover

## Default dimensions (use unless user specifies otherwise):
- widgetW: "370px", widgetH: "540px", widgetMaxW: "370px", widgetMaxH: "540px"
- toggleSize: "w-[58px] h-[58px]", toggleRadius: "rounded-[10px]"
- headerPad: "px-6 py-5", nameSize: "text-[15px]"
- avatarHeaderRound: "rounded-lg", chatAvatarRound: "rounded-lg"

## Also generate a widget.config.json with:
- clientId: slugified business name
- botName: "BusinessName AI" or similar
- welcomeMessage: personalized welcome in markdown
- inputPlaceholder: relevant placeholder text
- quickReplies: array of 3 relevant quick reply buttons
- avatar: { type: "initials", initials: "XX" } using business initials

Output the widget.config.json in a separate \`\`\`json code block labeled with "widget.config.json" comment.

## Important:
- Be conversational and helpful
- If the user wants changes after you generate the theme, modify and re-output the complete theme.json
- Always explain your color choices briefly
- Use hex colors (e.g., #1a2b3c), not rgb/rgba
- For focusRgb and toggleHoverRgb, use comma-separated RGB values like "26, 43, 60"
- Set "widgetName" in your response when you know the business name`;

function extractJsonBlocks(text: string): {
  themeJson: Record<string, unknown> | null;
  widgetConfig: Record<string, unknown> | null;
  widgetName: string | null;
} {
  const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g;
  let themeJson: Record<string, unknown> | null = null;
  let widgetConfig: Record<string, unknown> | null = null;
  let widgetName: string | null = null;

  let match;
  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());

      // Distinguish theme.json from widget.config.json by checking for unique fields
      if (parsed.clientId && parsed.botName && parsed.welcomeMessage) {
        widgetConfig = parsed;
        widgetName = parsed.botName || null;
      } else if (parsed.headerFrom || parsed.domain) {
        themeJson = parsed;
        if (parsed.label) {
          widgetName = parsed.label;
        }
      }
    } catch {
      // Skip invalid JSON blocks
    }
  }

  return { themeJson, widgetConfig, widgetName };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { sessionId, message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return Errors.badRequest('Message is required');
    }

    await connectDB();

    // Get or create session
    let session;
    if (sessionId) {
      session = await BuilderSession.findOne({ _id: sessionId, userId: auth.userId });
      if (!session) {
        return Errors.notFound('Session not found');
      }
    } else {
      session = new BuilderSession({
        userId: auth.userId,
        messages: [],
        status: 'chatting',
      });
    }

    // Add user message
    session.messages.push({
      role: 'user' as const,
      content: message.trim(),
      timestamp: new Date(),
    });

    // Build conversation history for Gemini
    const conversationHistory = session.messages
      .map((msg: { role: string; content: string }) => {
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
      })
      .join('\n\n');

    // Call Gemini
    const modelId = getDefaultModel().id;
    const model = genAI.getGenerativeModel({
      model: modelId,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const prompt = `${BUILDER_SYSTEM_PROMPT}\n\n---\nConversation:\n${conversationHistory}\n\nAssistant:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const assistantMessage = response.text();

    // Parse response for theme JSON
    const { themeJson, widgetConfig, widgetName } = extractJsonBlocks(assistantMessage);

    if (themeJson) {
      session.themeJson = themeJson;
      // Store widgetConfig alongside themeJson if found
      if (widgetConfig) {
        session.themeJson = { ...(session.themeJson as Record<string, unknown>), _widgetConfig: widgetConfig };
      }
    }

    if (widgetName && !session.widgetName) {
      session.widgetName = widgetName;
    }

    // Add assistant message
    session.messages.push({
      role: 'assistant' as const,
      content: assistantMessage,
      timestamp: new Date(),
    });

    await session.save();

    return successResponse({
      sessionId: session._id,
      message: assistantMessage,
      themeJson: themeJson || undefined,
      widgetConfig: widgetConfig || undefined,
      widgetName: session.widgetName,
      status: session.status,
    });
  } catch (error) {
    console.error('Builder chat error:', error);
    return Errors.internal('Failed to process chat message');
  }
}
