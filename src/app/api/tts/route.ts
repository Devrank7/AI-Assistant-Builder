import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Google Cloud TTS voice mapping (high-quality voices per language)
const VOICE_MAP: Record<string, { languageCode: string; name: string }> = {
  en: { languageCode: 'en-US', name: 'en-US-Standard-C' },
  ru: { languageCode: 'ru-RU', name: 'ru-RU-Standard-A' },
  uk: { languageCode: 'uk-UA', name: 'uk-UA-Standard-A' },
  ar: { languageCode: 'ar-XA', name: 'ar-XA-Standard-A' },
  pl: { languageCode: 'pl-PL', name: 'pl-PL-Standard-A' },
  de: { languageCode: 'de-DE', name: 'de-DE-Standard-A' },
  fr: { languageCode: 'fr-FR', name: 'fr-FR-Standard-A' },
  es: { languageCode: 'es-ES', name: 'es-ES-Standard-A' },
  tr: { languageCode: 'tr-TR', name: 'tr-TR-Standard-A' },
  he: { languageCode: 'he-IL', name: 'he-IL-Standard-A' },
};

const MAX_TEXT_LENGTH = 4000;

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

let cachedCredentials: ServiceAccountCredentials | null = null;
let cachedToken: { token: string; expires: number } | null = null;

function getCredentials(): ServiceAccountCredentials | null {
  if (cachedCredentials) return cachedCredentials;

  const saPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'service_account.json');
  try {
    if (fs.existsSync(saPath)) {
      const creds = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
      if (creds.client_email && creds.private_key) {
        cachedCredentials = { client_email: creds.client_email, private_key: creds.private_key };
        return cachedCredentials;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function getAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expires > now + 60) {
    return cachedToken.token;
  }

  const crypto = await import('crypto');

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signInput = `${b64Header}.${b64Payload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(creds.private_key, 'base64url');

  const jwt = `${signInput}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await resp.json();
  if (!resp.ok || !data.access_token) {
    throw new Error(`Google auth failed: ${data.error || resp.statusText}`);
  }

  cachedToken = { token: data.access_token, expires: now + 3600 };
  return data.access_token;
}

function cleanTextForTTS(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/[#_~`\[\]]/g, '') // markdown symbols
    .replace(/\(http[^)]*\)/g, '') // markdown links
    .replace(/https?:\/\/\S+/g, '') // raw URLs
    .replace(/\[SUGGESTIONS\][\s\S]*?\[\/SUGGESTIONS\]/g, '') // suggestion tags
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export async function POST(request: NextRequest) {
  try {
    const { text, lang } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const creds = getCredentials();
    if (!creds) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
    }

    const cleanText = cleanTextForTTS(text);
    if (!cleanText) {
      return NextResponse.json({ error: 'Empty text after cleaning' }, { status: 400 });
    }

    const langKey = (lang || 'en').toLowerCase();
    const voice = VOICE_MAP[langKey] || VOICE_MAP['en'];

    const accessToken = await getAccessToken(creds);

    const ttsResp = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: cleanText },
        voice: {
          languageCode: voice.languageCode,
          name: voice.name,
          ssmlGender: 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 0.95,
          pitch: 1.0,
        },
      }),
    });

    if (!ttsResp.ok) {
      const errBody = await ttsResp.text();
      console.error('Google TTS API error:', ttsResp.status, errBody);
      return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 502 });
    }

    const ttsData = await ttsResp.json();
    const audioContent = ttsData.audioContent; // base64 MP3

    return NextResponse.json(
      { audio: audioContent },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error) {
    console.error('TTS route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
