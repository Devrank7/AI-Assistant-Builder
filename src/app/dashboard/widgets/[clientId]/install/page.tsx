'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  Globe,
  Code2,
  Blocks,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';

const PRODUCTION_URL = 'https://winbixai.com';

type Platform = 'universal' | 'wordpress' | 'wix' | 'shopify' | 'tilda' | 'webflow';

interface PlatformGuide {
  id: Platform;
  name: string;
  icon: string;
  difficulty: 'Easy' | 'Medium';
  steps: { title: string; content: string; code?: string }[];
}

export default function InstallPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('universal');
  const [expandedStep, setExpandedStep] = useState<number>(0);

  const embedCode = `<script src="${PRODUCTION_URL}/widgets/${clientId}/script.js"></script>`;
  const embedCodeAsync = `<script src="${PRODUCTION_URL}/widgets/${clientId}/script.js" defer></script>`;

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const platforms: PlatformGuide[] = [
    {
      id: 'universal',
      name: 'Any Website (HTML)',
      icon: '🌐',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Copy the embed code',
          content: 'Copy the script tag below. This is all you need to add the widget to any website.',
          code: embedCode,
        },
        {
          title: 'Paste before </body>',
          content:
            'Open your website\'s HTML file and paste the code right before the closing </body> tag. This ensures the widget loads after your page content.',
          code: `<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
</head>
<body>
  <!-- Your website content -->

  <!-- WinBix AI Widget -->
  ${embedCode}
</body>
</html>`,
        },
        {
          title: 'Done! Widget appears automatically',
          content:
            'The widget will appear as a floating button in the bottom-right corner of your site. No additional configuration needed — it works on all pages where the script is included.',
        },
      ],
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '🔵',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Go to Appearance → Theme Editor or use a plugin',
          content:
            'The easiest way: Install the free "Insert Headers and Footers" plugin (by WPCode). Go to Code Snippets → Footer, paste the code, and save. Alternatively, go to Appearance → Theme File Editor → footer.php.',
        },
        {
          title: 'Paste the code in the footer',
          content: 'If using the plugin, paste this in the "Footer" section. If using footer.php, paste it before <?php wp_footer(); ?>',
          code: embedCode,
        },
        {
          title: 'Using Elementor?',
          content:
            'Go to Elementor → Custom Code → Add New. Set location to "</body> - End". Paste the embed code and publish. It will appear on all pages.',
          code: embedCode,
        },
        {
          title: 'Save and check your site',
          content: 'Visit your website in an incognito window. The chat widget should appear in the bottom-right corner. It may take a few seconds on the first load.',
        },
      ],
    },
    {
      id: 'wix',
      name: 'Wix',
      icon: '🟣',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Open Wix Dashboard → Settings',
          content: 'Go to your Wix site dashboard. Click Settings in the left menu.',
        },
        {
          title: 'Go to Custom Code (under Advanced)',
          content:
            'Click "Custom Code" under the Advanced section. Click "+ Add Custom Code".',
        },
        {
          title: 'Paste the code',
          content:
            'Paste the embed code below. Set "Add Code to Pages" to "All pages". Set "Place Code in" to "Body - end". Click Apply.',
          code: embedCode,
        },
        {
          title: 'Publish your site',
          content: 'Click "Publish" to make the changes live. The widget will appear on all pages of your Wix site.',
        },
      ],
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🟢',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Go to Online Store → Themes',
          content: 'In your Shopify admin, go to Online Store → Themes.',
        },
        {
          title: 'Edit code',
          content:
            'Click "..." on your active theme → "Edit code". Open the layout/theme.liquid file.',
        },
        {
          title: 'Paste before </body>',
          content: 'Scroll to the bottom of theme.liquid and paste the code right before the </body> tag.',
          code: embedCodeAsync,
        },
        {
          title: 'Save',
          content:
            'Click "Save". The widget will now appear on every page of your Shopify store. Use the `defer` attribute to ensure it doesn\'t slow down page load.',
        },
      ],
    },
    {
      id: 'tilda',
      name: 'Tilda',
      icon: '🟡',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Go to Site Settings',
          content: 'Open your Tilda project. Click the gear icon (Site Settings) in the top panel.',
        },
        {
          title: 'Open "More" → "HTML code"',
          content:
            'In site settings, go to the "More" tab. Find the "HTML code for the <head> section" or "Custom code before </body>".',
        },
        {
          title: 'Paste in "Before </body>"',
          content: 'Paste the embed code into the "Custom code before </body>" field.',
          code: embedCode,
        },
        {
          title: 'Republish all pages',
          content:
            'Go back to your pages and click "Republish all pages". The widget will appear on every published page.',
        },
      ],
    },
    {
      id: 'webflow',
      name: 'Webflow',
      icon: '🔷',
      difficulty: 'Easy',
      steps: [
        {
          title: 'Open Project Settings',
          content: 'In the Webflow Designer, click the gear icon in the left panel to open Project Settings.',
        },
        {
          title: 'Go to Custom Code tab',
          content:
            'Click the "Custom Code" tab. Scroll down to the "Footer Code" section.',
        },
        {
          title: 'Paste in Footer Code',
          content: 'Paste the embed code in the "Footer Code" textarea. This adds it to all pages.',
          code: embedCode,
        },
        {
          title: 'Publish',
          content:
            'Click "Save Changes" then publish your site. The widget will appear on all pages.',
        },
      ],
    },
  ];

  const currentPlatform = platforms.find((p) => p.id === activePlatform) || platforms[0];

  return (
    <div className="bg-bg-primary text-text-primary min-h-screen">
      {/* Header */}
      <div className="border-border border-b px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard/widgets"
            className="text-text-tertiary hover:text-text-primary mb-4 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Widgets
          </Link>
          <h1 className="text-text-primary mt-2 text-2xl font-bold">Install Widget on Your Site</h1>
          <p className="text-text-secondary mt-1">
            Widget ID: <code className="bg-bg-secondary rounded px-2 py-0.5 text-sm">{clientId}</code>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Quick Copy Section */}
        <Card padding="lg" className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <Code2 className="text-accent h-5 w-5" />
            <h2 className="text-text-primary text-lg font-semibold">Your Embed Code</h2>
          </div>
          <p className="text-text-secondary mb-4 text-sm">
            Add this single line to your website. That&apos;s it — the widget handles everything else.
          </p>
          <div className="bg-bg-secondary border-border group relative rounded-xl border p-4">
            <code className="text-accent break-all text-sm">{embedCode}</code>
            <button
              onClick={() => copy(embedCode, 'embed')}
              className="bg-bg-primary border-border hover:border-accent absolute right-3 top-3 rounded-lg border p-2 transition-all"
            >
              {copiedField === 'embed' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="text-text-tertiary h-4 w-4" />
              )}
            </button>
          </div>
        </Card>

        {/* Platform Selector */}
        <div className="mb-6">
          <h2 className="text-text-primary mb-4 text-lg font-semibold flex items-center gap-2">
            <Blocks className="h-5 w-5" />
            Step-by-Step Guide
          </h2>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActivePlatform(p.id);
                  setExpandedStep(0);
                }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                  activePlatform === p.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-secondary hover:border-accent/50 hover:text-text-primary'
                }`}
              >
                <span>{p.icon}</span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {currentPlatform.steps.map((step, idx) => (
            <Card
              key={idx}
              padding="sm"
              className={`overflow-hidden transition-all ${expandedStep === idx ? 'border-accent/50' : ''}`}
            >
              <button
                onClick={() => setExpandedStep(expandedStep === idx ? -1 : idx)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    expandedStep === idx
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary text-text-tertiary'
                  }`}
                >
                  {idx + 1}
                </span>
                <span className="text-text-primary flex-1 font-medium">{step.title}</span>
                {expandedStep === idx ? (
                  <ChevronDown className="text-text-tertiary h-4 w-4" />
                ) : (
                  <ChevronRight className="text-text-tertiary h-4 w-4" />
                )}
              </button>
              {expandedStep === idx && (
                <div className="border-border border-t px-5 py-4">
                  <p className="text-text-secondary mb-3 text-sm leading-relaxed">{step.content}</p>
                  {step.code && (
                    <div className="bg-bg-secondary border-border relative rounded-lg border p-4">
                      <pre className="text-accent overflow-x-auto text-xs leading-relaxed">
                        <code>{step.code}</code>
                      </pre>
                      <button
                        onClick={() => copy(step.code!, `step-${idx}`)}
                        className="bg-bg-primary border-border hover:border-accent absolute right-2 top-2 rounded-lg border p-1.5 transition-all"
                      >
                        {copiedField === `step-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="text-text-tertiary h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Verification */}
        <Card padding="lg" className="mt-8">
          <h3 className="text-text-primary mb-3 font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Verify Installation
          </h3>
          <ol className="text-text-secondary list-inside list-decimal space-y-2 text-sm">
            <li>Open your website in an incognito/private browser window</li>
            <li>Look for the chat button in the bottom-right corner</li>
            <li>Click it and send a test message</li>
            <li>
              If the widget doesn&apos;t appear, open DevTools (F12) → Console and look for errors
            </li>
          </ol>
          <div className="mt-4 flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open(`/demo/client-website?client=${clientId}`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Widget
            </Button>
          </div>
        </Card>

        {/* Troubleshooting */}
        <Card padding="lg" className="mt-4">
          <h3 className="text-text-primary mb-3 font-semibold">Common Issues</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-primary font-medium">Widget doesn&apos;t appear?</p>
              <p className="text-text-secondary">
                Make sure the script tag is placed before &lt;/body&gt;, not in &lt;head&gt;. Clear your browser cache.
              </p>
            </div>
            <div>
              <p className="text-text-primary font-medium">Widget appears but doesn&apos;t respond?</p>
              <p className="text-text-secondary">
                Check that your knowledge base is configured in the dashboard. The AI needs content to answer questions.
              </p>
            </div>
            <div>
              <p className="text-text-primary font-medium">Console shows &quot;Plan limit reached&quot;?</p>
              <p className="text-text-secondary">
                Your monthly message limit has been exceeded. Upgrade your plan at{' '}
                <Link href="/plans" className="text-accent hover:underline">
                  Plans
                </Link>{' '}
                to continue.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
