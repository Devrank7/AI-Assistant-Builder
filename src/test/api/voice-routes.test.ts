import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/voiceAgent', () => ({
  processVoiceMessage: vi.fn(),
}));

// TTS route reads fs and process.env directly; mock those
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { processVoiceMessage } from '@/lib/voiceAgent';
import * as fs from 'fs';

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ========== POST /api/voice/stream ==========
describe('POST /api/voice/stream', () => {
  let POST: typeof import('@/app/api/voice/stream/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/voice/stream/route'));
  });

  it('returns 400 when clientId is missing', async () => {
    const req = createRequest('POST', '/api/voice/stream', { transcript: 'hello' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('clientId');
  });

  it('returns 400 when transcript is missing', async () => {
    const req = createRequest('POST', '/api/voice/stream', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('transcript');
  });

  it('returns 500 when voice processing fails', async () => {
    vi.mocked(processVoiceMessage).mockResolvedValue({ success: false, error: 'AI error' } as never);
    const req = createRequest('POST', '/api/voice/stream', { clientId: 'c1', transcript: 'hello' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 200 on successful voice processing', async () => {
    vi.mocked(processVoiceMessage).mockResolvedValue({
      success: true,
      text: 'Hi there',
      ssml: '<speak>Hi there</speak>',
      inputTokens: 10,
      outputTokens: 5,
      costUsd: 0.001,
    } as never);
    const req = createRequest('POST', '/api/voice/stream', { clientId: 'c1', transcript: 'hello' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.text).toBe('Hi there');
  });

  it('passes optional fields to processVoiceMessage', async () => {
    vi.mocked(processVoiceMessage).mockResolvedValue({
      success: true,
      text: 'OK',
      ssml: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    } as never);
    const body = {
      clientId: 'c1',
      transcript: 'hello',
      sessionId: 's1',
      visitorId: 'v1',
      conversationHistory: [{ role: 'user', content: 'prev' }],
      language: 'en',
    };
    const req = createRequest('POST', '/api/voice/stream', body);
    await POST(req);
    expect(processVoiceMessage).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 's1', visitorId: 'v1', language: 'en' })
    );
  });
});

// ========== POST /api/tts ==========
describe('POST /api/tts', () => {
  let POST: typeof import('@/app/api/tts/route').POST;

  beforeEach(async () => {
    // Reset the module to clear cached credentials
    vi.resetModules();
    vi.mock('fs', () => ({
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    }));
    vi.mock('@/lib/voiceAgent', () => ({
      processVoiceMessage: vi.fn(),
    }));
    ({ POST } = await import('@/app/api/tts/route'));
  });

  it('returns 400 when text is missing', async () => {
    const req = createRequest('POST', '/api/tts', { lang: 'en' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Text is required');
  });

  it('returns 400 when text is not a string', async () => {
    const req = createRequest('POST', '/api/tts', { text: 123 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 503 when credentials are not configured', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const req = createRequest('POST', '/api/tts', { text: 'Hello world' });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('TTS not configured');
  });
});

// ========== OPTIONS /api/tts ==========
describe('OPTIONS /api/tts', () => {
  let OPTIONS: typeof import('@/app/api/tts/route').OPTIONS;

  beforeEach(async () => {
    vi.resetModules();
    ({ OPTIONS } = await import('@/app/api/tts/route'));
  });

  it('returns 200 with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });
});
