import { describe, it, expect, vi } from 'vitest';
import { webFetch, htmlToMarkdown } from '../webFetch';

describe('htmlToMarkdown', () => {
  it('strips script and style tags', () => {
    const html = '<style>body{}</style><script>alert(1)</script><p>Hello world</p>';
    const md = htmlToMarkdown(html);
    expect(md).not.toContain('alert');
    expect(md).not.toContain('body{}');
    expect(md).toContain('Hello world');
  });

  it('converts links to markdown', () => {
    const html = '<a href="https://example.com">Click here</a>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[Click here](https://example.com)');
  });

  it('converts headings', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Title');
    expect(md).toContain('## Subtitle');
  });

  it('truncates to max length', () => {
    const html = '<p>' + 'a'.repeat(40000) + '</p>';
    const md = htmlToMarkdown(html, 1000);
    expect(md.length).toBeLessThanOrEqual(1020); // some slack for truncation marker
  });
});

describe('webFetch', () => {
  it('rejects private IPs', async () => {
    const result = await webFetch('http://127.0.0.1/admin');
    expect(result.error).toContain('private');
  });

  it('rejects metadata IP', async () => {
    const result = await webFetch('http://169.254.169.254/latest/meta-data');
    expect(result.error).toContain('private');
  });
});
