/**
 * Document parsing utilities for PDF, DOCX, CSV, XLSX, TXT, and images (OCR)
 *
 * Required packages (install via npm):
 * npm install pdf-parse mammoth xlsx papaparse @types/papaparse
 */

export interface ParsedDocument {
  text: string;
  metadata: {
    filename: string;
    type: 'pdf' | 'docx' | 'txt' | 'csv' | 'xlsx' | 'image';
    pages?: number;
    sheets?: number;
    rows?: number;
    wordCount: number;
  };
}

/**
 * Parse PDF file buffer to text
 */
export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  try {
    // @ts-expect-error - pdf-parse types are not perfect
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    const text = data.text.trim();

    return {
      text,
      metadata: {
        filename,
        type: 'pdf',
        pages: data.numpages,
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      throw new Error('pdf-parse package not installed. Run: npm install pdf-parse');
    }
    throw error;
  }
}

/**
 * Parse DOCX file buffer to text
 */
export async function parseDOCX(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    return {
      text,
      metadata: {
        filename,
        type: 'docx',
        wordCount: text.split(/\s+/).length,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      throw new Error('mammoth package not installed. Run: npm install mammoth');
    }
    throw error;
  }
}

/**
 * Parse plain text file
 */
export function parseTXT(buffer: Buffer, filename: string): ParsedDocument {
  const text = buffer.toString('utf-8').trim();

  return {
    text,
    metadata: {
      filename,
      type: 'txt',
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Parse CSV file using papaparse
 */
export async function parseCSV(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const Papa = (await import('papaparse')).default;
  const raw = buffer.toString('utf-8');
  const result = Papa.parse(raw, { header: true, skipEmptyLines: true });
  const headers = result.meta.fields || [];
  const rows = (result.data as Record<string, string>[]).slice(0, 500);

  const lines = rows.map((row, i) => {
    const fields = headers.map((h) => `${h}=${row[h] || ''}`).join(', ');
    return `Row ${i + 1}: ${fields}`;
  });

  const text = lines.join('\n');

  return {
    text,
    metadata: {
      filename,
      type: 'csv',
      rows: rows.length,
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Parse XLSX file using SheetJS
 */
export async function parseXLSX(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    const rows = data.slice(0, 500);
    totalRows += rows.length;

    parts.push(`## Sheet: ${sheetName}`);
    for (let i = 0; i < rows.length; i++) {
      parts.push(`Row ${i + 1}: ${rows[i].join(', ')}`);
    }
  }

  const text = parts.join('\n');

  return {
    text,
    metadata: {
      filename,
      type: 'xlsx',
      sheets: workbook.SheetNames.length,
      rows: totalRows,
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Parse image via Gemini Vision OCR
 */
export async function parseImage(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split('.').pop() || 'png';
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };
  const mimeType = mimeMap[ext] || 'image/png';

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent([
    'Extract all text from this image. Return only the extracted text, nothing else. If there is no text, return "NO_TEXT_FOUND".',
    {
      inlineData: {
        mimeType,
        data: buffer.toString('base64'),
      },
    },
  ]);

  const text = result.response.text().trim();

  if (!text || text === 'NO_TEXT_FOUND') {
    return {
      text: '',
      metadata: { filename, type: 'image', wordCount: 0 },
    };
  }

  return {
    text,
    metadata: {
      filename,
      type: 'image',
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseDocument(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer, filename);
    case 'docx':
      return parseDOCX(buffer, filename);
    case 'txt':
    case 'md':
    case 'json':
    case 'xml':
    case 'html':
      return parseTXT(buffer, filename);
    case 'csv':
      return parseCSV(buffer, filename);
    case 'xlsx':
      return parseXLSX(buffer, filename);
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return parseImage(buffer, filename);
    default:
      throw new Error(
        `Unsupported file type: .${ext}. Supported: pdf, docx, txt, md, csv, xlsx, json, xml, html, png, jpg, jpeg, webp`
      );
  }
}
