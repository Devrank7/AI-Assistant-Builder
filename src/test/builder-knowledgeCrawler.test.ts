// src/test/builder-knowledgeCrawler.test.ts
import { describe, it, expect } from 'vitest';
import { chunkContent } from '@/lib/builder/knowledgeCrawler';

describe('Knowledge Crawler', () => {
  it('should split content at paragraph boundaries', () => {
    const content = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const chunks = chunkContent(content, 2000);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
  });

  it('should split long paragraphs at sentence boundaries', () => {
    const longParagraph = 'Sentence one. '.repeat(200); // ~2800 chars
    const chunks = chunkContent(longParagraph, 2000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
  });

  it('should handle empty content', () => {
    const chunks = chunkContent('', 2000);
    expect(chunks).toEqual([]);
  });

  it('should handle content shorter than max size', () => {
    const chunks = chunkContent('Short text.', 2000);
    expect(chunks).toEqual(['Short text.']);
  });

  it('should not produce empty chunks', () => {
    const content = '\n\n\n\nActual content.\n\n\n\n';
    const chunks = chunkContent(content, 2000);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });
});
