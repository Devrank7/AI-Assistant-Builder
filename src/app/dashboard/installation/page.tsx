'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/ui';

const PRODUCTION_URL = 'https://winbixai.com';

interface WidgetInfo {
  clientId: string;
  name: string;
  clientType: 'quick' | 'production';
  website?: string;
}

type Platform = 'universal' | 'wordpress' | 'wix' | 'shopify' | 'tilda' | 'webflow';

interface PlatformStep {
  title: string;
  content: string;
  code?: string;
  tip?: string;
}

interface PlatformGuide {
  id: Platform;
  name: string;
  icon: string;
  steps: PlatformStep[];
}

function getEmbedCode(clientId: string, clientType: string) {
  const folder = clientType === 'production' ? 'widgets' : 'quickwidgets';
  return `<script src="${PRODUCTION_URL}/${folder}/${clientId}/script.js"></script>`;
}

function getEmbedCodeDefer(clientId: string, clientType: string) {
  const folder = clientType === 'production' ? 'widgets' : 'quickwidgets';
  return `<script src="${PRODUCTION_URL}/${folder}/${clientId}/script.js" defer></script>`;
}

function getPlatforms(embedCode: string, embedCodeDefer: string): PlatformGuide[] {
  return [
    {
      id: 'universal',
      name: 'Any Website',
      icon: '🌐',
      steps: [
        {
          title: 'Copy the embed code',
          content: 'Copy the script tag above. This single line is all you need.',
          code: embedCode,
        },
        {
          title: 'Open your HTML file',
          content: 'Open the HTML file of your website in any code editor (VS Code, Sublime, Notepad++, etc.).',
        },
        {
          title: 'Paste before </body>',
          content: 'Find the closing </body> tag and paste the code right before it.',
          code: `<!-- Your website content -->

<!-- WinBix AI Widget -->
${embedCode}
</body>
</html>`,
        },
        {
          title: 'Save and refresh',
          content:
            'Save the file and refresh your website. The widget appears as a floating button in the bottom-right corner.',
          tip: "The widget loads asynchronously and won't slow down your page.",
        },
      ],
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '🔵',
      steps: [
        {
          title: 'Install "WPCode" plugin (recommended)',
          content:
            'In your WordPress admin, go to Plugins → Add New. Search for "WPCode" (formerly "Insert Headers and Footers"). Install and activate it.',
          tip: "This is the safest method — you won't lose the widget when updating your theme.",
        },
        {
          title: 'Add the code snippet',
          content: 'Go to Code Snippets → Header & Footer. Paste the embed code into the "Footer" section.',
          code: embedCode,
        },
        {
          title: 'Save changes',
          content: 'Click "Save Changes". The widget will now appear on every page of your WordPress site.',
        },
        {
          title: 'Alternative: Using Elementor',
          content:
            'If you use Elementor Pro: go to Elementor → Custom Code → Add New. Set location to "Before </body> closing tag". Paste the code and publish.',
          code: embedCode,
          tip: 'For theme editor method: Appearance → Theme File Editor → footer.php → paste before <?php wp_footer(); ?>',
        },
      ],
    },
    {
      id: 'wix',
      name: 'Wix',
      icon: '🟣',
      steps: [
        {
          title: 'Open Wix Dashboard',
          content: 'Log into your Wix account and open the dashboard for your site.',
        },
        {
          title: 'Go to Settings → Custom Code',
          content: 'In the sidebar, click Settings. Scroll down to "Advanced" section and click "Custom Code".',
        },
        {
          title: 'Add the code',
          content:
            'Click "+ Add Custom Code". Paste the embed code. Set "Add Code to Pages" to "All pages". Set "Place Code in" to "Body - end".',
          code: embedCode,
        },
        {
          title: 'Apply and publish',
          content: 'Click "Apply". Then go to your site editor and click "Publish" to make the changes live.',
          tip: 'Custom code requires Wix Premium plan.',
        },
      ],
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🟢',
      steps: [
        {
          title: 'Open Theme Editor',
          content:
            'In your Shopify admin, go to Online Store → Themes. Click "..." on your active theme → "Edit code".',
        },
        {
          title: 'Open theme.liquid',
          content: 'In the Layout folder, click on "theme.liquid". Scroll to the very bottom of the file.',
        },
        {
          title: 'Paste before </body>',
          content:
            'Find the closing </body> tag and paste the code right before it. We use the defer attribute for optimal loading.',
          code: embedCodeDefer,
        },
        {
          title: 'Save',
          content: 'Click "Save". The widget will now appear on every page of your Shopify store.',
          tip: "The defer attribute ensures the widget doesn't block your store's initial page load.",
        },
      ],
    },
    {
      id: 'tilda',
      name: 'Tilda',
      icon: '🟡',
      steps: [
        {
          title: 'Open Site Settings',
          content: 'In your Tilda project, click the gear icon (⚙️) in the top navigation to open Site Settings.',
        },
        {
          title: 'Navigate to "More" tab',
          content: 'Click the "More" tab in site settings. Find the "HTML code" section.',
        },
        {
          title: 'Paste into "Before </body>"',
          content: 'Paste the embed code into the "Custom code before </body> tag" field.',
          code: embedCode,
        },
        {
          title: 'Republish all pages',
          content: 'Go back to your pages list. Click "Republish all pages" to apply the changes to your live site.',
          tip: 'You must republish ALL pages — the code is inserted at the site level, but changes only apply after republishing.',
        },
      ],
    },
    {
      id: 'webflow',
      name: 'Webflow',
      icon: '🔷',
      steps: [
        {
          title: 'Open Project Settings',
          content: 'In the Webflow Designer, click the gear icon (⚙️) in the left panel to open Project Settings.',
        },
        {
          title: 'Go to Custom Code',
          content: 'Click the "Custom Code" tab. Scroll down to the "Footer Code" section.',
        },
        {
          title: 'Paste in Footer Code',
          content: 'Paste the embed code into the "Footer Code" textarea. This automatically adds it to all pages.',
          code: embedCode,
        },
        {
          title: 'Save and publish',
          content: 'Click "Save Changes", then click "Publish" to deploy your site with the widget.',
          tip: 'To add the widget to specific pages only, use per-page custom code in the page settings instead.',
        },
      ],
    },
  ];
}

export default function InstallationPage() {
  const [widgets, setWidgets] = useState<WidgetInfo[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('universal');
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/user/widgets')
      .then((r) => r.json())
      .then((data) => {
        const list: WidgetInfo[] = (data.data || []).map((c: Record<string, string>) => ({
          clientId: c.clientId,
          name: c.widgetName || c.clientId,
          clientType: c.clientType || 'quick',
          website: c.website,
        }));
        setWidgets(list);
        if (list.length > 0) setSelectedWidget(list[0].clientId);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const widget = widgets.find((w) => w.clientId === selectedWidget);
  const embedCode = widget ? getEmbedCode(widget.clientId, widget.clientType) : '';
  const embedCodeDefer = widget ? getEmbedCodeDefer(widget.clientId, widget.clientType) : '';
  const platforms = getPlatforms(embedCode, embedCodeDefer);
  const currentPlatform = platforms.find((p) => p.id === activePlatform) || platforms[0];

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for HTTP
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="border-accent h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

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

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-text-primary text-2xl font-bold">Install Widget on Your Site</h1>
        <p className="text-text-secondary mt-1 text-sm">Copy one line of code and paste it into your website</p>
      </div>

      {/* Widget Selector */}
      <div className="relative mb-8">
        <label className="text-text-secondary mb-2 block text-xs font-medium tracking-wider uppercase">
          Select Widget
        </label>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="border-border bg-bg-secondary hover:border-accent/50 flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                widget?.clientType === 'production' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {widget?.clientType === 'production' ? <Globe className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            </div>
            <div className="text-left">
              <div className="text-text-primary text-sm font-medium">{widget?.name}</div>
              <div className="text-text-tertiary text-xs">{widget?.clientId}</div>
            </div>
          </div>
          <ChevronDown
            className={`text-text-tertiary h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="border-border bg-bg-secondary absolute z-20 mt-1 w-full overflow-hidden rounded-xl border shadow-xl">
              <div className="max-h-64 overflow-y-auto py-1">
                {widgets.map((w) => (
                  <button
                    key={w.clientId}
                    onClick={() => {
                      setSelectedWidget(w.clientId);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedWidget === w.clientId ? 'bg-accent/10' : 'hover:bg-bg-tertiary'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                        w.clientType === 'production'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}
                    >
                      {w.clientType === 'production' ? <Globe className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-text-primary truncate text-sm font-medium">{w.name}</div>
                      <div className="text-text-tertiary text-xs">{w.clientId}</div>
                    </div>
                    {selectedWidget === w.clientId && <Check className="text-accent h-4 w-4 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Embed Code Card */}
      <Card padding="lg" className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <Code2 className="text-accent h-5 w-5" />
          <h2 className="text-text-primary text-lg font-semibold">Your Embed Code</h2>
        </div>
        <p className="text-text-secondary mb-4 text-sm">
          Add this single line before{' '}
          <code className="bg-bg-tertiary rounded px-1.5 py-0.5 text-xs">&lt;/body&gt;</code> on every page where you
          want the widget.
        </p>
        <div className="bg-bg-primary border-border group relative overflow-hidden rounded-xl border">
          <div className="overflow-x-auto p-4 pr-14">
            <code className="text-accent text-sm whitespace-nowrap">{embedCode}</code>
          </div>
          <button
            onClick={() => copy(embedCode, 'embed')}
            className="bg-bg-secondary border-border hover:border-accent absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
          >
            {copiedField === 'embed' ? (
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
      </Card>

      {/* Platform Tabs */}
      <div className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Blocks className="text-text-secondary h-5 w-5" />
          <h2 className="text-text-primary text-lg font-semibold">Step-by-Step Guide</h2>
        </div>
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActivePlatform(p.id);
                setExpandedSteps(new Set([0]));
              }}
              className={`flex flex-shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                activePlatform === p.id
                  ? 'border-accent bg-accent/10 text-accent shadow-sm'
                  : 'border-border text-text-secondary hover:border-accent/40 hover:text-text-primary'
              }`}
            >
              <span className="text-base">{p.icon}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="mb-8 space-y-3">
        {currentPlatform.steps.map((step, idx) => (
          <Card
            key={`${activePlatform}-${idx}`}
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
                  <div className="bg-bg-primary border-border relative mt-3 overflow-hidden rounded-lg border">
                    <pre className="overflow-x-auto p-4 pr-14">
                      <code className="text-accent text-xs leading-relaxed">{step.code}</code>
                    </pre>
                    <button
                      onClick={() => copy(step.code!, `step-${idx}`)}
                      className="bg-bg-secondary border-border hover:border-accent absolute top-2 right-2 flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-all"
                    >
                      {copiedField === `step-${idx}` ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="text-text-tertiary h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}
                {step.tip && (
                  <div className="bg-accent/5 border-accent/20 mt-3 rounded-lg border px-4 py-3">
                    <p className="text-accent text-xs leading-relaxed">
                      <span className="font-semibold">💡 Tip:</span> {step.tip}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Verification */}
      <Card padding="lg" className="mb-4">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-400" />
          <h3 className="text-text-primary font-semibold">Verify Installation</h3>
        </div>
        <ol className="text-text-secondary space-y-3 text-sm">
          {[
            'Open your website in a new incognito/private browser window',
            'Look for the chat widget button in the bottom-right corner',
            'Click it to open the chat — send a test message',
            'Verify the bot responds with relevant knowledge-based answers',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="bg-bg-tertiary text-text-tertiary mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
        {widget && (
          <div className="mt-5 flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                window.open(
                  `${PRODUCTION_URL}/demo/client-website?client=${widget.clientId}${widget.website ? `&website=${encodeURIComponent(widget.website)}` : ''}`,
                  '_blank'
                )
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Widget
            </Button>
          </div>
        )}
      </Card>

      {/* Troubleshooting */}
      <Card padding="lg" className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="text-text-secondary h-5 w-5" />
          <h3 className="text-text-primary font-semibold">Troubleshooting</h3>
        </div>
        <div className="divide-border divide-y">
          {[
            {
              q: "Widget doesn't appear",
              a: 'Make sure the script tag is placed before </body>, not inside <head>. Clear your browser cache and try an incognito window. Check the browser console (F12) for any Content Security Policy or loading errors.',
            },
            {
              q: "Widget appears but chat doesn't work",
              a: 'Verify your knowledge base has content uploaded (Dashboard → My Widgets → Settings). Check the browser console for API errors (4xx/5xx).',
            },
            {
              q: 'Styling conflicts with my site',
              a: "The widget uses Shadow DOM for full CSS isolation. If you see z-index conflicts, note that the widget uses z-index 9999. Adjust your site's z-index values if needed.",
            },
            {
              q: 'Widget loads slowly',
              a: 'The widget script is ~150KB gzipped and loads asynchronously. Add the defer attribute to prevent render-blocking. On Shopify, we include this by default.',
            },
            {
              q: 'How to remove the widget',
              a: 'Simply remove the <script> tag from your website code and save/republish.',
            },
          ].map((item, i) => (
            <details key={i} className="group">
              <summary className="text-text-primary hover:text-accent cursor-pointer list-none py-3 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between">
                  <span>{item.q}</span>
                  <ChevronRight className="text-text-tertiary h-4 w-4 transition-transform group-open:rotate-90" />
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
