/**
 * Builder Agentic System — Gemini Integration Tests
 *
 * Tests all Gemini API calls in the widget builder pipeline:
 * 1. gemini-3.1-pro-preview — Theme generation, code generation, agent loop
 * 2. gemini-3-flash-preview — Quick replies, design modification
 * 3. gemini-embedding-2-preview — Embeddings for RAG
 *
 * These tests make REAL API calls. Requires GEMINI_API_KEY in .env.local.
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Theme Generation (gemini-3.1-pro-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Theme Generation (gemini-3.1-pro-preview)', () => {
  it('should generate valid theme.json from site profile', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const themePrompt = `Generate a complete theme.json for a chat widget based on this real website analysis:
- Business: "Smile Dental Clinic" (dental)
- Primary color from site: #2563EB
- Accent color from site: #10B981
- Font from site: Inter, sans-serif
- All site colors: #2563EB, #10B981, #F59E0B, #FFFFFF
- Dark mode: false
- Style: glass

Return ONLY valid JSON (no markdown, no explanation) with ALL these fields:
{
  "label": "Theme label",
  "domain": "smiledentalclinic.com",
  "font": "Inter, sans-serif",
  "isDark": false,
  "headerFrom": "#hex", "headerVia": "#hex", "headerTo": "#hex",
  "toggleFrom": "#hex", "toggleVia": "#hex", "toggleTo": "#hex",
  "sendFrom": "#hex", "sendTo": "#hex",
  "userMsgFrom": "#hex", "userMsgTo": "#hex",
  "surfaceBg": "#hex", "surfaceCard": "#hex", "surfaceBorder": "#hex",
  "surfaceInput": "#hex", "textPrimary": "#hex", "textSecondary": "#hex",
  "chipBorder": "#hex", "chipFrom": "#hex", "chipTo": "#hex", "chipText": "#hex",
  "cssPrimary": "#hex", "cssAccent": "#hex"
}

CRITICAL: isDark=false. Light mode: surfaceBg MUST be white or near-white (#ffffff to #f8f9fa). textPrimary should be dark.`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: themePrompt,
      config: { temperature: 0.3 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const theme = JSON.parse(text);

    // Validate required fields
    expect(theme).toHaveProperty('headerFrom');
    expect(theme).toHaveProperty('surfaceBg');
    expect(theme).toHaveProperty('textPrimary');
    expect(theme).toHaveProperty('cssPrimary');

    // All color fields should be valid hex
    const hexFields = ['headerFrom', 'surfaceBg', 'textPrimary', 'cssPrimary', 'sendFrom'];
    for (const field of hexFields) {
      if (theme[field]) {
        expect(theme[field]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }

    // Light theme: surfaceBg should be light
    if (theme.surfaceBg) {
      const hex = theme.surfaceBg.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(lum).toBeGreaterThan(0.5); // Should be a light color
    }
  }, 30000);

  it('should generate dark theme when isDark=true', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Generate theme.json for a dark-mode chat widget.
Business: "NightClub VIP" (entertainment)
Primary: #8B5CF6, Accent: #EC4899
isDark: true

Return ONLY valid JSON with these fields:
{"isDark": true, "surfaceBg": "#hex", "surfaceCard": "#hex", "textPrimary": "#hex", "headerFrom": "#hex", "headerTo": "#hex", "cssPrimary": "#hex"}

Dark mode: surfaceBg MUST be very dark (#0f1117 to #1a1d23), textPrimary must be white/light.`,
      config: { temperature: 0.3 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const theme = JSON.parse(text);

    expect(theme.isDark).toBe(true);

    // Dark theme: surfaceBg should be dark
    if (theme.surfaceBg) {
      const hex = theme.surfaceBg.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(lum).toBeLessThan(0.3);
    }
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Quick Replies & Welcome Message (gemini-3-flash-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Quick Replies Generation (gemini-3-flash-preview)', () => {
  it('should generate quick replies and welcome message from site content', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are analyzing a dental business website: "Smile Dental Clinic".
Here is content from the site:
Home: Welcome to Smile Dental Clinic. We offer teeth whitening, implants, and general dentistry.
Services: Teeth Whitening $299, Dental Implants $1500, Root Canal $800, Check-up $50
Contact: Call us at +1-555-0123 or email info@smiledentalclinic.com

Generate a JSON object with:
1. "quickReplies": array of exactly 3 short button labels (max 25 chars each) that reflect the ACTUAL services/pages on THIS specific site. Use the site's language.
2. "welcomeMessage": a personalized 1-sentence greeting using the business name and what they offer. Use markdown bold for the business name.
3. "inputPlaceholder": a short input placeholder relevant to the business (max 35 chars)

Return ONLY valid JSON, no markdown fences.`,
      config: { temperature: 0.3 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const data = JSON.parse(text);

    expect(data.quickReplies).toBeDefined();
    expect(Array.isArray(data.quickReplies)).toBe(true);
    expect(data.quickReplies.length).toBe(3);

    // Each quick reply should be reasonable length
    for (const qr of data.quickReplies) {
      expect(typeof qr).toBe('string');
      expect(qr.length).toBeLessThanOrEqual(35);
      expect(qr.length).toBeGreaterThan(0);
    }

    expect(data.welcomeMessage).toBeDefined();
    expect(typeof data.welcomeMessage).toBe('string');
    expect(data.welcomeMessage.length).toBeGreaterThan(10);

    expect(data.inputPlaceholder).toBeDefined();
    expect(typeof data.inputPlaceholder).toBe('string');
  }, 30000);

  it('should generate Russian quick replies for a Russian site', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are analyzing a beauty_salon business website: "Студия Красоты Анна".
Here is content from the site:
Главная: Студия красоты Анна — маникюр, педикюр, наращивание ногтей, косметология.
Услуги: Маникюр от 500₽, Педикюр от 700₽, Наращивание ногтей от 2000₽, Чистка лица 1500₽
Контакты: +7-999-123-4567, ул. Ленина 42, Москва

Generate a JSON object with:
1. "quickReplies": array of exactly 3 short button labels (max 25 chars each) that reflect the ACTUAL services. Use the site's language (Russian).
2. "welcomeMessage": personalized 1-sentence greeting in Russian using the business name and services.
3. "inputPlaceholder": short placeholder in Russian (max 35 chars)

Return ONLY valid JSON, no markdown fences.`,
      config: { temperature: 0.3 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const data = JSON.parse(text);

    expect(data.quickReplies).toBeDefined();
    expect(data.quickReplies.length).toBe(3);

    // Should be in Russian
    const allText = data.quickReplies.join(' ') + data.welcomeMessage;
    expect(allText).toMatch(/[а-яА-Я]/); // Contains Cyrillic
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Design Modification (gemini-3-flash-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Design Modification (gemini-3-flash-preview)', () => {
  it('should modify color fields based on user instruction', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const currentColors = {
      isDark: false,
      headerFrom: '#2563EB',
      headerVia: '#3B82F6',
      headerTo: '#1D4ED8',
      toggleFrom: '#2563EB',
      toggleVia: '#3B82F6',
      toggleTo: '#1D4ED8',
      sendFrom: '#2563EB',
      sendTo: '#1D4ED8',
      userMsgFrom: '#2563EB',
      userMsgTo: '#1D4ED8',
      surfaceBg: '#ffffff',
      surfaceCard: '#ffffff',
      textPrimary: '#111827',
    };

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Here are the COLOR fields of a chat widget theme:
${JSON.stringify(currentColors, null, 2)}

USER REQUEST: "Make it green instead of blue"

Return a JSON with ONLY these same fields, with colors changed per the request.
Keep isDark unchanged. Return ONLY valid JSON, no markdown.`,
      config: { temperature: 0.1 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const modified = JSON.parse(text);

    // Should have changed the blue (#2563EB) to green
    expect(modified.headerFrom).toBeDefined();
    expect(modified.headerFrom).not.toBe('#2563EB');

    // Verify it's actually a greenish color (green channel dominant)
    const hex = modified.headerFrom.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    expect(g).toBeGreaterThan(r); // Green should dominate

    // isDark should remain unchanged
    expect(modified.isDark).toBe(false);
    // surfaceBg should remain light
    expect(modified.surfaceBg).toBeDefined();
  }, 30000);

  it('should switch to dark mode when requested', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const currentColors = {
      isDark: false,
      surfaceBg: '#ffffff',
      surfaceCard: '#ffffff',
      textPrimary: '#111827',
      textSecondary: '#4b5563',
      headerFrom: '#2563EB',
      headerTo: '#1D4ED8',
    };

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Here are the COLOR fields of a chat widget theme:
${JSON.stringify(currentColors, null, 2)}

USER REQUEST: "Switch to dark mode"

Return a JSON with ONLY these same fields, with colors changed per the request.
Dark mode means: isDark=true, surfaceBg should be very dark, textPrimary should be light/white.
Return ONLY valid JSON, no markdown.`,
      config: { temperature: 0.1 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const modified = JSON.parse(text);

    expect(modified.isDark).toBe(true);

    // surfaceBg should now be dark
    const bgHex = (modified.surfaceBg || '').replace('#', '');
    if (bgHex.length === 6) {
      const r = parseInt(bgHex.slice(0, 2), 16);
      const g = parseInt(bgHex.slice(2, 4), 16);
      const b = parseInt(bgHex.slice(4, 6), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(lum).toBeLessThan(0.3);
    }

    // textPrimary should be light
    const txtHex = (modified.textPrimary || '').replace('#', '');
    if (txtHex.length === 6) {
      const r = parseInt(txtHex.slice(0, 2), 16);
      const g = parseInt(txtHex.slice(2, 4), 16);
      const b = parseInt(txtHex.slice(4, 6), 16);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      expect(lum).toBeGreaterThan(0.6);
    }
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Code Generation (gemini-3.1-pro-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Widget Code Generation (gemini-3.1-pro-preview)', () => {
  const CODEGEN_SYSTEM_PROMPT = `You are a Preact widget code generator for WinBix AI.
TECH STACK: Preact (h, render, useState, useEffect), Tailwind CSS v3, Shadow DOM.
RULES:
1. Keep all shared hook imports even if a feature is removed
2. NEVER break the existing chat message flow
3. Export component as default function
4. Return ONLY the complete modified file content. No explanations, no markdown fences.`;

  it('should generate valid JSX code to remove a UI element', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const currentCode = `import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useChat } from '../hooks/useChat';
import { useVoice } from '../hooks/useVoice';
import { Mic, Send, X } from 'lucide-preact';

export default function Widget() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, isTyping } = useChat({ clientId: 'test' });
  const { isListening, startListening, stopListening } = useVoice();

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && (
        <div className="widget-panel">
          <div className="messages">
            {messages.map((m, i) => <div key={i}>{m.content}</div>)}
          </div>
          <div className="input-row">
            <button onClick={isListening ? stopListening : startListening}>
              <Mic />
            </button>
            <input type="text" placeholder="Type..." />
            <button onClick={() => sendMessage('test')}>
              <Send />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `CURRENT FILE:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n\nINSTRUCTION: Remove the microphone/voice button but keep the import.\n\nReturn the COMPLETE modified file.`,
      config: {
        systemInstruction: CODEGEN_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const code = (result.text || '').trim();

    // Should still have the import
    expect(code).toContain('useVoice');

    // Should NOT render the Mic button in JSX (but hook destructuring is OK per rule #1)
    expect(code).not.toMatch(/<Mic\s*\/>/);
    // The onClick handler calling startListening should be removed from JSX
    expect(code).not.toMatch(/onClick=\{.*startListening/);

    // Should still export default function
    expect(code).toMatch(/export\s+default\s+function/);

    // Should still have send button
    expect(code).toContain('Send');
    expect(code).toContain('sendMessage');
  }, 30000);

  it('should add a new UI element to the widget', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const currentCode = `import { h } from 'preact';
import { useState } from 'preact/hooks';

export default function Widget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Chat</button>
      {isOpen && (
        <div className="widget-panel">
          <div className="header">Support Chat</div>
          <div className="messages"></div>
          <input type="text" placeholder="Type..." />
        </div>
      )}
    </div>
  );
}`;

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `CURRENT FILE:\n\`\`\`jsx\n${currentCode}\n\`\`\`\n\nINSTRUCTION: Add a "Powered by WinBix" footer link at the bottom of the widget panel.\n\nReturn the COMPLETE modified file.`,
      config: {
        systemInstruction: CODEGEN_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const code = (result.text || '').trim();

    // Should contain the new footer
    expect(code.toLowerCase()).toContain('winbix');

    // Should still export default function
    expect(code).toMatch(/export\s+default\s+function/);

    // Should preserve existing functionality
    expect(code).toContain('isOpen');
    expect(code).toContain('setIsOpen');
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Agent Loop — Function Calling (gemini-3.1-pro-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Agent Function Calling (gemini-3.1-pro-preview)', () => {
  it('should call the correct tool when asked to analyze a website', async () => {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const functionDeclarations = [
      {
        name: 'analyze_site',
        description: 'Crawl and analyze a website to extract colors, fonts, business info.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: 'The website URL to analyze' },
          },
          required: ['url'],
        },
      },
      {
        name: 'generate_design',
        description: 'Generate widget theme design based on site analysis.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            siteProfile: { type: Type.STRING, description: 'JSON site profile from analyze_site' },
          },
          required: [],
        },
      },
    ];

    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction:
          'You are a widget builder agent. When the user gives a URL, first analyze it with analyze_site.',
        tools: [{ functionDeclarations }],
        temperature: 0.3,
      },
    });

    const response = await chat.sendMessage({
      message: 'Create a widget for https://example-dental.com',
    });

    const functionCalls = response.functionCalls || [];

    // Should attempt to call analyze_site
    expect(functionCalls.length).toBeGreaterThan(0);
    expect(functionCalls[0].name).toBe('analyze_site');
    expect(functionCalls[0].args).toHaveProperty('url');

    // URL should contain the domain
    const urlArg = (functionCalls[0].args as Record<string, unknown>).url as string;
    expect(urlArg).toContain('example-dental');
  }, 30000);

  it('should handle multi-turn function calling with responses', async () => {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const functionDeclarations = [
      {
        name: 'get_weather',
        description: 'Get current weather for a city',
        parameters: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING, description: 'City name' },
          },
          required: ['city'],
        },
      },
    ];

    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        tools: [{ functionDeclarations }],
        temperature: 0.1,
      },
    });

    // Step 1: User asks about weather
    const response1 = await chat.sendMessage({
      message: 'What is the weather in Tokyo?',
    });

    const calls = response1.functionCalls || [];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0].name).toBe('get_weather');

    // Step 2: Send function result back
    const response2 = await chat.sendMessage({
      message: [
        {
          functionResponse: {
            name: 'get_weather',
            response: { temperature: 22, condition: 'Sunny', humidity: 45 },
          },
        },
      ],
    });

    // Should now give a text response about the weather
    expect(response2.text).toBeDefined();
    expect(response2.text!.length).toBeGreaterThan(10);

    // Should mention Tokyo or the weather data
    const text = response2.text!.toLowerCase();
    expect(text.includes('tokyo') || text.includes('22') || text.includes('sunny')).toBe(true);
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Embeddings (gemini-embedding-2-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Embeddings for RAG (gemini-embedding-2-preview)', () => {
  it('should generate embeddings for knowledge chunks', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

    const result = await model.embedContent('Teeth whitening costs $299 at Smile Dental Clinic');

    expect(result.embedding).toBeDefined();
    expect(result.embedding.values).toBeDefined();
    expect(Array.isArray(result.embedding.values)).toBe(true);
    expect(result.embedding.values.length).toBeGreaterThan(100);

    // All values should be numbers
    for (const v of result.embedding.values.slice(0, 10)) {
      expect(typeof v).toBe('number');
      expect(isFinite(v)).toBe(true);
    }
  }, 30000);

  it('should produce similar embeddings for similar texts', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

    const [result1, result2, result3] = await Promise.all([
      model.embedContent('What is the price of teeth whitening?'),
      model.embedContent('How much does teeth whitening cost?'),
      model.embedContent('Tell me about your restaurant menu'),
    ]);

    // Cosine similarity helper
    function cosine(a: number[], b: number[]): number {
      let dot = 0,
        normA = 0,
        normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    const similarScore = cosine(result1.embedding.values, result2.embedding.values);
    const differentScore = cosine(result1.embedding.values, result3.embedding.values);

    // Similar questions should have higher similarity than unrelated ones
    expect(similarScore).toBeGreaterThan(differentScore);
    expect(similarScore).toBeGreaterThan(0.7); // High similarity
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Create Theme From Scratch (gemini-3.1-pro-preview)
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Create Theme From Scratch (gemini-3.1-pro-preview)', () => {
  it('should generate complete theme without website analysis', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Generate a complete chat widget theme.json for:
Business: "AutoService Pro" (auto_service)
Primary color: #EF4444 (red)
Dark mode: true
Style: glass

Return ONLY valid JSON with these fields:
{
  "label": "string",
  "font": "string",
  "isDark": true,
  "headerFrom": "#hex", "headerVia": "#hex", "headerTo": "#hex",
  "toggleFrom": "#hex", "toggleVia": "#hex", "toggleTo": "#hex",
  "sendFrom": "#hex", "sendTo": "#hex",
  "userMsgFrom": "#hex", "userMsgTo": "#hex",
  "surfaceBg": "#hex", "surfaceCard": "#hex",
  "textPrimary": "#hex", "textSecondary": "#hex",
  "cssPrimary": "#hex", "cssAccent": "#hex",
  "chipBorder": "#hex", "chipText": "#hex"
}

CRITICAL: isDark=true. surfaceBg must be very dark. Colors should use the red primary.`,
      config: { temperature: 0.3 },
    });

    const text = (result.text || '')
      .trim()
      .replace(/^```(?:json)?[\s\n]*/m, '')
      .replace(/[\s\n]*```$/m, '')
      .trim();

    const theme = JSON.parse(text);

    expect(theme.isDark).toBe(true);
    expect(theme.headerFrom).toBeDefined();
    expect(theme.cssPrimary).toBeDefined();

    // Primary color should be reddish
    const primary = (theme.cssPrimary || theme.headerFrom || '').replace('#', '');
    if (primary.length === 6) {
      const r = parseInt(primary.slice(0, 2), 16);
      const g = parseInt(primary.slice(2, 4), 16);
      expect(r).toBeGreaterThan(g); // Red should dominate
    }
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Model Connectivity Validation — All Builder Models
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — Model Connectivity Check', () => {
  it('gemini-3.1-pro-preview responds to simple prompt', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: 'Reply with exactly: OK',
      config: { temperature: 0 },
    });

    expect(response.text).toBeDefined();
    expect(response.text!.trim().toUpperCase()).toContain('OK');
  }, 15000);

  it('gemini-3-flash-preview responds to simple prompt', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Reply with exactly: OK',
      config: { temperature: 0 },
    });

    expect(response.text).toBeDefined();
    expect(response.text!.trim().toUpperCase()).toContain('OK');
  }, 15000);

  it('gemini-3.1-flash-lite-preview responds to simple prompt', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: 'Reply with exactly: OK',
      config: { temperature: 0 },
    });

    expect(response.text).toBeDefined();
    expect(response.text!.trim().toUpperCase()).toContain('OK');
  }, 15000);

  it('gemini-embedding-2-preview generates valid vectors', async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });

    const result = await model.embedContent('test');

    expect(result.embedding).toBeDefined();
    expect(result.embedding.values.length).toBeGreaterThan(0);
  }, 15000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. JSON Output Reliability — Critical for Builder
// ─────────────────────────────────────────────────────────────────────────────

describe('Builder — JSON Output Reliability', () => {
  it('gemini-3.1-pro should return parseable JSON for theme generation', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Run 3 attempts to check reliability
    let successCount = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `Return ONLY valid JSON with: {"color": "#hex_value", "name": "test"}. No explanation.`,
          config: { temperature: 0 },
        });

        const text = (result.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();

        JSON.parse(text);
        successCount++;
      } catch {
        // Parse error — count as failure
      }
    }

    // At least 2 out of 3 should produce valid JSON
    expect(successCount).toBeGreaterThanOrEqual(2);
  }, 60000);

  it('gemini-3-flash should return parseable JSON for quick replies', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    let successCount = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Return ONLY valid JSON array: ["Item 1", "Item 2", "Item 3"]. No explanation.`,
          config: { temperature: 0 },
        });

        const text = (result.text || '')
          .trim()
          .replace(/^```(?:json)?[\s\n]*/m, '')
          .replace(/[\s\n]*```$/m, '')
          .trim();

        const parsed = JSON.parse(text);
        expect(Array.isArray(parsed)).toBe(true);
        successCount++;
      } catch {
        // count as failure
      }
    }

    expect(successCount).toBeGreaterThanOrEqual(2);
  }, 30000);
});
