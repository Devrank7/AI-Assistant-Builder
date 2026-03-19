# Builder File Attachment — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a file attachment button to the AI Builder chat that lets users upload documents (PDF, DOCX, TXT, MD, CSV, XLSX) and images (PNG, JPG, WEBP) up to 25 MB. The Gemini agent sees the file content and decides whether to add it to the widget's knowledge base or answer questions about it.

**Architecture:** Upload-first approach. File is parsed server-side into text, then a preview (first 3000 chars + metadata) is injected into the user's message context for Gemini. Gemini decides what to do — add to knowledge via existing `upload_knowledge_text` tool, or respond based on content. No new Gemini tools needed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (main app), Gemini Vision API for OCR, `xlsx` for spreadsheets.

---

## 1. UI — Attachment Button & File Preview

### 1.1 Attachment Button

**Location:** `src/components/builder/BuilderChat.tsx`, input area (line ~769)

**Placement:** Between the microphone button and the text input field.

**Appearance:**

- Same dimensions as mic button: `h-9 w-9 rounded-xl`
- Paperclip icon (SVG, matching existing icon style — 18x18, stroke 1.5)
- Default state: muted color (`#4a5068`), transparent background
- Hover state: subtle background (`rgba(255,255,255,0.05)`)
- Disabled during streaming (same as other controls)
- Hidden `<input type="file">` triggered by button click

**Accepted formats:** `.pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp`

### 1.2 File Preview Badge

After file selection, a preview badge appears **above the input form** (between messages and input area):

- Pill-shaped badge with frosted glass background (matches input area style)
- Left: file type icon (document/image/spreadsheet)
- Center: filename (truncated to 30 chars) + file size (e.g., "2.4 MB")
- Right: "X" button to remove the file
- Subtle slide-up animation on appear

### 1.3 Send Behavior

- User can send file with text message, or file alone (empty input)
- When file is attached and user clicks send: upload starts, input shows "Uploading..." state
- Send button disabled condition: `disabled={(!input.trim() && !attachedFile) || isStreaming}`
- After upload completes, message + file context sent to chat endpoint
- File badge disappears after send

---

## 2. Upload Endpoint

### `POST /api/builder/upload-file`

**Purpose:** Parse an uploaded file into text + metadata. Does NOT save to knowledge base — that's Gemini's decision.

**Authentication:** Same as chat endpoint — `verifyUser(request)`. Reject unauthenticated requests with 401.

**Input:** FormData with `file` field

**Processing:**

1. Validate file size (max 25 MB)
2. Validate file extension (whitelist)
3. Validate MIME type as secondary check (`file.type` from FormData)
4. Route to appropriate parser:
   - PDF → `pdf-parse`
   - DOCX → `mammoth`
   - TXT/MD → UTF-8 decode
   - CSV → built-in line-by-line parsing (no external dependency)
   - XLSX → `xlsx` (SheetJS) — convert all sheets to text
   - PNG/JPG/WEBP → Gemini Vision API for OCR
5. Truncate extracted text to 500,000 characters max (append "[Content truncated]" if exceeded)
6. Return parsed result

**Response:**

```json
{
  "success": true,
  "text": "full extracted text...",
  "preview": "first 3000 characters...",
  "metadata": {
    "filename": "pricing.pdf",
    "type": "pdf",
    "size": 2457600,
    "pages": 15,
    "wordCount": 4200
  }
}
```

**Error cases:**

- File too large (>25 MB) → 413 with message
- Unsupported format → 400 with supported formats list
- Parse failure → 500 with descriptive error
- Empty document → 400 "Document is empty or could not be parsed"

---

## 3. Document Parser Extensions

### File: `src/lib/documentParser.ts`

**Add support for:**

### 3.1 CSV Parsing

- Use `papaparse` library for robust CSV parsing (handles quoted fields, escaped quotes, newlines within quotes, semicolon delimiters)
- Convert to readable text format: `Row 1: col1=val1, col2=val2, ...`
- Limit to first 500 rows to avoid massive text output
- Install: `npm install papaparse @types/papaparse`

### 3.2 XLSX Parsing

- Use `xlsx` (SheetJS) package
- Iterate all sheets, convert each to CSV-like text
- Include sheet names as headers: `## Sheet: Products\n...`
- Limit to first 500 rows per sheet
- New type in `ParsedDocument.metadata.type`: `'xlsx'`

### 3.3 Image OCR via Gemini Vision

- Use existing Gemini API connection (`@google/genai`) with the same model used in the builder (`gemini-2.0-flash` or whatever is configured in `src/lib/builder/geminiAgent.ts`)
- Reuse the existing `GoogleGenAI` client instance from `src/lib/gemini.ts`
- Send image buffer as inline data with prompt: "Extract all text from this image. Return only the extracted text, nothing else."
- Works for screenshots of menus, pricing tables, business cards, etc.
- New type: `'image'`

### Updated `ParsedDocument` interface:

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

---

## 4. Chat Endpoint Modification

### File: `src/app/api/builder/chat/route.ts`

**Change:** Accept optional `fileContext` in request body.

**New request shape:**

```typescript
{
  sessionId?: string;
  message: string;
  fileContext?: {
    filename: string;
    type: string;
    size: number;
    pages?: number;
    wordCount: number;
    preview: string;   // first 3000 chars
    fullText: string;  // complete extracted text
  }
}
```

**When fileContext is present:**

The user message sent to Gemini is augmented:

```
{user's text message, or "User uploaded a file" if no text}

---
[Attached file: {filename} ({type}, {pages} pages, {wordCount} words, {size} bytes)]
Content preview:
{preview - first 3000 chars}

IMPORTANT: The full text of this file is available. If the user wants to add it to the widget's knowledge base, use the upload_knowledge_text tool with the full content. If the user is asking a question about the file, answer based on the preview above.
---
```

### fullText Storage & Injection Mechanism

**Storage:** The `fullText` is stored in-memory on the server in a module-level `Map<string, string>` keyed by `sessionId` inside the chat route handler (`src/app/api/builder/chat/route.ts`). NOT in MongoDB (avoids 16 MB BSON limit). NOT on the client (avoids round-trip waste).

**Flow:**

1. Client sends `fileContext` (with `fullText`) to `/api/builder/chat`
2. Server stores `fullText` in `pendingFileTexts.set(sessionId, fullText)`
3. Server sends only the preview (3000 chars) to Gemini in the augmented message
4. When Gemini calls `upload_knowledge_text`, the tool executor checks `pendingFileTexts.get(sessionId)` — if present and the tool's `text` arg matches a marker like `"__FILE_CONTENT__"`, the system substitutes the full text
5. After the agent loop completes (or after 5 minutes), the entry is deleted: `pendingFileTexts.delete(sessionId)`

**Size limit:** Extracted text is capped at 500,000 characters (enforced in the upload endpoint). This keeps the in-memory map safe — worst case ~500 KB per active session.

**Multiple files:** Each new file upload overwrites the previous entry for that session. Only one pending file at a time.

**ToolContext extension:** Add `pendingFileText?: string` to the `ToolContext` interface. The chat route populates it from the map before running the agent loop. The `upload_knowledge_text` tool checks `ctx.pendingFileText` when it sees the `__FILE_CONTENT__` marker.

---

## 5. System Prompt Update

### File: `src/lib/builder/systemPrompt.ts`

Add to the capabilities section:

```
### File Attachments
Users can attach files (PDF, DOCX, TXT, MD, CSV, XLSX, images) via the paperclip button.
When a user attaches a file, you see the filename, metadata, and a content preview.
- To add file content to the widget's knowledge base: call upload_knowledge_text with text set to "__FILE_CONTENT__" — the system will substitute the full file text automatically
- To answer questions about the file: use the preview content provided in the message
- Default behavior: if the user just uploads a file without specific instructions, add it to the knowledge base and confirm what was added
- IMPORTANT: Do NOT call upload_knowledge_text before a widget is built (no clientId yet). Acknowledge the file, and upload it after the widget is created.
```

---

## 6. Edge Cases

- **No widget built yet:** If user uploads a file before building a widget, Gemini is instructed (via system prompt) to NOT call `upload_knowledge_text` until a widget exists. Instead, Gemini acknowledges the file and remembers it. After `build_deploy` completes and a `clientId` exists, Gemini can then call `upload_knowledge_text`. The `pendingFileText` in-memory map retains the text for the duration of the session (up to 5 min timeout or until used).
- **Large files (>3000 chars):** Only preview sent to Gemini. Full text available via upload_knowledge_text tool
- **Image with no text:** Gemini Vision returns empty → respond "Could not extract text from this image"
- **Corrupt/unreadable file:** Parser throws → show user-friendly error: "Could not read this file. Please try a different format."
- **Upload during streaming:** Attachment button disabled while agent is working
- **Mobile:** File input works natively on mobile browsers (camera/files picker)

---

## 7. What NOT to Build

- No drag-and-drop (can be added later)
- No multi-file upload (one file at a time)
- No file storage/history (files are parsed and discarded)
- No progress bar for upload (files parse fast enough for a spinner)
- No file preview rendering (no PDF viewer, no image thumbnail in chat)

---

## 8. Files to Create/Modify

| Action  | File                                       | Purpose                                             |
| ------- | ------------------------------------------ | --------------------------------------------------- |
| Modify  | `src/components/builder/BuilderChat.tsx`   | Attachment button, file preview badge, upload logic |
| Modify  | `src/lib/documentParser.ts`                | Add CSV, XLSX, image OCR support                    |
| Create  | `src/app/api/builder/upload-file/route.ts` | Parse file endpoint (no DB writes)                  |
| Modify  | `src/app/api/builder/chat/route.ts`        | Accept fileContext in request body                  |
| Modify  | `src/lib/builder/systemPrompt.ts`          | Add file attachment instructions                    |
| Modify  | `src/lib/builder/toolRegistry.ts`          | Add `pendingFileText` to `ToolContext` interface    |
| Install | `xlsx`                                     | XLSX parsing (SheetJS)                              |
| Install | `papaparse`, `@types/papaparse`            | Robust CSV parsing                                  |

---

## 9. Acceptance Criteria

1. Paperclip button appears in builder chat input area, between mic and text input
2. Clicking it opens file picker with correct format filter
3. Selected file shows preview badge above input with name, size, and remove button
4. Uploading a PDF/DOCX/TXT extracts text correctly
5. Uploading a CSV/XLSX extracts tabular data as text
6. Uploading an image extracts text via Gemini Vision OCR
7. Files >25 MB are rejected with clear error message
8. Gemini sees file content preview and metadata in the message
9. Gemini can add file content to knowledge base via upload_knowledge_text
10. Gemini can answer questions about file content based on preview
11. Upload button disabled during streaming
12. File badge has working remove button
13. Works on mobile browsers
