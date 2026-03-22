import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { parseDocument } from '@/lib/documentParser';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_TEXT_LENGTH = 500_000; // 500K characters

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'docx',
  'txt',
  'md',
  'csv',
  'xlsx',
  'json',
  'xml',
  'html',
  'png',
  'jpg',
  'jpeg',
  'webp',
]);

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 25 MB.' }, { status: 413 });
    }

    // Validate extension
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type: .${ext}. Supported: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse document
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.name);

    if (!parsed.text) {
      return NextResponse.json({ success: false, error: 'Document is empty or could not be parsed' }, { status: 400 });
    }

    // Truncate if needed
    let text = parsed.text;
    let truncated = false;
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[Content truncated at 500K characters]';
      truncated = true;
    }

    const preview = text.substring(0, 3000);

    return NextResponse.json({
      success: true,
      text,
      preview,
      truncated,
      metadata: {
        ...parsed.metadata,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Error parsing file:', error);
    const message = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
