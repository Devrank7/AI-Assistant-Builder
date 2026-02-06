/**
 * Document parsing utilities for PDF and DOCX files
 *
 * Required packages (install via npm):
 * npm install pdf-parse mammoth
 *
 * If packages are not installed, the functions will throw helpful errors.
 */

export interface ParsedDocument {
  text: string;
  metadata: {
    filename: string;
    type: 'pdf' | 'docx' | 'txt';
    pages?: number;
    wordCount: number;
  };
}

/**
 * Parse PDF file buffer to text
 */
export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  try {
    // Dynamic import to handle missing package gracefully
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
    // Dynamic import to handle missing package gracefully
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
      return parseTXT(buffer, filename);
    default:
      throw new Error(`Unsupported file type: .${ext}. Supported: pdf, docx, txt, md`);
  }
}
