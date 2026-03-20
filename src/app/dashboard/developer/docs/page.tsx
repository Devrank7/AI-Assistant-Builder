'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Book,
  Code,
  Terminal,
  Copy,
  Check,
  ChevronRight,
  Zap,
  Lock,
  ArrowRight,
  ExternalLink,
  Key,
  BarChart3,
  MessageSquare,
  Brain,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  scope: string;
  params?: Param[];
  bodyParams?: Param[];
  responseExample: string;
  curlExample: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://winbixai.com/api/v1';

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  POST: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  PATCH: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const SCOPE_STYLES: Record<string, string> = {
  read: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  write: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  admin: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
};

const CATEGORIES: Category[] = [
  { id: 'getting-started', label: 'Getting Started', icon: <Zap className="h-3.5 w-3.5" /> },
  { id: 'authentication', label: 'Authentication', icon: <Lock className="h-3.5 w-3.5" /> },
  { id: 'widgets', label: 'Widgets', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { id: 'chat-logs', label: 'Chat Logs', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: <Brain className="h-3.5 w-3.5" /> },
  { id: 'rate-limits', label: 'Rate Limits', icon: <Key className="h-3.5 w-3.5" /> },
];

const ENDPOINTS: Endpoint[] = [
  // Widgets
  {
    id: 'get-widgets',
    method: 'GET',
    path: '/api/v1/widgets',
    description: 'Returns a paginated list of all widgets belonging to the authenticated account.',
    scope: 'read',
    params: [
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Results per page (default: 20, max: 100)' },
    ],
    responseExample: `{
  "data": [
    {
      "id": "wgt_01HXYZ",
      "name": "Support Widget",
      "status": "active",
      "createdAt": "2026-01-15T10:00:00Z",
      "config": {
        "primaryColor": "#6366f1",
        "position": "bottom-right"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3
  }
}`,
    curlExample: `curl -X GET "${BASE_URL}/widgets" \\
  -H "X-WinBix-Key: wbx_live_your_key_here" \\
  -H "Content-Type: application/json"`,
  },
  {
    id: 'get-widget',
    method: 'GET',
    path: '/api/v1/widgets/:id',
    description: 'Retrieves full details for a single widget by its ID.',
    scope: 'read',
    responseExample: `{
  "data": {
    "id": "wgt_01HXYZ",
    "name": "Support Widget",
    "status": "active",
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-02-20T08:30:00Z",
    "config": {
      "primaryColor": "#6366f1",
      "position": "bottom-right",
      "welcomeMessage": "Hi! How can I help?"
    },
    "stats": {
      "totalChats": 142,
      "avgResponseTime": 1.3
    }
  }
}`,
    curlExample: `curl -X GET "${BASE_URL}/widgets/wgt_01HXYZ" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
  {
    id: 'patch-widget',
    method: 'PATCH',
    path: '/api/v1/widgets/:id',
    description: "Partially updates a widget's configuration or metadata. Only provided fields are changed.",
    scope: 'write',
    bodyParams: [
      { name: 'name', type: 'string', required: false, description: 'Display name for the widget' },
      { name: 'config.primaryColor', type: 'string', required: false, description: 'Hex color code (e.g. #6366f1)' },
      { name: 'config.welcomeMessage', type: 'string', required: false, description: 'Greeting message shown on open' },
      { name: 'config.position', type: 'string', required: false, description: '"bottom-right" | "bottom-left"' },
    ],
    responseExample: `{
  "data": {
    "id": "wgt_01HXYZ",
    "name": "Updated Widget Name",
    "status": "active",
    "config": {
      "primaryColor": "#8b5cf6",
      "welcomeMessage": "Hello! Ask me anything.",
      "position": "bottom-right"
    },
    "updatedAt": "2026-03-20T12:00:00Z"
  }
}`,
    curlExample: `curl -X PATCH "${BASE_URL}/widgets/wgt_01HXYZ" \\
  -H "X-WinBix-Key: wbx_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Updated Widget Name","config":{"primaryColor":"#8b5cf6"}}'`,
  },
  {
    id: 'delete-widget',
    method: 'DELETE',
    path: '/api/v1/widgets/:id',
    description:
      'Deactivates a widget. The widget is soft-deleted and will stop responding to chat requests. This action requires admin scope.',
    scope: 'admin',
    responseExample: `{
  "data": {
    "id": "wgt_01HXYZ",
    "status": "deactivated",
    "deactivatedAt": "2026-03-20T12:00:00Z"
  },
  "message": "Widget deactivated successfully"
}`,
    curlExample: `curl -X DELETE "${BASE_URL}/widgets/wgt_01HXYZ" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
  // Analytics
  {
    id: 'get-analytics',
    method: 'GET',
    path: '/api/v1/analytics',
    description: 'Returns aggregated analytics for a widget over a specified time window.',
    scope: 'read',
    params: [
      { name: 'widgetId', type: 'string', required: true, description: 'Target widget ID' },
      { name: 'days', type: 'number', required: false, description: 'Lookback window in days (default: 30, max: 365)' },
    ],
    responseExample: `{
  "data": {
    "widgetId": "wgt_01HXYZ",
    "period": {
      "from": "2026-02-19T00:00:00Z",
      "to": "2026-03-20T23:59:59Z",
      "days": 30
    },
    "metrics": {
      "totalSessions": 312,
      "uniqueVisitors": 289,
      "avgSessionDuration": 94,
      "messagesSent": 1047,
      "leadsCollected": 28,
      "satisfactionScore": 4.7
    },
    "dailyBreakdown": [
      { "date": "2026-03-20", "sessions": 14, "messages": 42 }
    ]
  }
}`,
    curlExample: `curl -X GET "${BASE_URL}/analytics?widgetId=wgt_01HXYZ&days=30" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
  // Chat Logs
  {
    id: 'get-chatlogs',
    method: 'GET',
    path: '/api/v1/chatlogs',
    description: 'Retrieves paginated chat session logs for a widget, ordered by most recent first.',
    scope: 'read',
    params: [
      { name: 'widgetId', type: 'string', required: true, description: 'Target widget ID' },
      { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
      { name: 'limit', type: 'number', required: false, description: 'Items per page (default: 50, max: 100)' },
    ],
    responseExample: `{
  "data": [
    {
      "id": "log_01ABCD",
      "widgetId": "wgt_01HXYZ",
      "visitorId": "vis_anon_9f2a",
      "startedAt": "2026-03-20T10:14:33Z",
      "endedAt": "2026-03-20T10:17:02Z",
      "messages": [
        { "role": "user", "content": "What are your business hours?", "at": "2026-03-20T10:14:35Z" },
        { "role": "assistant", "content": "We're open Mon–Fri 9am–6pm EST.", "at": "2026-03-20T10:14:36Z" }
      ],
      "leadCaptured": false
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 312 }
}`,
    curlExample: `curl -X GET "${BASE_URL}/chatlogs?widgetId=wgt_01HXYZ&page=1&limit=50" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
  // Knowledge Base
  {
    id: 'get-knowledge',
    method: 'GET',
    path: '/api/v1/knowledge',
    description: 'Lists all knowledge chunks associated with a widget.',
    scope: 'read',
    params: [{ name: 'widgetId', type: 'string', required: true, description: 'Target widget ID' }],
    responseExample: `{
  "data": [
    {
      "id": "knw_01EFGH",
      "widgetId": "wgt_01HXYZ",
      "title": "Return Policy",
      "content": "We accept returns within 30 days of purchase...",
      "source": "manual",
      "createdAt": "2026-01-20T09:00:00Z"
    }
  ],
  "meta": { "total": 24 }
}`,
    curlExample: `curl -X GET "${BASE_URL}/knowledge?widgetId=wgt_01HXYZ" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
  {
    id: 'post-knowledge',
    method: 'POST',
    path: '/api/v1/knowledge',
    description:
      "Adds a new knowledge chunk to a widget's knowledge base. The chunk is immediately available for AI responses.",
    scope: 'write',
    bodyParams: [
      { name: 'widgetId', type: 'string', required: true, description: 'Target widget ID' },
      { name: 'title', type: 'string', required: true, description: 'Short descriptive title for this chunk' },
      { name: 'content', type: 'string', required: true, description: 'The knowledge text (max 8,000 characters)' },
      { name: 'source', type: 'string', required: false, description: '"manual" | "url" | "file" (default: "manual")' },
    ],
    responseExample: `{
  "data": {
    "id": "knw_01IJKL",
    "widgetId": "wgt_01HXYZ",
    "title": "Shipping Policy",
    "content": "Standard shipping takes 3–5 business days...",
    "source": "manual",
    "createdAt": "2026-03-20T12:00:00Z"
  }
}`,
    curlExample: `curl -X POST "${BASE_URL}/knowledge" \\
  -H "X-WinBix-Key: wbx_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"widgetId":"wgt_01HXYZ","title":"Shipping Policy","content":"Standard shipping takes 3–5 business days..."}'`,
  },
  {
    id: 'delete-knowledge',
    method: 'DELETE',
    path: '/api/v1/knowledge/:id',
    description: 'Permanently removes a knowledge chunk. This action cannot be undone.',
    scope: 'write',
    responseExample: `{
  "data": {
    "id": "knw_01IJKL",
    "deleted": true,
    "deletedAt": "2026-03-20T12:05:00Z"
  },
  "message": "Knowledge chunk deleted successfully"
}`,
    curlExample: `curl -X DELETE "${BASE_URL}/knowledge/knw_01IJKL" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`,
  },
];

const RATE_LIMITS = [
  { plan: 'Free', rate: '—', access: 'No API access' },
  { plan: 'Starter', rate: '60 / min', access: 'Basic' },
  { plan: 'Pro', rate: '300 / min', access: 'Full' },
  { plan: 'Enterprise', rate: '1,000 / min', access: 'Full + Custom' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-text-secondary hover:text-text-primary hover:bg-bg-secondary hover:border-border flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium transition-all"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="border-border bg-bg-tertiary relative overflow-hidden rounded-xl border">
      <div className="border-border flex items-center justify-between border-b px-4 py-2">
        <span className="text-text-tertiary text-[11px] font-medium tracking-wider uppercase">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="text-text-secondary overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${METHOD_STYLES[method]}`}
    >
      {method}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${SCOPE_STYLES[scope] ?? 'bg-bg-tertiary text-text-tertiary'}`}
    >
      <Lock className="h-2.5 w-2.5" />
      {scope}
    </span>
  );
}

function ParamTable({ params, title }: { params: Param[]; title: string }) {
  return (
    <div>
      <h4 className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">{title}</h4>
      <div className="border-border overflow-hidden rounded-xl border">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-border bg-bg-tertiary border-b">
              <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Name
              </th>
              <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Type
              </th>
              <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Required
              </th>
              <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.name} className={i < params.length - 1 ? 'border-border border-b' : ''}>
                <td className="text-text-primary px-4 py-2.5 font-mono">{p.name}</td>
                <td className="px-4 py-2.5 font-mono text-violet-400">{p.type}</td>
                <td className="px-4 py-2.5">
                  {p.required ? (
                    <span className="font-medium text-rose-400">Yes</span>
                  ) : (
                    <span className="text-text-tertiary">No</span>
                  )}
                </td>
                <td className="text-text-secondary px-4 py-2.5">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border bg-bg-secondary overflow-hidden rounded-2xl border transition-all">
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-bg-tertiary/50 flex w-full items-center gap-3 px-5 py-4 text-left transition-colors"
      >
        <MethodBadge method={endpoint.method} />
        <code className="text-text-primary flex-1 truncate font-mono text-[13px]">{endpoint.path}</code>
        <ScopeBadge scope={endpoint.scope} />
        <ChevronRight
          className={`text-text-tertiary h-4 w-4 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded body */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="border-border space-y-5 border-t px-5 py-5"
        >
          <p className="text-text-secondary text-[14px] leading-relaxed">{endpoint.description}</p>

          {/* Request headers */}
          <div>
            <h4 className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">
              Required Headers
            </h4>
            <div className="border-border overflow-hidden rounded-xl border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-border bg-bg-tertiary border-b">
                    <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Header
                    </th>
                    <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-border border-b">
                    <td className="text-text-primary px-4 py-2.5 font-mono">X-WinBix-Key</td>
                    <td className="text-text-secondary px-4 py-2.5 font-mono">wbx_live_your_key_here</td>
                  </tr>
                  {(endpoint.method === 'POST' || endpoint.method === 'PATCH') && (
                    <tr>
                      <td className="text-text-primary px-4 py-2.5 font-mono">Content-Type</td>
                      <td className="text-text-secondary px-4 py-2.5 font-mono">application/json</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {endpoint.params && endpoint.params.length > 0 && (
            <ParamTable params={endpoint.params} title="Query Parameters" />
          )}

          {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
            <ParamTable params={endpoint.bodyParams} title="Request Body" />
          )}

          <div>
            <h4 className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">
              Response Example
            </h4>
            <CodeBlock code={endpoint.responseExample} language="json" />
          </div>

          <div>
            <h4 className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">cURL Example</h4>
            <CodeBlock code={endpoint.curlExample} language="bash" />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Smooth scroll to section
  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileSidebarOpen(false);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const widgetEndpoints = ENDPOINTS.filter((e) =>
    ['get-widgets', 'get-widget', 'patch-widget', 'delete-widget'].includes(e.id)
  );
  const analyticsEndpoints = ENDPOINTS.filter((e) => e.id === 'get-analytics');
  const chatlogEndpoints = ENDPOINTS.filter((e) => e.id === 'get-chatlogs');
  const knowledgeEndpoints = ENDPOINTS.filter((e) =>
    ['get-knowledge', 'post-knowledge', 'delete-knowledge'].includes(e.id)
  );

  const sectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  // ── Sidebar ──

  const SidebarContent = () => (
    <nav className="space-y-0.5 px-3 py-4">
      <div className="text-text-tertiary mb-3 px-3 text-[11px] font-semibold tracking-widest uppercase">
        API Reference
      </div>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => scrollTo(cat.id)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
            activeSection === cat.id
              ? 'bg-accent/10 text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          <span className={activeSection === cat.id ? 'text-accent' : 'text-text-tertiary'}>{cat.icon}</span>
          {cat.label}
          {activeSection === cat.id && <ArrowRight className="text-accent ml-auto h-3 w-3" />}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="relative flex min-h-full">
      {/* ── Desktop Left Sidebar ─────────────────────────────────────────── */}
      <aside className="border-border bg-bg-secondary sticky top-[48px] hidden h-[calc(100vh-48px)] w-56 flex-shrink-0 overflow-y-auto border-r xl:block">
        <SidebarContent />
      </aside>

      {/* ── Mobile Top Tabs ───────────────────────────────────────────────── */}
      <div className="mb-4 w-full xl:hidden">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="border-border bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors"
          >
            <Book className="h-4 w-4" />
            Sections
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${mobileSidebarOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-border bg-bg-secondary mb-4 rounded-2xl border"
          >
            <SidebarContent />
          </motion.div>
        )}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => scrollTo(cat.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
                activeSection === cat.id
                  ? 'bg-accent/10 text-accent border-accent/20 border'
                  : 'bg-bg-secondary text-text-secondary border-border hover:text-text-primary border'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="min-w-0 flex-1 space-y-12 pb-16 xl:px-8 xl:py-2">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-4"
        >
          <div className="bg-accent/10 border-accent/20 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border">
            <Code className="text-accent h-5 w-5" />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-bold tracking-tight">API Reference</h1>
            <p className="text-text-secondary mt-1 text-[14px]">
              Integrate WinBix AI into your products with our REST API.
            </p>
          </div>
        </motion.div>

        {/* ── Getting Started ─────────────────────────────────────────── */}
        <section id="getting-started" ref={sectionRef('getting-started')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Getting Started</h2>
          </div>

          <div className="border-border bg-bg-secondary space-y-5 rounded-2xl border p-6">
            {/* Base URL */}
            <div>
              <p className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">Base URL</p>
              <div className="border-border bg-bg-tertiary flex items-center gap-3 rounded-xl border px-4 py-3">
                <ExternalLink className="text-text-tertiary h-4 w-4 flex-shrink-0" />
                <code className="text-text-primary flex-1 font-mono text-[14px]">{BASE_URL}</code>
                <CopyButton text={BASE_URL} />
              </div>
            </div>

            {/* Quick start steps */}
            <div>
              <p className="text-text-tertiary mb-3 text-[12px] font-semibold tracking-wider uppercase">Quick Start</p>
              <ol className="space-y-3">
                {[
                  {
                    step: '1',
                    title: 'Get your API key',
                    desc: 'Navigate to Settings → API Keys and generate a new key.',
                    icon: <Key className="text-accent h-4 w-4" />,
                  },
                  {
                    step: '2',
                    title: 'Add the header',
                    desc: 'Include X-WinBix-Key in every request.',
                    icon: <Lock className="h-4 w-4 text-violet-400" />,
                  },
                  {
                    step: '3',
                    title: 'Make your first request',
                    desc: 'Call GET /api/v1/widgets to list your widgets.',
                    icon: <Terminal className="h-4 w-4 text-emerald-400" />,
                  },
                ].map(({ step, title, desc, icon }) => (
                  <li
                    key={step}
                    className="border-border bg-bg-tertiary/50 flex items-start gap-4 rounded-xl border px-4 py-3"
                  >
                    <div className="bg-accent/10 border-accent/20 text-accent flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border text-[12px] font-bold">
                      {step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        {icon}
                        <span className="text-text-primary text-[14px] font-semibold">{title}</span>
                      </div>
                      <p className="text-text-secondary text-[13px]">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <CodeBlock
              code={`curl -X GET "${BASE_URL}/widgets" \\
  -H "X-WinBix-Key: wbx_live_your_key_here"`}
              language="bash"
            />
          </div>
        </section>

        {/* ── Authentication ───────────────────────────────────────────── */}
        <section id="authentication" ref={sectionRef('authentication')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5 text-violet-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Authentication</h2>
          </div>

          <div className="border-border bg-bg-secondary space-y-5 rounded-2xl border p-6">
            <p className="text-text-secondary text-[14px] leading-relaxed">
              All requests must include your API key in the{' '}
              <code className="text-text-primary bg-bg-tertiary rounded-md px-1.5 py-0.5 font-mono text-[13px]">
                X-WinBix-Key
              </code>{' '}
              request header. Keys are prefixed with{' '}
              <code className="text-text-primary bg-bg-tertiary rounded-md px-1.5 py-0.5 font-mono text-[13px]">
                wbx_live_
              </code>{' '}
              for production and{' '}
              <code className="text-text-primary bg-bg-tertiary rounded-md px-1.5 py-0.5 font-mono text-[13px]">
                wbx_test_
              </code>{' '}
              for sandbox.
            </p>

            <div>
              <p className="text-text-tertiary mb-2 text-[12px] font-semibold tracking-wider uppercase">Header</p>
              <div className="border-border bg-bg-tertiary flex items-center gap-3 rounded-xl border px-4 py-3">
                <code className="text-text-secondary font-mono text-[13px]">X-WinBix-Key:</code>
                <code className="text-text-primary font-mono text-[13px]">wbx_live_your_key_here</code>
                <CopyButton text="X-WinBix-Key: wbx_live_your_key_here" />
              </div>
            </div>

            {/* Scopes */}
            <div>
              <p className="text-text-tertiary mb-3 text-[12px] font-semibold tracking-wider uppercase">
                Permission Scopes
              </p>
              <div className="border-border overflow-hidden rounded-xl border">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-border bg-bg-tertiary border-b">
                      <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                        Scope
                      </th>
                      <th className="text-text-tertiary px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider uppercase">
                        Permissions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { scope: 'read', desc: 'List and retrieve resources. Cannot modify data.' },
                      { scope: 'write', desc: 'Create, update, and delete most resources.' },
                      {
                        scope: 'admin',
                        desc: 'Full access including destructive operations (widget deactivation, account management).',
                      },
                    ].map(({ scope, desc }, i, arr) => (
                      <tr key={scope} className={i < arr.length - 1 ? 'border-border border-b' : ''}>
                        <td className="px-4 py-3">
                          <ScopeBadge scope={scope} />
                        </td>
                        <td className="text-text-secondary px-4 py-3">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* ── Widgets ──────────────────────────────────────────────────── */}
        <section id="widgets" ref={sectionRef('widgets')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Widgets</h2>
          </div>
          <p className="text-text-secondary text-[14px]">Manage and configure your chat widgets programmatically.</p>
          <div className="space-y-3">
            {widgetEndpoints.map((ep) => (
              <motion.div
                key={ep.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <EndpointCard endpoint={ep} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Analytics ────────────────────────────────────────────────── */}
        <section id="analytics" ref={sectionRef('analytics')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Analytics</h2>
          </div>
          <p className="text-text-secondary text-[14px]">
            Retrieve usage metrics, session counts, and performance data for your widgets.
          </p>
          <div className="space-y-3">
            {analyticsEndpoints.map((ep) => (
              <EndpointCard key={ep.id} endpoint={ep} />
            ))}
          </div>
        </section>

        {/* ── Chat Logs ─────────────────────────────────────────────────── */}
        <section id="chat-logs" ref={sectionRef('chat-logs')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-sky-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Chat Logs</h2>
          </div>
          <p className="text-text-secondary text-[14px]">Access full conversation transcripts and session metadata.</p>
          <div className="space-y-3">
            {chatlogEndpoints.map((ep) => (
              <EndpointCard key={ep.id} endpoint={ep} />
            ))}
          </div>
        </section>

        {/* ── Knowledge Base ────────────────────────────────────────────── */}
        <section id="knowledge-base" ref={sectionRef('knowledge-base')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <Brain className="h-5 w-5 text-purple-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Knowledge Base</h2>
          </div>
          <p className="text-text-secondary text-[14px]">
            Programmatically manage the knowledge chunks that power your AI responses.
          </p>
          <div className="space-y-3">
            {knowledgeEndpoints.map((ep) => (
              <EndpointCard key={ep.id} endpoint={ep} />
            ))}
          </div>
        </section>

        {/* ── Rate Limits ───────────────────────────────────────────────── */}
        <section id="rate-limits" ref={sectionRef('rate-limits')} className="scroll-mt-16 space-y-4">
          <div className="flex items-center gap-2.5">
            <Key className="h-5 w-5 text-rose-400" />
            <h2 className="text-text-primary text-[18px] font-bold">Rate Limits</h2>
          </div>

          <div className="border-border bg-bg-secondary space-y-5 rounded-2xl border p-6">
            <p className="text-text-secondary text-[14px] leading-relaxed">
              Rate limits are enforced per API key on a rolling 60-second window. When a limit is exceeded the API
              returns
              <code className="bg-bg-tertiary mx-1 rounded-md px-1.5 py-0.5 font-mono text-[13px] text-rose-400">
                429 Too Many Requests
              </code>
              . Retry after the number of seconds indicated in the
              <code className="text-text-primary bg-bg-tertiary mx-1 rounded-md px-1.5 py-0.5 font-mono text-[13px]">
                Retry-After
              </code>{' '}
              header.
            </p>

            <div className="border-border overflow-hidden rounded-xl border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-bg-tertiary border-border border-b">
                    <th className="text-text-tertiary px-5 py-3 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Plan
                    </th>
                    <th className="text-text-tertiary px-5 py-3 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Rate Limit
                    </th>
                    <th className="text-text-tertiary px-5 py-3 text-left text-[11px] font-semibold tracking-wider uppercase">
                      API Access
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {RATE_LIMITS.map(({ plan, rate, access }, i) => (
                    <tr key={plan} className={i < RATE_LIMITS.length - 1 ? 'border-border border-b' : ''}>
                      <td className="text-text-primary px-5 py-3 font-semibold">{plan}</td>
                      <td className="text-text-secondary px-5 py-3 font-mono">{rate}</td>
                      <td className="px-5 py-3">
                        {access === 'No API access' ? (
                          <span className="text-text-tertiary">{access}</span>
                        ) : access.includes('Custom') ? (
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <Zap className="h-3.5 w-3.5" /> {access}
                          </span>
                        ) : (
                          <span className="text-emerald-400">{access}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <p className="text-text-secondary text-[13px]">
                Need higher limits? <span className="font-medium text-amber-400">Enterprise plans</span> offer 1,000
                req/min with custom bursting and dedicated infrastructure. Contact{' '}
                <span className="text-accent font-medium">sales@winbixai.com</span> to upgrade.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
