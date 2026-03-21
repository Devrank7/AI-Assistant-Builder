'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  Globe,
  Code2,
  Blocks,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Zap,
  Download,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Key,
  Webhook,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tag,
  Monitor,
  Smartphone,
  Package,
  Layout,
  Search,
} from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/ui';

const PRODUCTION_URL = 'https://winbixai.com';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WidgetInfo {
  clientId: string;
  widgetName: string;
  clientType: 'quick' | 'full';
  widgetType: string;
  website: string | null;
  embedCode: string;
  clientToken: string;
  installationVerified: boolean;
  lastVerified: string;
}

type TabId = 'script' | 'wordpress' | 'shopify' | 'react' | 'gtm' | 'wix' | 'tilda' | 'webflow';

interface TabStep {
  title: string;
  content: string;
  code?: string;
  language?: string;
  tip?: string;
  warning?: string;
}

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  description: string;
  steps: (embedCode: string, embedCodeDefer: string, clientId: string) => TabStep[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEmbedCode(clientId: string, clientType: string): string {
  const folder = clientType === 'full' ? 'widgets' : 'quickwidgets';
  return `<script src="${PRODUCTION_URL}/${folder}/${clientId}/script.js"></script>`;
}

function getEmbedCodeDefer(clientId: string, clientType: string): string {
  const folder = clientType === 'full' ? 'widgets' : 'quickwidgets';
  return `<script src="${PRODUCTION_URL}/${folder}/${clientId}/script.js" defer></script>`;
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

const TABS: TabDef[] = [
  {
    id: 'script',
    label: 'Script Tag',
    icon: '🔖',
    description: 'Universal — works on any HTML page',
    steps: (embedCode) => [
      {
        title: 'Copy the embed code',
        content: 'This single script tag is everything you need. Copy it using the button above.',
        code: embedCode,
        language: 'html',
      },
      {
        title: 'Open your HTML file',
        content: 'Open the HTML file for your webpage in a code editor (VS Code, Sublime Text, Notepad++, etc.).',
      },
      {
        title: 'Paste before </body>',
        content: 'Find the closing </body> tag near the bottom of the file. Paste the code immediately before it.',
        code: `<!-- Your page content here -->

<!-- WinBix AI Widget -->
${embedCode}
</body>
</html>`,
        language: 'html',
        tip: 'Always place scripts before </body>, not in <head> — this ensures the widget loads after your page content.',
      },
      {
        title: 'Save and test',
        content:
          'Save the file, refresh your website in an incognito window. The chat button will appear in the bottom-right corner.',
        tip: "The widget loads asynchronously and won't affect your page speed score.",
      },
    ],
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    icon: '🔵',
    description: 'Using WPCode plugin (recommended)',
    steps: (embedCode) => [
      {
        title: 'Install the WPCode plugin',
        content:
          'In your WordPress admin panel, go to Plugins → Add New. Search for "WPCode" (formerly Insert Headers and Footers). Install and activate.',
        tip: 'WPCode is the safest method — changes survive theme updates.',
      },
      {
        title: 'Open Code Snippets → Header & Footer',
        content: 'In the left sidebar, go to Code Snippets → Header & Footer. You will see input areas for each zone.',
      },
      {
        title: 'Paste in the Footer section',
        content: 'Scroll to the "Body" or "Footer" section. Paste the embed code there.',
        code: embedCode,
        language: 'html',
      },
      {
        title: 'Save changes',
        content: 'Click "Save Changes". The widget now appears on every page of your WordPress site.',
      },
      {
        title: 'Alternative: Theme functions.php',
        content:
          'Advanced users can enqueue the script via functions.php. Go to Appearance → Theme File Editor → functions.php and add:',
        code: `function winbix_widget_script() {
    wp_enqueue_script(
        'winbix-ai-widget',
        '${embedCode.match(/src="([^"]+)"/)?.[1] ?? ''}',
        [],
        null,
        true  // load in footer
    );
}
add_action( 'wp_enqueue_scripts', 'winbix_widget_script' );`,
        language: 'php',
        warning: 'Editing functions.php directly can break your site. Use a child theme or WPCode instead.',
      },
    ],
  },
  {
    id: 'shopify',
    label: 'Shopify',
    icon: '🟢',
    description: 'Add to theme.liquid',
    steps: (_, embedCodeDefer) => [
      {
        title: 'Open your Shopify admin',
        content: 'Log in to your Shopify store and navigate to Online Store → Themes.',
      },
      {
        title: 'Edit your active theme code',
        content: 'Click the "..." button next to your active theme, then select "Edit code".',
      },
      {
        title: 'Open theme.liquid',
        content:
          'In the Layout folder on the left, click "theme.liquid". This is the master template for your entire store.',
      },
      {
        title: 'Paste before </body>',
        content: 'Use Ctrl+F / Cmd+F to find </body>. Paste the embed code directly above it.',
        code: `<!-- WinBix AI Widget -->
${embedCodeDefer}
</body>`,
        language: 'html',
        tip: "We use the defer attribute here so the widget does not block your store's critical rendering path.",
      },
      {
        title: 'Save',
        content: 'Click "Save" in the top right. The widget will instantly appear on all pages of your store.',
      },
    ],
  },
  {
    id: 'react',
    label: 'React / Next.js',
    icon: '⚛️',
    description: 'useEffect or Next.js Script component',
    steps: (embedCode, _, clientId) => [
      {
        title: 'Option A: Next.js Script component (recommended for Next.js)',
        content: 'In your root layout file (_app.tsx or layout.tsx), import and use the Script component:',
        code: `// app/layout.tsx  (Next.js App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${embedCode.match(/src="([^"]+)"/)?.[1] ?? ''}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`,
        language: 'tsx',
        tip: 'strategy="lazyOnload" ensures the widget loads after the page is fully interactive.',
      },
      {
        title: 'Option B: useEffect hook (works in any React app)',
        content: 'Add the script dynamically from a useEffect in your root component or a layout component:',
        code: `import { useEffect } from 'react';

export function WinBixWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${embedCode.match(/src="([^"]+)"/)?.[1] ?? ''}';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Optional cleanup
      document.body.removeChild(script);
    };
  }, []); // Empty deps = runs once on mount

  return null;
}`,
        language: 'tsx',
      },
      {
        title: 'Add the component to your app',
        content: 'Import and render the WinBixWidget component in your _app.tsx or root layout:',
        code: `// pages/_app.tsx  (Next.js Pages Router)
import { WinBixWidget } from '@/components/WinBixWidget';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <WinBixWidget />
    </>
  );
}`,
        language: 'tsx',
      },
      {
        title: 'Verify widget ID',
        content: `Your client ID for this widget is: ${clientId}. The widget uses Shadow DOM isolation, so it will not conflict with your React styles.`,
        tip: 'No npm package needed — the widget is a self-contained script that works alongside React.',
      },
    ],
  },
  {
    id: 'gtm',
    label: 'Google Tag Manager',
    icon: '🏷️',
    description: 'Deploy via GTM without touching code',
    steps: (embedCode) => [
      {
        title: 'Open Google Tag Manager',
        content:
          'Go to tagmanager.google.com and open your container. If GTM is not installed on your site yet, follow the GTM setup guide first.',
      },
      {
        title: 'Create a new tag',
        content: 'Click Tags → New. Give it a name like "WinBix AI Widget".',
      },
      {
        title: 'Choose Custom HTML tag type',
        content: 'Click "Tag Configuration". Select "Custom HTML" from the list.',
      },
      {
        title: 'Paste the embed code',
        content: 'Paste the embed code into the HTML field:',
        code: embedCode,
        language: 'html',
        tip: 'Enable "Support document.write" if your website uses it, otherwise leave it unchecked.',
      },
      {
        title: 'Set the trigger',
        content:
          'Click "Triggering". Select "All Pages" (or choose specific pages). This controls when the widget loads.',
      },
      {
        title: 'Save and submit',
        content:
          'Click Save, then click Submit in the top right. Add a version name like "Add WinBix AI Widget" and click Publish.',
        tip: 'Use the Preview mode to test the tag before publishing live.',
      },
    ],
  },
  {
    id: 'wix',
    label: 'Wix',
    icon: '🟣',
    description: 'Via Wix Custom Code settings',
    steps: (embedCode) => [
      {
        title: 'Open your Wix Dashboard',
        content: 'Log in to your Wix account and go to your site dashboard.',
      },
      {
        title: 'Go to Settings → Custom Code',
        content: 'In the sidebar, click Settings. Scroll to the Advanced section and click "Custom Code".',
        warning: 'Custom code requires a Wix Premium plan.',
      },
      {
        title: 'Add custom code',
        content:
          'Click "+ Add Custom Code". Paste the embed code. Set "Add Code to Pages" to "All pages". Set "Place Code in" to "Body - end".',
        code: embedCode,
        language: 'html',
      },
      {
        title: 'Apply and publish',
        content: 'Click Apply, then open your Site Editor and click Publish to push changes live.',
      },
    ],
  },
  {
    id: 'tilda',
    label: 'Tilda',
    icon: '🟡',
    description: 'Via Tilda Site Settings',
    steps: (embedCode) => [
      {
        title: 'Open Site Settings',
        content: 'In your Tilda project, click the gear icon (⚙️) in the top navigation.',
      },
      {
        title: 'Navigate to the More tab',
        content: 'Click the "More" tab. Find the "HTML code" section.',
      },
      {
        title: 'Paste into "Before </body>"',
        content: 'Paste the embed code into the "Custom code before </body> tag" field.',
        code: embedCode,
        language: 'html',
      },
      {
        title: 'Republish all pages',
        content: 'Go back to the pages list and click "Republish all pages".',
        warning: 'You must republish all pages — the code applies site-wide but is only active after republishing.',
      },
    ],
  },
  {
    id: 'webflow',
    label: 'Webflow',
    icon: '🔷',
    description: 'Via Webflow Project Settings',
    steps: (embedCode) => [
      {
        title: 'Open Project Settings',
        content: 'In the Webflow Designer, click the gear icon (⚙️) in the left panel.',
      },
      {
        title: 'Go to Custom Code',
        content: 'Click the "Custom Code" tab. Scroll to "Footer Code".',
      },
      {
        title: 'Paste in Footer Code',
        content: 'Paste the embed code into the "Footer Code" textarea.',
        code: embedCode,
        language: 'html',
        tip: 'To add the widget to specific pages only, use per-page custom code in the page settings.',
      },
      {
        title: 'Save and publish',
        content: 'Click Save Changes, then Publish your site.',
      },
    ],
  },
];

// ─── Code Block ───────────────────────────────────────────────────────────────

function CodeBlock({
  code,
  fieldKey,
  copiedField,
  onCopy,
}: {
  code: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) {
  const copied = copiedField === fieldKey;
  return (
    <div className="bg-bg-primary border-border relative mt-3 overflow-hidden rounded-xl border">
      <div className="overflow-x-auto p-4 pr-14">
        <pre className="text-xs leading-relaxed">
          <code className="text-accent">{code}</code>
        </pre>
      </div>
      <button
        onClick={() => onCopy(code, fieldKey)}
        className="bg-bg-secondary border-border hover:border-accent/60 absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all"
        aria-label="Copy code"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="text-text-tertiary h-3.5 w-3.5" />
            <span className="text-text-secondary">Copy</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstallationPage() {
  const [widgets, setWidgets] = useState<WidgetInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('script');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Verification state
  const [verifyUrl, setVerifyUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    verified: boolean;
    details: string;
    checkedAt?: string;
  } | null>(null);

  // Ref for retry on 401
  const retried = useRef(false);

  const fetchWidgets = useCallback(async (retry = false) => {
    try {
      const res = await fetch('/api/installation');
      if (res.status === 401 && !retry) {
        // Attempt token refresh once
        await fetch('/api/auth/refresh', { method: 'POST' });
        return fetchWidgets(true);
      }
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      const list: WidgetInfo[] = json.data || [];
      setWidgets(list);
      if (list.length > 0) {
        setSelectedId(list[0].clientId);
        setVerifyUrl(list[0].website || '');
      }
    } catch {
      // fall through — show empty state or partial
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const widget = widgets.find((w) => w.clientId === selectedId);
  const embedCode = widget ? getEmbedCode(widget.clientId, widget.clientType) : '';
  const embedCodeDefer = widget ? getEmbedCodeDefer(widget.clientId, widget.clientType) : '';

  const currentTabDef = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const steps = widget ? currentTabDef.steps(embedCode, embedCodeDefer, widget.clientId) : [];

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleStep = (idx: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleVerify = async () => {
    if (!verifyUrl.trim() || !selectedId) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/installation/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: verifyUrl.trim(), clientId: selectedId }),
      });
      if (res.status === 401 && !retried.current) {
        retried.current = true;
        await fetch('/api/auth/refresh', { method: 'POST' });
        return handleVerify();
      }
      retried.current = false;
      const json = await res.json();
      if (json.success) {
        setVerifyResult({
          verified: json.data.verified,
          details: json.data.details,
          checkedAt: json.data.checkedAt,
        });
      } else {
        setVerifyResult({ verified: false, details: json.error || 'Verification failed.' });
      }
    } catch {
      setVerifyResult({ verified: false, details: 'Network error. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectWidget = (clientId: string) => {
    setSelectedId(clientId);
    setDropdownOpen(false);
    setVerifyResult(null);
    setExpandedSteps(new Set([0]));
    const w = widgets.find((x) => x.clientId === clientId);
    setVerifyUrl(w?.website || '');
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="text-accent h-8 w-8 animate-spin" />
      </div>
    );
  }

  // ── Empty state ──
  if (widgets.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          icon={Download}
          title="No widgets yet"
          description="Create your first AI chat widget, then come back here for installation instructions."
          action={
            <Link href="/dashboard/builder">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Widget
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="bg-accent/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Download className="text-accent h-5 w-5" />
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-bold">Installation Guide</h1>
            <p className="text-text-secondary text-sm">Add your AI widget to any website in under 2 minutes</p>
          </div>
        </div>

        {/* Progress bar — always shows step 1 of 3 conceptually */}
        <div className="mt-4 flex items-center gap-2">
          {['Select Widget', 'Install Code', 'Verify'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="bg-accent flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
                  {i + 1}
                </div>
                <span className="text-text-secondary text-xs">{label}</span>
              </div>
              {i < 2 && <div className="bg-border mx-1 h-px w-8 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Widget Selector ── */}
      <div className="mb-2">
        <span className="text-text-tertiary text-xs font-semibold tracking-wider uppercase">
          Step 1 — Select Widget
        </span>
      </div>
      <div className="relative mb-8">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="border-border bg-bg-secondary hover:border-accent/50 flex w-full items-center justify-between rounded-xl border px-4 py-3.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                widget?.clientType === 'full' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {widget?.clientType === 'full' ? <Globe className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </div>
            <div className="text-left">
              <div className="text-text-primary text-sm font-semibold">{widget?.widgetName}</div>
              <div className="text-text-tertiary font-mono text-xs">{widget?.clientId}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {widget?.installationVerified ? (
              <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" />
                Installed
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Not verified
              </span>
            )}
            <ChevronDown
              className={`text-text-tertiary h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="border-border bg-bg-secondary absolute z-20 mt-1 w-full overflow-hidden rounded-xl border shadow-2xl">
              <div className="max-h-64 overflow-y-auto py-1">
                {widgets.map((w) => (
                  <button
                    key={w.clientId}
                    onClick={() => handleSelectWidget(w.clientId)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedId === w.clientId ? 'bg-accent/10' : 'hover:bg-bg-tertiary'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                        w.clientType === 'full' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {w.clientType === 'full' ? <Globe className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary truncate text-sm font-medium">{w.widgetName}</div>
                      <div className="text-text-tertiary font-mono text-xs">{w.clientId}</div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {w.installationVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-400" />
                      )}
                      {selectedId === w.clientId && <Check className="text-accent h-4 w-4" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Embed Code Card ── */}
      <div className="mb-2">
        <span className="text-text-tertiary text-xs font-semibold tracking-wider uppercase">
          Step 2 — Copy &amp; Install
        </span>
      </div>
      <Card padding="lg" className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Code2 className="text-accent h-5 w-5" />
          <h2 className="text-text-primary text-lg font-semibold">Your Embed Code</h2>
          <span className="border-border bg-bg-tertiary text-text-tertiary ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
            {widget?.clientType === 'full' ? 'Production' : 'Quick Widget'}
          </span>
        </div>
        <p className="text-text-secondary mb-4 text-sm">
          Add this one line before <code className="bg-bg-tertiary rounded px-1.5 py-0.5 text-xs">&lt;/body&gt;</code>{' '}
          on every page where you want the widget to appear.
        </p>
        <div className="bg-bg-primary border-border group relative overflow-hidden rounded-xl border">
          <div className="overflow-x-auto p-4 pr-16">
            <code className="text-accent font-mono text-sm whitespace-nowrap">{embedCode}</code>
          </div>
          <button
            onClick={() => copy(embedCode, 'embed-main')}
            className="bg-bg-secondary border-border hover:border-accent/60 absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
          >
            {copiedField === 'embed-main' ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="text-text-tertiary h-3.5 w-3.5" />
                <span className="text-text-secondary">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="border-border mt-4 grid grid-cols-3 gap-3 border-t pt-4">
          {[
            { icon: Monitor, label: 'Desktop', value: '✓ Supported' },
            { icon: Smartphone, label: 'Mobile', value: '✓ Responsive' },
            { icon: Package, label: 'Bundle size', value: '~150KB gzip' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-bg-tertiary rounded-lg px-3 py-2.5">
              <div className="text-text-tertiary mb-0.5 flex items-center gap-1.5 text-[11px]">
                <Icon className="h-3 w-3" />
                {label}
              </div>
              <div className="text-text-primary text-xs font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Platform Tabs ── */}
      <div className="mb-4 flex items-center gap-2">
        <Blocks className="text-text-secondary h-5 w-5" />
        <h2 className="text-text-primary text-lg font-semibold">Platform Guide</h2>
      </div>

      {/* Tab bar */}
      <div className="scrollbar-hide mb-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setExpandedSteps(new Set([0]));
            }}
            className={`flex flex-shrink-0 flex-col items-center gap-0.5 rounded-xl border px-4 py-2.5 text-sm transition-all ${
              activeTab === tab.id
                ? 'border-accent bg-accent/10 text-accent shadow-sm'
                : 'border-border text-text-secondary hover:border-accent/40 hover:text-text-primary'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="leading-none font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <p className="text-text-secondary mb-4 text-sm">{currentTabDef.description}</p>

      {/* Steps */}
      <div className="mb-8 space-y-3">
        {steps.map((step, idx) => (
          <Card
            key={`${activeTab}-${idx}`}
            padding="sm"
            className={`overflow-hidden transition-all ${expandedSteps.has(idx) ? 'border-accent/30' : ''}`}
          >
            <button onClick={() => toggleStep(idx)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                  expandedSteps.has(idx) ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary'
                }`}
              >
                {idx + 1}
              </span>
              <span className="text-text-primary flex-1 text-sm font-medium">{step.title}</span>
              {expandedSteps.has(idx) ? (
                <ChevronDown className="text-text-tertiary h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="text-text-tertiary h-4 w-4 flex-shrink-0" />
              )}
            </button>

            {expandedSteps.has(idx) && (
              <div className="border-border border-t px-5 py-4">
                <p className="text-text-secondary text-sm leading-relaxed">{step.content}</p>

                {step.code && (
                  <CodeBlock
                    code={step.code}
                    fieldKey={`step-${activeTab}-${idx}`}
                    copiedField={copiedField}
                    onCopy={copy}
                  />
                )}

                {step.tip && (
                  <div className="bg-accent/5 border-accent/20 mt-3 rounded-lg border px-4 py-3">
                    <p className="text-accent text-xs leading-relaxed">
                      <span className="font-semibold">Tip: </span>
                      {step.tip}
                    </p>
                  </div>
                )}

                {step.warning && (
                  <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <p className="text-xs leading-relaxed text-amber-400">
                      <span className="font-semibold">Warning: </span>
                      {step.warning}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ── Step 3: Verification ── */}
      <div className="mb-2">
        <span className="text-text-tertiary text-xs font-semibold tracking-wider uppercase">
          Step 3 — Verify Installation
        </span>
      </div>
      <Card padding="lg" className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-400" />
          <h3 className="text-text-primary font-semibold">Check Your Installation</h3>
        </div>

        <p className="text-text-secondary mb-4 text-sm">
          Enter your website URL and we will scan the page to confirm the widget script tag is present.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="text-text-tertiary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="url"
              value={verifyUrl}
              onChange={(e) => {
                setVerifyUrl(e.target.value);
                setVerifyResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              placeholder="https://yourwebsite.com"
              className="border-border bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:border-accent w-full rounded-xl border py-2.5 pr-4 pl-10 text-sm transition-colors outline-none"
            />
          </div>
          <Button onClick={handleVerify} disabled={verifying || !verifyUrl.trim()} className="flex-shrink-0">
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Verify
              </>
            )}
          </Button>
        </div>

        {/* Verify result */}
        {verifyResult && (
          <div
            className={`mt-4 rounded-xl border px-4 py-4 ${
              verifyResult.verified ? 'border-green-500/25 bg-green-500/5' : 'border-red-500/25 bg-red-500/5'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              {verifyResult.verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={`font-semibold ${verifyResult.verified ? 'text-green-400' : 'text-red-400'}`}>
                {verifyResult.verified ? 'Widget Detected!' : 'Not Found'}
              </span>
              {verifyResult.checkedAt && (
                <span className="text-text-tertiary ml-auto text-xs">
                  {new Date(verifyResult.checkedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className={`text-sm leading-relaxed ${verifyResult.verified ? 'text-green-300/80' : 'text-red-300/80'}`}>
              {verifyResult.details}
            </p>
          </div>
        )}

        {/* Manual verification checklist */}
        <div className="border-border mt-5 border-t pt-5">
          <p className="text-text-secondary mb-3 text-sm font-medium">Manual verification steps:</p>
          <ol className="text-text-secondary space-y-2.5 text-sm">
            {[
              'Open your website in a new incognito/private browser window',
              'Look for the chat widget button in the bottom-right corner',
              'Click it to open the chat — send a test message',
              'Verify the bot responds with knowledge-based answers',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="bg-bg-tertiary text-text-tertiary mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  {i + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Preview button */}
        {widget && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(
                  `${PRODUCTION_URL}/demo/client-website?client=${widget.clientId}${
                    widget.website ? `&website=${encodeURIComponent(widget.website)}` : ''
                  }`,
                  '_blank'
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Widget
            </Button>
            <Button variant="secondary" size="sm" onClick={() => fetchWidgets()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        )}
      </Card>

      {/* ── API Key & Webhook Info ── */}
      {widget && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Key className="text-text-secondary h-5 w-5" />
            <h2 className="text-text-primary text-lg font-semibold">API &amp; Webhook</h2>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-2">
            {/* Client Token */}
            <Card padding="lg">
              <div className="mb-3 flex items-center gap-2">
                <Key className="text-accent h-4 w-4" />
                <span className="text-text-primary text-sm font-semibold">Client Token</span>
              </div>
              <p className="text-text-secondary mb-3 text-xs">
                Use this token to authenticate direct API calls for this widget.
              </p>
              <div className="bg-bg-primary border-border relative overflow-hidden rounded-xl border">
                <div className="overflow-x-auto p-3 pr-12">
                  <code className="text-accent font-mono text-xs whitespace-nowrap">{widget.clientToken}</code>
                </div>
                <button
                  onClick={() => copy(widget.clientToken, 'client-token')}
                  className="bg-bg-secondary border-border hover:border-accent/60 absolute top-2 right-2 flex items-center gap-1 rounded-lg border p-1.5 text-xs transition-all"
                >
                  {copiedField === 'client-token' ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="text-text-tertiary h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-text-tertiary mt-2 text-xs">
                Example: <code className="font-mono">Authorization: Bearer {'<token>'}</code>
              </p>
            </Card>

            {/* Webhook URL */}
            <Card padding="lg">
              <div className="mb-3 flex items-center gap-2">
                <Webhook className="h-4 w-4 text-purple-400" />
                <span className="text-text-primary text-sm font-semibold">Chat Webhook</span>
              </div>
              <p className="text-text-secondary mb-3 text-xs">
                Point third-party tools at this endpoint to receive chat events.
              </p>
              <div className="bg-bg-primary border-border relative overflow-hidden rounded-xl border">
                <div className="overflow-x-auto p-3 pr-12">
                  <code className="font-mono text-xs whitespace-nowrap text-purple-400">
                    {`${PRODUCTION_URL}/api/chat/${widget.clientId}`}
                  </code>
                </div>
                <button
                  onClick={() => copy(`${PRODUCTION_URL}/api/chat/${widget.clientId}`, 'webhook-url')}
                  className="bg-bg-secondary border-border hover:border-accent/60 absolute top-2 right-2 flex items-center gap-1 rounded-lg border p-1.5 text-xs transition-all"
                >
                  {copiedField === 'webhook-url' ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="text-text-tertiary h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/dashboard/channels"
                  className="text-accent flex items-center gap-1 text-xs hover:underline"
                >
                  <Layout className="h-3 w-3" />
                  Configure channels
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── Multi-widget quick links ── */}
      {widgets.length > 1 && (
        <Card padding="lg" className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="text-text-secondary h-4 w-4" />
            <span className="text-text-primary text-sm font-semibold">All Widgets</span>
          </div>
          <div className="space-y-2">
            {widgets.map((w) => (
              <div key={w.clientId} className="border-border flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                    w.clientType === 'full' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {w.clientType === 'full' ? <Globe className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-text-primary truncate text-xs font-medium">{w.widgetName}</div>
                  <div className="text-text-tertiary font-mono text-[11px]">{w.clientId}</div>
                </div>
                {w.installationVerified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Pending
                  </span>
                )}
                <button
                  onClick={() => handleSelectWidget(w.clientId)}
                  className="text-accent hover:text-accent/70 text-xs font-medium transition-colors"
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Troubleshooting ── */}
      <Card padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="text-text-secondary h-5 w-5" />
          <h3 className="text-text-primary font-semibold">Troubleshooting</h3>
        </div>
        <div className="divide-border divide-y">
          {[
            {
              q: "Widget doesn't appear on my page",
              a: 'Confirm the script tag is placed before </body>, not in <head>. Clear your browser cache, try an incognito window, and check the browser console (F12) for Content Security Policy or loading errors.',
            },
            {
              q: "Widget loads but chat doesn't respond",
              a: 'Verify your knowledge base has content (Dashboard → My Widgets → Settings). Check the browser network tab for failed API requests (4xx/5xx) and ensure your domain is not blocked by CORS.',
            },
            {
              q: 'The verifier says "not found" but I can see the widget',
              a: 'Some sites block headless fetches. The verifier sends a plain HTTP GET — if your site has bot protection (Cloudflare, etc.) it may block it. Use the manual verification checklist instead.',
            },
            {
              q: 'Styling conflicts with my site',
              a: "The widget uses Shadow DOM for full CSS isolation. If you see z-index conflicts, the widget uses z-index 9999 — adjust your site's stacking context if needed.",
            },
            {
              q: 'Widget loads slowly',
              a: 'The widget script is ~150KB gzip and loads asynchronously. Add the defer attribute for optimal performance. On Shopify, we include defer by default.',
            },
            {
              q: 'How do I remove the widget?',
              a: 'Remove the <script> tag from your website code and save/republish. The widget will immediately stop appearing.',
            },
            {
              q: 'Does the widget work with Single-Page Applications (React, Vue, Angular)?',
              a: 'Yes. The widget is SPA-compatible and does not rely on page reloads. Use the useEffect or Next.js Script approaches shown in the React/Next.js tab.',
            },
          ].map((item, i) => (
            <details key={i} className="group">
              <summary className="text-text-primary hover:text-accent cursor-pointer list-none py-3.5 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between">
                  <span>{item.q}</span>
                  <ChevronRight className="text-text-tertiary h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-90" />
                </div>
              </summary>
              <p className="text-text-secondary pb-3 text-sm leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </Card>
    </div>
  );
}
