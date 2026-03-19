# Builder File Attachment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a file attachment button to the AI Builder chat so users can upload documents and images, which Gemini can add to the widget knowledge base or answer questions about.

**Architecture:** File is uploaded to a parse-only endpoint, text is extracted server-side, preview (3000 chars) + metadata injected into user message for Gemini. Full text stored in-memory map keyed by sessionId, accessible via `__FILE_CONTENT__` marker in `upload_knowledge_text` tool.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, `xlsx` (SheetJS), `papaparse`, Gemini Vision API for OCR.

**Spec:** `docs/superpowers/specs/2026-03-19-builder-file-attachment-design.md`

---

## File Structure

| Action  | File                                         | Responsibility                                                           |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Install | `xlsx`, `papaparse`, `@types/papaparse`      | New dependencies for XLSX and CSV parsing                                |
| Modify  | `src/lib/documentParser.ts`                  | Add CSV, XLSX, and image OCR parsing                                     |
| Create  | `src/app/api/builder/upload-file/route.ts`   | Parse-only endpoint (no DB writes)                                       |
| Modify  | `src/lib/builder/toolRegistry.ts`            | Add `pendingFileText` to `ToolContext`                                   |
| Modify  | `src/lib/builder/tools/coreTools.ts`         | Handle `__FILE_CONTENT__` marker in `upload_knowledge_text`              |
| Modify  | `src/app/api/builder/chat/route.ts`          | Accept `fileContext`, store fullText in memory map, augment user message |
| Modify  | `src/lib/builder/systemPrompt.ts`            | Add file attachment instructions                                         |
| Modify  | `src/components/builder/useBuilderStream.ts` | Add `sendMessageWithFile` method                                         |
| Modify  | `src/components/builder/BuilderChat.tsx`     | Attachment button, file preview badge, upload flow                       |

---

## Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install xlsx, papaparse, and types**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant
npm install xlsx papaparse @types/papaparse
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('xlsx'); require('papaparse'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install xlsx and papaparse for file attachment feature"
```

---

## Task 2: Extend Document Parser

**Files:**

- Modify: `src/lib/documentParser.ts`

The existing parser handles PDF, DOCX, TXT, MD. Add CSV, XLSX, and image OCR support.

- [ ] **Step 1: Add CSV parser function**

Add after the `parseTXT` function (line ~88):

```typescript
import Papa from 'papaparse';

export async function parseCSV(buffer: Buffer, filename: string): Promise<ParsedDocument> {
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
```

- [ ] **Step 2: Add XLSX parser function**

Add after `parseCSV`:

```typescript
import * as XLSX from 'xlsx';

export async function parseXLSX(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { header: 1 });
    const rows = (data as string[][]).slice(0, 500);
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
```

- [ ] **Step 3: Add image OCR function via Gemini Vision**

```typescript
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
```

- [ ] **Step 4: Update the `ParsedDocument` interface**

Change the existing interface (line ~10):

```typescript
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
```

- [ ] **Step 5: Update the `parseDocument` switch statement**

Add new cases to the switch in `parseDocument` (line ~96):

```typescript
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
      throw new Error(`Unsupported file type: .${ext}. Supported: pdf, docx, txt, md, csv, xlsx, png, jpg, jpeg, webp`);
  }
}
```

- [ ] **Step 6: Verify the project builds**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && npx next build --no-lint 2>&1 | tail -5
```

Expected: Build succeeds (or at least no errors in documentParser.ts)

- [ ] **Step 7: Commit**

```bash
git add src/lib/documentParser.ts
git commit -m "feat: add CSV, XLSX, and image OCR support to document parser"
```

---

## Task 3: Create Upload-File Endpoint

**Files:**

- Create: `src/app/api/builder/upload-file/route.ts`

This endpoint parses files but does NOT write to the database. Authentication required.

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { parseDocument } from '@/lib/documentParser';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_TEXT_LENGTH = 500_000; // 500K characters

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'md', 'csv', 'xlsx', 'png', 'jpg', 'jpeg', 'webp']);

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
      return NextResponse.json({ success: false, error: `File too large. Maximum size is 25 MB.` }, { status: 413 });
    }

    // Validate extension
    const ext = file.name.toLowerCase().split('.').pop() || '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: .${ext}. Supported: ${[...ALLOWED_EXTENSIONS].join(', ')}` },
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
```

- [ ] **Step 2: Verify the file is created at the correct path**

```bash
ls -la src/app/api/builder/upload-file/route.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/builder/upload-file/route.ts
git commit -m "feat: add parse-only file upload endpoint for builder"
```

---

## Task 4: Extend ToolContext and upload_knowledge_text

**Files:**

- Modify: `src/lib/builder/toolRegistry.ts` (line 3-10)
- Modify: `src/lib/builder/tools/coreTools.ts` (line ~1507-1538)

- [ ] **Step 1: Add `pendingFileText` to ToolContext**

In `src/lib/builder/toolRegistry.ts`, add the field to the `ToolContext` interface:

```typescript
export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
  userPlan?: string;
  pendingFileText?: string;
}
```

- [ ] **Step 2: Handle `__FILE_CONTENT__` marker in `upload_knowledge_text`**

In `src/lib/builder/tools/coreTools.ts`, modify the executor of `upload_knowledge_text` (line ~1507). Replace:

```typescript
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const text = args.text as string;
```

With:

```typescript
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      let text = args.text as string;

      // If Gemini sends the marker, substitute with the full file text
      if (text === '__FILE_CONTENT__' && ctx.pendingFileText) {
        text = ctx.pendingFileText;
      }
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/toolRegistry.ts src/lib/builder/tools/coreTools.ts
git commit -m "feat: add pendingFileText to ToolContext, handle __FILE_CONTENT__ marker"
```

---

## Task 5: Modify Chat Endpoint to Accept fileContext

**Files:**

- Modify: `src/app/api/builder/chat/route.ts`

- [ ] **Step 1: Add the in-memory map at module level**

At the top of the file (after line 14 where `activeStreams` is defined), add:

```typescript
const pendingFileTexts = new Map<string, { text: string; timestamp: number }>();

// Cleanup entries older than 5 minutes
function cleanupPendingFiles() {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, val] of pendingFileTexts) {
    if (val.timestamp < fiveMinAgo) pendingFileTexts.delete(key);
  }
}
```

- [ ] **Step 2: Parse fileContext from request body**

After `const { sessionId, message } = body;` (line ~23), change to:

```typescript
const { sessionId, message, fileContext } = body;
```

- [ ] **Step 3: Augment the user message when fileContext is present**

After the session is loaded and before `session.messages.push` (around line 51), add message augmentation:

```typescript
// Augment message with file context if present
let augmentedMessage = message;
if (fileContext && fileContext.preview) {
  const fileMeta = [
    `Attached file: ${fileContext.filename}`,
    `(${fileContext.type}, ${fileContext.wordCount} words, ${Math.round(fileContext.size / 1024)} KB)`,
    fileContext.pages ? `${fileContext.pages} pages` : null,
  ]
    .filter(Boolean)
    .join(' ');

  augmentedMessage = `${message || 'User uploaded a file'}\n\n---\n[${fileMeta}]\nContent preview:\n${fileContext.preview}\n\nIMPORTANT: The full text of this file is available. To add it to the widget's knowledge base, call upload_knowledge_text with text set to "__FILE_CONTENT__". To answer questions about the file, use the preview above.\n---`;
}

// Store fullText in memory map
if (fileContext && fileContext.fullText) {
  cleanupPendingFiles();
  // Use session ID (existing or the one we're about to create)
  const sid = session._id.toString();
  pendingFileTexts.set(sid, { text: fileContext.fullText, timestamp: Date.now() });
}

// Add user message (use augmented version for Gemini, but store original for display)
session.messages.push({ role: 'user', content: augmentedMessage, timestamp: new Date() });
```

- [ ] **Step 4: Pass pendingFileText to ToolContext**

In the `toolContext` object creation (around line 74), add the field:

```typescript
const toolContext: ToolContext = {
  sessionId: currentSessionId,
  userId: auth.userId,
  baseUrl,
  cookie,
  write,
  userPlan,
  pendingFileText: pendingFileTexts.get(currentSessionId)?.text,
};
```

- [ ] **Step 5: Clean up pending file after agent loop**

After the agent loop completes (after `runAgentLoop` returns, around line 89), add:

```typescript
// Clean up pending file text
pendingFileTexts.delete(currentSessionId);
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/builder/chat/route.ts
git commit -m "feat: accept fileContext in builder chat, augment messages for Gemini"
```

---

## Task 6: Update System Prompt

**Files:**

- Modify: `src/lib/builder/systemPrompt.ts`

- [ ] **Step 1: Add file attachment instructions**

In `src/lib/builder/systemPrompt.ts`, after the `### Proactive Tools` section (around line 42), add:

```typescript
### File Attachments
Users can attach files (PDF, DOCX, TXT, MD, CSV, XLSX, images) via the paperclip button.
When a user attaches a file, you see the filename, metadata, and a content preview.
- To add file content to the widget's knowledge base: call upload_knowledge_text with text set to "__FILE_CONTENT__" — the system will substitute the full file text automatically
- To answer questions about the file: use the preview content provided in the message
- Default behavior: if the user just uploads a file without specific instructions, add it to the knowledge base and confirm what was added
- IMPORTANT: Do NOT call upload_knowledge_text before a widget is built (no clientId yet). Acknowledge the file, and upload it after the widget is created.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/builder/systemPrompt.ts
git commit -m "feat: add file attachment instructions to builder system prompt"
```

---

## Task 7: Add sendMessageWithFile to useBuilderStream

**Files:**

- Modify: `src/components/builder/useBuilderStream.ts`

- [ ] **Step 1: Add the sendMessageWithFile method**

After the existing `sendMessage` callback (around line 282), add a new method:

```typescript
const sendMessageWithFile = useCallback(
  async (
    message: string,
    fileContext: {
      filename: string;
      type: string;
      size: number;
      pages?: number;
      wordCount: number;
      preview: string;
      fullText: string;
    }
  ) => {
    // Add user message to UI (show filename badge)
    const displayMessage = message || `📎 ${fileContext.filename}`;
    const userMsg: BuilderMessage = {
      role: 'user',
      content: displayMessage,
      timestamp: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isStreaming: true,
      error: null,
    }));

    const assistantMsg: BuilderMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      toolCards: [],
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, assistantMsg],
    }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/builder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          message: message || 'User uploaded a file',
          fileContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to connect');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setState((prev) => ({
          ...prev,
          error: (err as Error).message,
        }));
      }
    } finally {
      setState((prev) => ({ ...prev, isStreaming: false }));
      abortRef.current = null;
    }
  },
  [state.sessionId, handleEvent]
);
```

**Note:** The SSE event handling in `sendMessageWithFile` duplicates the streaming logic from `sendMessage`. An alternative is to extract the common streaming logic into a helper, but for this MVP keeping it self-contained avoids risky refactoring of the existing sendMessage. The implementer can refactor if they see the duplication is clean to extract.

- [ ] **Step 2: Add sendMessageWithFile to the return object**

In the return statement (around line 287):

```typescript
return {
  ...state,
  sendMessage,
  sendMessageWithFile,
  stopStreaming,
  resetSession,
  restoreSession,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/builder/useBuilderStream.ts
git commit -m "feat: add sendMessageWithFile to builder stream hook"
```

---

## Task 8: Add Attachment Button and File Preview to BuilderChat

**Files:**

- Modify: `src/components/builder/BuilderChat.tsx`
- Modify: `src/app/dashboard/builder/page.tsx` (pass new prop)

This is the largest task — adds the UI button, file state, upload logic, and preview badge.

- [ ] **Step 1: Update Props interface to accept file upload handler**

In `BuilderChat.tsx`, update the `Props` interface (line ~31):

```typescript
interface Props {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  onSendMessage: (message: string) => void;
  onSendMessageWithFile?: (
    message: string,
    fileContext: {
      filename: string;
      type: string;
      size: number;
      pages?: number;
      wordCount: number;
      preview: string;
      fullText: string;
    }
  ) => void;
  suggestions?: string[];
  proactiveSuggestions?: Suggestion[] | null;
}
```

- [ ] **Step 2: Add file state and refs**

Inside the component function, after the existing state declarations (around line ~65), add:

```typescript
const [attachedFile, setAttachedFile] = useState<File | null>(null);
const [isUploading, setIsUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
```

- [ ] **Step 3: Add handleFileSelect and handleSendWithFile functions**

After the existing `handleSubmit` function:

```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate size (25 MB)
  if (file.size > 25 * 1024 * 1024) {
    alert('File too large. Maximum size is 25 MB.');
    return;
  }

  setAttachedFile(file);
  // Reset input so same file can be re-selected
  e.target.value = '';
};

const handleSubmitWithFile = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isStreaming || isUploading) return;
  if (!attachedFile && !input.trim()) return;

  if (attachedFile && onSendMessageWithFile) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', attachedFile);

      const res = await fetch('/api/builder/upload-file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to process file');
        setIsUploading(false);
        return;
      }

      onSendMessageWithFile(input.trim(), {
        filename: data.metadata.filename,
        type: data.metadata.type,
        size: data.metadata.size,
        pages: data.metadata.pages,
        wordCount: data.metadata.wordCount,
        preview: data.preview,
        fullText: data.text,
      });

      setInput('');
      setAttachedFile(null);
    } catch (err) {
      alert('Failed to upload file. Please try again.');
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  } else if (input.trim()) {
    playSendSound();
    onSendMessage(input.trim());
    setInput('');
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
```

- [ ] **Step 4: Replace the form's onSubmit handler**

Change the form's `onSubmit` from `handleSubmit` to `handleSubmitWithFile`:

```tsx
        <form
          onSubmit={handleSubmitWithFile}
```

- [ ] **Step 5: Add the file preview badge above the input form**

Right before the `<form>` element (after the top fade gradient div), add:

```tsx
{
  /* File preview badge */
}
{
  attachedFile && (
    <div
      className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <svg
        className="h-4 w-4 flex-shrink-0"
        style={{ color: '#22d3ee' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
      <span
        className="min-w-0 flex-1 truncate text-xs"
        style={{ color: '#e0e4ec', fontFamily: "'Outfit', sans-serif" }}
      >
        {attachedFile.name.length > 30 ? attachedFile.name.slice(0, 27) + '...' : attachedFile.name}
      </span>
      <span className="flex-shrink-0 text-xs" style={{ color: '#6b7280' }}>
        {formatFileSize(attachedFile.size)}
      </span>
      <button
        type="button"
        onClick={() => setAttachedFile(null)}
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors"
        style={{ color: '#6b7280' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6b7280';
        }}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Add hidden file input and attachment button**

Inside the `<div className="flex items-center gap-2 px-3 py-2.5">` (the input row), add the hidden file input and button BEFORE the mic button:

```tsx
{
  /* Hidden file input */
}
<input
  ref={fileInputRef}
  type="file"
  accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
  onChange={handleFileSelect}
  className="hidden"
/>;
{
  /* Attachment button */
}
<button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  disabled={isStreaming || isUploading}
  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-300 disabled:opacity-30"
  style={{
    background: attachedFile ? 'rgba(6,182,212,0.12)' : 'transparent',
    color: attachedFile ? '#22d3ee' : '#4a5068',
  }}
>
  <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
    />
  </svg>
</button>;
```

- [ ] **Step 7: Update send button disabled condition**

Change the send button's `disabled` attribute from:

```tsx
disabled={!input.trim() || isStreaming}
```

To:

```tsx
disabled={(!input.trim() && !attachedFile) || isStreaming || isUploading}
```

- [ ] **Step 8: Update input placeholder during upload**

Change the input `placeholder` from:

```tsx
placeholder={isStreaming ? 'Agent is working...' : 'Describe what you want to build...'}
```

To:

```tsx
placeholder={isUploading ? 'Uploading file...' : isStreaming ? 'Agent is working...' : 'Describe what you want to build...'}
```

- [ ] **Step 9: Update builder page to pass the new prop**

In `src/app/dashboard/builder/page.tsx`, find the `<BuilderChat>` component (around line 289) and add the new prop:

```tsx
                onSendMessage={(msg) => stream.sendMessage(msg)}
                onSendMessageWithFile={(msg, fileCtx) => stream.sendMessageWithFile(msg, fileCtx)}
```

- [ ] **Step 10: Verify the dev server shows the attachment button**

Open `http://localhost:3000/dashboard/builder` and verify:

1. Paperclip button appears in the input area
2. Clicking it opens a file picker
3. Selecting a file shows the preview badge

- [ ] **Step 11: Commit**

```bash
git add src/components/builder/BuilderChat.tsx src/app/dashboard/builder/page.tsx
git commit -m "feat: add file attachment button and preview badge to builder chat"
```

---

## Task 9: End-to-End Verification

- [ ] **Step 1: Test file upload flow**

1. Open builder at `http://localhost:3000/dashboard/builder`
2. Click paperclip button
3. Select a PDF or TXT file
4. Verify preview badge shows filename and size
5. Click send
6. Verify Gemini receives the file context and responds appropriately

- [ ] **Step 2: Test knowledge base upload**

1. Build a widget first (paste a URL)
2. After widget is deployed, attach a document
3. Verify Gemini adds content to knowledge base via `upload_knowledge_text`

- [ ] **Step 3: Test edge cases**

1. Try a file > 25 MB → should show error
2. Try an unsupported format (.exe) → should not be selectable (file picker filter)
3. Click X on preview badge → file should be removed
4. Send with file + text message → both should be sent

- [ ] **Step 4: Final commit with all changes**

```bash
git add -A
git commit -m "feat: builder file attachment — complete implementation"
git push origin main
```
